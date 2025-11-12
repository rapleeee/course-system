export type QuizQuestion = {
  prompt: string;
  type: "mcq" | "text";
  options?: string[];
  correctIndices?: number[];
};

export type SubmissionStatus = "submitted" | "approved" | "rejected" | "needs_correction";

export type TaskSubmission = { text: string };

export type McqAnswer = { type: "mcq"; choices: number[] };
export type TextAnswer = { type: "text"; value: string };
export type QuizAnswerEntry = McqAnswer | TextAnswer;
export type QuizSubmission = QuizAnswerEntry[];

export type SubmissionSummary = {
  status?: SubmissionStatus;
  awardedPoints?: number;
  autoScore?: number | null;
  answers?: QuizSubmission | TaskSubmission;
};

export type Assignment = {
  id: string;
  title: string;
  description?: string;
  type: "task" | "quiz";
  points?: number;
  autoGrading?: boolean;
  questions?: QuizQuestion[];
  createdAt?: unknown;
  createdBy?: string;
  createdByName?: string;
  createdBySubject?: string;
};

export type AutoGradeResult = {
  autoScore: number | null;
  autoApprove: boolean;
  correctCount: number;
  totalGradable: number;
};
