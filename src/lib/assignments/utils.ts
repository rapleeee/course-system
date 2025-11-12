import type {
  Assignment,
  AutoGradeResult,
  QuizAnswerEntry,
  QuizSubmission,
} from "@/types/assignments";

export const ALREADY_SUBMITTED_ERROR =
  "Kamu sudah mengirim jawaban. Jawaban baru tidak diizinkan.";

export const normalizeNumberArray = (values: unknown): number[] => {
  if (!Array.isArray(values)) return [];
  return Array.from(
    new Set(values.map((n) => (typeof n === "number" ? n : parseInt(String(n), 10))))
  )
    .filter((n) => Number.isInteger(n) && n >= 0)
    .sort((a, b) => a - b);
};

export const extractChoices = (entry: QuizAnswerEntry | undefined): number[] => {
  if (!entry || entry.type !== "mcq") return [];
  return normalizeNumberArray(entry.choices);
};

export function computeAutoGrading(
  assignment: Assignment,
  answers: QuizSubmission
): AutoGradeResult {
  if (assignment.type !== "quiz" || !assignment.autoGrading) {
    return { autoScore: null, autoApprove: false, correctCount: 0, totalGradable: 0 };
  }

  const questions = Array.isArray(assignment.questions) ? assignment.questions : [];
  if (questions.length === 0) {
    return { autoScore: null, autoApprove: false, correctCount: 0, totalGradable: 0 };
  }

  let correct = 0;
  let gradable = 0;
  let allMcq = true;

  questions.forEach((q, idx) => {
    if (q.type !== "mcq") {
      allMcq = false;
      return;
    }

    gradable += 1;
    const correctIndices = normalizeNumberArray(q.correctIndices ?? []);

    const entry = answers[idx];
    if (!entry || entry.type !== "mcq") {
      return;
    }
    const chosen = normalizeNumberArray(entry.choices);

    if (
      chosen.length > 0 &&
      chosen.length === correctIndices.length &&
      chosen.every((value, i) => value === correctIndices[i])
    ) {
      correct += 1;
    }
  });

  const autoScore = gradable > 0 ? correct / gradable : null;
  const autoApprove = allMcq && gradable > 0;

  return { autoScore, autoApprove, correctCount: correct, totalGradable: gradable };
}
