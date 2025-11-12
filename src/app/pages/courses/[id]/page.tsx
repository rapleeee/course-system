"use client";

import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { useEffect, useRef, useState, type ReactNode, type SyntheticEvent } from "react";
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
import { Button } from "@/components/ui/button";
import type { User } from "firebase/auth";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

type Course = {
  title: string;
  description: string;
  mentor: string;
  imageUrl: string;
  accessType?: "free" | "subscription" | "paid" | string;
  isFree?: boolean;
  price?: number | null;
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
      onPaste={handlePrevent}
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
  const [hasAccess, setHasAccess] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const securePageRef = useRef<HTMLDivElement | null>(null);
  const handleRetry = () => setReloadToken((token) => token + 1);

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

  useEffect(() => {
    if (typeof window === "undefined") return;

    const secureSelector = "[data-secure-content='true']";
    const blockedCtrlKeys = new Set(["s", "p", "u", "c", "x", "i", "j", "k"]);

    const elementWithinSecure = (node: Node | null): boolean => {
      if (!node) return false;
      if (node instanceof Element) {
        return Boolean(node.closest(secureSelector));
      }
      if (node instanceof Text) {
        return elementWithinSecure(node.parentElement);
      }
      return false;
    };

    const isWithinSecureScope = (event?: Event) => {
      if (event) {
        if (typeof event.composedPath === "function") {
          const path = event.composedPath();
          if (path.some((item) => item instanceof Element && item.matches?.(secureSelector))) {
            return true;
          }
        }
        const target = event.target as Node | null;
        if (elementWithinSecure(target)) return true;
      }

      const active = document.activeElement;
      if (elementWithinSecure(active)) return true;

      const selection = window.getSelection();
      if (selection?.anchorNode && elementWithinSecure(selection.anchorNode)) {
        return true;
      }

      return false;
    };

    const blockContextMenu = (event: MouseEvent) => {
      if (isWithinSecureScope(event)) {
        event.preventDefault();
      }
    };

    const blockKeyDown = (event: KeyboardEvent) => {
      if (!isWithinSecureScope(event)) return;

      const ctrlOrMeta = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();

      const shouldBlockWithModifier = ctrlOrMeta && blockedCtrlKeys.has(key);
      const isFunctionBlock =
        key === "f12" ||
        key === "printscreen" ||
        (event.altKey && key === "printscreen");

      if (shouldBlockWithModifier || isFunctionBlock) {
        event.preventDefault();
        event.stopPropagation();

        if (key === "printscreen" && "clipboard" in navigator && typeof navigator.clipboard.writeText === "function") {
          navigator.clipboard.writeText("Tangkapan layar dinonaktifkan untuk konten ini.").catch(() => {});
        }
      }
    };

    const blockClipboard = (event: ClipboardEvent) => {
      if (isWithinSecureScope(event)) {
        event.preventDefault();
      }
    };

    const disableSelection = (event: Event) => {
      if (isWithinSecureScope(event)) {
        event.preventDefault();
      }
    };

    const addNoPrintClass = () => {
      document.body.classList.add("no-print");
    };

    const removeNoPrintClass = () => {
      document.body.classList.remove("no-print");
    };

    window.addEventListener("contextmenu", blockContextMenu, true);
    window.addEventListener("keydown", blockKeyDown, true);
    document.addEventListener("copy", blockClipboard, true);
    document.addEventListener("cut", blockClipboard, true);
    document.addEventListener("paste", blockClipboard, true);
    document.addEventListener("selectstart", disableSelection, true);
    window.addEventListener("beforeprint", addNoPrintClass);
    window.addEventListener("afterprint", removeNoPrintClass);

    const styleEl = document.createElement("style");
    styleEl.dataset.courseSecurity = "true";
    styleEl.textContent = `
      @media print {
        body.no-print * {
          visibility: hidden !important;
        }
        body.no-print::before {
          content: "Printing dinonaktifkan untuk konten ini.";
          visibility: visible !important;
          display: block;
          padding: 2rem;
          font-size: 1.25rem;
          text-align: center;
        }
      }
    `;
    document.head.appendChild(styleEl);

    return () => {
      window.removeEventListener("contextmenu", blockContextMenu, true);
      window.removeEventListener("keydown", blockKeyDown, true);
      document.removeEventListener("copy", blockClipboard, true);
      document.removeEventListener("cut", blockClipboard, true);
      document.removeEventListener("paste", blockClipboard, true);
      document.removeEventListener("selectstart", disableSelection, true);
      window.removeEventListener("beforeprint", addNoPrintClass);
      window.removeEventListener("afterprint", removeNoPrintClass);
      document.body.classList.remove("no-print");
      if (styleEl.parentNode) {
        styleEl.parentNode.removeChild(styleEl);
      }
    };
  }, []);

  const handleToggleChapterCompleted = async (chapterId: string) => {
    if (!user || !id) return;
    const previous = new Set(completedIds);
    const isCompleted = completedIds.has(chapterId);
    setCompletedIds((prev) => {
      const next = new Set(prev);
      if (isCompleted) next.delete(chapterId);
      else next.add(chapterId);
      return next;
    });
    try {
      const result = await mutateCourseProgress(
        user,
        id as string,
        chapterId,
        isCompleted ? "remove" : "add"
      );
      if (result?.completedChapterIds) {
        setCompletedIds(new Set(result.completedChapterIds));
      }
    } catch (err) {
      console.error("Failed to update progress", err);
      setCompletedIds(new Set(previous));
      toast.error("Gagal memperbarui progres. Coba lagi.");
    }
  };

  useEffect(() => {
    if (!user && !authLoading) {
      router.push("/auth/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!id || !user) return;

    let cancelled = false;

    const fetchSecuredCourse = async () => {
      setIsLoading(true);
      setNotFound(false);
      setFetchError(null);

      try {
        const token = await user.getIdToken();
        const response = await fetch(`/api/courses/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (cancelled) return;

        if (response.status === 403) {
          setHasAccess(false);
          setCourse(null);
          setChapters([]);
          setCompletedIds(new Set());
          setFetchError(null);
          setIsLoading(false);
          return;
        }

        if (response.status === 404) {
          setNotFound(true);
          setCourse(null);
          setHasAccess(true);
          setChapters([]);
          setCompletedIds(new Set());
          setFetchError(null);
          setIsLoading(false);
          return;
        }

        if (!response.ok) {
          const message = await response.json().catch(() => ({}));
          throw new Error(message?.error || "Gagal memuat data kursus.");
        }

        const payload = await response.json();

        if (cancelled) return;

        setCourse(payload.course ?? null);
        setChapters(Array.isArray(payload.chapters) ? payload.chapters : []);
        setHasAccess(payload.hasAccess !== false);
        setCompletedIds(
          new Set(
            Array.isArray(payload.progress?.completedChapterIds)
              ? payload.progress.completedChapterIds
              : []
          )
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Failed to load course data securely:", message);
        if (!cancelled) {
          setCourse(null);
          setChapters([]);
          setCompletedIds(new Set());
          setHasAccess(true);
          setNotFound(false);
          setFetchError(message || "Gagal memuat data kursus.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchSecuredCourse();

    return () => {
      cancelled = true;
    };
  }, [id, user, reloadToken]);

  if (isLoading) {
    return (
      <Layout pageTitle="Memuat Kelas">
        <div className="space-y-6 max-w-full mx-auto">
          <div className="rounded-lg border bg-card p-6 shadow-sm space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
          <div className="rounded-lg border bg-card p-6 shadow-sm space-y-4">
            <Skeleton className="h-6 w-40" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="space-y-3 rounded-lg border border-dashed border-border/60 p-4">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-32 w-full rounded-md" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (fetchError) {
    return (
      <Layout pageTitle="Gagal Memuat Kelas">
        <div className="mx-auto max-w-2xl rounded-lg border bg-card p-8 text-center shadow-sm space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Tidak bisa memuat materi</h2>
          <p className="text-sm text-muted-foreground">
            {fetchError || "Terjadi kesalahan saat mengambil data. Coba beberapa saat lagi."}
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button variant="outline" onClick={handleRetry}>
              Coba Lagi
            </Button>
            <Link href="/pages/courses" className="text-sm text-blue-600 underline">
              Kembali ke daftar kelas
            </Link>
          </div>
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

  if (notFound || !course) {
    return (
      <Layout pageTitle="Kelas Tidak Ditemukan">
        <div className="text-center p-10">
          <p className="text-lg font-semibold mb-2">Kelas tidak ditemukan.</p>
          <p className="text-muted-foreground">Silakan kembali ke halaman Kelas.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout pageTitle={course.title}>
      <div
        ref={securePageRef}
        data-course-secure-root="true"
        className="space-y-6 max-w-full mx-auto"
      >
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
              {chapters.map((chapter, index) => {
                const isCompleted = completedIds.has(chapter.id);
                return (
                  <AccordionItem
                    key={chapter.id}
                    value={`item-${index}`}
                    className="border-b border-border"
                  >
                    <AccordionTrigger className="flex items-center justify-between gap-4 text-left hover:no-underline">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">#{index + 1}</span>
                          <span className="font-medium">{chapter.title}</span>
                        </div>
                        <label
                          onClick={(event) => event.stopPropagation()}
                          className="flex items-center gap-2 rounded-full border border-border/70 bg-background/90 px-3 py-1 text-xs font-medium text-foreground shadow-sm"
                        >
                          <input
                            type="checkbox"
                            aria-label={`Tandai selesai: ${chapter.title}`}
                            checked={isCompleted}
                            onChange={() => handleToggleChapterCompleted(chapter.id)}
                            className="h-3.5 w-3.5 rounded border-border text-foreground focus:ring-ring"
                          />
                          <span>{isCompleted ? "Selesai" : "Belum selesai"}</span>
                        </label>
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
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </div>
      </div>
    </Layout>
  );
}

type ProgressMutationResult = {
  completedChapterIds: string[];
  updatedAt: string | null;
} | null;

async function mutateCourseProgress(
  user: User,
  courseId: string,
  chapterId: string,
  action: "add" | "remove"
): Promise<ProgressMutationResult> {
  const token = await user.getIdToken();
  const response = await fetch(`/api/courses/${courseId}/progress`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ chapterId, action }),
  });

  const text = await response.text();
  let payload: unknown;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = undefined;
    }
  }

  if (!response.ok) {
    const message = (() => {
      if (payload && typeof payload === "object" && payload !== null && "error" in payload) {
        const raw = (payload as { error?: unknown }).error;
        if (typeof raw === "string") {
          return raw;
        }
      }
      return "Gagal menyimpan progres.";
    })();
    throw new Error(message);
  }

  const progressPayload =
    payload && typeof payload === "object" && payload !== null && "progress" in payload
      ? (payload as { progress?: unknown }).progress
      : undefined;

  const ids = Array.isArray(
    progressPayload && typeof progressPayload === "object" && progressPayload !== null
      ? (progressPayload as { completedChapterIds?: unknown }).completedChapterIds
      : null
  )
    ? (
        (progressPayload as {
          completedChapterIds: unknown[];
        }).completedChapterIds ?? []
      ).filter((value: unknown): value is string => typeof value === "string")
    : null;

  if (!ids) return null;

  const updatedAt =
    progressPayload &&
    typeof progressPayload === "object" &&
    progressPayload !== null &&
    typeof (progressPayload as { updatedAt?: unknown }).updatedAt === "string"
      ? (progressPayload as { updatedAt: string }).updatedAt
      : null;

  return {
    completedChapterIds: ids,
    updatedAt,
  };
}
