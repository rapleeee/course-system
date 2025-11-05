import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import {
  extractRoles,
  serializeCourse,
  serializeProgress,
  userHasCourseAccess,
} from "../../_lib/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type ProgressAction = "add" | "remove";
type CourseProgressContext = {
  params: Promise<{ courseId: string }>;
};

export async function POST(req: NextRequest, context: CourseProgressContext) {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return NextResponse.json({ error: "Missing Authorization token" }, { status: 401 });
  }

  const resolvedParams = await context.params;
  const courseId = resolvedParams?.courseId;
  if (!courseId) {
    return NextResponse.json({ error: "Missing course id" }, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const { chapterId, action } = (payload ?? {}) as Partial<{
    chapterId: string;
    action: ProgressAction;
  }>;

  if (!chapterId || typeof chapterId !== "string") {
    return NextResponse.json({ error: "chapterId is required" }, { status: 400 });
  }

  if (action !== "add" && action !== "remove") {
    return NextResponse.json({ error: "action must be 'add' or 'remove'" }, { status: 400 });
  }

  try {
    const idToken = authHeader.split(" ")[1];
    const auth = getAuth();
    const decoded = await auth.verifyIdToken(idToken);
    const uid = decoded.uid;

    const courseRef = adminDb.collection("courses").doc(courseId);
    const courseSnap = await courseRef.get();

    if (!courseSnap.exists) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const course = serializeCourse(courseSnap.data());
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const chapterDoc = await courseRef.collection("chapters").doc(chapterId).get();
    if (!chapterDoc.exists) {
      return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
    }

    const userRef = adminDb.collection("users").doc(uid);
    const userSnap = await userRef.get();
    const userData = userSnap.exists ? userSnap.data() : undefined;
    const roles = extractRoles(userData);

    const hasAccess = userHasCourseAccess(course, roles, userData, courseId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const progressRef = userRef.collection("progress").doc(courseId);

    await adminDb.runTransaction(async (tx) => {
      tx.set(
        progressRef,
        {
          updatedAt: Timestamp.now(),
          completedChapterIds:
            action === "add"
              ? FieldValue.arrayUnion(chapterId)
              : FieldValue.arrayRemove(chapterId),
        },
        { merge: true }
      );
    });

    const progressSnap = await progressRef.get();
    const progress = serializeProgress(progressSnap.exists ? progressSnap.data() : undefined);

    return NextResponse.json({ ok: true, progress });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message.includes("auth/argument-error") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
