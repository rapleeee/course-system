"use client";

import Layout from "@/components/layout";
import { useAuth } from "@/lib/useAuth";
import { db, storage } from "@/lib/firebase";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import Link from "next/link";

type CourseLite = {
  id: string;
  title: string;
  accessType?: "free" | "subscription" | "paid";
  price?: number;
};

type RequestStatus = "pending" | "approved" | "rejected" | null;

export default function CourseManualPaymentPage() {
  const params = useParams<{ id: string }>();
  const courseId = params?.id;
  const { user, loading: authLoading } = useAuth();

  const [course, setCourse] = useState<CourseLite | null>(null);
  const [pricing, setPricing] = useState<{ base: number; discount: number; final: number }>({
    base: 0,
    discount: 0,
    final: 0,
  });
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [requestStatus, setRequestStatus] = useState<RequestStatus>(null);

  const [amount, setAmount] = useState("0");
  const [bank, setBank] = useState(process.env.NEXT_PUBLIC_BANK_NAME || "Mandiri");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [transferAt, setTransferAt] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    setAmount(pricing.final.toString());
  }, [pricing.final]);

  useEffect(() => {
    const loadData = async () => {
      if (!courseId || !user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const courseRef = doc(db, "courses", courseId);
        const courseSnap = await getDoc(courseRef);
        let normalizedPrice = 0;
        if (courseSnap.exists()) {
          const data = courseSnap.data() as Record<string, unknown>;
          const priceRaw = data.price;
          const price =
            typeof priceRaw === "number"
              ? priceRaw
              : typeof priceRaw === "string"
              ? Number(priceRaw)
              : 0;
          normalizedPrice = Number.isFinite(price) ? price : 0;
          setCourse({
            id: courseId,
            title: (data.title as string) ?? "Course",
            accessType: data.accessType as CourseLite["accessType"],
            price: normalizedPrice,
          });
        } else {
          setCourse(null);
        }

        const subSnap = await getDoc(doc(db, "subscriptions", user.uid));
        const now = Date.now();
        const active =
          subSnap.exists() &&
          (() => {
            const data = subSnap.data() as { status?: string; currentPeriodEnd?: Timestamp };
            if (data.status !== "active") return false;
            const end = data.currentPeriodEnd?.toMillis?.() ?? 0;
            return end >= now;
          })();
        const reqRef = doc(db, "course_purchase_requests", `${user.uid}_${courseId}`);
        const reqSnap = await getDoc(reqRef);
        if (reqSnap.exists()) {
          const data = reqSnap.data() as { status?: string };
          const status = data.status;
          if (status === "pending" || status === "approved" || status === "rejected") {
            setRequestStatus(status);
          }
        } else {
          setRequestStatus(null);
        }

        const base = Math.max(0, normalizedPrice);
        const discount = active && base > 0 ? 5000 : 0;
        const final = Math.max(0, base - discount);
        setPricing({ base, discount, final });
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [courseId, user]);

  const priceLabel = useMemo(() => {
    if (pricing.final <= 0) return "Gratis (diskon langganan)";
    return `Rp ${pricing.final.toLocaleString("id-ID")}`;
  }, [pricing.final]);

  if (authLoading || loading) {
    return (
      <Layout pageTitle="Pembelian Kelas Manual">
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-muted-foreground/30 border-t-foreground" />
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout pageTitle="Pembelian Kelas Manual">
        <div className="max-w-xl mx-auto py-16 text-center space-y-4">
          <p className="text-lg font-semibold">Kamu perlu login untuk mengajukan pembelian kelas.</p>
          <Link href="/auth/login" className="text-blue-600 underline text-sm">
            Ke Halaman Login
          </Link>
        </div>
      </Layout>
    );
  }

  if (!course) {
    return (
      <Layout pageTitle="Pembelian Kelas Manual">
        <div className="max-w-xl mx-auto py-16 text-center space-y-4">
          <p className="text-lg font-semibold">Kelas tidak ditemukan.</p>
          <Link href="/pages/courses" className="text-blue-600 underline text-sm">
            Kembali ke daftar kelas
          </Link>
        </div>
      </Layout>
    );
  }

  if (course.accessType !== "paid") {
    return (
      <Layout pageTitle="Pembelian Kelas Manual">
        <div className="max-w-xl mx-auto py-16 text-center space-y-4">
          <p className="text-lg font-semibold">Kelas ini tidak memerlukan pembayaran manual.</p>
          <Link href="/pages/courses" className="text-blue-600 underline text-sm">
            Kembali ke daftar kelas
          </Link>
        </div>
      </Layout>
    );
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    if (!file) {
      alert("Unggah bukti transfer terlebih dahulu.");
      return;
    }
    setSubmitted(false);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
      const objectPath = `course-requests/${user.uid}/${courseId}/${Date.now()}-${safeName}`;
      const storageRef = ref(storage, objectPath);
      await uploadBytes(storageRef, file);
      const proofUrl = await getDownloadURL(storageRef);

      const requestRef = doc(db, "course_purchase_requests", `${user.uid}_${courseId}`);
      const requestSnap = await getDoc(requestRef);
      const now = serverTimestamp();

      await setDoc(
        requestRef,
        {
          uid: user.uid,
          userEmail: user.email ?? null,
          userName: user.displayName ?? null,
          courseId,
          courseTitle: course.title,
          basePrice: pricing.base,
          discountApplied: pricing.discount,
          finalPrice: pricing.final,
          amount: pricing.final,
          bank,
          accountName,
          accountNumber,
          transferAt: transferAt ? Timestamp.fromDate(new Date(transferAt)) : null,
          notes: notes || null,
          proofUrl,
          status: "pending",
          updatedAt: now,
          createdAt: requestSnap.exists() ? requestSnap.data()?.createdAt ?? now : now,
          method: "manual_transfer",
        },
        { merge: true },
      );

      setRequestStatus("pending");
      setSubmitted(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      alert(`Gagal mengirim bukti transfer: ${message}`);
    }
  };

  return (
    <Layout pageTitle={`Pembelian Kelas: ${course.title}`}>
      <div className="max-w-xl mx-auto space-y-6">
        <div className="rounded-md border p-4 bg-white dark:bg-neutral-900">
          <h1 className="text-xl font-semibold mb-2">{course.title}</h1>
          <p className="text-sm text-muted-foreground">
            Ajukan bukti transfer untuk mendapatkan akses. Admin akan memeriksa dan mengaktifkan kelas setelah pembayaran terkonfirmasi.
          </p>
          <div className="mt-4 text-sm space-y-1">
            <div>
              Harga normal:{" "}
              <span className="font-semibold">Rp {pricing.base.toLocaleString("id-ID")}</span>
            </div>
            {pricing.discount > 0 && (
              <div className="text-emerald-600">
                Diskon subscriber: Rp 5.000 → {priceLabel}
              </div>
            )}
            {pricing.discount <= 0 && (
              <div>
                Nominal yang perlu dibayar: <span className="font-semibold">{priceLabel}</span>
              </div>
            )}
          </div>
          {requestStatus === "pending" && (
            <div className="mt-4 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Pengajuan kamu sedang diproses admin. Kamu dapat mengirim ulang bukti transfer jika diperlukan.
            </div>
          )}
          {requestStatus === "approved" && (
            <div className="mt-4 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              Pembayaran telah disetujui. Kamu seharusnya sudah mendapat akses ke kelas ini.
            </div>
          )}
          {requestStatus === "rejected" && (
            <div className="mt-4 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              Pengajuan sebelumnya ditolak. Periksa kembali pembayaranmu lalu kirim bukti terbaru.
            </div>
          )}
        </div>

        <div className="rounded-md border p-4 bg-white dark:bg-neutral-900">
          <h3 className="text-base font-semibold mb-2">Rekening Tujuan</h3>
          <div className="text-sm space-y-1">
            <div>
              Bank: <span className="font-medium">{process.env.NEXT_PUBLIC_BANK_NAME || "Mandiri"}</span>
            </div>
            <div>
              No Rekening:{" "}
              <span className="font-mono font-semibold tracking-wide">
                {process.env.NEXT_PUBLIC_BANK_ACCOUNT_NUMBER || "1670003540134"}
              </span>
            </div>
            <div>
              Atas Nama:{" "}
              <span className="font-medium">{process.env.NEXT_PUBLIC_BANK_ACCOUNT_HOLDER || "Rafli Maulana"}</span>
            </div>
          </div>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-md border p-4 bg-white dark:bg-neutral-900">
            <div>
              <label className="block text-sm mb-1">Nominal (Rp)</label>
              <input
                className="w-full border rounded px-3 py-2 bg-neutral-100 text-neutral-600"
                value={amount}
                readOnly
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1">Bank Pengirim</label>
                <input
                  className="w-full border rounded px-3 py-2"
                  value={bank}
                  onChange={(e) => setBank(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Tanggal Transfer</label>
                <input
                  type="datetime-local"
                  className="w-full border rounded px-3 py-2"
                  value={transferAt}
                  onChange={(e) => setTransferAt(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1">Nama Pengirim</label>
                <input
                  className="w-full border rounded px-3 py-2"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Nomor Rekening Pengirim</label>
                <input
                  className="w-full border rounded px-3 py-2"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm mb-1">Unggah Bukti Transfer (jpg/png/pdf)</label>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                required
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Catatan (opsional)</label>
              <textarea
                className="w-full border rounded px-3 py-2"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center rounded bg-blue-600 text-white px-4 py-2 text-sm disabled:opacity-60"
              >
                Kirim Bukti
              </button>
            </div>
          </form>
        ) : (
          <div className="rounded-md border p-4 bg-emerald-50 border-emerald-200 text-emerald-800 text-sm">
            Bukti transfer berhasil dikirim. Mohon tunggu konfirmasi dari admin.
          </div>
        )}

        <div className="text-center text-sm">
          <Link href="/pages/courses" className="text-blue-600 underline">
            Kembali ke daftar kelas
          </Link>
        </div>
      </div>
    </Layout>
  );
}
