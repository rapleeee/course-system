import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type SubmitBody = {
  answers: unknown; // free-form JSON; could be {text: string} or structured answers
};

type AdminQuizQuestion = {
  type?: "mcq" | "text";
  correctIndices?: unknown[];
};

type McqAnswer = { type: "mcq"; choices: number[] };
type TextAnswer = { type: "text"; value: string };
type QuizSubmission = Array<McqAnswer | TextAnswer>;

type AssignmentDoc = {
  type?: "task" | "quiz";
  autoGrading?: boolean;
  questions?: AdminQuizQuestion[];
  points?: number;
};

type SubmissionDoc = {
  status?: "submitted" | "approved" | "rejected" | "needs_correction";
  awardedPoints?: number;
  autoScore?: number | null;
};

type AutoGradeResult = {
  autoScore: number | null;
  autoApprove: boolean;
  correctCount: number;
  totalGradable: number;
};

type SubmissionWrite = {
  uid: string;
  assignmentId: string;
  answers: QuizSubmission | SubmitBody["answers"];
  status: "submitted" | "approved";
  awardedPoints: number;
  autoScore: number | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

const ALREADY_SUBMITTED_ERROR = "Kamu sudah mengirim jawaban. Jawaban baru tidak diizinkan.";

function normalizeQuizAnswers(questions: AdminQuizQuestion[], rawAnswers: unknown): QuizSubmission {
  const sourceArray = Array.isArray(rawAnswers) ? rawAnswers : undefined;
  const sourceObject =
    !sourceArray && rawAnswers && typeof rawAnswers === "object"
      ? (rawAnswers as Record<string, unknown>)
      : undefined;

  return questions.map((q, idx) => {
    const raw = sourceArray ? sourceArray[idx] : sourceObject?.[String(idx)];
    if (q?.type === "mcq") {
      let source: unknown[] = [];
      if (raw && typeof raw === "object" && !Array.isArray(raw)) {
        const maybeChoices = (raw as { choices?: unknown }).choices;
        source = Array.isArray(maybeChoices) ? maybeChoices : [];
      } else if (Array.isArray(raw)) {
        source = raw;
      } else if (typeof raw === "number") {
        source = [raw];
      }

      const choices = Array.from(
        new Set(
          source.map((n) => {
            if (typeof n === "number") return n;
            if (typeof n === "string") return parseInt(n, 10);
            return Number.NaN;
          })
        )
      )
        .filter((n) => Number.isInteger(n) && n >= 0)
        .sort((a, b) => a - b);

      return { type: "mcq", choices } satisfies McqAnswer;
    }
    let textValue = "";
    if (raw && typeof raw === "object" && raw !== null && "value" in (raw as Record<string, unknown>)) {
      const candidate = (raw as { value?: unknown }).value;
      if (typeof candidate === "string") textValue = candidate;
      else if (typeof candidate === "number") textValue = String(candidate);
    } else if (typeof raw === "string") {
      textValue = raw;
    } else if (typeof raw === "number") {
      textValue = String(raw);
    }
    return { type: "text", value: textValue } satisfies TextAnswer;
  });
}

function evaluateAutoGrading(
  questions: AdminQuizQuestion[],
  autoGrading: boolean,
  normalizedAnswers: QuizSubmission
): AutoGradeResult {
  if (!autoGrading || !Array.isArray(questions) || questions.length === 0) {
    return { autoScore: null, autoApprove: false, correctCount: 0, totalGradable: 0 };
  }

  let correct = 0;
  let gradable = 0;
  let allMcq = true;

  questions.forEach((q, idx) => {
    if (q?.type !== "mcq") {
      allMcq = false;
      return;
    }

    gradable += 1;
    const correctIndices = Array.isArray(q.correctIndices)
      ? Array.from(
          new Set(
            q.correctIndices.map((n) => {
              if (typeof n === "number") return n;
              if (typeof n === "string") return parseInt(n, 10);
              return Number.NaN;
            })
          )
        )
          .filter((n) => Number.isInteger(n) && n >= 0)
      : [];
    const sortedCorrect = [...correctIndices].sort((a, b) => a - b);

    const entry = normalizedAnswers[idx];
    if (!entry || entry.type !== "mcq") {
      return;
    }
    const sortedChosen = Array.from(new Set(entry.choices)).sort((a, b) => a - b);

    if (
      sortedChosen.length > 0 &&
      sortedChosen.length === sortedCorrect.length &&
      sortedChosen.every((value, i) => value === sortedCorrect[i])
    ) {
      correct += 1;
    }
  });

  const autoScore = gradable > 0 ? correct / gradable : null;
  const autoApprove = allMcq && gradable > 0;
  return { autoScore, autoApprove, correctCount: correct, totalGradable: gradable };
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Missing assignment id" }, { status: 400 });

    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!authHeader?.toLowerCase().startsWith("bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const idToken = authHeader.split(" ")[1];
    const auth = getAuth();
    const decoded = await auth.verifyIdToken(idToken);
    const uid = decoded.uid;

    const body = (await req.json()) as SubmitBody;
    if (!body?.answers) return NextResponse.json({ error: "Missing answers" }, { status: 400 });

    const asgRef = adminDb.collection("assignments").doc(id);
    const asgSnap = await asgRef.get();
    if (!asgSnap.exists) return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    const asg = asgSnap.data() as AssignmentDoc;

    const questions = Array.isArray(asg.questions) ? asg.questions : [];
    const maxPoints = typeof asg.points === "number" ? Math.max(0, Math.floor(asg.points)) : 0;

    let normalizedAnswers: QuizSubmission | SubmitBody["answers"];
    let autoScore: number | null = null;
    let autoApprove = false;
    let correctCount = 0;
    let totalGradable = 0;

    if (asg.type === "quiz") {
      const quizAnswers = normalizeQuizAnswers(questions, body.answers);
      normalizedAnswers = quizAnswers;
      const evaluation = evaluateAutoGrading(questions, Boolean(asg.autoGrading), quizAnswers);
      autoScore = evaluation.autoScore;
      autoApprove = evaluation.autoApprove;
      correctCount = evaluation.correctCount;
      totalGradable = evaluation.totalGradable;
    } else {
      normalizedAnswers = body.answers;
    }

    const subRef = asgRef.collection("submissions").doc(uid);
    const userRef = adminDb.collection("users").doc(uid);

    let finalStatus: "submitted" | "approved" = autoApprove ? "approved" : "submitted";
    let finalAwardedPoints = 0;
    let autoApproved = autoApprove;
    let justAwarded = false;

    await adminDb.runTransaction(async (tx) => {
      const subSnap = await tx.get(subRef);
      const now = Timestamp.now();
      const existing = subSnap.exists ? (subSnap.data() as SubmissionDoc) : undefined;

      if (existing) {
        throw new Error(ALREADY_SUBMITTED_ERROR);
      }

      const gradable = totalGradable;
      const perQuestion = gradable > 0 ? maxPoints / gradable : 0;
      const computedAward = autoScore !== null ? Math.round(correctCount * perQuestion) : 0;
      const awardedPoints = autoApprove ? Math.min(maxPoints, Math.max(0, computedAward)) : 0;

      const base: SubmissionWrite = {
        uid,
        assignmentId: id,
        answers: normalizedAnswers,
        status: autoApprove ? "approved" : "submitted",
        awardedPoints,
        autoScore,
        createdAt: now,
        updatedAt: now,
      };

      if (autoApprove && awardedPoints > 0) {
        tx.set(userRef, { totalScore: FieldValue.increment(awardedPoints) }, { merge: true });
        justAwarded = true;
      }

      tx.set(subRef, base);

      finalStatus = base.status;
      finalAwardedPoints = base.awardedPoints;
      autoApproved = finalStatus === "approved";
    });

    return NextResponse.json({ ok: true, autoScore, autoApproved, justAwarded, awardedPoints: finalAwardedPoints });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === ALREADY_SUBMITTED_ERROR) {
      return NextResponse.json({ error: ALREADY_SUBMITTED_ERROR }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
