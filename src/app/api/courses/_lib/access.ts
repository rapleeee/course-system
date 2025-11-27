import { Timestamp, type DocumentData } from "firebase-admin/firestore";
import type { QuizQuestion } from "@/types/assignments";

export type SerializedCourse = {
  title: string;
  description: string;
  mentor: string;
  imageUrl: string;
  accessType?: string;
  isFree: boolean;
  price: number | null;
  materialType: string;
};

export type SerializedChapter = {
  id: string;
  title: string;
  description: string;
  type: string;
  videoId: string;
  image: string;
  pdfUrl: string;
  text: string;
  createdAt: number | null;
  quizQuestions?: QuizQuestion[];
  quizMinScore?: number | null;
};

export type SerializedProgress = {
  completedChapterIds: string[];
  updatedAt: string | null;
};

export type ExtractedRoles = {
  singular?: string;
  multi: string[];
};

export const serializeCourse = (data: DocumentData | undefined): SerializedCourse | null => {
  if (!data) return null;
  return {
    title: typeof data.title === "string" ? data.title : "",
    description: typeof data.description === "string" ? data.description : "",
    mentor: typeof data.mentor === "string" ? data.mentor : "",
    imageUrl: typeof data.imageUrl === "string" ? data.imageUrl : "",
    accessType: typeof data.accessType === "string" ? data.accessType : undefined,
    isFree: Boolean(data.isFree),
    price: typeof data.price === "number" ? data.price : null,
    materialType: typeof data.materialType === "string" ? data.materialType : "",
  };
};

export const serializeChapter = (id: string, data: DocumentData): SerializedChapter => {
  const createdAt =
    data.createdAt instanceof Timestamp
      ? data.createdAt.toMillis()
      : typeof data.createdAt === "number"
        ? data.createdAt
        : null;

  const rawQuizQuestions = Array.isArray(data.quizQuestions) ? data.quizQuestions : [];
  const quizQuestions: QuizQuestion[] = rawQuizQuestions.map((entry) => {
    const value = (entry ?? {}) as Record<string, unknown>;
    const prompt = typeof value.prompt === "string" ? value.prompt : "";
    const type = value.type === "text" ? "text" : "mcq";
    const options = Array.isArray(value.options)
      ? value.options.map((opt) => (typeof opt === "string" ? opt : String(opt ?? "")))
      : undefined;
    const correctIndices = Array.isArray(value.correctIndices)
      ? value.correctIndices
          .map((n) => (typeof n === "number" ? n : parseInt(String(n), 10)))
          .filter((n) => Number.isInteger(n) && n >= 0)
      : undefined;
    return {
      prompt,
      type,
      options,
      correctIndices,
    };
  });

  const rawMinScore = data.quizMinScore;
  const quizMinScore =
    typeof rawMinScore === "number" && Number.isFinite(rawMinScore)
      ? Math.max(0, Math.min(100, Math.floor(rawMinScore)))
      : null;

  return {
    id,
    title: typeof data.title === "string" ? data.title : "",
    description: typeof data.description === "string" ? data.description : "",
    type: typeof data.type === "string" ? data.type : "module",
    videoId: typeof data.videoId === "string" ? data.videoId : "",
    image: typeof data.image === "string" ? data.image : "",
    pdfUrl: typeof data.pdfUrl === "string" ? data.pdfUrl : "",
    text: typeof data.text === "string" ? data.text : "",
    createdAt,
    quizQuestions: quizQuestions.length > 0 ? quizQuestions : undefined,
    quizMinScore,
  };
};

export const serializeProgress = (data: DocumentData | undefined): SerializedProgress => {
  const ids = Array.isArray(data?.completedChapterIds)
    ? data?.completedChapterIds.filter((value: unknown): value is string => typeof value === "string")
    : [];

  const updatedAt =
    data?.updatedAt instanceof Timestamp
      ? data.updatedAt.toDate().toISOString()
      : null;

  return {
    completedChapterIds: ids,
    updatedAt,
  };
};

export const extractRoles = (data: DocumentData | undefined): ExtractedRoles => {
  const singular = typeof data?.role === "string" ? data.role : undefined;
  const multi = Array.isArray(data?.roles)
    ? data.roles.filter((value: unknown): value is string => typeof value === "string")
    : [];
  return { singular, multi };
};

export const userHasElevatedRole = (roles: ExtractedRoles): boolean => {
  const elevated = new Set(["admin", "guru", "mentor"]);
  if (roles.singular && elevated.has(roles.singular)) return true;
  return roles.multi.some((role) => elevated.has(role));
};

export const courseIsFree = (course: SerializedCourse | null): boolean => {
  if (!course) return false;
  if (course.isFree) return true;
  return course.accessType?.toLowerCase() === "free";
};

export const userHasSubscriptionAccess = (
  userData: DocumentData | undefined,
  course: SerializedCourse | null
): boolean => {
  if (!course) return false;
  const subscriptionEnabled = Boolean(userData?.subscriptionActive);
  if (!subscriptionEnabled) return false;
  const accessType = course.accessType?.toLowerCase();
  return accessType === "subscription";
};

export const userHasClaimedCourse = (
  userData: DocumentData | undefined,
  courseId: string
): boolean => {
  if (!userData) return false;
  const claimed = Array.isArray(userData.claimedCourses) ? userData.claimedCourses : [];
  return claimed.includes(courseId);
};

export const userHasCourseAccess = (
  course: SerializedCourse | null,
  roles: ExtractedRoles,
  userData: DocumentData | undefined,
  courseId: string
): boolean => {
  return (
    courseIsFree(course) ||
    userHasElevatedRole(roles) ||
    userHasSubscriptionAccess(userData, course) ||
    userHasClaimedCourse(userData, courseId)
  );
};
