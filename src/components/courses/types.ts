import type { QuizQuestion } from "@/types/assignments";

export type Chapter = {
  id: string;
  title: string;
  description?: string;
  shortDesc?: string;
  text?: string;
  type: "video" | "module" | "pdf" | "quiz";
  videoId?: string;
  pdfUrl?: string;
  image?: string;
  createdAt: Date | number;
  quizQuestions?: QuizQuestion[];
  quizMinScore?: number;
};
