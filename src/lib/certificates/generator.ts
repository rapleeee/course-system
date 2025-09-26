import PDFDocument from "pdfkit";
import QRCode from "qrcode";

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
  const verificationUrl = `${payload.verificationBaseUrl.replace(/\/$/, "")}/${payload.verificationCode}`;
  const qrBuffer = await QRCode.toBuffer(verificationUrl, { type: "png", scale: 6, margin: 1 });

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", layout: "landscape", margins: { top: 60, bottom: 60, left: 70, right: 70 } });
    const buffers: Buffer[] = [];
    doc.on("data", (chunk) => buffers.push(Buffer.from(chunk)));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(buffers)));

    const brandColor = "#0d3b66";
    const accentColor = "#f4a261";
    const textColor = "#14213d";
    const subtleText = "#475569";

    const panelWidth = 190;
    const panelX = doc.page.margins.left - 50;
    const panelY = doc.page.margins.top - 30;
    const panelHeight = doc.page.height - doc.page.margins.top - doc.page.margins.bottom + 60;

    doc.save();
    doc.rect(panelX, panelY, panelWidth, panelHeight).fill(brandColor);
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(24).text("MENTORAXPESAT", panelX + 24, doc.page.height - doc.page.margins.bottom - 54, {
      width: panelWidth - 40,
    });
    doc.restore();

    const contentX = panelX + panelWidth + 36;
    const contentWidth = doc.page.width - contentX - doc.page.margins.right;
    let y = doc.page.height - doc.page.margins.top;

    doc.fillColor(textColor).font("Helvetica-Bold").fontSize(30).text("SERTIFIKAT PENGHARGAAN", contentX, y, { width: contentWidth });
    y -= 36;

    const tagline = payload.backgroundTagline || "Mentoraxpesat memberikan apresiasi atas dedikasi dan konsistensi belajar.";
    doc.font("Helvetica").fontSize(12).fillColor(subtleText).text(tagline, contentX, y, { width: contentWidth });
    y -= 48;

    doc.fontSize(11).fillColor(subtleText).text("Diberikan kepada", contentX, y);
    y -= 20;
    doc.font("Helvetica-Bold").fontSize(32).fillColor(textColor).text(payload.studentName, contentX, y, { width: contentWidth });
    y -= 40;

    doc.font("Helvetica").fontSize(14).fillColor(subtleText).text("atas keberhasilannya menyelesaikan", contentX, y);
    doc.font("Helvetica-Bold").fontSize(20).fillColor(accentColor).text(payload.courseTitle, contentX + 200, y);
    y -= 52;

    doc.font("Helvetica").fontSize(11).fillColor(subtleText).text("Nomor Sertifikat", contentX, y);
    doc.font("Helvetica-Bold").fontSize(13).fillColor(textColor).text(payload.certificateNumber, contentX, y - 18);

    doc.font("Helvetica").fillColor(subtleText).text("Kode Verifikasi", contentX + 220, y);
    doc.font("Helvetica-Bold").fillColor(textColor).text(payload.verificationCode, contentX + 220, y - 18);

    doc.font("Helvetica").fillColor(subtleText).text(`Diterbitkan: ${payload.issuedDateText}`, contentX + 420, y);
    y -= 60;

    const achievements = payload.achievements?.length ? payload.achievements : [];
    if (achievements.length > 0) {
      doc.font("Helvetica-Bold").fontSize(12).fillColor(textColor).text("Poin Pencapaian", contentX, y);
      y -= 18;
      doc.font("Helvetica").fontSize(10).fillColor(subtleText);
      achievements.slice(0, 4).forEach((achievement) => {
        doc.text(`• ${achievement}`, contentX, y, { width: contentWidth });
        y -= 16;
      });
      y -= 12;
    }

    const qrSize = 100;
    const qrX = doc.page.width - doc.page.margins.right - qrSize;
    const qrY = doc.page.height - doc.page.margins.top - qrSize - 20;
    doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });
    doc.font("Helvetica").fontSize(8).fillColor(subtleText).text("Scan untuk verifikasi", qrX, qrY - 12, {
      width: qrSize,
      align: "center",
    });

    if (payload.issuerName) {
      const sigY = doc.page.margins.bottom + 80;
      const sigWidth = 220;
      const sigX = contentX;

      doc
        .moveTo(sigX, sigY)
        .lineTo(sigX + sigWidth, sigY)
        .strokeColor(subtleText)
        .lineWidth(1)
        .stroke();
      doc.font("Helvetica-Bold").fontSize(12).fillColor(textColor).text(payload.issuerName, sigX, sigY - 14);
      if (payload.issuerRole) {
        doc.font("Helvetica").fontSize(10).fillColor(subtleText).text(payload.issuerRole, sigX, sigY - 30);
      }
    }

    doc.font("Helvetica").fontSize(9).fillColor(subtleText).text("Validasi sertifikat di:", contentX, doc.page.margins.bottom - 10);
    doc.font("Helvetica-Bold").fillColor(accentColor).text(verificationUrl, contentX + 120, doc.page.margins.bottom - 10);

    doc.end();
  });
}
