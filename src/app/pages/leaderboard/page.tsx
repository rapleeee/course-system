"use client";

import React, { useEffect, useState } from "react";
import Layout from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { db } from "@/lib/firebase";
import { collection, getDocs, orderBy, limit, query } from "firebase/firestore";

type LeaderboardUser = {
  id: string;
  name: string;
  role: string;
  level: string;
  totalScore: number;
  avatar: string;
};

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState("weekly");
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      const q = query(
        collection(db, "users"),
        orderBy("totalScore", "desc"),
        limit(10)
      );
      const querySnap = await getDocs(q);
      const data: LeaderboardUser[] = querySnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as LeaderboardUser[];

      setUsers(data);
      setLoading(false);
    };

    fetchLeaderboard();
  }, []);

  return (
    <Layout pageTitle="Leaderboard">
      <div className="w-full mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Leaderboard</h1>
          <div className="flex gap-2">
            {["weekly", "monthly", "overall"].map((tab) => (
              <Button
                key={tab}
                variant={activeTab === tab ? "default" : "outline"}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </Button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center mt-10 text-gray-500">Loading leaderboard...</div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center mt-12 space-y-4">
            <h2 className="text-xl font-semibold">Leaderboard kosong nih 🔥</h2>
            <p className="text-gray-500 max-w-md">
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

              return (
                <Card
                  key={user.id}
                  className={`flex p-4 rounded-xl border ${
                    isTop3
                      ? bgColor + " border-2"
                      : "border-gray-200 dark:border-neutral-700"
                  }`}
                >
                  <div className="flex w-full items-center gap-4">
                    <div className="flex items-center gap-2 w-14">
                      <div className="text-lg font-semibold text-gray-500 text-center">
                        {index + 1}
                      </div>
                      {trophy && <div className="text-xl">{trophy}</div>}
                    </div>
                    <Image
                      src={user.avatar || "/photos/boy.png"}
                      alt={user.name}
                      width={40}
                      height={40}
                      className="rounded-full border"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold dark:text-gray-500 truncate">
                        {user.name}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {user.role}
                      </p>
                    </div>
                    <div className="text-sm text-gray-500">{user.level} 🔥</div>
                    <div className="font-semibold text-[#1d857c]">
                      {user.totalScore} Poin
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}