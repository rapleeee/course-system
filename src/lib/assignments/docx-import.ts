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
const LIST_PREFIX_RE = /^(?:[-*•●▪◦]|\d+[.)]|[A-Za-z][.)])\s+/;
const ZERO_WIDTH_RE = /[\u200B-\u200D\uFEFF]/g;
const HEADER_RE = /(?:tipe|type|pertanyaan|soal|question|opsi|pilihan|options?|jawaban|kunci|answer)\s*[:：]/gi;
const QUESTION_MARKER_RE = /(?:\[\s*pertanyaan(?:\s+\d+)?\s*]|[【\[]\s*pertanyaan(?:\s+\d+)?\s*[】\]])/gi;
const QUESTION_MARKER_WITH_HEADER_RE =
  /(?:\[\s*pertanyaan(?:\s+\d+)?\s*]|[【\[]\s*pertanyaan(?:\s+\d+)?\s*[】\]])(?=\s*(?:tipe|type|pertanyaan|soal|question)\s*[:：])/gi;

function normalizeText(input: string): string {
  return input.replace(/\u00A0/g, " ").replace(ZERO_WIDTH_RE, "");
}

function decodeXmlEntities(input: string): string {
  const named = input
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
  return named
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, dec: string) => String.fromCodePoint(parseInt(dec, 10)));
}

function splitCompoundLine(input: string): string[] {
  let text = normalizeText(input).replace(/\r/g, "").trim();
  if (!text) return [];

  // Beberapa editor menyimpan semua soal jadi satu paragraf tanpa newline.
  text = text
    .replace(QUESTION_MARKER_WITH_HEADER_RE, "\n$&\n")
    .replace(HEADER_RE, "\n$&")
    .replace(/(?<!^)(?=-\s*\[[^\]]*])+/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();

  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function extractParagraphs(xmlContent: string): string[] {
  const paragraphs = Array.from(xmlContent.matchAll(/<w:p[\s\S]*?<\/w:p>/g)).map((match) => match[0]);
  return paragraphs.flatMap((paragraph) => {
    const normalizedParagraph = paragraph
      .replace(/<w:tab[^>]*\/>/g, " ")
      .replace(/<w:br[^>]*\/>/g, "\n");
    const texts = Array.from(normalizedParagraph.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)).map((match) =>
      decodeXmlEntities(match[1])
    );

    const mergedText = normalizeText(texts.join("")).replace(/\r/g, "");
    return mergedText
      .split("\n")
      .map((line) => line.trimEnd())
      .flatMap((line) => splitCompoundLine(line));
  });
}

function isQuestionMarker(input: string): boolean {
  const normalized = normalizeText(input)
    .replace(LIST_PREFIX_RE, "")
    .replace(/^['"`‘’“”]+|['"`‘’“”]+$/g, "")
    .trim();
  if (!normalized) return false;
  if (normalized.toUpperCase() === QUESTION_MARKER) return true;
  return (
    /^\[\s*pertanyaan(?:\s+\d+)?\s*]$/i.test(normalized) ||
    /^[【\[]\s*pertanyaan(?:\s+\d+)?\s*[】\]]$/i.test(normalized) ||
    /^pertanyaan(?:\s+\d+)?\s*[:：]?$/i.test(normalized)
  );
}

function looksLikePromptHeader(line: string): boolean {
  return /^(pertanyaan|soal|question)\s*[:：]\s*(.+)$/i.test(line);
}

function looksLikeTypeHeader(line: string): boolean {
  return /^(tipe|type)\s*[:：]\s*(.+)$/i.test(line);
}

function groupQuestionBlocksWithoutMarker(lines: string[]): string[][] {
  const sanitized = lines.map((line) => normalizeText(line).trim()).filter(Boolean);
  const groups: string[][] = [];
  let current: string[] = [];
  let hasPromptInCurrent = false;

  for (const line of sanitized) {
    const isPrompt = looksLikePromptHeader(line);
    const isType = looksLikeTypeHeader(line);

    if (isPrompt && current.length > 0 && hasPromptInCurrent) {
      groups.push(current);
      current = [];
      hasPromptInCurrent = false;
    } else if (isType && current.length > 0 && hasPromptInCurrent) {
      groups.push(current);
      current = [];
      hasPromptInCurrent = false;
    }

    current.push(line);
    if (isPrompt) hasPromptInCurrent = true;
  }

  if (current.length > 0 && hasPromptInCurrent) {
    groups.push(current);
  }

  return groups;
}

function groupQuestionBlocks(lines: string[]): string[][] {
  const sanitized = lines.map((line) => normalizeText(line).trim());
  const groups: string[][] = [];
  let current: string[] | null = null;

  for (const rawLine of sanitized) {
    if (!rawLine) continue;
    const line = rawLine.trim();
    if (isQuestionMarker(line)) {
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

  if (groups.length > 0) return groups;

  // Fallback untuk dokumen yang kehilangan marker, tapi masih punya pola "Pertanyaan:"
  return groupQuestionBlocksWithoutMarker(lines);
}

function resolveQuestionGroups(lines: string[]): string[][] {
  const groups = groupQuestionBlocks(lines);
  if (groups.length > 0) return groups;

  const hasPromptHeader = lines.some((line) => looksLikePromptHeader(normalizeText(line).trim()));
  const hasTypeHeader = lines.some((line) => looksLikeTypeHeader(normalizeText(line).trim()));

  if (hasPromptHeader || hasTypeHeader) {
    throw new Error(
      "Format dokumen terdeteksi, tapi struktur blok pertanyaan belum valid. Pastikan setiap soal dimulai dengan [PERTANYAAN] atau baris 'Pertanyaan:'."
    );
  }

  throw new Error("Tidak menemukan blok [PERTANYAAN] di dokumen.");
}

function parseMcqOptionLine(line: string): { text: string; correct: boolean } | null {
  const variants = [line, line.replace(LIST_PREFIX_RE, "").trim()];
  for (const variantRaw of variants) {
    const variant = normalizeText(variantRaw).trim();
    if (!variant) continue;

    const checkbox = variant.match(/^\[\s*([xX*✓✔✅☑☒])?\s*]\s*(.+)$/);
    if (checkbox) {
      const [, marker, text] = checkbox;
      return { text: text.trim(), correct: Boolean(marker) };
    }

    const parenthesis = variant.match(/^\(\s*(x|X|✓|✔|✅|☑|☒|benar|salah)\s*\)\s*(.+)$/i);
    if (parenthesis) {
      const [, state, text] = parenthesis;
      const isTrue = ["x", "✓", "✔", "✅", "☑", "☒", "benar"].includes(state.toLowerCase());
      return { text: text.trim(), correct: isTrue };
    }

    const literal = variant.match(/^(✓|✔|✅|☑|☒)\s*(.+)$/);
    if (literal) {
      const [, , text] = literal;
      return { text: text.trim(), correct: true };
    }

    const statePrefix = variant.match(/^(benar|salah)\s*[:\-]\s*(.+)$/i);
    if (statePrefix) {
      const [, state, text] = statePrefix;
      return { text: text.trim(), correct: state.toLowerCase() === "benar" };
    }
  }

  const fallback = normalizeText(line).replace(LIST_PREFIX_RE, "").trim();
  return fallback ? { text: fallback, correct: false } : null;
}

function parseAnswerKeyIndices(rawValue: string): number[] {
  const tokens = rawValue
    .split(/[,;/]|(?:\s+dan\s+)|(?:\s+and\s+)/i)
    .map((value) => value.trim())
    .filter(Boolean);

  const indices = new Set<number>();
  for (const token of tokens) {
    if (/^\d+$/.test(token)) {
      const idx = Number.parseInt(token, 10) - 1;
      if (Number.isFinite(idx) && idx >= 0) indices.add(idx);
      continue;
    }
    if (/^[A-Za-z]$/.test(token)) {
      const idx = token.toUpperCase().charCodeAt(0) - 65;
      if (idx >= 0) indices.add(idx);
    }
  }
  return Array.from(indices.values());
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
  const groups = resolveQuestionGroups(lines);

  return groups.map((group, idx) => {
    let type: "mcq" | "text" = "mcq";
    let prompt = "";
    const options: { text: string; correct: boolean }[] = [];
    const answerKeyIndices = new Set<number>();
    let readingOptions = false;

    for (const row of group) {
      const line = normalizeText(row).trim();
      if (!line) continue;

      const typeMatch = line.match(/^(tipe|type)\s*[:：]\s*(.+)$/i);
      if (typeMatch) {
        const value = typeMatch[2].trim().toLowerCase();
        if (["text", "essay", "jawaban singkat", "short answer", "isian", "isian singkat"].includes(value)) {
          type = "text";
        } else {
          type = "mcq";
        }
        readingOptions = false;
        continue;
      }

      const promptMatch = line.match(/^(pertanyaan|soal|question)\s*[:：]\s*(.+)$/i);
      if (promptMatch) {
        prompt = promptMatch[2].trim();
        readingOptions = false;
        continue;
      }

      if (/^(opsi|pilihan|options?)\s*[:：]?$/i.test(line)) {
        readingOptions = true;
        continue;
      }

      const answerMatch = line.match(/^(jawaban|kunci|answer)\s*[:：]\s*(.+)$/i);
      if (answerMatch) {
        for (const answerIdx of parseAnswerKeyIndices(answerMatch[2])) {
          answerKeyIndices.add(answerIdx);
        }
        continue;
      }

      if (readingOptions) {
        const parsedOption = parseMcqOptionLine(line);
        if (parsedOption) options.push(parsedOption);
        continue;
      }

      if (prompt) {
        prompt = `${prompt} ${line}`.trim();
      }
    }

    if (!prompt) {
      throw new Error(`Pertanyaan ${idx + 1} belum memiliki teks pada baris 'Pertanyaan:'.`);
    }

    if (type === "mcq") {
      if (!options.some((option) => option.correct) && answerKeyIndices.size > 0) {
        answerKeyIndices.forEach((answerIdx) => {
          if (answerIdx >= 0 && answerIdx < options.length) {
            options[answerIdx].correct = true;
          }
        });
      }

      if (options.length < 2) {
        throw new Error(`Pertanyaan ${idx + 1} membutuhkan minimal 2 opsi.`);
      }
      if (!options.some((option) => option.correct)) {
        throw new Error(`Pertanyaan ${idx + 1} belum menandai jawaban benar (gunakan [x] atau baris 'Jawaban:').`);
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
