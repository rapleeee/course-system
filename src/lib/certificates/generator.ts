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
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margins: { top: 60, bottom: 60, left: 70, right: 70 },
    });

    const buffers: Buffer[] = [];
    doc.on("data", (chunk) => buffers.push(Buffer.from(chunk)));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(buffers)));

    const primary = "#1B3C53";
    const accent = "#D49A6A";
    const text = "#1F2937";
    const muted = "#6B7280";

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = 50;
    const contentWidth = pageWidth - margin * 2;

    doc.rect(0, 0, pageWidth, pageHeight).fill("#F8FAFC");
    doc.rect(margin, margin, contentWidth, pageHeight - margin * 2).fill("white");
    doc.strokeColor("#E2E8F0").lineWidth(2).rect(margin, margin, contentWidth, pageHeight - margin * 2).stroke();

    const drawShape = (callback: () => void) => {
      doc.save();
      callback();
      doc.restore();
    };

    drawShape(() => {
      doc.fillColor(primary).opacity(0.08);
      doc.roundedRect(margin + 20, margin + 20, contentWidth - 40, 80, 18).fill();
    });

    drawShape(() => {
      doc.fillColor(accent).opacity(0.06);
      doc.circle(pageWidth - margin - 80, margin + 70, 60).fill();
    });

    drawShape(() => {
      doc.fillColor("#0EA5E9").opacity(0.04);
      doc.polygon(
        [margin + 10, pageHeight - margin - 120],
        [margin + 150, pageHeight - margin - 40],
        [margin + 10, pageHeight - margin - 40]
      ).fill();
    });

    let cursorY = margin + 60;
    const centerLine = (value: string, font: string, size: number, color: string, gap = 18) => {
      doc.fillColor(color)
        .font(font)
        .fontSize(size)
        .text(value, margin, cursorY, { width: contentWidth, align: "center" });
      cursorY = doc.y + gap;
    };

    centerLine("Sertifikat Pencapaian", "Helvetica-Bold", 32, primary, 12);
    centerLine(
      payload.backgroundTagline || "belajar.",
      "Helvetica",
      12,
      muted,
      30
    );
    centerLine("Diberikan kepada", "Helvetica", 13, muted, 10);
    centerLine(payload.studentName, "Helvetica-Bold", 28, text, 12);
    centerLine("atas keberhasilan menyelesaikan", "Helvetica", 12, muted, 10);
    centerLine(payload.courseTitle, "Helvetica-Bold", 20, accent, 28);

    const infoY = cursorY + 10;
    const infoLeft = margin + 50;
    const infoRight = pageWidth - margin - 50;

    doc.moveTo(infoLeft, infoY).lineTo(infoRight, infoY).strokeColor("#E5E7EB").lineWidth(1).stroke();

    const infoText = (label: string, value: string, x: number, y: number, width: number) => {
      doc.fillColor(muted).font("Helvetica").fontSize(11).text(`${label}: ${value}`, x, y, { width });
    };

    infoText("Nomor Sertifikat", payload.certificateNumber, infoLeft, infoY + 16, contentWidth / 2 - 60);
    infoText("Kode Verifikasi", payload.verificationCode, margin + contentWidth / 2, infoY + 16, contentWidth / 2 - 60);
    infoText("Diterbitkan", payload.issuedDateText, infoLeft, infoY + 34, contentWidth / 2 - 60);

    cursorY = infoY + 70;
    const achievements = (payload.achievements ?? []).filter(Boolean).slice(0, 3);
    if (achievements.length > 0) {
      doc.fillColor(text).font("Helvetica-Bold").fontSize(12).text("Poin Pencapaian:", infoLeft, cursorY);
      cursorY = doc.y + 6;
      doc.fillColor(muted).font("Helvetica").fontSize(11);
      achievements.forEach((item) => {
        doc.text(`• ${item}`, infoLeft, cursorY, { width: contentWidth - 100 });
        cursorY = doc.y + 4;
      });
    }

    const footerBaseline = pageHeight - margin - 36;
    const qrSize = 110;
    const qrX = pageWidth - margin - qrSize - 10;
    const qrY = footerBaseline - qrSize - 16;
    doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });
    doc.fillColor(muted).fontSize(9).text("Scan untuk verifikasi", qrX, qrY - 12, {
      width: qrSize,
      align: "center",
    });

    doc.fillColor(muted)
      .fontSize(9)
      .text("Validasi sertifikat di:", margin + 30, footerBaseline);
    doc.fillColor(accent)
      .font("Helvetica-Bold")
      .text(verificationUrl, margin + 170, footerBaseline);

    if (payload.issuerName) {
      const sigWidth = 220;
      const sigX = pageWidth - margin - sigWidth - 10;
      const sigY = footerBaseline - 12;

      doc.moveTo(sigX, sigY).lineTo(sigX + sigWidth, sigY).strokeColor("#CBD5F5").lineWidth(1).stroke();
      doc.fillColor(text).font("Helvetica-Bold").fontSize(12).text(payload.issuerName, sigX, sigY + 6, {
        width: sigWidth,
        align: "center",
      });
      if (payload.issuerRole) {
        doc.fillColor(muted).font("Helvetica").fontSize(10).text(payload.issuerRole, sigX, sigY + 26, {
          width: sigWidth,
          align: "center",
        });
      }
    }

    doc.end();
  });
}
