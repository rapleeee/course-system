import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getAuth } from "firebase-admin/auth";
import { Timestamp } from "firebase-admin/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type UserDoc = {
  lastClaimAt?: Timestamp;
  streakCount?: number;
  longestStreak?: number;
  totalScore?: number;
  totalClaims?: number;
};

function startOfUtcDay(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function daysDiffUtc(a: Date, b: Date) {
  const da = startOfUtcDay(a).getTime();
  const db = startOfUtcDay(b).getTime();
  return Math.round((da - db) / (24 * 60 * 60 * 1000));
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
      return NextResponse.json({ error: "Missing Authorization header" }, { status: 401 });
    }
    const idToken = authHeader.split(" ")[1];
    const auth = getAuth();
    const decoded = await auth.verifyIdToken(idToken);
    const uid = decoded.uid;

    const userRef = adminDb.collection("users").doc(uid);
    const now = new Date();

    const result = await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      const data = (snap.data() as UserDoc | undefined) ?? {};
      const lastTs = data.lastClaimAt;
      const last = lastTs ? lastTs.toDate() : undefined;

      // Claim window: 1x per UTC day
      if (last && daysDiffUtc(now, last) === 0) {
        const nextAt = new Date(startOfUtcDay(now).getTime() + 24 * 60 * 60 * 1000);
        return {
          alreadyClaimed: true,
          nextAvailableAt: nextAt.toISOString(),
          streakCount: data.streakCount ?? 0,
          longestStreak: data.longestStreak ?? 0,
          totalScore: data.totalScore ?? 0,
          reward: 0,
        };
      }

      let newStreak = 1;
      if (last) {
        const diff = daysDiffUtc(now, last);
        if (diff === 1) newStreak = (data.streakCount ?? 0) + 1;
        else newStreak = 1; // missed a day
      }

      const longest = Math.max(newStreak, data.longestStreak ?? 0);

      // Reward scheme: base 5 + min(streak, 10)
      const reward = 5 + Math.min(newStreak, 10);
      const totalScore = (data.totalScore ?? 0) + reward;
      const totalClaims = (data.totalClaims ?? 0) + 1;

      tx.set(
        userRef,
        {
          streakCount: newStreak,
          longestStreak: longest,
          lastClaimAt: Timestamp.fromDate(now),
          totalClaims,
          totalScore,
        },
        { merge: true }
      );

      const nextAt = new Date(startOfUtcDay(now).getTime() + 24 * 60 * 60 * 1000);
      return {
        alreadyClaimed: false,
        nextAvailableAt: nextAt.toISOString(),
        streakCount: newStreak,
        longestStreak: longest,
        totalScore,
        reward,
      };
    });

    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
