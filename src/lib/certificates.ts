import type { FieldValue, Timestamp } from "firebase/firestore";

export type CertificateStatus = "draft" | "issued" | "revoked";

export type CertificateDoc = {
  userId: string;
  courseId: string;
  studentName: string;
  studentEmail?: string;
  courseTitle: string;
  courseIdAlias?: string;
  status: CertificateStatus;
  issuedAt?: Timestamp | FieldValue;
  issuedBy?: string;
  updatedAt?: Timestamp | FieldValue;
  certificateNumber: string;
  verificationCode: string;
  storageUrl?: string;
  notes?: string;
  templateId?: string;
  revokedAt?: Timestamp | FieldValue;
  revokedBy?: string;
};

export type CertificateRecord = CertificateDoc & { id: string };

export function generateCertificateNumber(courseId: string, userId: string) {
  const now = new Date();
  const day = String(now.getUTCDate()).padStart(2, "0");
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const year = now.getUTCFullYear();
  const suffix = userId.slice(-4).toUpperCase();
  const coursePart = courseId.replace(/[^A-Za-z0-9]/g, "").slice(0, 4).toUpperCase();
  return `${coursePart || "CRS"}-${year}${month}${day}-${suffix}`;
}

export function createVerificationCode(courseId: string, userId: string) {
  const courseSegment = courseId.replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase() || "CRS";
  const userSegment = userId.replace(/[^A-Za-z0-9]/g, "").slice(-3).toUpperCase() || "USR";
  const randomSegment = Math.random().toString(36).slice(2, 8).toUpperCase();
  const timestampSegment = Date.now().toString(36).slice(-4).toUpperCase();
  return `${courseSegment}${userSegment}-${randomSegment}${timestampSegment}`;
}
