"use client";

import { useEffect, useMemo, useState } from "react";
import { Timestamp, collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import Layout from "@/components/layout";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Link from "next/link";
import { Copy, ExternalLink, Loader2 } from "lucide-react";
import type { CertificateRecord } from "@/lib/certificates";

export default function CertificatesPage() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<CertificateRecord[]>([]);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    if (!user) {
      setItems([]);
      setPending(false);
      return;
    }

    const certificatesQuery = query(
      collection(db, "certificates"),
      where("userId", "==", user.uid),
      orderBy("issuedAt", "desc")
    );

    const unsubscribe = onSnapshot(certificatesQuery, (snap) => {
      const rows = snap.docs.map((docSnap) => {
        const data = docSnap.data() as CertificateRecord;
        return { ...data, id: docSnap.id } as CertificateRecord;
      });
      setItems(rows);
      setPending(false);
    });

    return () => unsubscribe();
  }, [user]);

  const issuedCertificates = useMemo(() => items.filter((item) => item.status === "issued"), [items]);

  if (loading || pending) {
    return (
      <Layout pageTitle="Sertifikat">
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout pageTitle="Sertifikat">
        <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center space-y-3 text-center">
          <p className="text-sm text-muted-foreground">Kamu perlu login untuk melihat sertifikat.</p>
          <Link href="/auth/login" className="text-sm font-medium text-primary hover:underline">
            Masuk sekarang
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout pageTitle="Sertifikat">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold">Sertifikat Kamu</h1>
          <p className="text-sm text-muted-foreground">
            Simpan dan bagikan sertifikat penyelesaian kelas. Gunakan kode verifikasi untuk membuktikan keabsahan kepada pihak ketiga.
          </p>
          <div className="rounded-lg border border-dashed bg-muted/40 p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Bagaimana sertifikat diterbitkan?</p>
            <ul className="mt-2 space-y-1 list-disc pl-4">
              <li>Pastikan sudah berlangganan</li>
              <li>Selesaikan seluruh chapter di kelas yang diikuti hingga progres mencapai 100%.</li>
              <li>Tim akademik akan meninjau progresmu, lalu menerbitkan sertifikat secara manual.</li>
              <li>Kamu akan menerima notifikasi ketika sertifikat tersedia dan bisa langsung mengunduhnya di halaman ini.</li>
            </ul>
          </div>
        </header>

        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-background p-8 text-center text-sm text-muted-foreground">
            Belum ada sertifikat yang diterbitkan. Selesaikan kelas untuk mendapat pengakuan resmi.
          </div>
        ) : (
          <div className="space-y-6">
            {issuedCertificates.length === 0 ? (
              <div className="rounded-lg border border-dashed bg-background p-6 text-sm text-muted-foreground">
                Belum ada sertifikat aktif. Jika kamu baru saja menyelesaikan kelas, tunggu admin menerbitkannya.
              </div>
            ) : null}

            <div className="grid gap-6 md:grid-cols-2">
              {items.map((cert) => (
                <article key={cert.id} className="flex h-full flex-col justify-between rounded-lg border bg-card shadow-sm">
                  <div className="space-y-4 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-semibold leading-tight">{cert.courseTitle}</h2>
                        <p className="text-xs text-muted-foreground">Kode kelas: {cert.courseId}</p>
                      </div>
                      <Badge variant={cert.status === "issued" ? "default" : "outline"}>
                        {cert.status === "issued" ? "Aktif" : cert.status === "revoked" ? "Dicabut" : "Draft"}
                      </Badge>
                    </div>
                    <div className="rounded-md bg-muted/50 p-3 text-xs font-mono text-muted-foreground">
                      <div className="font-semibold text-foreground">No Sertifikat: {cert.certificateNumber}</div>
                      <div className="flex items-center justify-between gap-2 pt-2">
                        <span>Kode verifikasi: {cert.verificationCode}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => copyToClipboard(cert.verificationCode)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Verifikasikan melalui halaman publik berikut. Bagikan link ini kepada perekrut atau mitra.
                    </p>
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <Link
                        href={`/certificate/verify/${cert.verificationCode}`}
                        className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                      >
                        Buka halaman verifikasi <ExternalLink className="h-3 w-3" />
                      </Link>
                      {cert.storageUrl ? (
                        <Link
                          href={cert.storageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          Unduh PDF <ExternalLink className="h-3 w-3" />
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">File PDF belum tersedia</span>
                      )}
                    </div>
                  </div>
                  <footer className="border-t p-4 text-xs text-muted-foreground">
                    {(() => {
                      const issuedDate = toDateOrNull(cert.issuedAt);
                      return `Terbit: ${issuedDate ? formatDate(issuedDate) : "Menunggu admin"}`;
                    })()}
                  </footer>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

async function copyToClipboard(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success("Kode disalin");
  } catch (err) {
    console.error("Failed to copy", err);
    toast.error("Browser memblokir salin kode");
  }
}

function formatDate(date?: Date) {
  if (!date) return "";
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function toDateOrNull(value: CertificateRecord["issuedAt"]) {
  return value instanceof Timestamp ? value.toDate() : null;
}
