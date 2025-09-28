"use client";

import { useEffect, useMemo, useState } from "react";
import { Flame, CheckCircle2, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/useAuth";
import { auth, db } from "@/lib/firebase";
import { doc, onSnapshot, Timestamp, runTransaction } from "firebase/firestore";
import { toast } from "sonner";

type StreakDoc = {
  streakCount?: number;
  longestStreak?: number;
  lastClaimAt?: Timestamp;
  totalScore?: number;
  totalClaims?: number;
  seasonalScore?: number;
};

export default function StreakWidget() {
  const { user } = useAuth();
  const [data, setData] = useState<StreakDoc | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    const ref = doc(db, "users", user.uid);
    const unsub = onSnapshot(ref, (snap) => {
      setData((snap.exists() ? (snap.data() as StreakDoc) : {}) || {});
    });
    return () => unsub();
  }, [user?.uid]);

  const claimedToday = useMemo(() => {
    if (!data?.lastClaimAt) return false;
    const d = data.lastClaimAt.toDate();
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }, [data?.lastClaimAt]);

  const handleClaim = async () => {
    if (!user) {
      toast.error("Silakan login dulu untuk klaim harian.");
      return;
    }
    try {
      setLoading(true);
      const token = await auth.currentUser?.getIdToken();
      try {
        const res = await fetch("/api/streak/claim", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Gagal klaim");
        if (json.alreadyClaimed) {
          toast.info("Kamu sudah klaim hari ini. Datang lagi besok ya! ✨");
        } else {
          toast.success(`Klaim berhasil! +${json.reward} poin 🔥`);
        }
      } catch {
        // Fallback: admin credential belum diset → lakukan klaim di client via transaction
        await clientClaimFallback();
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  async function clientClaimFallback() {
    if (!user) return;
    const ref = doc(db, "users", user.uid);
    const now = new Date();

    const dayKeyUTC = (d: Date) => d.toISOString().slice(0, 10); // YYYY-MM-DD in UTC

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      const d = snap.exists() ? (snap.data() as StreakDoc) : {};
      const last = d.lastClaimAt ? d.lastClaimAt.toDate() : undefined;

      if (last && dayKeyUTC(last) === dayKeyUTC(now)) {
        throw new Error("Kamu sudah klaim hari ini. Datang lagi besok ya! ✨");
      }

      let newStreak = 1;
      if (last) {
        const diffDays = Math.round(
          (Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) -
            Date.UTC(last.getUTCFullYear(), last.getUTCMonth(), last.getUTCDate())) /
            (24 * 60 * 60 * 1000)
        );
        newStreak = diffDays === 1 ? (d.streakCount || 0) + 1 : 1;
      }

      const longest = Math.max(newStreak, d.longestStreak || 0);
      const reward = 5 + Math.min(newStreak, 10);
      const totalScore = (d.totalScore || 0) + reward;
      const seasonalScore = (d.seasonalScore || 0) + reward;
      const totalClaims = (d.totalClaims || 0) + 1;

      tx.set(
        ref,
        {
          streakCount: newStreak,
          longestStreak: longest,
          lastClaimAt: Timestamp.fromDate(now),
          totalClaims,
          totalScore,
          seasonalScore,
        },
        { merge: true }
      );
    });

    toast.success("Klaim berhasil! (fallback) 🔥");
  }

  const streak = data?.streakCount || 0;
  const longest = data?.longestStreak || 0;
  const score = data?.totalScore || 0;

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-orange-100 p-2 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
            <Flame className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm text-neutral-500 dark:text-neutral-400">Streak Belajar</div>
            <div className="text-xl font-bold">{streak} hari</div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">Terpanjang: {longest} hari • Poin: {score}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            disabled={loading || claimedToday}
            onClick={handleClaim}
            className="bg-[#1d857c] hover:bg-[#176861] text-white"
          >
            {claimedToday ? (
              <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Sudah Klaim</span>
            ) : (
              <span className="inline-flex items-center gap-2"><Gift className="h-4 w-4" /> Klaim Harian</span>
            )}
          </Button>
        </div>
      </div>
      <div className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
        Hadiah: 5 poin + bonus sesuai streak (maks +10). Klaim 1x per hari.
      </div>
    </div>
  );
}
