import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { adminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Body = {
  title: string;
  description?: string;
  type: "task" | "quiz";
  points?: number; // max points
  autoGrading?: boolean;
  questions?: Array<{
    prompt: string;
    type: "mcq" | "text";
    options?: string[];
    correctIndices?: number[]; // for mcq
  }>;
  dueAt?: string; // ISO
};

type UserDoc = {
  role?: string;
};

async function assertAdmin(uid: string) {
  const snap = await adminDb.collection("users").doc(uid).get();
  const data = (snap.data() as UserDoc | undefined) ?? {};
  if (data.role !== "guru") throw new Error("Forbidden");
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!authHeader?.toLowerCase().startsWith("bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const idToken = authHeader.split(" ")[1];
    const auth = getAuth();
    const decoded = await auth.verifyIdToken(idToken);
    await assertAdmin(decoded.uid);

    const body = (await req.json()) as Body;
    if (!body?.title || !body?.type) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const doc = await adminDb.collection("assignments").add({
      title: body.title,
      description: body.description || "",
      type: body.type,
      points: typeof body.points === "number" ? Math.max(0, Math.floor(body.points)) : 10,
      autoGrading: Boolean(body.autoGrading),
      questions: Array.isArray(body.questions) ? body.questions : [],
      dueAt: body.dueAt ? Timestamp.fromDate(new Date(body.dueAt)) : null,
      createdAt: Timestamp.now(),
      createdBy: decoded.uid,
    });
    return NextResponse.json({ id: doc.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const code = msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}
