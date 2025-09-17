import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { adminDb } from "@/lib/firebase-admin";
import { Timestamp, WriteBatch } from "firebase-admin/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type UpdateBody = {
  title?: string;
  description?: string;
  type?: "task" | "quiz";
  points?: number;
  autoGrading?: boolean;
  dueAt?: string | null; // ISO or null to clear
  questions?: QuizQuestion[];
};

type QuizQuestion = {
  prompt: string;
  type: "mcq" | "text";
  options?: string[];
  correctIndices?: number[];
};

type AssignmentUpdate = {
  title?: string;
  description?: string;
  type?: "task" | "quiz";
  points?: number;
  autoGrading?: boolean;
  dueAt?: Timestamp | null;
  questions?: QuizQuestion[];
  updatedAt: Timestamp;
};

type UserDoc = {
  role?: string;
};

async function assertAdmin(uid: string) {
  const snap = await adminDb.collection("users").doc(uid).get();
  const data = (snap.data() as UserDoc | undefined) ?? {};
  if (data.role !== "guru") throw new Error("Forbidden");
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const body = (await req.json()) as UpdateBody;
    const update: AssignmentUpdate = { updatedAt: Timestamp.now() };
    if (typeof body.title === "string") update.title = body.title;
    if (typeof body.description === "string") update.description = body.description;
    if (body.type === "task" || body.type === "quiz") update.type = body.type;
    if (typeof body.points === "number") update.points = Math.max(0, Math.floor(body.points));
    if (typeof body.autoGrading === "boolean") update.autoGrading = body.autoGrading;
    if (Array.isArray(body.questions)) update.questions = body.questions;
    if (body.dueAt === null) update.dueAt = null;
    else if (typeof body.dueAt === "string") update.dueAt = Timestamp.fromDate(new Date(body.dueAt));

    await adminDb.collection("assignments").doc(id).set(update, { merge: true });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const code = msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const asgRef = adminDb.collection("assignments").doc(id);
    const subsSnap = await asgRef.collection("submissions").get();

    // Batch delete submissions in chunks of 500
    let batch: WriteBatch | null = null;
    let count = 0;
    for (const docSnap of subsSnap.docs) {
      if (count === 0) {
        batch = adminDb.batch();
      }
      batch!.delete(docSnap.ref);
      count++;
      if (count === 500) {
        await batch!.commit();
        batch = null;
        count = 0;
      }
    }
    if (batch) await batch.commit();

    await asgRef.delete();
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const code = msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}
