"use client";

import React from "react";
import AdminLayout from "@/components/layouts/AdminLayout";
import LeaderboardContent from "@/components/leaderboard/LeaderboardContent";

export default function AdminLeaderboardPage() {
  return (
    <AdminLayout pageTitle="Leaderboard">
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Leaderboard Siswa</h1>
          <p className="text-sm text-muted-foreground">
            Tampilan yang sama seperti halaman siswa untuk memantau perolehan poin terbaru.
          </p>
        </div>
        <LeaderboardContent enableRewards={false} />
      </div>
    </AdminLayout>
  );
}
