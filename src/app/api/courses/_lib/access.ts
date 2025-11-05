import { Timestamp, type DocumentData } from "firebase-admin/firestore";

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
