"use client";

import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs, query, orderBy, setDoc, serverTimestamp, arrayUnion, arrayRemove, type FieldValue } from "firebase/firestore";
import { useEffect, useState, type ReactNode, type SyntheticEvent } from "react";
import Layout from "@/components/layout";
import Link from "next/link";
import Image from "next/image";
import YouTube from 'react-youtube';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

type Course = {
  title: string;
  description: string;
  mentor: string;
  imageUrl: string;
  accessType?: "free" | "subscription" | "paid";
  isFree?: boolean;
  price?: number;
  materialType: string;
};

type Chapter = {
  id: string;
  title: string;
  description?: string;
  type: "video" | "module" | "pdf";
  videoId?: string;
  image?: string;
  pdfUrl?: string;
  text?: string;
  createdAt: Date | number;
};

const buildProtectedPdfSrc = (pdfUrl: string) => {
  if (!pdfUrl) return "";
  return pdfUrl.includes("#")
    ? `${pdfUrl}&toolbar=0&navpanes=0&scrollbar=0`
    : `${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`;
};

const SecureContentWrapper = ({ children, watermark }: { children: ReactNode; watermark: string }) => {
  const handlePrevent = (event: SyntheticEvent) => {
    event.preventDefault();
  };

  return (
    <div
      data-secure-content="true"
      className="relative select-none"
      onContextMenu={handlePrevent}
      onCopy={handlePrevent}
      onCut={handlePrevent}
      onDragStart={handlePrevent}
      draggable={false}
    >
      {children}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          aria-hidden="true"
          className="px-6 py-2 rounded-full border border-foreground/20 bg-background/60 text-[10px] md:text-xs font-semibold uppercase tracking-[0.35em] text-foreground/20 rotate-[-22deg] shadow-sm"
        >
          {watermark}
        </div>
      </div>
    </div>
  );
};

const renderChapterContent = (chapter: Chapter) => {
  switch (chapter.type) {
    case "video":
      return chapter.videoId ? (
        <div className="aspect-video w-full rounded-lg overflow-hidden">
          <YouTube
            videoId={chapter.videoId}
            opts={{
              width: '100%',
              height: '100%',
              playerVars: {
                autoplay: 0,
                modestbranding: 1,
                rel: 0,
                disablekb: 1,
              },
            }}
            className="w-full h-full"
          />
        </div>
      ) : null;

    case "pdf":
      return chapter.pdfUrl ? (
        <div className="w-full h-[600px] rounded-lg overflow-hidden border border-border bg-card">
          <iframe
            src={buildProtectedPdfSrc(chapter.pdfUrl)}
            className="w-full h-full"
            title={`PDF: ${chapter.title}`}
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        </div>
      ) : null;

    case "module":
      return chapter.image ? (
        <div className="relative w-full h-[400px] bg-muted rounded-lg">
          <Image
            src={chapter.image}
            alt={chapter.title}
            fill
            className="rounded-lg object-contain"
            draggable={false}
            loading="lazy"
          />
        </div>
      ) : null;

    default:
      return null;
  }
};

const renderSecureChapterContent = (chapter: Chapter, watermark: string) => {
  const content = renderChapterContent(chapter);
  if (!content) return null;
  return <SecureContentWrapper watermark={watermark}>{content}</SecureContentWrapper>;
};

export default function CourseDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [hasAccess, setHasAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const secureSelector = "[data-secure-content='true']";
    const preventIfSecure = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (target && target.closest(secureSelector)) {
        event.preventDefault();
      }
    };

    const preventClipboard = (event: ClipboardEvent) => {
      const selection = window.getSelection();
      const anchorNode = selection?.anchorNode;
      const element =
        anchorNode instanceof Element
          ? anchorNode
          : anchorNode instanceof Text
            ? anchorNode.parentElement
            : null;

      if (element && element.closest(secureSelector)) {
        event.preventDefault();
      }
    };

    const blockedCodes = new Set(["KeyS", "KeyP", "KeyC", "KeyX", "KeyD"]);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      const target = event.target as HTMLElement | null;
      if (target && target.closest(secureSelector) && blockedCodes.has(event.code)) {
        event.preventDefault();
      }
    };

    document.addEventListener("contextmenu", preventIfSecure);
    document.addEventListener("dragstart", preventIfSecure);
    document.addEventListener("copy", preventClipboard);
    document.addEventListener("cut", preventClipboard);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("contextmenu", preventIfSecure);
      document.removeEventListener("dragstart", preventIfSecure);
      document.removeEventListener("copy", preventClipboard);
      document.removeEventListener("cut", preventClipboard);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleToggleChapterCompleted = async (chapterId: string) => {
    if (!user || !id) return;
    const isCompleted = completedIds.has(chapterId);
    // Optimistic update
    setCompletedIds((prev) => {
      const next = new Set(prev);
      if (isCompleted) next.delete(chapterId);
      else next.add(chapterId);
      return next;
    });
    try {
      await updateProgress(
        db,
        user.uid,
        id as string,
        chapterId,
        isCompleted ? "remove" : "add",
        { title: course?.title, imageUrl: course?.imageUrl }
      );
    } catch (err) {
      console.error("Failed to update progress", err);
      // Revert on failure
      setCompletedIds((prev) => {
        const next = new Set(prev);
        if (isCompleted) next.add(chapterId);
        else next.delete(chapterId);
        return next;
      });
    }
  };

  useEffect(() => {
    if (!user && !authLoading) {
      router.push("/auth/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!id || !user) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch course data
        const courseSnap = await getDoc(doc(db, "courses", id as string));
        if (courseSnap.exists()) {
          setCourse(courseSnap.data() as Course);
        }

        // Check user access
        const userSnap = await getDoc(doc(db, "users", user.uid));
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const claimedCourses = userData.claimedCourses || [];
          setHasAccess(claimedCourses.includes(id));
        }

        // Fetch chapters
        const chapterRef = collection(db, "courses", id as string, "chapters");
        const q = query(chapterRef, orderBy("createdAt", "asc"));
        const chapterSnap = await getDocs(q);
        const chapterData = chapterSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Chapter[];
        setChapters(chapterData);

        // Fetch progress for this course
        const progressRef = doc(db, "users", user.uid, "progress", id as string);
        const progressSnap = await getDoc(progressRef);
        if (progressSnap.exists()) {
          const data = progressSnap.data() as { completedChapterIds?: string[] };
          setCompletedIds(new Set(data.completedChapterIds || []));
        } else {
          setCompletedIds(new Set());
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id, user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div
          aria-label="Memuat"
          className="animate-spin rounded-full h-12 w-12 border-2 border-muted-foreground/30 border-t-foreground"
        />
      </div>
    );
  }

  if (!course) {
    return (
      <Layout pageTitle="Kelas Tidak Ditemukan">
        <div className="text-center p-10">
          <p className="text-lg font-semibold mb-2">Kelas tidak ditemukan.</p>
          <p className="text-muted-foreground">Silakan kembali ke halaman Kelas.</p>
        </div>
      </Layout>
    );
  }

  if (!hasAccess) {
    return (
      <Layout pageTitle="Akses Ditolak">
        <div className="text-center p-10">
          <p className="text-lg font-semibold mb-2">Kamu belum mengikuti kelas ini.</p>
          <p className="text-muted-foreground">Silakan kembali ke halaman Kelas dan klik Ikuti Kelas yang tersedia.</p>
          <div className="mt-4">
            <Link href="/pages/subscription" className="text-blue-600 underline text-sm">
              Upgrade langganan untuk akses premium
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout pageTitle={course.title}>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Course Header */}
        <div className="rounded-lg overflow-hidden shadow-sm border bg-card">
          <div className="relative h-48 md:h-64">
            <Image
              src={course.imageUrl || "/photos/working.jpg"}
              alt={course.title}
              fill
              className="object-cover"
              draggable={false}
            />
          </div>
          <div className="p-6">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">{course.title}</h1>
            <p className="text-sm text-muted-foreground mt-2">Mentor: {course.mentor}</p>
            <p className="text-sm md:text-base text-muted-foreground mt-1">{course.description}</p>
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4 text-foreground">
            Materi Chapter
          </h2>
          
          {chapters.length === 0 ? (
            <p className="text-muted-foreground">
              Belum ada chapter ditambahkan oleh pengajar.
            </p>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {chapters.map((chapter, index) => (
                <AccordionItem 
                  key={chapter.id} 
                  value={`item-${index}`}
                  className="border-b border-border"
                >
                  <AccordionTrigger className="text-left hover:no-underline">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">#{index + 1}</span>
                      <span className="font-medium">{chapter.title}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    {renderSecureChapterContent(chapter, user?.email ?? user?.displayName ?? "Pengguna terdaftar")}

                    {chapter.description && (
                      <p className="text-sm text-muted-foreground">
                        {chapter.description}
                      </p>
                    )}

                    {chapter.text && (
                      <p className="text-sm md:text-base text-foreground whitespace-pre-line">
                        {chapter.text}
                      </p>
                    )}

                    {!chapter.videoId && !chapter.image && !chapter.pdfUrl && !chapter.text && (
                      <p className="text-sm text-muted-foreground italic">
                        Konten belum tersedia.
                      </p>
                    )}

                    {/* Completion toggle inside content */}
                    <div className="mt-2 pt-3 border-t border-border flex items-center justify-end gap-2">
                      <label className="flex items-center gap-2 text-sm text-muted-foreground select-none">
                        <input
                          type="checkbox"
                          aria-label={`Tandai selesai: ${chapter.title}`}
                          checked={completedIds.has(chapter.id)}
                          onChange={() => handleToggleChapterCompleted(chapter.id)}
                          className="h-4 w-4 rounded border-border text-foreground focus:ring-ring"
                        />
                        Tandai selesai
                      </label>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      </div>
    </Layout>
  );
}

async function updateProgress(
  db: typeof import("@/lib/firebase").db,
  userId: string,
  courseId: string,
  chapterId: string,
  action: "add" | "remove",
  courseMeta?: { title?: string; imageUrl?: string }
) {
  const progressRef = doc(db, "users", userId, "progress", courseId);
  const payload: { updatedAt: FieldValue; completedChapterIds?: FieldValue; courseTitle?: string; courseImageUrl?: string } = {
    updatedAt: serverTimestamp(),
  };
  if (courseMeta?.title) payload.courseTitle = courseMeta.title;
  if (courseMeta?.imageUrl) payload.courseImageUrl = courseMeta.imageUrl;

  if (action === "add") {
    payload.completedChapterIds = arrayUnion(chapterId);
  } else {
    payload.completedChapterIds = arrayRemove(chapterId);
  }

  await setDoc(progressRef, payload, { merge: true });
}
