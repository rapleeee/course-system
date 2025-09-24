import { NextResponse } from "next/server";
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            heading: HeadingLevel.TITLE,
            children: [new TextRun({ text: "Template Import Tugas & Kuis", bold: true })],
          }),
          new Paragraph(
            "Ikuti format ini untuk setiap pertanyaan. Simpan file dalam format .docx sebelum diunggah."
          ),
          new Paragraph("Ketik '[PERTANYAAN]' untuk memulai blok pertanyaan baru."),
          new Paragraph(
            "Gunakan 'mcq' untuk pilihan ganda atau 'text' untuk jawaban singkat pada baris 'Tipe'."
          ),
          new Paragraph(
            "Tandai opsi jawaban benar dengan '[x]' dan kosongkan tanda kurung untuk opsi salah."
          ),
          new Paragraph(""),
          ...[
            "[PERTANYAAN]",
            "Tipe: mcq",
            "Pertanyaan: Apa ibu kota Indonesia?",
            "Opsi:",
            "- [x] Jakarta",
            "- [ ] Bandung",
            "- [ ] Surabaya",
            "",
            "[PERTANYAAN]",
            "Tipe: text",
            "Pertanyaan: Tuliskan pengalaman belajar yang paling berkesan.",
            "Opsi:",
            "- [ ] (Tidak perlu diisi untuk tipe text)",
          ].map((line) => new Paragraph(line)),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": "attachment; filename=template-import-assignments.docx",
    },
  });
}
