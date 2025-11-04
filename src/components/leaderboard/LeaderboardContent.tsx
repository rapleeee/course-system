"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/firebase";
import {
  arrayUnion,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { toast } from "sonner";

type LeaderboardUser = {
  id: string;
  name: string;
  role: string;
  level: string;
  totalScore: number;
  avatar: string;
  seasonalScore?: number;
};

type Tab = "monthly" | "overall";

type LeaderboardReward = {
  id: string;
  period: string;
  rank: number;
  status: "pending" | "claimed" | "expired";
  score: number;
  subscriptionMonths?: number;
};

type LeaderboardContentProps = {
  currentUserId?: string;
  enableRewards?: boolean;
};

export default function LeaderboardContent({
  currentUserId,
  enableRewards = true,
}: LeaderboardContentProps) {
  const [activeTab, setActiveTab] = useState<Tab>("monthly");
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [reward, setReward] = useState<LeaderboardReward | null>(null);
  const [claiming, setClaiming] = useState(false);
  const resetCheckedRef = useRef(false);
  const tabs: Tab[] = useMemo(() => ["monthly", "overall"], []);

  const fetchLeaderboard = useCallback(async (mode: Tab) => {
    setLoading(true);
    const orderField = mode === "overall" ? "totalScore" : "seasonalScore";
    const q = query(collection(db, "users"), orderBy(orderField, "desc"), limit(10));
    const querySnap = await getDocs(q);
    const data: LeaderboardUser[] = querySnap.docs.map((docSnap) => {
      const payload = docSnap.data() as LeaderboardUser;
      return {
        ...payload,
        id: docSnap.id,
      };
    });
    setUsers(data);
    setLoading(false);
  }, []);

  const loadReward = useCallback(async () => {
    if (!enableRewards || !currentUserId) {
      setReward(null);
      return;
    }

    const rewardsQuery = query(
      collection(db, "leaderboard_rewards"),
      where("userId", "==", currentUserId),
      where("status", "==", "pending"),
      orderBy("createdAt", "desc"),
      limit(1)
    );

    const snap = await getDocs(rewardsQuery);
    if (snap.empty) {
      setReward(null);
      return;
    }

    const rewardDoc = snap.docs[0];
    const payload = rewardDoc.data() as Omit<LeaderboardReward, "id">;
    setReward({ id: rewardDoc.id, ...payload });
  }, [currentUserId, enableRewards]);

  const formatPeriod = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

  const resetSeasonalScores = useCallback(async () => {
    const usersSnap = await getDocs(collection(db, "users"));
    if (usersSnap.empty) return;

    const commits: Promise<void>[] = [];
    let batch = writeBatch(db);
    let count = 0;

    usersSnap.forEach((docSnap) => {
      batch.update(docSnap.ref, {
        seasonalScore: 0,
        seasonalScoreUpdatedAt: serverTimestamp(),
      });
      count += 1;
      if (count === 400) {
        commits.push(batch.commit() as unknown as Promise<void>);
        batch = writeBatch(db);
        count = 0;
      }
    });

    if (count > 0) {
      commits.push(batch.commit() as unknown as Promise<void>);
    }

    await Promise.all(commits);
  }, []);

  const awardSeasonWinners = useCallback(async (previousPeriod: string) => {
    const winnersSnap = await getDocs(query(collection(db, "users"), orderBy("seasonalScore", "desc"), limit(3)));

    if (winnersSnap.empty) return;

    const batch = writeBatch(db);
    winnersSnap.docs.forEach((docSnap, index) => {
      const data = docSnap.data() as LeaderboardUser & { seasonalScore?: number };
      const score = data.seasonalScore ?? 0;
      if (score <= 0) return;

      const rewardId = `${previousPeriod}_${docSnap.id}`;
      const rewardRef = doc(db, "leaderboard_rewards", rewardId);
      batch.set(
        rewardRef,
        {
          userId: docSnap.id,
          period: previousPeriod,
          rank: index + 1,
          status: "pending",
          score,
          subscriptionMonths: 1,
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );
    });

    await batch.commit();
  }, []);

  const checkMonthlySeasonReset = useCallback(async () => {
    const metaRef = doc(db, "leaderboard_meta", "global");
    const now = new Date();
    const currentPeriod = formatPeriod(now);

    let shouldReset = false;
    let previousPeriod = currentPeriod;
    let bootstrapScores = false;

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(metaRef);
      if (!snap.exists()) {
        tx.set(metaRef, { activePeriod: currentPeriod, lastResetAt: serverTimestamp() });
        bootstrapScores = true;
        return;
      }

      const data = snap.data() as { activePeriod?: string };
      if (data.activePeriod !== currentPeriod) {
        previousPeriod = data.activePeriod ?? currentPeriod;
        shouldReset = true;
        tx.set(
          metaRef,
          {
            activePeriod: currentPeriod,
            lastResetAt: serverTimestamp(),
          },
          { merge: true }
        );
      }
    });

    if (bootstrapScores) {
      await resetSeasonalScores();
      return;
    }

    if (shouldReset) {
      await awardSeasonWinners(previousPeriod);
      await resetSeasonalScores();
    }
  }, [awardSeasonWinners, resetSeasonalScores]);

  useEffect(() => {
    if (resetCheckedRef.current) return;
    resetCheckedRef.current = true;
    checkMonthlySeasonReset().catch((error) => console.error("Failed to reset leaderboard", error));
  }, [checkMonthlySeasonReset]);

  useEffect(() => {
    fetchLeaderboard(activeTab).catch((error) => console.error("Failed to load leaderboard", error));
  }, [fetchLeaderboard, activeTab]);

  useEffect(() => {
    loadReward().catch((error) => console.error("Failed to load reward", error));
  }, [loadReward]);

  const handleClaimReward = useCallback(async () => {
    if (!enableRewards || !currentUserId || !reward) {
      toast.error("Login sebagai siswa untuk klaim reward.");
      return;
    }

    setClaiming(true);
    try {
      const rewardRef = doc(db, "leaderboard_rewards", reward.id);
      const subscriptionRef = doc(db, "subscriptions", currentUserId);
      const userRef = doc(db, "users", currentUserId);

      await runTransaction(db, async (tx) => {
        const rewardSnap = await tx.get(rewardRef);
        if (!rewardSnap.exists()) throw new Error("Reward tidak ditemukan");
        const rewardData = rewardSnap.data() as LeaderboardReward;
        if (rewardData.status !== "pending") throw new Error("Reward sudah diklaim atau tidak tersedia");

        const now = Timestamp.now();
        const subscriptionSnap = await tx.get(subscriptionRef);

        let baseDate = now.toDate();
        if (subscriptionSnap.exists()) {
          const data = subscriptionSnap.data();
          const currentEnd =
            data.currentPeriodEnd instanceof Timestamp ? data.currentPeriodEnd.toDate() : null;
          if (currentEnd && currentEnd > baseDate) {
            baseDate = currentEnd;
          }
        }

        const months = rewardData.subscriptionMonths ?? 1;
        const newEnd = new Date(baseDate);
        newEnd.setMonth(newEnd.getMonth() + months);
        const newEndTimestamp = Timestamp.fromDate(newEnd);

        tx.set(
          subscriptionRef,
          {
            planId: "leaderboard-reward",
            status: "active",
            currentPeriodStart: now,
            currentPeriodEnd: newEndTimestamp,
            lastPaymentAt: now,
            updatedAt: now,
            method: "reward",
            rewardPeriod: rewardData.period,
          },
          { merge: true }
        );

        tx.set(
          userRef,
          {
            subscriptionActive: true,
            subscriberUntil: newEndTimestamp,
            updatedAt: now,
            roles: arrayUnion("subscriber"),
          },
          { merge: true }
        );

        tx.update(rewardRef, {
          status: "claimed",
          claimedAt: now,
        });
      });

      toast.success("Selamat! Subscription gratis berhasil diklaim.");
      await loadReward();
    } catch (error) {
      console.error("Failed to claim reward", error);
      toast.error(error instanceof Error ? error.message : "Gagal klaim reward");
    } finally {
      setClaiming(false);
    }
  }, [enableRewards, currentUserId, loadReward, reward]);

  const renderRewardBanner = () => {
    if (!enableRewards || !reward) return null;

    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-900/30 dark:text-emerald-100">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">Selamat! Kamu juara #{reward.rank} periode {reward.period} 🎉</p>
            <p className="text-xs sm:text-sm text-emerald-600/80 dark:text-emerald-100/80">
              Klaim subscription gratis sebelum periode berakhir. Nilai poin bulan lalu: {reward.score}.
            </p>
          </div>
          <Button onClick={handleClaimReward} disabled={claiming} className="bg-emerald-600 text-white hover:bg-emerald-700">
            {claiming ? "Memproses..." : "Claim Subscription"}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto w-full space-y-6">
      {renderRewardBanner()}

      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
        <h1 className="text-3xl font-bold">Leaderboard</h1>
        <div className="max-w-full overflow-x-auto">
          <div className="inline-flex gap-2 sm:gap-3">
            {tabs.map((tab) => (
              <Button
                key={tab}
                variant={activeTab === tab ? "default" : "outline"}
                onClick={() => setActiveTab(tab)}
                className="whitespace-nowrap"
              >
                {tab}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="mt-10 text-center text-gray-500">Loading leaderboard...</div>
      ) : users.length === 0 ? (
        <div className="mt-12 flex flex-col items-center justify-center space-y-4 text-center">
          <h2 className="text-xl font-semibold">Leaderboard kosong nih 🔥</h2>
          <p className="max-w-md text-gray-500">
            Yuk kerjain tugas, kumpulkan poin, dan jadilah yang terbaik di leaderboard!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((user, index) => {
            const isTop3 = index < 3;
            const bgColor =
              index === 0
                ? "bg-yellow-100 border-l-yellow-400"
                : index === 1
                ? "bg-gray-100 border-l-gray-400"
                : index === 2
                ? "bg-yellow-50 border-l-amber-700"
                : "bg-white dark:bg-neutral-800";

            const trophy = ["🥇", "🥈", "🥉"][index] || null;
            const displayScore = activeTab === "overall" ? user.totalScore ?? 0 : user.seasonalScore ?? 0;
            const secondaryLabel = activeTab === "overall" ? null : `${user.totalScore ?? 0} total poin`;

            return (
              <Card
                key={user.id}
                className={`flex rounded-xl border p-4 ${
                  isTop3 ? `${bgColor} border-2` : "border-gray-200 dark:border-neutral-700"
                }`}
              >
                <div className="flex w-full items-center gap-4">
                  <div className="flex w-14 items-center gap-2">
                    <div className="text-center text-lg font-semibold text-gray-500">{index + 1}</div>
                    {trophy ? <div className="text-xl">{trophy}</div> : null}
                  </div>
                  <Image
                    src={user.avatar || "/photos/boy.png"}
                    alt={user.name}
                    width={40}
                    height={40}
                    className="rounded-full border object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-foreground">{user.name}</p>
                    <p className="truncate text-sm text-gray-500">{user.role}</p>
                    {secondaryLabel ? <p className="text-xs text-muted-foreground">{secondaryLabel}</p> : null}
                  </div>
                  <div className="text-sm text-gray-500">{user.level} 🔥</div>
                  <div className="font-semibold text-[#1d857c]">{displayScore} poin</div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export { LeaderboardContent };
