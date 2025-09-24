import JSZip from "jszip";

type FileLike = {
  name: string;
  arrayBuffer(): Promise<ArrayBuffer>;
};

type DocxQuestionBase = {
  prompt: string;
};

type DocxMcqQuestion = DocxQuestionBase & {
  type: "mcq";
  options: { text: string; correct: boolean }[];
};

type DocxTextQuestion = DocxQuestionBase & {
  type: "text";
};

export type DocxParsedQuestion = DocxMcqQuestion | DocxTextQuestion;

const QUESTION_MARKER = "[PERTANYAAN]";

function decodeXmlEntities(input: string): string {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function extractParagraphs(xmlContent: string): string[] {
  const paragraphs = Array.from(xmlContent.matchAll(/<w:p[\s\S]*?<\/w:p>/g)).map((match) => match[0]);
  return paragraphs.map((paragraph) => {
    const texts = Array.from(paragraph.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)).map((match) =>
      decodeXmlEntities(match[1])
    );
    return texts.join("").replace(/\u00A0/g, " ").replace(/\r?\n/g, "").trimEnd();
  });
}

function groupQuestionBlocks(lines: string[]): string[][] {
  const sanitized = lines.map((line) => line.replace(/\u00A0/g, " ").trim());
  const groups: string[][] = [];
  let current: string[] | null = null;

  for (const rawLine of sanitized) {
    if (!rawLine) continue;
    const line = rawLine.trim();
    if (line.toUpperCase() === QUESTION_MARKER) {
      if (current && current.length > 0) {
        groups.push(current);
      }
      current = [];
      continue;
    }
    if (current) current.push(line);
  }

  if (current && current.length > 0) {
    groups.push(current);
  }

  return groups;
}

export async function parseDocxFile(file: FileLike): Promise<DocxParsedQuestion[]> {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);
  const docEntry = zip.file("word/document.xml");
  if (!docEntry) {
    throw new Error("File DOCX tidak valid. Gunakan template yang disediakan.");
  }

  const xmlContent = await docEntry.async("string");
  const lines = extractParagraphs(xmlContent);
  const groups = groupQuestionBlocks(lines);

  if (groups.length === 0) {
    throw new Error("Tidak menemukan blok [PERTANYAAN] di dokumen.");
  }

  return groups.map((group, idx) => {
    let type: "mcq" | "text" = "mcq";
    let prompt = "";
    const options: { text: string; correct: boolean }[] = [];
    let readingOptions = false;

    for (const row of group) {
      const line = row.trim();
      if (!line) continue;
      const lower = line.toLowerCase();

      if (lower.startsWith("tipe:")) {
        const value = line.split(":").slice(1).join(":").trim().toLowerCase();
        if (["text", "essay", "jawaban singkat"].includes(value)) {
          type = "text";
        } else {
          type = "mcq";
        }
        continue;
      }

      if (lower.startsWith("pertanyaan:") || lower.startsWith("soal:")) {
        prompt = line.split(":").slice(1).join(":").trim();
        continue;
      }

      if (lower.startsWith("opsi:") || lower.startsWith("pilihan:")) {
        readingOptions = true;
        continue;
      }

      if (readingOptions) {
        const checkboxMatch = line.match(/^[-*]\s*\[\s*([xX*])?\s*\]\s*(.+)$/);
        if (checkboxMatch) {
          const [, marker, text] = checkboxMatch;
          options.push({ text: text.trim(), correct: Boolean(marker) });
          continue;
        }

        const literalMatch = line.match(/^[-*]\s*\(\s*(benar|salah)\s*\)\s*(.+)$/i);
        if (literalMatch) {
          const [, state, text] = literalMatch;
          options.push({ text: text.trim(), correct: state.toLowerCase() === "benar" });
          continue;
        }

        options.push({ text: line.trim(), correct: false });
      }
    }

    if (!prompt) {
      throw new Error(`Pertanyaan ${idx + 1} belum memiliki teks pada baris 'Pertanyaan:'.`);
    }

    if (type === "mcq") {
      if (options.length < 2) {
        throw new Error(`Pertanyaan ${idx + 1} membutuhkan minimal 2 opsi.`);
      }
      if (!options.some((option) => option.correct)) {
        throw new Error(`Pertanyaan ${idx + 1} belum menandai jawaban benar (gunakan [x]).`);
      }
      return {
        prompt,
        type: "mcq",
        options,
      } satisfies DocxParsedQuestion;
    }

    return {
      prompt,
      type: "text",
    } satisfies DocxParsedQuestion;
  });
}
