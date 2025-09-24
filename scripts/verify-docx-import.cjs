require("ts-node/register/transpile-only");

const { Document, Packer, Paragraph, TextRun } = require("docx");
const { parseDocxFile } = require("../src/lib/assignments/docx-import");

async function buildSampleDoc() {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ children: [new TextRun({ text: "[PERTANYAAN]", bold: true })] }),
          new Paragraph("Tipe: mcq"),
          new Paragraph("Pertanyaan: Ibu kota Indonesia?"),
          new Paragraph("Opsi:"),
          new Paragraph("- [x] Jakarta"),
          new Paragraph("- [ ] Surabaya"),
          new Paragraph("- [ ] Bandung"),
          new Paragraph(""),
          new Paragraph({ children: [new TextRun({ text: "[PERTANYAAN]", bold: true })] }),
          new Paragraph("Tipe: text"),
          new Paragraph("Pertanyaan: Ceritakan pengalaman belajar terbaik Anda."),
          new Paragraph("Opsi:"),
          new Paragraph("- [ ] (Tidak perlu diisi untuk tipe text)"),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}

async function main() {
  const buffer = await buildSampleDoc();
  const fileLike = {
    name: "sample.docx",
    async arrayBuffer() {
      return buffer;
    },
  };

  const parsed = await parseDocxFile(fileLike);
  console.log(`Berhasil parsing ${parsed.length} pertanyaan dari template sampel.`);
  parsed.forEach((question, idx) => {
    console.log(`Pertanyaan ${idx + 1}:`, question);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
