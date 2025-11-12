"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ChevronLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/useAuth";
import { auth, db } from "@/lib/firebase";
import {
  doc,
  increment,
  onSnapshot,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import type {
  Assignment,
  QuizAnswerEntry,
  QuizSubmission,
  SubmissionSummary,
} from "@/types/assignments";
import {
  ALREADY_SUBMITTED_ERROR,
  computeAutoGrading,
  extractChoices,
  normalizeNumberArray,
} from "@/lib/assignments/utils";

type QuizAttemptPageProps = {
  params: Promise<{ id: string }>;
};

const WARNING_THRESHOLD = 5;
const AUTO_SUBMIT_THRESHOLD = 10;

const parseSubmission = (raw: unknown): SubmissionSummary | null => {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const submissionAnswers = data.answers;
  const answers = Array.isArray(submissionAnswers)
    ? (submissionAnswers as QuizSubmission)
    : undefined;
  return {
    status: data.status as SubmissionSummary["status"],
    awardedPoints: typeof data.awardedPoints === "number" ? data.awardedPoints : undefined,
    autoScore: typeof data.autoScore === "number" ? data.autoScore : null,
    answers,
  };
};

export default function QuizAttemptPage({ params }: QuizAttemptPageProps) {
  const { id: assignmentId } = use(params);
  const router = useRouter();
  const { user } = useAuth();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [assignmentLoading, setAssignmentLoading] = useState(true);
  const [submission, setSubmission] = useState<SubmissionSummary | null>(null);
  const [submissionLoading, setSubmissionLoading] = useState(true);
  const [answers, setAnswers] = useState<QuizSubmission>([]);
  const [saving, setSaving] = useState(false);
  const [rulesVisible, setRulesVisible] = useState(true);
  const [focusWarning, setFocusWarning] = useState(false);
  const [violationCount, setViolationCount] = useState(0);
  const [violationFlagged, setViolationFlagged] = useState(false);
  const autoSubmitTriggeredRef = useRef(false);
  const [leaveWarningOpen, setLeaveWarningOpen] = useState(false);
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  const [screenshotMask, setScreenshotMask] = useState(false);
  const screenshotTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const screenshotComboRef = useRef(false);

  useEffect(() => {
    const ref = doc(db, "assignments", assignmentId);
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        setAssignmentLoading(false);
        if (!snap.exists()) {
          setAssignment(null);
          return;
        }
        setAssignment({ id: snap.id, ...(snap.data() as Omit<Assignment, "id">) });
      },
      (error) => {
        console.error("Failed to load assignment:", error);
        setAssignmentLoading(false);
        toast.error("Gagal memuat data kuis.");
      }
    );
    return () => unsubscribe();
  }, [assignmentId]);

  useEffect(() => {
    if (!user?.uid) {
      setSubmission(null);
      setSubmissionLoading(false);
      return;
    }
    setSubmissionLoading(true);
    const ref = doc(db, `assignments/${assignmentId}/submissions/${user.uid}`);
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        setSubmissionLoading(false);
        setSubmission(snap.exists() ? parseSubmission(snap.data()) : null);
      },
      (error) => {
        console.error("Failed to load submission:", error);
        setSubmissionLoading(false);
      }
    );
    return () => unsubscribe();
  }, [assignmentId, user?.uid]);

  const questionList = useMemo(
    () => (assignment?.questions && Array.isArray(assignment.questions) ? assignment.questions : []),
    [assignment?.questions]
  );

  const alreadySubmitted = Boolean(submission);
  const submittedQuizAnswers = useMemo(
    () =>
      alreadySubmitted && Array.isArray(submission?.answers)
        ? (submission?.answers as QuizSubmission)
        : [],
    [alreadySubmitted, submission?.answers]
  );

  useEffect(() => {
    if (alreadySubmitted) return;
    setAnswers((prev) => {
      const next: QuizSubmission = [];
      questionList.forEach((q, idx) => {
        const existing = prev[idx];
        if (q.type === "mcq") {
          const base = existing && existing.type === "mcq" ? [...existing.choices] : [];
          next[idx] = { type: "mcq", choices: base };
        } else {
          const baseValue = existing && existing.type === "text" ? existing.value : "";
          next[idx] = { type: "text", value: baseValue };
        }
      });
      return next;
    });
  }, [questionList, alreadySubmitted]);

  const restrictionsActive = !rulesVisible && !alreadySubmitted && questionList.length > 0;

  useEffect(() => {
    if (!restrictionsActive) return;

    const triggerScreenshotMask = (options?: { persistUntilRelease?: boolean; durationMs?: number }) => {
      setScreenshotMask(true);
      if (screenshotTimeoutRef.current) {
        clearTimeout(screenshotTimeoutRef.current);
        screenshotTimeoutRef.current = null;
      }
      if (options?.persistUntilRelease) {
        return;
      }
      const delay = options?.durationMs ?? 2500;
      screenshotTimeoutRef.current = setTimeout(() => {
        setScreenshotMask(false);
        screenshotTimeoutRef.current = null;
        screenshotComboRef.current = false;
      }, delay);
    };

    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      toast.warning("Fitur klik kanan dinonaktifkan sementara demi menjaga integritas kuis.");
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const forbidden =
        event.metaKey ||
        event.ctrlKey ||
        key === "f12" ||
        key === "f5" ||
        (event.shiftKey && key === "f10") ||
        ["tab", "c", "v", "x", "p", "s", "u"].includes(key);

      const metaShiftActive = event.metaKey && event.shiftKey;
      const isPrintScreen = key === "printscreen";
      const isMacScreenshot =
        metaShiftActive && (["3", "4", "5"].includes(key) || event.code === "Digit3" || event.code === "Digit4");
      const isDelayedScreenshot = event.ctrlKey && metaShiftActive && ["3", "4", "5"].includes(key);
      const isSnippingTool = (event.ctrlKey && event.shiftKey && key === "s") || (metaShiftActive && key === "s");

      if (metaShiftActive && !screenshotComboRef.current) {
        screenshotComboRef.current = true;
        triggerScreenshotMask({ persistUntilRelease: true });
      }

      if (isPrintScreen || isMacScreenshot || isDelayedScreenshot || isSnippingTool) {
        event.preventDefault();
        screenshotComboRef.current = true;
        triggerScreenshotMask({ durationMs: 3000 });
        return;
      }

      if (forbidden) {
        event.preventDefault();
        toast.warning("Beberapa shortcut dimatikan sementara demi keamanan kuis.");
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (!event.metaKey && !event.shiftKey) {
        screenshotComboRef.current = false;
        if (!screenshotTimeoutRef.current) {
          setScreenshotMask(false);
        }
      }
    };

    const handleVisibility = () => {
      if (document.hidden) {
        setFocusWarning(true);
        setViolationCount((prev) => prev + 1);
        toast.warning("Perpindahan tab terdeteksi. Mohon tetap di halaman kuis hingga selesai.");
      }
    };

    const handleBlur = () => {
      setFocusWarning(true);
      setViolationCount((prev) => prev + 1);
      toast.warning("Jendela kuis perlu tetap aktif sampai pengerjaan selesai.");
    };

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (alreadySubmitted) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    window.addEventListener("keyup", handleKeyUp, { capture: true });
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("keyup", handleKeyUp, { capture: true });
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [restrictionsActive, alreadySubmitted]);

  useEffect(() => {
    if (!restrictionsActive) return;
    if (violationCount >= WARNING_THRESHOLD) {
      setViolationFlagged(true);
    }
  }, [violationCount, restrictionsActive]);

  useEffect(() => {
    if (!restrictionsActive) {
      setLeaveWarningOpen(false);
      setScreenshotMask(false);
      if (screenshotTimeoutRef.current) {
        clearTimeout(screenshotTimeoutRef.current);
        screenshotTimeoutRef.current = null;
      }
    }
  }, [restrictionsActive]);

  useEffect(
    () => () => {
      if (screenshotTimeoutRef.current) {
        clearTimeout(screenshotTimeoutRef.current);
        screenshotTimeoutRef.current = null;
      }
    },
    []
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!restrictionsActive || alreadySubmitted) return;

    const pushGuardState = () => {
      try {
        window.history.pushState({ quizLockId: assignmentId }, "", window.location.href);
      } catch {
        // ignore
      }
    };

    pushGuardState();

    const handlePopState = () => {
      window.history.go(1);
      setLeaveWarningOpen(true);
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [restrictionsActive, alreadySubmitted, assignmentId]);

  useEffect(() => {
    if (!restrictionsActive) return;
    if (violationCount === WARNING_THRESHOLD) {
      toast.warning(
        `Sudah ${WARNING_THRESHOLD} kali berpindah tab. Jika melebihi ${AUTO_SUBMIT_THRESHOLD} kali, sistem akan mengirim jawaban otomatis.`
      );
    }
  }, [violationCount, restrictionsActive]);

  const toggleChoice = (questionIndex: number, optionIndex: number) => {
    if (alreadySubmitted) return;
    setAnswers((prev) => {
      const next: QuizSubmission = [...prev];
      const current = next[questionIndex];
      const choices =
        current && current.type === "mcq" ? [...current.choices] : [];
      const existingIndex = choices.indexOf(optionIndex);
      if (existingIndex >= 0) {
        choices.splice(existingIndex, 1);
      } else {
        choices.push(optionIndex);
      }
      choices.sort((a, b) => a - b);
      next[questionIndex] = { type: "mcq", choices };
      return next;
    });
  };

  const updateTextAnswer = (questionIndex: number, value: string) => {
    if (alreadySubmitted) return;
    setAnswers((prev) => {
      const next: QuizSubmission = [...prev];
      next[questionIndex] = { type: "text", value };
      return next;
    });
  };

  const canSubmit = useMemo(() => {
    if (saving || alreadySubmitted) return false;
    if (questionList.length === 0) return false;
    return questionList.every((q, idx) => {
      const entry = answers[idx];
      if (!entry) return false;
      if (q.type === "mcq") {
        return entry.type === "mcq" && entry.choices.length > 0;
      }
      return entry.type === "text" && entry.value.trim().length > 0;
    });
  }, [answers, questionList, saving, alreadySubmitted]);

  const submit = useCallback(
    async () => {
      if (!assignment) return;
      if (!user) {
        toast.error("Silakan login terlebih dahulu.");
        return;
      }
      if (alreadySubmitted) {
        toast.error(ALREADY_SUBMITTED_ERROR);
        return;
      }

      const questions = questionList;
      const normalized: QuizSubmission = questions.map((q, idx) => {
        const raw = answers[idx];
        if (q.type === "mcq") {
          const source = raw && raw.type === "mcq" ? raw.choices : [];
          const choices = Array.from(new Set(source.filter((n) => Number.isInteger(n) && n >= 0))).sort(
            (a, b) => a - b
          );
          return { type: "mcq", choices };
        }
        const value = raw && raw.type === "text" ? raw.value : "";
        return { type: "text", value };
      });

      try {
        setSaving(true);
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch(`/api/assignments/${assignment.id}/submit`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ answers: normalized }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || "Gagal submit kuis.");

        if (json.autoApproved) {
          const totalPoints = Math.max(0, assignment.points ?? 0);
          const awarded = typeof json.awardedPoints === "number" ? json.awardedPoints : 0;
          if (json.justAwarded && awarded >= totalPoints) {
            toast.success(`Keren! Semua benar dan kamu mendapat ${awarded} poin.`);
          } else if (json.justAwarded && awarded > 0) {
            toast.success(`Jawaban benar dinilai otomatis. Kamu mendapat ${awarded} poin.`);
          } else {
            toast.success("Jawaban dinilai otomatis. Nilaimu sudah tercatat.");
          }
        } else if (assignment.autoGrading) {
          const score = typeof json.autoScore === "number" ? Math.round(json.autoScore * 100) : null;
          toast.success(
            score !== null ? `Jawaban terkirim. Skor otomatis ${score}%. Menunggu review admin.` : "Jawaban terkirim."
          );
        } else {
          toast.success("Jawaban terkirim. Menunggu review admin.");
        }

        setSubmission({
          status: json.autoApproved ? "approved" : "submitted",
          awardedPoints:
            json.autoApproved && typeof json.awardedPoints === "number" ? json.awardedPoints : undefined,
          autoScore: typeof json.autoScore === "number" ? json.autoScore : null,
          answers: normalized,
        });
        setAnswers([]);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message === ALREADY_SUBMITTED_ERROR) {
          toast.error(ALREADY_SUBMITTED_ERROR);
          return;
        }
        try {
          if (!user) throw error;
          const quizAnswers = normalized;
          let fallbackAutoApproved = false;
          let fallbackJustAwarded = false;
          let fallbackAutoScore: number | null = null;
          let fallbackAwardedPoints = 0;

          await runTransaction(db, async (tx) => {
            const subRef = doc(db, `assignments/${assignment.id}/submissions/${user.uid}`);
            const userRef = doc(db, `users/${user.uid}`);
            const snap = await tx.get(subRef);
            if (snap.exists()) throw new Error(ALREADY_SUBMITTED_ERROR);

            const timestamp = serverTimestamp();
            const { autoScore, autoApprove, correctCount, totalGradable } = computeAutoGrading(assignment, quizAnswers);
            fallbackAutoScore = autoScore;

            const maxPoints = Math.max(0, Math.floor(assignment.points ?? 0));
            const perQuestion = totalGradable > 0 ? maxPoints / totalGradable : 0;
            const awarded = autoScore !== null ? Math.round(correctCount * perQuestion) : 0;
            fallbackAwardedPoints = Math.min(maxPoints, Math.max(0, awarded));

            const base = {
              uid: user.uid,
              assignmentId: assignment.id,
              answers: quizAnswers,
              status: autoApprove ? "approved" : "submitted",
              awardedPoints: autoApprove ? fallbackAwardedPoints : 0,
              autoScore,
              createdAt: timestamp,
              updatedAt: timestamp,
            };

            if (autoApprove && fallbackAwardedPoints > 0) {
              fallbackAutoApproved = true;
              fallbackJustAwarded = true;
              tx.set(
                userRef,
                {
                  totalScore: increment(fallbackAwardedPoints),
                  seasonalScore: increment(fallbackAwardedPoints),
                },
                { merge: true }
              );
            } else if (autoApprove) {
              fallbackAutoApproved = true;
            }

            tx.set(subRef, base);
          });

          if (fallbackAutoApproved) {
            if (fallbackJustAwarded) {
              toast.success(`Jawaban dinilai otomatis. Kamu mendapat ${fallbackAwardedPoints} poin.`);
            } else {
              toast.success("Jawaban dinilai otomatis. Nilaimu sudah tercatat.");
            }
          } else if (fallbackAutoScore !== null) {
            toast.success(
              `Jawaban terkirim. Skor otomatis ${(fallbackAutoScore * 100).toFixed(0)}%. Menunggu review admin.`
            );
          } else {
            toast.success("Jawaban terkirim. Menunggu review admin.");
          }

          setSubmission({
            status: fallbackAutoApproved ? "approved" : "submitted",
            awardedPoints: fallbackAutoApproved ? fallbackAwardedPoints : undefined,
            autoScore: fallbackAutoScore,
            answers: quizAnswers,
          });
          setAnswers([]);
        } catch (fallbackError) {
          const fallbackMessage =
            fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
          toast.error(fallbackMessage === ALREADY_SUBMITTED_ERROR ? ALREADY_SUBMITTED_ERROR : fallbackMessage);
        }
      } finally {
        setSaving(false);
      }
    },
    [assignment, user, alreadySubmitted, questionList, answers]
  );

  const exitSession = useCallback(async () => {
    if (autoSubmitTriggeredRef.current) return;
    autoSubmitTriggeredRef.current = true;
    await submit();
    router.push("/pages/assignments");
  }, [router, submit]);

  useEffect(() => {
    if (!restrictionsActive) return;
    if (alreadySubmitted) return;
    if (violationCount > AUTO_SUBMIT_THRESHOLD && !autoSubmitTriggeredRef.current) {
      toast.error(
        `Perpindahan tab melebihi ${AUTO_SUBMIT_THRESHOLD} kali. Sistem mengirim jawaban yang ada secara otomatis.`
      );
      void exitSession();
    }
  }, [alreadySubmitted, exitSession, restrictionsActive, violationCount]);

  const quizReview = useMemo(() => {
    if (!alreadySubmitted) return null;
    return questionList.reduce(
      (acc, question, index) => {
        if (question.type !== "mcq") return acc;
        const correct = normalizeNumberArray(question.correctIndices ?? []);
        if (correct.length === 0) return acc;
        acc.gradable += 1;
        const entry = submittedQuizAnswers[index] as QuizAnswerEntry | undefined;
        const selected = extractChoices(entry);
        const isCorrect =
          selected.length === correct.length && selected.every((value, i) => value === correct[i]);
        if (isCorrect) {
          acc.correct += 1;
        } else {
          acc.incorrect.push(index + 1);
        }
        return acc;
      },
      { gradable: 0, correct: 0, incorrect: [] as number[] }
    );
  }, [alreadySubmitted, questionList, submittedQuizAnswers]);

  const renderContent = () => {
    if (assignmentLoading || submissionLoading) {
      return <div className="text-sm text-gray-500">Memuat data kuis…</div>;
    }

    if (!assignment) {
      return (
        <div className="space-y-4">
          <p className="text-sm text-red-500">Kuis tidak ditemukan atau sudah dihapus.</p>
          <Button onClick={() => router.push("/pages/assignments")}>Kembali ke daftar</Button>
        </div>
      );
    }

    if (assignment.type !== "quiz") {
      return (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Tugas ini bukan kuis. Silakan kembali ke daftar tugas.</p>
          <Button onClick={() => router.push("/pages/assignments")}>Kembali ke daftar</Button>
        </div>
      );
    }

    const displayAnswers = alreadySubmitted ? submittedQuizAnswers : answers;

    return (
      <div className="space-y-6">
        <div className="rounded-2xl border bg-white dark:bg-neutral-900 p-6 shadow-sm space-y-4">
          <div className="flex flex-col gap-2">
            <div className="text-sm font-semibold text-emerald-600">Kuis {assignment.title}</div>
            {assignment.description ? (
              <p className="text-sm text-gray-600 dark:text-gray-300">{assignment.description}</p>
            ) : null}
            <div className="text-xs text-gray-500">
              {questionList.length} soal • {assignment.points ?? 0} poin
            </div>
            <div className="text-xs text-gray-500">
              Pengampu: {assignment.createdByName ?? "Tim Mentor Mentora"}
              {assignment.createdBySubject ? ` • ${assignment.createdBySubject}` : ""}
            </div>
          </div>

          {alreadySubmitted ? (
            <div
              className={
                quizReview && quizReview.gradable > 0 && quizReview.incorrect.length > 0
                  ? "text-xs text-red-600"
                  : "text-xs text-emerald-600"
              }
            >
              Kamu sudah mengirim jawaban (
              {submission?.status === "approved" ? "Disetujui" : "Menunggu review"}).
              {typeof submission?.awardedPoints === "number"
                ? ` Nilai: ${submission.awardedPoints} poin.`
                : ""}
              {typeof submission?.autoScore === "number"
                ? ` Skor otomatis ${(submission.autoScore * 100).toFixed(0)}%.`
                : ""}
              {quizReview && quizReview.gradable > 0 ? (
                <span>
                  {" "}
                  {quizReview.correct} dari {quizReview.gradable} soal pilihan ganda kamu benar.
                  {quizReview.incorrect.length > 0
                    ? ` Cek soal ${quizReview.incorrect.join(", ")} untuk melihat detailnya.`
                    : " Semua benar, mantap!"}
                </span>
              ) : null}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 dark:border-amber-400/40 dark:bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-100 space-y-1">
              <p className="font-semibold text-sm">Peringatan keamanan:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Klik kanan dan shortcut tertentu dimatikan sementara.</li>
                <li>Perpindahan tab dicatat; {WARNING_THRESHOLD} kali akan diberi tanda khusus.</li>
                <li>Lebih dari {AUTO_SUBMIT_THRESHOLD} kali, jawaban terkirim otomatis.</li>
              </ul>
            </div>
          )}
        </div>

        {violationFlagged && !alreadySubmitted ? (
          <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-500/40 dark:bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-100 space-y-1">
            <p className="font-semibold text-sm">Perhatian</p>
            <p>
              Sistem mencatat {violationCount} kali perpindahan tab. Jika mencapai lebih dari {AUTO_SUBMIT_THRESHOLD},
              jawaban akan dikirim otomatis.
            </p>
          </div>
        ) : null}

        <div className="rounded-2xl border bg-white dark:bg-neutral-900 p-6 shadow-sm space-y-4">
          {questionList.length === 0 ? (
            <div className="text-sm text-red-500">Admin belum menambahkan soal untuk kuis ini.</div>
          ) : (
            questionList.map((q, idx) => {
              const entry = displayAnswers[idx] as QuizAnswerEntry | undefined;
              const options = Array.isArray(q.options) ? q.options : [];
              const correctIndices = normalizeNumberArray(q.correctIndices ?? []);
              const normalizedSelected = extractChoices(entry);
              const isGraded = alreadySubmitted && q.type === "mcq" && correctIndices.length > 0;
              const isCorrect =
                isGraded && normalizedSelected.length === correctIndices.length
                  ? normalizedSelected.every((value, i) => value === correctIndices[i])
                  : null;
              const selectedSet = new Set(normalizedSelected);
              const correctSet = new Set(correctIndices);

              return (
                <div key={`${assignment.id}-${idx}`} className="space-y-3 rounded-xl border p-4 bg-white dark:bg-neutral-950/30">
                  <div className="flex items-start justify-between gap-3">
                    <div className="font-medium text-sm">
                      {idx + 1}. {q.prompt}
                    </div>
                    {isGraded ? (
                      <span
                        className={`text-[11px] font-semibold ${
                          isCorrect ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {isCorrect ? "Benar" : "Perlu koreksi"}
                      </span>
                    ) : null}
                  </div>

                  {q.type === "mcq" ? (
                    options.length === 0 ? (
                      <div className="text-xs text-red-500">Belum ada opsi jawaban.</div>
                    ) : (
                      <div className="space-y-2">
                        {options.map((opt, optIdx) => {
                          const selected = selectedSet.has(optIdx);
                          const highlightState = (() => {
                            if (!isGraded) return "neutral" as const;
                            if (selected && correctSet.has(optIdx)) return "correct" as const;
                            if (selected && !correctSet.has(optIdx)) return "incorrect" as const;
                            if (!selected && correctSet.has(optIdx)) return "missed" as const;
                            return "neutral" as const;
                          })();
                          const baseClasses =
                            "flex items-center gap-2 text-sm rounded-md border px-3 py-2 transition";
                          const stateClasses = (() => {
                            switch (highlightState) {
                              case "correct":
                                return "border-emerald-500 bg-emerald-50 text-emerald-700";
                              case "incorrect":
                                return "border-red-500 bg-red-50 text-red-700";
                              case "missed":
                                return "border-emerald-400 bg-emerald-50/60 text-emerald-700";
                              default:
                                return "border-gray-200 dark:border-neutral-800";
                            }
                          })();
                          return (
                            <label
                              key={`${assignment.id}-${idx}-${optIdx}`}
                              className={`${baseClasses} ${stateClasses}`}
                            >
                              <input
                                type="checkbox"
                                className="h-4 w-4"
                                checked={selected}
                                onChange={() => toggleChoice(idx, optIdx)}
                                disabled={alreadySubmitted}
                              />
                              <span>{opt}</span>
                            </label>
                          );
                        })}
                        <p className="text-[11px] text-gray-500">
                          {alreadySubmitted
                            ? correctIndices.length === 0
                              ? ""
                              : "Jawaban benar ditandai warna hijau."
                            : "Bisa memilih lebih dari satu jawaban."}
                        </p>
                      </div>
                    )
                  ) : (
                    <Textarea
                      rows={3}
                      placeholder="Jawaban singkat kamu…"
                      value={entry && entry.type === "text" ? entry.value : ""}
                      onChange={(e) => updateTextAnswer(idx, e.target.value)}
                      disabled={alreadySubmitted}
                    />
                  )}
                </div>
              );
            })
          )}

          {!alreadySubmitted ? (
            <Button className="w-full" disabled={!canSubmit} onClick={() => void submit()}>
              {saving ? "Mengirim jawaban..." : "Kirim Jawaban"}
            </Button>
          ) : (
            <Button variant="outline" className="w-full" onClick={() => router.push("/pages/assignments")}>
              Kembali ke daftar
            </Button>
          )}
        </div>
      </div>
    );
  };

  const handleLeaveButtonClick = () => {
    if (alreadySubmitted || !restrictionsActive) {
      router.push("/pages/assignments");
      return;
    }
    setLeaveWarningOpen(true);
  };

  const handleLeaveConfirm = async () => {
    if (leaveSubmitting) return;
    setLeaveSubmitting(true);
    try {
      await exitSession();
    } finally {
      setLeaveSubmitting(false);
      setLeaveWarningOpen(false);
    }
  };

  const handleLeaveCancel = () => {
    setLeaveWarningOpen(false);
  };

  return (
    <Layout pageTitle="Mode Kuis">
      <div className="relative z-10 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Button variant="ghost" size="sm" onClick={handleLeaveButtonClick}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>
          {restrictionsActive ? (
            <span className="text-xs text-emerald-600 font-semibold">Mode anti-kecurangan aktif</span>
          ) : null}
        </div>
        {renderContent()}
      </div>

      {!alreadySubmitted && rulesVisible ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-lg p-6">
          <div className="max-w-lg w-full space-y-4 rounded-2xl bg-white dark:bg-neutral-900 p-6 text-sm shadow-xl">
            <h2 className="text-lg font-semibold">Sebelum mulai kuis</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Mode pengawasan dinyalakan untuk meminimalisir kecurangan. Dengan menekan tombol di bawah
              kamu setuju untuk:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-gray-700 dark:text-gray-200">
              <li>Klik kanan, salin-tempel, dan DevTools dinonaktifkan sementara selama kuis.</li>
              <li>Tetap di tab ini, setiap perpindahan akan tercatat dan diberi peringatan.</li>
              <li>Jangan tutup atau muat ulang halaman hingga selesai mengirim jawaban.</li>
            </ul>
            <div className="text-xs text-gray-500">
              Lebih dari {WARNING_THRESHOLD} kali berpindah tab akan ditandai, dan setelah {AUTO_SUBMIT_THRESHOLD} kali
              sistem mengirim jawaban secara otomatis.
            </div>
            <Button className="w-full" onClick={() => setRulesVisible(false)}>
              Saya mengerti, mulai sekarang
            </Button>
          </div>
        </div>
      ) : null}

      {!alreadySubmitted && focusWarning ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-6">
          <div className="max-w-md w-full space-y-4 rounded-2xl bg-white dark:bg-neutral-900 p-6 text-center shadow-xl">
            <h3 className="text-lg font-semibold text-red-600">Tetap di halaman kuis!</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Sistem mendeteksi kamu berpindah tab/jendela. Harap tetap fokus pada halaman ini sampai
              kuis selesai.
            </p>
            <p className="text-xs text-gray-500">
              Pelanggaran ke-{violationCount}. Lebih dari {AUTO_SUBMIT_THRESHOLD} kali akan langsung mengirim jawaban.
            </p>
            <Button onClick={() => setFocusWarning(false)}>Kembali ke kuis</Button>
          </div>
        </div>
      ) : null}

      {!alreadySubmitted && leaveWarningOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
          <div className="max-w-md w-full space-y-4 rounded-2xl bg-white dark:bg-neutral-900 p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-center">Keluar dari sesi kuis?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 text-center">
              Kamu akan meninggalkan kuis <span className="font-semibold">{assignment?.title ?? "ini"}</span>. Sistem
              akan langsung mengirim jawaban yang sudah ada.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button variant="outline" onClick={handleLeaveCancel} disabled={leaveSubmitting}>
                Batal
              </Button>
              <Button onClick={handleLeaveConfirm} disabled={leaveSubmitting || saving}>
                {leaveSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Mengirim...
                  </>
                ) : (
                  "Ya, kirim & keluar"
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {screenshotMask ? (
        <div aria-hidden="true" className="fixed inset-0 z-[70] bg-black" />
      ) : null}
    </Layout>
  );
}
