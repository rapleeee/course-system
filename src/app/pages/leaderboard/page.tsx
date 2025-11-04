"use client";

import React from "react";
import Layout from "@/components/layout";
import { useAuth } from "@/lib/useAuth";
import LeaderboardContent from "@/components/leaderboard/LeaderboardContent";

export default function LeaderboardPage() {
  const { user } = useAuth();

  return (
    <Layout pageTitle="Leaderboard">
      <LeaderboardContent currentUserId={user?.uid ?? undefined} enableRewards />
    </Layout>
  );
}
