import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { adminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Body = {
  uid: string; // target submitter
  decision: "approved" | "rejected" | "needs_correction";
  awardedPoints?: number; // default to assignment.points or lower
};

type UserDoc = {
  role?: string;
  totalScore?: number;
};

type AssignmentDoc = {
  points?: number;
};

type SubmissionDoc = {
  status?: "submitted" | "approved" | "rejected" | "needs_correction";
  awardedPoints?: number;
};

async function assertAdmin(uid: string) {
  const snap = await adminDb.collection("users").doc(uid).get();
  const data = (snap.data() as UserDoc | undefined) ?? {};
  if (data.role !== "guru") throw new Error("Forbidden");
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!authHeader?.toLowerCase().startsWith("bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const idToken = authHeader.split(" ")[1];
    const auth = getAuth();
    const decoded = await auth.verifyIdToken(idToken);
    await assertAdmin(decoded.uid);

    const body = (await req.json()) as Body;
    if (!body?.uid || !body?.decision) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

    const asgRef = adminDb.collection("assignments").doc(id);
    const asgSnap = await asgRef.get();
    if (!asgSnap.exists) return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    const asg = (asgSnap.data() as AssignmentDoc | undefined) ?? {};
    const maxPoints = typeof asg.points === "number" ? asg.points : 10;
    const awardReq = Math.max(0, Math.min(maxPoints, Math.floor(body.awardedPoints ?? maxPoints)));

    const subRef = asgRef.collection("submissions").doc(body.uid);
    const userRef = adminDb.collection("users").doc(body.uid);

    await adminDb.runTransaction(async (tx) => {
      const [subSnap, userSnap] = await Promise.all([tx.get(subRef), tx.get(userRef)]);
      if (!subSnap.exists) throw new Error("Submission not found");
      const sub = (subSnap.data() as SubmissionDoc | undefined) ?? {};

      // Prevent double awarding if already approved
      const alreadyApproved = sub.status === "approved" && (sub.awardedPoints || 0) > 0;

      const updates: SubmissionDoc & {
        status: Body["decision"];
        reviewedAt: Timestamp;
        reviewedBy: string;
        updatedAt: Timestamp;
      } = {
        status: body.decision,
        reviewedAt: Timestamp.now(),
        reviewedBy: decoded.uid,
        updatedAt: Timestamp.now(),
      };

      const userData = (userSnap.data() as UserDoc | undefined) ?? {};
      let newTotal = userData.totalScore ?? 0;
      if (body.decision === "approved" && !alreadyApproved) {
        updates.awardedPoints = awardReq;
        newTotal = newTotal + awardReq;
        tx.set(userRef, { totalScore: newTotal }, { merge: true });
      }

      tx.set(subRef, updates, { merge: true });
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const code = msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}
