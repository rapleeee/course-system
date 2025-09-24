"use client";

import { use, useEffect, useState } from "react";
import { Timestamp, collection, getDocs, limit, query, where } from "firebase/firestore";
import Layout from "@/components/layout";
import { db } from "@/lib/firebase";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, HelpCircle, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import type { CertificateRecord } from "@/lib/certificates";

export default function CertificateVerifyPage({ params }: { params: Promise<{ code: string }> }) {
  const resolvedParams = use(params);
  const codeParam = decodeURIComponent(resolvedParams.code).trim().toUpperCase();
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "not-found" }
    | { status: "revoked"; certificate: CertificateRecord }
    | { status: "issued"; certificate: CertificateRecord }
  >({ status: "loading" });
  const searchParams = useSearchParams();
  const autofill = searchParams?.get("auto") === "1";

  useEffect(() => {
    const load = async () => {
      if (!codeParam) {
        setState({ status: "not-found" });
        return;
      }
      try {
        const certificatesQuery = query(
          collection(db, "certificates"),
          where("verificationCode", "==", codeParam),
          limit(1)
        );
        const snap = await getDocs(certificatesQuery);
        if (snap.empty) {
          setState({ status: "not-found" });
          return;
        }
        const docSnap = snap.docs[0];
        const data = docSnap.data() as CertificateRecord;
        const certificate = { ...data, id: docSnap.id } as CertificateRecord;
        if (certificate.status === "revoked") {
          setState({ status: "revoked", certificate });
        } else {
          setState({ status: "issued", certificate });
        }
      } catch (err) {
        console.error("Failed to verify certificate", err);
        setState({ status: "not-found" });
      }
    };

    void load();
  }, [codeParam]);

  const title = state.status === "issued" ? "Sertifikat Valid" : state.status === "revoked" ? "Sertifikat Dicabut" : "Verifikasi Sertifikat";

  return (
    <Layout pageTitle={title}>
      <section className="mx-auto max-w-3xl rounded-xl border bg-card p-8 shadow-sm">
        {state.status === "loading" ? (
          <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Memeriksa keabsahan kode {codeParam}...</p>
          </div>
        ) : state.status === "not-found" ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <HelpCircle className="h-10 w-10 text-muted-foreground" />
            <h1 className="text-xl font-semibold">Kode tidak ditemukan</h1>
            <p className="text-sm text-muted-foreground">
              Kami tidak menemukan sertifikat dengan kode {codeParam}. Pastikan kode verifikasi sesuai dengan yang tertera pada sertifikat.
            </p>
          </div>
        ) : (
          <CertificateDetails code={codeParam} state={state} autofill={autofill} />
        )}
      </section>
    </Layout>
  );
}

function CertificateDetails({
  code,
  state,
  autofill,
}: {
  code: string;
  state: { status: "issued"; certificate: CertificateRecord } | { status: "revoked"; certificate: CertificateRecord };
  autofill: boolean;
}) {
  const { status, certificate } = state;
  const issuedAt = toDateOrNull(certificate.issuedAt);
  const revokedAt = toDateOrNull(certificate.revokedAt);
  const icon = status === "issued" ? <ShieldCheck className="h-10 w-10 text-emerald-600" /> : <ShieldAlert className="h-10 w-10 text-rose-600" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-3 text-center">
        {icon}
        <div>
          <h1 className="text-2xl font-semibold">{status === "issued" ? "Sertifikat Valid" : "Sertifikat Tidak Berlaku"}</h1>
          <p className="text-sm text-muted-foreground">
            Hasil verifikasi untuk kode <span className="font-mono">{code}</span>.
          </p>
        </div>
      </div>

      <div className="rounded-lg border bg-background p-5">
        <dl className="grid gap-4 text-sm md:grid-cols-2">
          <div>
            <dt className="text-xs uppercase text-muted-foreground">Pemegang Sertifikat</dt>
            <dd className="text-base font-medium">{certificate.studentName}</dd>
            {certificate.studentEmail && <dd className="text-xs text-muted-foreground">{certificate.studentEmail}</dd>}
          </div>
          <div>
            <dt className="text-xs uppercase text-muted-foreground">Nama Program/Kelas</dt>
            <dd className="text-base font-medium">{certificate.courseTitle}</dd>
            <dd className="text-xs text-muted-foreground">Kode kelas: {certificate.courseId}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-muted-foreground">Nomor Sertifikat</dt>
            <dd className="font-mono text-sm">{certificate.certificateNumber}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-muted-foreground">Status</dt>
            <dd className={`font-medium ${status === "issued" ? "text-emerald-600" : "text-rose-600"}`}>
              {status === "issued" ? "Aktif" : "Dicabut"}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-muted-foreground">Tanggal Terbit</dt>
            <dd>{issuedAt ? formatDate(issuedAt) : "-"}</dd>
          </div>
          {status === "revoked" && (
            <div>
              <dt className="text-xs uppercase text-muted-foreground">Tanggal Pencabutan</dt>
              <dd>{revokedAt ? formatDate(revokedAt) : "-"}</dd>
            </div>
          )}
        </dl>
      </div>

      {certificate.storageUrl && status === "issued" ? (
        <div className="rounded-lg border border-dashed bg-muted/40 p-4 text-sm">
          <p className="text-muted-foreground">
            Sertifikat resmi dalam format PDF tersedia. Gunakan tombol di bawah untuk mengunduh file asli.
          </p>
          <a
            href={certificate.storageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <CheckCircle2 className="h-4 w-4" /> Unduh sertifikat
          </a>
        </div>
      ) : null}

      {autofill ? (
        <div className="rounded-md bg-emerald-50 p-3 text-xs text-emerald-700">
          Otomatis diverifikasi melalui tautan resmi. Tidak perlu tindakan lanjutan.
        </div>
      ) : null}
    </div>
  );
}

function formatDate(date: Date) {
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function toDateOrNull(value: CertificateRecord["issuedAt"]) {
  return value instanceof Timestamp ? value.toDate() : null;
}
