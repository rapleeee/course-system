import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb, adminStorage } from "@/lib/firebase-admin";
import { renderCertificatePdf } from "@/lib/certificates/generator";
import type { CertificateDoc } from "@/lib/certificates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_BUCKET = process.env.FIREBASE_STORAGE_BUCKET;
const ISSUER_NAME = process.env.CERTIFICATE_SIGNER_NAME || "Tim Akademik Mentora";
const ISSUER_ROLE = process.env.CERTIFICATE_SIGNER_ROLE || "Head of Learning";
const VERIFY_BASE_URL = process.env.CERTIFICATE_VERIFY_URL || "https://mentora.smkpesat.sch.id/certificate/verify";
const MAKE_PUBLIC = process.env.CERTIFICATE_MAKE_PUBLIC === "true";

async function assertAdmin(decoded: { uid: string; email?: string | null }) {
  const allowedEmailsEnv = process.env.CERTIFICATE_ADMIN_EMAILS;
  const allowedEmails = allowedEmailsEnv
    ? allowedEmailsEnv.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean)
    : ["admin@gmail.com"];

  if (decoded.email && allowedEmails.includes(decoded.email.toLowerCase())) {
    return;
  }

  const snap = await adminDb.collection("users").doc(decoded.uid).get();
  const role = (snap.data() as { role?: string } | undefined)?.role;
  if (role !== "guru" && role !== "admin") {
    throw new Error("Forbidden");
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!authHeader?.toLowerCase().startsWith("bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const idToken = authHeader.split(" ")[1];
    const auth = getAuth();
    const decoded = await auth.verifyIdToken(idToken);
    await assertAdmin({ uid: decoded.uid, email: decoded.email });

    const docSnap = await adminDb.collection("certificates").doc(id).get();
    if (!docSnap.exists) {
      return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
    }

    const certificate = docSnap.data() as CertificateDoc;
    if (!certificate.studentName || !certificate.courseTitle) {
      return NextResponse.json({ error: "Certificate data incomplete" }, { status: 400 });
    }

    const issuedDate =
      certificate.issuedAt && typeof (certificate.issuedAt as { toDate?: () => Date }).toDate === "function"
        ? (certificate.issuedAt as { toDate: () => Date }).toDate()
        : new Date();
    const issuedText = issuedDate.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const achievements: string[] = [];
    if (certificate.courseTitle) achievements.push(`Menyelesaikan program ${certificate.courseTitle} dengan progres 100%.`);
    achievements.push("Mengikuti evaluasi akhir dan memenuhi standar kelulusan internal.");

    const pdfBuffer = await renderCertificatePdf({
      studentName: certificate.studentName,
      courseTitle: certificate.courseTitle,
      certificateNumber: certificate.certificateNumber,
      verificationCode: certificate.verificationCode,
      issuedDateText: issuedText,
      issuerName: ISSUER_NAME,
      issuerRole: ISSUER_ROLE,
      verificationBaseUrl: VERIFY_BASE_URL,
      backgroundTagline: "MentoraxPesat memberikan apresiasi atas dedikasi dan konsistensi belajar.",
      achievements,
    });

    const bucket = DEFAULT_BUCKET ? adminStorage.bucket(DEFAULT_BUCKET) : adminStorage.bucket();
    const objectPath = `certificates/${id}.pdf`;
    const file = bucket.file(objectPath);

    await file.save(pdfBuffer, {
      resumable: false,
      contentType: "application/pdf",
      metadata: {
        cacheControl: "public, max-age=3600",
      },
    });

    let publicUrl: string | undefined;
    if (MAKE_PUBLIC) {
      await file.makePublic().catch(() => undefined);
      publicUrl = `https://storage.googleapis.com/${bucket.name}/${objectPath}`;
    } else {
      const [signedUrl] = await file.getSignedUrl({
        action: "read",
        expires: "2124-01-01",
      });
      publicUrl = signedUrl;
    }

    await adminDb.collection("certificates").doc(id).set(
      {
        storageUrl: publicUrl,
        updatedAt: Timestamp.now(),
      },
      { merge: true }
    );

    await adminDb
      .collection("users")
      .doc(certificate.userId)
      .collection("notifications")
      .add({
        type: "certificate",
        title: "Sertifikat siap diunduh",
        message: `Sertifikat untuk ${certificate.courseTitle} telah diterbitkan.`,
        createdAt: Timestamp.now(),
        read: false,
        data: {
          certificateId: id,
          courseId: certificate.courseId,
          verificationCode: certificate.verificationCode,
        },
      })
      .catch(() => undefined);

    return NextResponse.json({ ok: true, url: publicUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
