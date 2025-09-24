"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addDoc,
  collection,
  collectionGroup,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  Timestamp,
} from "firebase/firestore";
import { useAuth } from "@/lib/useAuth";
import AdminLayout from "@/components/layouts/AdminLayout";
import { auth, db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Award, RefreshCcw, ShieldCheck, ShieldOff } from "lucide-react";
import {
  createVerificationCode,
  generateCertificateNumber,
  type CertificateDoc,
  type CertificateRecord,
} from "@/lib/certificates";

const STATUS_COLOR: Record<CertificateDoc["status"], string> = {
  draft: "bg-amber-100 text-amber-800 border border-amber-200",
  issued: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  revoked: "bg-rose-100 text-rose-800 border border-rose-200",
};

const STATUS_LABEL: Record<CertificateDoc["status"], string> = {
  draft: "Draft",
  issued: "Terbit",
  revoked: "Dicabut",
};

type ProgressDoc = {
  completedChapterIds?: string[];
  courseTitle?: string;
  courseImageUrl?: string;
};

type CourseInfo = {
  title: string;
  totalChapters: number;
};

type UserInfo = {
  name: string;
  email?: string;
};

type EligibleCandidate = {
  progressId: string;
  userId: string;
  courseId: string;
  completed: number;
  total: number;
  studentName: string;
  studentEmail?: string;
  courseTitle: string;
  courseImageUrl?: string;
};

export default function AdminCertificatesPage() {
  const { user } = useAuth();
  const [loadingEligible, setLoadingEligible] = useState(true);
  const [fetchingEligible, setFetchingEligible] = useState(false);
  const [eligible, setEligible] = useState<EligibleCandidate[]>([]);
  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<CertificateDoc["status"] | "all">("all");
  const courseCacheRef = useRef(new Map<string, CourseInfo>());
  const userCacheRef = useRef(new Map<string, UserInfo>());
  const [backfilling, setBackfilling] = useState(false);

  useEffect(() => {
    const certificatesQuery = query(collection(db, "certificates"));
    const unsubCertificates = onSnapshot(certificatesQuery, (snap) => {
      const items: CertificateRecord[] = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as CertificateDoc),
      }));
      setCertificates(items);
    });

    return () => {
      unsubCertificates();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const progressQuery = query(collectionGroup(db, "progress"));
    setLoadingEligible(true);

    const unsubscribe = onSnapshot(progressQuery, async (snap) => {
      setFetchingEligible(true);
      try {
        const tasks = snap.docs.map(async (docSnap) => {
          const segments = docSnap.ref.path.split("/");
          if (segments.length < 4) return null;
          const userId = segments[1];
          const courseId = segments[3];
          const data = docSnap.data() as ProgressDoc;
          const completed = data.completedChapterIds?.length || 0;

          const courseInfo = await getCourseInfo(courseId, courseCacheRef.current);
          if (!courseInfo || courseInfo.totalChapters === 0) return null;

          const userInfo = await getUserInfo(userId, userCacheRef.current);
          if (!userInfo) return null;

          const eligibleForCertificate = completed >= courseInfo.totalChapters;
          if (!eligibleForCertificate) return null;

          return {
            progressId: docSnap.id,
            userId,
            courseId,
            completed,
            total: courseInfo.totalChapters,
            studentName: userInfo.name,
            studentEmail: userInfo.email,
            courseTitle: data.courseTitle || courseInfo.title,
            courseImageUrl: data.courseImageUrl,
          } satisfies EligibleCandidate;
        });

        const results = (await Promise.all(tasks)).filter(Boolean) as EligibleCandidate[];
        if (!cancelled) {
          setEligible(results);
          setLoadingEligible(false);
        }
      } catch (err) {
        console.error("Failed to load eligible learners", err);
        if (!cancelled) {
          toast.error("Gagal memuat data kelulusan");
          setEligible([]);
          setLoadingEligible(false);
        }
      } finally {
        if (!cancelled) setFetchingEligible(false);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const certificateKey = (userId: string, courseId: string) => `${userId}__${courseId}`;
  const certificatesMap = useMemo(() => {
    const map = new Map<string, CertificateRecord>();
    certificates.forEach((cert) => {
      map.set(certificateKey(cert.userId, cert.courseId), cert);
    });
    return map;
  }, [certificates]);

  const filteredEligible = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return eligible
      .filter((candidate) => !certificatesMap.has(certificateKey(candidate.userId, candidate.courseId)))
      .filter((candidate) => {
        if (!term) return true;
        return (
          candidate.studentName.toLowerCase().includes(term) ||
          candidate.courseTitle.toLowerCase().includes(term) ||
          candidate.studentEmail?.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => a.studentName.localeCompare(b.studentName));
  }, [eligible, searchTerm, certificatesMap]);

  const filteredCertificates = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const getMillis = (value: CertificateRecord["issuedAt"]) =>
      value instanceof Timestamp ? value.toMillis() : 0;

    return certificates
      .filter((cert) => (statusFilter === "all" ? true : cert.status === statusFilter))
      .filter((cert) => {
        if (!term) return true;
        return (
          cert.studentName.toLowerCase().includes(term) ||
          cert.courseTitle.toLowerCase().includes(term) ||
          cert.studentEmail?.toLowerCase().includes(term) ||
          cert.certificateNumber?.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => {
        const timeA = getMillis(a.issuedAt);
        const timeB = getMillis(b.issuedAt);
        return timeB - timeA;
      });
  }, [certificates, searchTerm, statusFilter]);

  const handleBackfillMissingPdfs = useCallback(async () => {
    if (!user?.uid) {
      toast.error("Anda harus login sebagai admin.");
      return;
    }
    try {
      setBackfilling(true);
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Auth token missing");

      const snapshot = await getDocs(
        query(collection(db, "certificates"), where("status", "==", "issued"))
      );

      const missing = snapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as CertificateDoc) }))
        .filter((cert) => !cert.storageUrl);

      for (const cert of missing) {
        const res = await fetch(`/api/certificates/${cert.id}/generate`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          throw new Error(data?.error || `Gagal mengunggah PDF untuk ${cert.studentName}`);
        }
      }

      toast.success("PDF sertifikat berhasil diperbarui.");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(message);
    } finally {
      setBackfilling(false);
    }
  }, [user?.uid]);

  const handleGenerateCertificate = async (candidate: EligibleCandidate) => {
    if (!user?.uid) {
      toast.error("Anda harus login sebagai admin.");
      return;
    }

    try {
      const key = certificateKey(candidate.userId, candidate.courseId);
      if (certificatesMap.has(key)) {
        toast.warning("Sertifikat sudah dibuat sebelumnya.");
        return;
      }

      const certificateNumber = generateCertificateNumber(candidate.courseId, candidate.userId);
      const verificationCode = createVerificationCode(candidate.courseId, candidate.userId);

      const certRef = await addDoc(collection(db, "certificates"), {
        userId: candidate.userId,
        courseId: candidate.courseId,
        studentName: candidate.studentName,
        studentEmail: candidate.studentEmail,
        courseTitle: candidate.courseTitle,
        status: "issued",
        issuedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        issuedBy: user.uid,
        certificateNumber,
        verificationCode,
      } satisfies CertificateDoc);

      toast.success(`Sertifikat untuk ${candidate.studentName} telah diterbitkan.`);

      void requestCertificatePdf(certRef.id);
    } catch (err) {
      console.error("Failed to issue certificate", err);
      toast.error("Gagal menerbitkan sertifikat.");
    }
  };

  const handleRevokeCertificate = async (cert: CertificateRecord) => {
    if (!user?.uid) {
      toast.error("Anda harus login sebagai admin.");
      return;
    }

    try {
      await updateDoc(doc(db, "certificates", cert.id), {
        status: "revoked",
        revokedAt: serverTimestamp(),
        revokedBy: user.uid,
        updatedAt: serverTimestamp(),
      });
      toast.success("Sertifikat dicabut.");
    } catch (err) {
      console.error("Failed to revoke certificate", err);
      toast.error("Gagal mencabut sertifikat.");
    }
  };

  const handleRestoreCertificate = async (cert: CertificateRecord) => {
    if (!user?.uid) {
      toast.error("Anda harus login sebagai admin.");
      return;
    }

    try {
      await updateDoc(doc(db, "certificates", cert.id), {
        status: "issued",
        updatedAt: serverTimestamp(),
      });
      toast.success("Sertifikat diaktifkan kembali.");
      void requestCertificatePdf(cert.id);
    } catch (err) {
      console.error("Failed to restore certificate", err);
      toast.error("Gagal mengaktifkan sertifikat.");
    }
  };

  const statusFilters: { value: CertificateDoc["status"] | "all"; label: string }[] = [
    { value: "all", label: "Semua" },
    { value: "issued", label: "Terbit" },
    { value: "draft", label: "Draft" },
    { value: "revoked", label: "Dicabut" },
  ];

  return (
    <AdminLayout pageTitle="Manajemen Sertifikat">
      <div className="space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Manajemen Sertifikat</h1>
            <p className="text-sm text-muted-foreground">
              Terbitkan dokumentasi penyelesaian kelas, pantau status sertifikat, dan kelola pencabutan.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Cari nama siswa, kelas, atau kode..."
              className="w-[260px]"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
              }}
            >
              Reset
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={backfilling}
              onClick={handleBackfillMissingPdfs}
            >
              {backfilling ? "Mengunggah PDF..." : "Generate ulang PDF yang hilang"}
            </Button>
          </div>
        </div>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Award className="size-5" /> Kandidat Sertifikat
              </h2>
              <p className="text-xs text-muted-foreground">
                Siswa di bawah ini telah menyelesaikan seluruh chapter berdasarkan data progres.
              </p>
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              {fetchingEligible ? (
                <span className="inline-flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Memuat progres terbaru
                </span>
              ) : (
                <span>Diperbarui otomatis</span>
              )}
            </div>
          </div>

          {loadingEligible ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredEligible.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Tidak ada kandidat baru. Semua sertifikat sudah diterbitkan atau belum ada siswa yang selesai.
            </div>
          ) : (
            <div className="space-y-3">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Siswa</TableHead>
                    <TableHead>Kelas</TableHead>
                    <TableHead>Progres</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEligible.map((candidate) => (
                    <TableRow key={`${candidate.userId}-${candidate.courseId}`}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{candidate.studentName}</span>
                          {candidate.studentEmail && (
                            <span className="text-xs text-muted-foreground">{candidate.studentEmail}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{candidate.courseTitle}</span>
                          <span className="text-xs text-muted-foreground">{candidate.courseId}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {candidate.completed} dari {candidate.total} chapter
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => handleGenerateCertificate(candidate)}
                          disabled={fetchingEligible}
                        >
                          Terbitkan sertifikat
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TableCaption>
                Pastikan data nama siswa telah benar di profil sebelum menerbitkan sertifikat.
              </TableCaption>
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <ShieldCheck className="size-5" /> Riwayat Sertifikat
              </h2>
              <p className="text-xs text-muted-foreground">
                Pantau sertifikat yang sudah diterbitkan, termasuk kode verifikasi dan status aktifnya.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              {statusFilters.map((filter) => (
                <Button
                  key={filter.value}
                  variant={statusFilter === filter.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(filter.value)}
                >
                  {filter.label}
                </Button>
              ))}
            </div>
          </div>

          {filteredCertificates.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Belum ada sertifikat dengan filter saat ini.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Siswa</TableHead>
                  <TableHead>Kelas</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Kode</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCertificates.map((cert) => (
                  <TableRow key={cert.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold">{cert.studentName}</span>
                        {cert.studentEmail && (
                          <span className="text-xs text-muted-foreground">{cert.studentEmail}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold">{cert.courseTitle}</span>
                        <span className="text-xs text-muted-foreground">{cert.courseId}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLOR[cert.status]}>{STATUS_LABEL[cert.status]}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs leading-5">
                        <div className="font-mono">{cert.certificateNumber}</div>
                        <div className="font-mono text-muted-foreground">{cert.verificationCode}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {cert.status === "revoked" ? (
                          <Button size="sm" variant="outline" onClick={() => handleRestoreCertificate(cert)}>
                            <RefreshCcw className="mr-2 h-4 w-4" /> Aktifkan
                          </Button>
                        ) : (
                          <Button size="sm" variant="destructive" onClick={() => handleRevokeCertificate(cert)}>
                            <ShieldOff className="mr-2 h-4 w-4" /> Cabut
                          </Button>
                        )}
                        {!cert.storageUrl ? (
                          <Button size="sm" variant="outline" onClick={() => requestCertificatePdf(cert.id)}>
                            Generate PDF
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>
      </div>
    </AdminLayout>
  );
}

async function requestCertificatePdf(id: string) {
  try {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("Auth token missing");
    const res = await fetch(`/api/certificates/${id}/generate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
    if (!res.ok) {
      throw new Error(data?.error || "Gagal membuat file PDF");
    }
    toast.success(data?.url ? "File sertifikat siap diunduh." : "Sertifikat diperbarui.");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    toast.error(message);
  }
}

async function getCourseInfo(courseId: string, cache: Map<string, CourseInfo>): Promise<CourseInfo | null> {
  if (cache.has(courseId)) {
    return cache.get(courseId)!;
  }

  try {
    const [courseDoc, chaptersCount] = await Promise.all([
      getDoc(doc(db, "courses", courseId)),
      getCountFromServer(collection(db, "courses", courseId, "chapters")),
    ]);

    const title = (courseDoc.exists() ? (courseDoc.data() as { title?: string }).title : undefined) || `Kelas ${courseId}`;
    const totalChapters = chaptersCount.data().count || 0;
    const info: CourseInfo = { title, totalChapters };
    cache.set(courseId, info);
    return info;
  } catch (err) {
    console.error(`Failed to get course info for ${courseId}`, err);
    return null;
  }
}

async function getUserInfo(userId: string, cache: Map<string, UserInfo>): Promise<UserInfo | null> {
  if (cache.has(userId)) {
    return cache.get(userId)!;
  }

  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) return null;
    const data = userDoc.data() as { name?: string; email?: string };
    const info: UserInfo = {
      name: data.name || data.email || `User ${userId}`,
      email: data.email,
    };
    cache.set(userId, info);
    return info;
  } catch (err) {
    console.error(`Failed to get user info for ${userId}`, err);
    return null;
  }
}
