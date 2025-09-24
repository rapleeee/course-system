import PDFDocument from "pdfkit";

export type CertificatePdfPayload = {
  studentName: string;
  courseTitle: string;
  certificateNumber: string;
  verificationCode: string;
  issuedDateText: string;
  issuerName?: string;
  issuerRole?: string;
  verificationBaseUrl: string;
  backgroundTagline?: string;
  achievements?: string[];
};

export async function renderCertificatePdf(payload: CertificatePdfPayload): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margins: { top: 40, bottom: 40, left: 50, right: 50 },
    });
    const chunks: Uint8Array[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("error", reject);
    doc.on("end", () => {
      const buffer = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
      resolve(buffer);
    });

    const brandColor = "#0d3b66";
    const accentColor = "#f4a261";
    const deepNavy = "#14213d";
    const softSlate = "#475569";

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const contentStartX = doc.page.margins.left;
    const usableHeight = pageHeight - doc.page.margins.top - doc.page.margins.bottom;

    const gradient = doc.linearGradient(0, 0, pageWidth, pageHeight);
    gradient.stop(0, "#f6f7fb");
    gradient.stop(1, "#dbeafe");
    doc.rect(0, 0, pageWidth, pageHeight).fill(gradient);

    doc.lineWidth(4)
      .strokeColor(accentColor)
      .roundedRect(18, 18, pageWidth - 36, pageHeight - 36, 18)
      .stroke();

    const bandWidth = 220;
    const bandX = contentStartX - 15;
    const bandY = doc.page.margins.top - 15;
    const bandHeight = usableHeight + 30;
    const bandGradient = doc.linearGradient(bandX, 0, bandX + bandWidth, 0);
    bandGradient.stop(0, "#0d3b66");
    bandGradient.stop(1, "#14497f");
    doc.rect(bandX, bandY, bandWidth, bandHeight).fill(bandGradient);

    doc.save();
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(24)
      .text("MENTORA", bandX + 30, bandY + 44);
    doc.font("Helvetica").fontSize(10).fillColor("#cbd5f5")
      .text("Course System", bandX + 30, bandY + 76);
    doc.fillOpacity(0.12)
      .circle(bandX + bandWidth / 2, bandY + bandHeight - 120, 92)
      .fill("#ffffff");
    doc.restore();

    const contentX = bandX + bandWidth + 30;
    const contentWidth = pageWidth - contentX - doc.page.margins.right;

    doc.fillColor(brandColor).font("Helvetica-Bold").fontSize(30)
      .text("SERTIFIKAT PENGHARGAAN", contentX, doc.page.margins.top, {
        width: contentWidth,
      });

    doc.moveDown(0.6);
    doc.fontSize(12).font("Helvetica").fillColor(softSlate)
      .text(
        payload.backgroundTagline ||
          "Mentora Course System menyatakan bahwa partisipan berikut telah menuntaskan seluruh tahapan pembelajaran dengan hasil yang sangat baik.",
        {
          width: contentWidth,
        }
      );

    const highlightY = doc.y + 14;
    doc.save();
    doc.rect(contentX, highlightY, contentWidth, 110)
      .fillOpacity(0.08)
      .fill(brandColor)
      .restore();

    doc.font("Helvetica").fontSize(11).fillColor(softSlate)
      .text("Diberikan kepada", contentX + 24, highlightY + 18);

    doc.font("Helvetica-Bold").fontSize(36).fillColor(deepNavy)
      .text(payload.studentName, contentX + 24, highlightY + 40, {
        width: contentWidth - 48,
      });

    doc.font("Helvetica").fontSize(14).fillColor(softSlate)
      .text("atas keberhasilannya menyelesaikan", contentX + 24, highlightY + 90);

    doc.font("Helvetica-Bold").fontSize(26).fillColor(brandColor)
      .text(payload.courseTitle, contentX + 260, highlightY + 82, {
        width: contentWidth - 284,
      });

    const detailsTop = highlightY + 150;
    doc.fontSize(11).font("Helvetica").fillColor(softSlate)
      .text("Nomor Sertifikat", contentX, detailsTop)
      .font("Helvetica-Bold").fillColor(deepNavy)
      .text(payload.certificateNumber, contentX, detailsTop + 16);

    doc.font("Helvetica").fillColor(softSlate)
      .text("Kode Verifikasi", contentX + 220, detailsTop)
      .font("Helvetica-Bold").fillColor(deepNavy)
      .text(payload.verificationCode, contentX + 220, detailsTop + 16);

    doc.font("Helvetica").fillColor(softSlate)
      .text("Diterbitkan", contentX + 440, detailsTop)
      .font("Helvetica-Bold").fillColor(deepNavy)
      .text(payload.issuedDateText, contentX + 440, detailsTop + 16);

    const achievements = payload.achievements?.length
      ? payload.achievements
      : [
          "Menuntaskan seluruh modul pembelajaran dan evaluasi akhir.",
          "Menunjukkan pemahaman materi melalui tugas dan refleksi.",
          "Menjaga konsistensi dan partisipasi aktif selama program.",
        ];

    const achievementY = detailsTop + 60;
    doc.font("Helvetica-Bold").fontSize(12).fillColor(deepNavy)
      .text("Sorotan Pencapaian", contentX, achievementY);

    doc.font("Helvetica").fontSize(10).fillColor(softSlate);
    achievements.forEach((achievement, index) => {
      doc.text(`• ${achievement}`, contentX, achievementY + 20 + index * 16, {
        width: contentWidth - 48,
      });
    });

    if (payload.issuerName) {
      const signatureY = pageHeight - doc.page.margins.bottom - 110;
      const sigWidth = 200;
      doc.lineWidth(1)
        .strokeColor(brandColor)
        .moveTo(contentX, signatureY)
        .lineTo(contentX + sigWidth, signatureY)
        .stroke();

      doc.font("Helvetica-Bold").fontSize(12).fillColor(deepNavy)
        .text(payload.issuerName, contentX, signatureY + 8, {
          width: sigWidth,
        });
      if (payload.issuerRole) {
        doc.font("Helvetica").fontSize(10).fillColor(softSlate)
          .text(payload.issuerRole, contentX, signatureY + 26, {
            width: sigWidth,
          });
      }

      doc.font("Helvetica").fontSize(10).fillColor(softSlate)
        .text(
          "Dokumen ini berlaku sebagai pengakuan kompetensi dan dapat diverifikasi secara digital.",
          contentX + sigWidth + 48,
          signatureY - 4,
          {
            width: contentWidth - sigWidth - 80,
          }
        );
    }

    const verificationUrl = `${payload.verificationBaseUrl.replace(/\/$/, "")}/${payload.verificationCode}`;
    const footerY = pageHeight - doc.page.margins.bottom - 26;
    doc.font("Helvetica").fontSize(9).fillColor(softSlate)
      .text("Validasi sertifikat di:", contentX, footerY, { continued: true });
    doc.font("Helvetica-Bold").fillColor(accentColor)
      .text(verificationUrl, { continued: false });

    doc.end();
  });
}
