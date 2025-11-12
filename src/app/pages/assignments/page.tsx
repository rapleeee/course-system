"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/useAuth";
import { db, auth } from "@/lib/firebase";
import {
  collection,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import Layout from "@/components/layout";
import { ChevronDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import type {
  Assignment,
  McqAnswer,
  QuizAnswerEntry,
  QuizSubmission,
  SubmissionStatus,
  SubmissionSummary,
  TaskSubmission,
  TextAnswer,
} from "@/types/assignments";
import {
  ALREADY_SUBMITTED_ERROR,
  computeAutoGrading,
  extractChoices,
  normalizeNumberArray,
} from "@/lib/assignments/utils";

const TAB_WARNING_THRESHOLD = 5;
const TAB_AUTO_THRESHOLD = 10;

type AnswerStateValue = string | QuizSubmission;
type AnswerState = Record<string, AnswerStateValue>;

const STATUS_LABELS: Record<SubmissionStatus, string> = {
  submitted: "Menunggu review admin",
  approved: "Sudah disetujui",
  rejected: "Ditolak",
  needs_correction: "Perlu koreksi",
};

export default function AssignmentsPage() {
  const { user } = useAuth();
  const [list, setList] = useState<Assignment[]>([]);
  const [answers, setAnswers] = useState<AnswerState>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [submissionMap, setSubmissionMap] = useState<Record<string, SubmissionSummary | null>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");

  useEffect(() => {
    const q = query(collection(db, "assignments"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setList(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Assignment, "id">) })) as Assignment[]);
    });
    return () => unsub();
  }, []);

  const teacherOptions = useMemo(() => {
    const set = new Set<string>();
    list.forEach((assignment) => {
      const name = assignment.createdByName?.trim();
      if (name) set.add(name);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "id"));
  }, [list]);

  const subjectOptions = useMemo(() => {
    const set = new Set<string>();
    list.forEach((assignment) => {
      const subject = assignment.createdBySubject?.trim();
      if (subject) set.add(subject);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "id"));
  }, [list]);

  const filteredAssignments = useMemo(() => {
    const teacherFilter = selectedTeacher.trim().toLowerCase();
    const subjectFilter = selectedSubject.trim().toLowerCase();
    if (!teacherFilter && !subjectFilter) return list;
    return list.filter((assignment) => {
      const teacherName = assignment.createdByName?.trim().toLowerCase() ?? "";
      const subjectName = assignment.createdBySubject?.trim().toLowerCase() ?? "";
      const teacherMatch = teacherFilter ? teacherName === teacherFilter : true;
      const subjectMatch = subjectFilter ? subjectName === subjectFilter : true;
      return teacherMatch && subjectMatch;
    });
  }, [list, selectedSubject, selectedTeacher]);

  const assignmentIdsKey = useMemo(() => list.map((a) => a.id).sort().join("|"), [list]);
  const assignmentIds = useMemo(
    () => (assignmentIdsKey ? assignmentIdsKey.split("|").filter((id) => id.length > 0) : []),
    [assignmentIdsKey]
  );

  useEffect(() => {
    if (!user?.uid || assignmentIds.length === 0) {
      setSubmissionMap({});
      return;
    }

    const validIds = new Set(assignmentIds);
    setSubmissionMap((prev) => {
      const filtered: Record<string, SubmissionSummary | null> = {};
      validIds.forEach((id) => {
        if (id in prev) filtered[id] = prev[id];
      });
      return filtered;
    });

    const parseSubmission = (raw: unknown): SubmissionSummary => {
      if (!raw || typeof raw !== "object") return {};
      const data = raw as Record<string, unknown>;
      const submissionAnswers = data.answers;
      const validAnswers = Array.isArray(submissionAnswers)
        ? (submissionAnswers as QuizSubmission)
        : submissionAnswers &&
            typeof submissionAnswers === "object" &&
            "text" in submissionAnswers &&
            typeof (submissionAnswers as Record<string, unknown>).text === "string"
        ? (submissionAnswers as TaskSubmission)
        : undefined;
      return {
        status: data.status as SubmissionStatus | undefined,
        awardedPoints: typeof data.awardedPoints === "number" ? data.awardedPoints : undefined,
        autoScore: typeof data.autoScore === "number" ? data.autoScore : null,
        answers: validAnswers,
      };
    };

    const unsubscribers = assignmentIds.map((assignmentId) => {
      const subRef = doc(db, `assignments/${assignmentId}/submissions/${user.uid}`);
      return onSnapshot(subRef, (snap) => {
        setSubmissionMap((prev) => ({
          ...prev,
          [assignmentId]: snap.exists() ? parseSubmission(snap.data()) : null,
        }));
      });
    });

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [user?.uid, assignmentIds, assignmentIdsKey]);

  const handleTaskAnswerChange = (assignmentId: string, value: string) => {
    if (submissionMap[assignmentId]) return;
    setAnswers((prev) => ({ ...prev, [assignmentId]: value }));
  };

  const canSubmit = (assignment: Assignment) => {
    if (loadingId) return false;
    if (submissionMap[assignment.id]) return false;

    if (assignment.type === "quiz") {
      return false;
    }

    const raw = answers[assignment.id];
    if (typeof raw === "string") {
      return raw.trim().length > 0;
    }
    return false;
  };

  const submit = async (assignment: Assignment) => {
    if (!user) {
      toast.error("Silakan login dulu");
      return;
    }

    if (submissionMap[assignment.id]) {
      toast.error(ALREADY_SUBMITTED_ERROR);
      return;
    }

    const isQuiz = assignment.type === "quiz";
    const questions = Array.isArray(assignment.questions) ? assignment.questions : [];
    let payloadAnswers: QuizSubmission | TaskSubmission;
    let normalizedAnswers: QuizSubmission | TaskSubmission;

    if (isQuiz) {
      const stored = Array.isArray(answers[assignment.id]) ? [...(answers[assignment.id] as QuizSubmission)] : [];
      const normalized: QuizSubmission = questions.map((q, idx) => {
        const raw = stored[idx];
        if (q.type === "mcq") {
          const source = raw && raw.type === "mcq" ? raw.choices : [];
          const choices = Array.from(new Set(source.map((n) => (typeof n === "number" ? n : parseInt(String(n), 10)))))
            .filter((n) => Number.isInteger(n) && n >= 0)
            .sort((a, b) => a - b);
          return { type: "mcq", choices } satisfies McqAnswer;
        }
        const textValue = raw && raw.type === "text" ? raw.value : typeof raw === "string" ? raw : "";
        return { type: "text", value: textValue } satisfies TextAnswer;
      });
      payloadAnswers = normalized;
      normalizedAnswers = normalized;
    } else {
      const answerValue = answers[assignment.id];
      const textAnswer = typeof answerValue === "string" ? answerValue : "";
      const textPayload: TaskSubmission = { text: textAnswer };
      payloadAnswers = textPayload;
      normalizedAnswers = textPayload;
    }

    try {
      setLoadingId(assignment.id);
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/assignments/${assignment.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ answers: payloadAnswers }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Gagal submit");

      if (json.autoApproved) {
        const totalPoints = Math.max(0, assignment.points ?? 0);
        const awarded = typeof json.awardedPoints === "number" ? json.awardedPoints : 0;
        if (json.justAwarded && awarded >= totalPoints) {
          toast.success(`Jawaban benar semua! Kamu mendapatkan ${awarded} poin.`);
        } else if (json.justAwarded && awarded > 0) {
          toast.success(`Jawaban dinilai otomatis. Kamu mendapat ${awarded} poin.`);
        } else {
          toast.success("Jawaban dinilai otomatis. Nilaimu sudah tercatat.");
        }
      } else if (isQuiz && assignment.autoGrading) {
        const score = typeof json.autoScore === "number" ? Math.round(json.autoScore * 100) : null;
        toast.success(
          score !== null
            ? `Jawaban terkirim. Skor otomatis ${score}%. Menunggu review admin.`
            : "Jawaban terkirim. Menunggu review admin."
        );
      } else {
        toast.success("Jawaban terkirim. Menunggu review admin.");
      }

      setSubmissionMap((prev) => ({
        ...prev,
        [assignment.id]: {
          status: json.autoApproved ? "approved" : "submitted",
          awardedPoints: json.autoApproved && typeof json.awardedPoints === "number" ? json.awardedPoints : undefined,
          autoScore: typeof json.autoScore === "number" ? json.autoScore : null,
          answers: normalizedAnswers,
        },
      }));

      setAnswers((prev) => ({ ...prev, [assignment.id]: isQuiz ? [] : "" }));
    } catch (error) {
      const primaryMessage = error instanceof Error ? error.message : String(error);
      if (primaryMessage === ALREADY_SUBMITTED_ERROR) {
        toast.error(primaryMessage);
        return;
      }
      try {
        if (!user) throw error;

        if (!isQuiz) {
          const taskAnswers = normalizedAnswers as TaskSubmission;
          await runTransaction(db, async (tx) => {
            const subRef = doc(db, `assignments/${assignment.id}/submissions/${user.uid}`);
            const snap = await tx.get(subRef);
            if (snap.exists()) throw new Error(ALREADY_SUBMITTED_ERROR);
            const timestamp = serverTimestamp();
            tx.set(subRef, {
              uid: user.uid,
              assignmentId: assignment.id,
              answers: taskAnswers,
              status: "submitted",
              awardedPoints: 0,
              autoScore: null,
              createdAt: timestamp,
              updatedAt: timestamp,
            });
          });
          toast.success("Jawaban terkirim (fallback). Menunggu review admin.");
          setSubmissionMap((prev) => ({
            ...prev,
            [assignment.id]: {
              status: "submitted",
              awardedPoints: undefined,
              autoScore: null,
              answers: taskAnswers,
            },
          }));
          setAnswers((prev) => ({ ...prev, [assignment.id]: "" }));
        } else {
          const quizAnswers = normalizedAnswers as QuizSubmission;
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
              toast.success(`Jawaban dinilai otomatis. Kamu mendapat ${fallbackAwardedPoints} poin (fallback).`);
            } else {
              toast.success("Jawaban dinilai otomatis (fallback). Nilaimu sudah tercatat.");
            }
          } else if (fallbackAutoScore !== null) {
            toast.success(
              `Jawaban terkirim (fallback). Skor otomatis ${(fallbackAutoScore * 100).toFixed(0)}%. Menunggu review admin.`
            );
          } else {
            toast.success("Jawaban terkirim (fallback). Menunggu review admin.");
          }

          setSubmissionMap((prev) => ({
            ...prev,
            [assignment.id]: {
              status: fallbackAutoApproved ? "approved" : "submitted",
              awardedPoints: fallbackAutoApproved ? fallbackAwardedPoints : undefined,
              autoScore: fallbackAutoScore,
              answers: quizAnswers,
            },
          }));
          setAnswers((prev) => ({ ...prev, [assignment.id]: [] }));
        }
      } catch (fallbackError) {
        const fallbackMessage =
          fallbackError instanceof Error
            ? fallbackError.message
            : error instanceof Error
            ? error.message
            : String(fallbackError);
        toast.error(fallbackMessage === ALREADY_SUBMITTED_ERROR ? ALREADY_SUBMITTED_ERROR : fallbackMessage);
      }
    } finally {
      setLoadingId(null);
    }
  };

  const filtersActive = Boolean(selectedTeacher || selectedSubject);
  const visibleAssignments = filteredAssignments;
  const hasAssignments = list.length > 0;

  return (
    <Layout pageTitle="Tugas & Kuis">
      <div className="max-w-full space-y-6">
        <div className="rounded-xl border bg-white dark:bg-neutral-900 p-4 space-y-3">
          <div className="text-sm font-semibold">Filter berdasarkan guru & mata pelajaran</div>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase text-gray-500">Guru / Pembuat</span>
              <Select
                value={selectedTeacher || "all"}
                onValueChange={(value) => setSelectedTeacher(value === "all" ? "" : value)}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Semua guru" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua guru</SelectItem>
                  {teacherOptions.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase text-gray-500">Mata Pelajaran</span>
              <Select
                value={selectedSubject || "all"}
                onValueChange={(value) => setSelectedSubject(value === "all" ? "" : value)}
              >
                <SelectTrigger className="w-[220px]">
                 <SelectValue placeholder="Semua mata pelajaran" />
               </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua mata pelajaran</SelectItem>
                  {subjectOptions.map((subject) => (
                    <SelectItem key={subject} value={subject}>
                      {subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedTeacher("");
                setSelectedSubject("");
              }}
              disabled={!filtersActive}
            >
              Reset filter
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Gunakan filter untuk menemukan tugas dari pengampu tertentu. Kosongkan untuk melihat semua tugas.
          </p>
        </div>

        {!hasAssignments ? (
          <div className="text-sm text-gray-500">Belum ada tugas/kuis yang aktif.</div>
        ) : visibleAssignments.length === 0 ? (
          <div className="text-sm text-gray-500">Tidak ada tugas yang cocok dengan filter yang dipilih.</div>
        ) : (
          visibleAssignments.map((a) => {
            const isQuiz = a.type === "quiz";
            const questionList = Array.isArray(a.questions) ? a.questions : [];
            const submissionInfo = submissionMap[a.id];
            const alreadySubmitted = Boolean(submissionInfo);
            const storedSubmissionAnswers = submissionInfo?.answers;
            const stored = alreadySubmitted ? storedSubmissionAnswers ?? answers[a.id] : answers[a.id];
            const submittedQuizAnswers =
              alreadySubmitted && isQuiz && Array.isArray(storedSubmissionAnswers)
                ? (storedSubmissionAnswers as QuizSubmission)
                : [];
            const quizReview = alreadySubmitted && isQuiz
              ? questionList.reduce(
                  (
                    acc,
                    question,
                    index
                  ) => {
                    if (question.type !== "mcq") return acc;
                    const correct = normalizeNumberArray(question.correctIndices ?? []);
                    if (correct.length === 0) return acc;
                    acc.gradable += 1;
                    const entry = submittedQuizAnswers[index] as QuizAnswerEntry | undefined;
                    const selected = extractChoices(entry);
                    const isCorrect =
                      selected.length === correct.length &&
                      selected.every((value, i) => value === correct[i]);
                    if (isCorrect) {
                      acc.correct += 1;
                    } else {
                      acc.incorrect.push(index + 1);
                    }
                    return acc;
                  },
                  { gradable: 0, correct: 0, incorrect: [] as number[] }
                )
              : null;
            const statusLabel = submissionInfo?.status
              ? STATUS_LABELS[submissionInfo.status]
              : STATUS_LABELS.submitted;

            if (isQuiz) {
              const questionCount = questionList.length;
              const teacherName = (a.createdByName ?? "").trim() || "Tim Mentor Mentora";
              const subjectLabel = a.createdBySubject?.trim();
              return (
                <div key={a.id} className="rounded-xl border bg-white dark:bg-neutral-900 p-4 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-base">{a.title}</div>
                      {a.description ? (
                        <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{a.description}</p>
                      ) : null}
                      <div className="mt-2 text-xs text-gray-500">
                        Kuis • {a.points ?? 0} poin • {questionCount} soal
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        Pengampu: {teacherName}
                        {subjectLabel ? ` • ${subjectLabel}` : ""}
                      </div>
                    </div>
                    <span
                      className={`text-xs font-semibold ${alreadySubmitted ? "text-emerald-600" : "text-gray-500"}`}
                    >
                      {alreadySubmitted ? "Sudah dikerjakan" : "Belum dikerjakan"}
                    </span>
                  </div>

                  {alreadySubmitted ? (
                    <div
                      className={
                        quizReview && quizReview.gradable > 0 && quizReview.incorrect.length > 0
                          ? "text-xs text-red-600"
                          : "text-xs text-emerald-600"
                      }
                    >
                      Kamu sudah mengirim jawaban ({statusLabel}).
                      {typeof submissionInfo?.awardedPoints === "number"
                        ? ` Nilai: ${submissionInfo.awardedPoints} poin.`
                        : ""}
                      {typeof submissionInfo?.autoScore === "number"
                        ? ` Skor otomatis ${(submissionInfo.autoScore * 100).toFixed(0)}%.`
                        : ""}
                      {quizReview && quizReview.gradable > 0 ? (
                        <span>
                          {" "}
                          {quizReview.correct} dari {quizReview.gradable} soal pilihan ganda kamu benar.
                          {quizReview.incorrect.length > 0
                            ? ` Cek soal ${quizReview.incorrect.join(", ")} untuk melihat detail kesalahannya.`
                            : " Semua benar, mantap!"}
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-600 dark:text-gray-300">
                      Kuis akan dibuka di halaman baru dengan mode anti-kecurangan.
                    </div>
                  )}

                  {questionCount === 0 ? (
                    <div className="text-xs text-red-500">Kuis belum dikonfigurasi oleh admin.</div>
                  ) : null}

                  <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 dark:border-amber-400/40 dark:bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-100 space-y-1">
                    <p className="font-semibold text-sm text-amber-900 dark:text-amber-100">Mode pengawasan ringan</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Klik kanan dan beberapa shortcut kami nonaktifkan sementara.</li>
                      <li>Sistem menandai jika kamu berpindah tab hingga {TAB_WARNING_THRESHOLD} kali.</li>
                      <li>Lebih dari {TAB_AUTO_THRESHOLD} pelanggaran membuat jawaban dikirim otomatis.</li>
                    </ul>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="text-xs text-gray-500">
                      {a.autoGrading ? "Penilaian otomatis aktif. " : "Penilaian dilakukan admin. "}
                      Klik tombol untuk membuka kuis.
                    </div>
                    <Button asChild disabled={questionCount === 0}>
                      <Link href={`/pages/assignments/${a.id}`}>
                        {alreadySubmitted ? "Lihat Halaman Kuis" : "Mulai Kuis"}
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            }

            const isOpen = openId === a.id;

            return (
              <div key={a.id} className="rounded-xl border overflow-hidden bg-white dark:bg-neutral-900">
                <button
                  type="button"
                  className="w-full p-4 text-left hover:bg-neutral-50 dark:hover:bg-neutral-900/60 transition cursor-pointer"
                  onClick={() => setOpenId((prev) => (prev === a.id ? null : a.id))}
                  aria-expanded={isOpen}
                  aria-controls={`assignment-panel-${a.id}`}
                >
                  <div className="flex items-start gap-4 justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{a.title}</div>
                    {a.description ? (
                      <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{a.description}</p>
                    ) : null}
                    <div className="mt-2 text-xs text-gray-500">
                      {a.type} • {a.points ?? 0} poin
                    </div>
                    {(a.createdByName || a.createdBySubject) ? (
                      <div className="mt-1 text-xs text-gray-500">
                        Pengampu: {a.createdByName ?? "Tim Mentor Mentora"}
                        {a.createdBySubject ? ` • ${a.createdBySubject}` : ""}
                      </div>
                    ) : null}
                  </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <label
                        className="inline-flex items-center gap-2 text-xs text-gray-500"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input type="checkbox" className="h-4 w-4 cursor-pointer" checked={alreadySubmitted} readOnly />
                        <span className={`${alreadySubmitted ? "text-emerald-600" : "text-gray-500"}`}>
                          {alreadySubmitted ? "Sudah dikerjakan" : "Belum dikerjakan"}
                        </span>
                      </label>
                      <ChevronDown
                        className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                </button>

                {isOpen ? (
                  <div
                    id={`assignment-panel-${a.id}`}
                    className="border-t p-4 space-y-4 bg-neutral-50 dark:bg-neutral-900/40"
                  >
                  {alreadySubmitted ? (
                    <div className="text-xs text-emerald-600">
                      Kamu sudah mengirim jawaban ({statusLabel}).
                      {typeof submissionInfo?.awardedPoints === "number"
                        ? ` Nilai: ${submissionInfo.awardedPoints} poin.`
                        : ""}
                    </div>
                  ) : null}

                  <Textarea
                    placeholder="Jawaban kamu (tuliskan ringkas & jelas)…"
                    value={
                      typeof stored === "string"
                        ? stored
                        : stored && typeof stored === "object" && "text" in stored
                        ? (stored as TaskSubmission).text
                        : ""
                    }
                    onChange={(e) => handleTaskAnswerChange(a.id, e.target.value)}
                    disabled={alreadySubmitted}
                  />

                    <Button disabled={!canSubmit(a)} onClick={() => submit(a)}>
                      Kirim Jawaban
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </Layout>
  );
}
