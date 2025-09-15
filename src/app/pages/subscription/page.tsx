"use client";

import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/layout";
import { doc, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  ShieldCheck,
  Crown,
  BookOpen,
  Star,
  BadgeCheck,
  Clock,
  Sparkles,
} from "lucide-react";
import { BenefitCard } from "@/components/ui/BenefitCard";

type SubStatus =
  | "active" | "expired" | "pending" | "cancel" | "deny"
  | "failure" | "refund" | "chargeback" | "capture" | "settlement";

type SubscriptionDoc = {
  planId: string;
  price: number;
  status: SubStatus;
  currentPeriodStart?: Timestamp;
  currentPeriodEnd?: Timestamp;
  lastPaymentAt?: Timestamp;
  orderId?: string;
  updatedAt?: Timestamp;
};

type UserLite = { uid: string; name?: string | null; email?: string | null };


const formatDate = (ts?: Timestamp) =>
  ts ? new Date(ts.toMillis()).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "-";

// (removed unused getErrorMessage)

export default function SubscriptionPage() {
  const [authUser, setAuthUser] = useState<UserLite | null>(null);
  const [sub, setSub] = useState<SubscriptionDoc | null>(null);
  const [loading] = useState(false);

  useEffect(() => {
    const off = onAuthStateChanged(getAuth(), (u) => {
      if (!u) { setAuthUser(null); setSub(null); return; }
      setAuthUser({ uid: u.uid, name: u.displayName, email: u.email });
    });
    return () => off();
  }, []);

  useEffect(() => {
    if (!authUser?.uid) return;
    const off = onSnapshot(doc(db, "subscriptions", authUser.uid), (snap) => {
      setSub((snap.data() as SubscriptionDoc) ?? null);
    });
    return () => off();
  }, [authUser?.uid]);

  const isActive = useMemo(() => {
    if (!sub || sub.status !== "active") return false;
    return (sub.currentPeriodEnd?.toMillis() ?? 0) >= Date.now();
  }, [sub]);
// Pembayaran Midtrans dinonaktifkan. Gunakan transfer manual.
const goToManual = () => {
  window.location.href = "/pages/subscription/manual";
};

  return (
    <Layout pageTitle="Langganan Mentora">
      <div className="relative overflow-hidden rounded-2xl p-6 shadow-sm bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 text-white dark:from-indigo-700 dark:via-blue-700 dark:to-cyan-700">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs">
              <Crown className="h-4 w-4" />
              Paket Bulanan
            </div>
            <h1 className="text-2xl font-bold md:text-3xl">Akses Premium Mentora</h1>
            <p className="max-w-xl text-sm text-white/90">
              Materi lengkap, latihan terarah, dan fitur khusus untuk bantu kamu naik level tiap bulan.
            </p>
          </div>
          <div className="rounded-xl bg-white/15 p-4 text-right backdrop-blur-sm">
            <div className="text-sm text-white/90">Harga</div>
            <div className="text-3xl font-extrabold leading-tight">Rp 5.000</div>
            <div className="text-xs text-white/90">per bulan</div>
          </div>
        </div>
      </div>
      <div className="mt-6 rounded-xl border p-5 shadow-sm bg-white border-neutral-200 dark:bg-neutral-900 dark:border-neutral-800">
        <div className="flex items-center justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              <ShieldCheck className="h-5 w-5" />
              Status Langganan
            </div>
            <div className="text-sm text-neutral-600 dark:text-neutral-300">
              {isActive ? (
                <>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">Aktif</span> • berlaku sampai{" "}
                  <span className="font-medium">{formatDate(sub?.currentPeriodEnd ?? undefined)}</span>
                </>
              ) : sub?.status === "pending" ? (
                <span className="text-amber-600 dark:text-amber-400">Menunggu penyelesaian pembayaran…</span>
              ) : (
                <span className="text-neutral-700 dark:text-neutral-300">Tidak aktif</span>
              )}
            </div>
          </div>

          <button
            onClick={goToManual}
            disabled={!authUser || loading}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition bg-blue-600 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
            {isActive ? "Perpanjang via transfer" : "Langganan via transfer"}
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          <Clock className="h-4 w-4" />
          Setelah bukti transfer disetujui admin, status aktif otomatis.
        </div>

        {!authUser && (
          <div className="mt-4 rounded-lg border p-3 text-sm
                          border-amber-200 bg-amber-50 text-amber-700
                          dark:border-amber-300/30 dark:bg-amber-900/20 dark:text-amber-300">
            Silakan login terlebih dahulu untuk berlangganan.
          </div>
        )}
      </div>
      <div className="mt-4 rounded-lg border p-4 bg-white dark:bg-neutral-900">
        <div className="text-sm text-neutral-700 dark:text-neutral-300">
          Pembayaran hanya melalui transfer ke rekening yang disediakan. Kirim bukti, admin akan cek manual.
        </div>
        <div className="mt-2">
          <a href="/pages/subscription/manual" className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700">
            Ajukan via transfer manual
          </a>
        </div>
      </div>
      <div className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Kenapa langganan Mentora?
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <BenefitCard
            icon={<BookOpen className="h-5 w-5" />}
            title="Semua materi premium"
            desc="Kurikulum terstruktur, video & latihan praktik yang terus diperbarui."
          />
          <BenefitCard
            icon={<Star className="h-5 w-5" />}
            title="Leaderboard & badge"
            desc="Kumpulkan bintang, naik peringkat, dan raih badge prestasi tiap bulan."
          />
          <BenefitCard
            icon={<BadgeCheck className="h-5 w-5" />}
            title="Mentoring one-on-one"
            desc="Sesi mentoring pribadi untuk diskusi materi, proyek, atau karir."
          />
          <BenefitCard
            icon={<Sparkles className="h-5 w-5" />}
            title="Benefit eksklusif"
            desc="Event Google Developer Group, diskon produk merchandise, dan lainnya."
          />
        </div>
      </div>
    </Layout>
  );
}
