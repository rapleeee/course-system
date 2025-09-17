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

type QuizQuestion = {
  prompt: string;
  type: "mcq" | "text";
  options?: string[];
  correctIndices?: number[];
};

type SubmissionStatus = "submitted" | "approved" | "rejected" | "needs_correction";
type SubmissionSummary = {
  status?: SubmissionStatus;
  awardedPoints?: number;
  autoScore?: number | null;
};

type Assignment = {
  id: string;
  title: string;
  description?: string;
  type: "task" | "quiz";
  points?: number;
  autoGrading?: boolean;
  questions?: QuizQuestion[];
};

type AutoGradeResult = {
  autoScore: number | null;
  autoApprove: boolean;
  correctCount: number;
  totalGradable: number;
};

type McqAnswer = { type: "mcq"; choices: number[] };
type TextAnswer = { type: "text"; value: string };
type QuizAnswerEntry = McqAnswer | TextAnswer;
type QuizSubmission = QuizAnswerEntry[];
type TaskSubmission = { text: string };
type AnswerStateValue = string | QuizSubmission;
type AnswerState = Record<string, AnswerStateValue>;

const ALREADY_SUBMITTED_ERROR = "Kamu sudah mengirim jawaban. Jawaban baru tidak diizinkan.";

const STATUS_LABELS: Record<SubmissionStatus, string> = {
  submitted: "Menunggu review admin",
  approved: "Sudah disetujui",
  rejected: "Ditolak",
  needs_correction: "Perlu koreksi",
};

function computeAutoGrading(assignment: Assignment, answers: QuizSubmission): AutoGradeResult {
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
    const correctIndices = Array.isArray(q.correctIndices)
      ? Array.from(new Set(q.correctIndices.map((n) => (typeof n === "number" ? n : parseInt(String(n), 10))))).filter(
          (n) => Number.isInteger(n) && n >= 0
        )
      : [];
    const sortedCorrect = [...correctIndices].sort((a, b) => a - b);

    const entry = answers[idx];
    if (!entry || entry.type !== "mcq") {
      return;
    }
    const chosen = entry.choices
      .map((n) => (typeof n === "number" ? n : parseInt(String(n), 10)))
      .filter((n) => Number.isInteger(n) && n >= 0);
    const sortedChosen = Array.from(new Set(chosen)).sort((a, b) => a - b);

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

export default function AssignmentsPage() {
  const { user } = useAuth();
  const [list, setList] = useState<Assignment[]>([]);
  const [answers, setAnswers] = useState<AnswerState>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [submissionMap, setSubmissionMap] = useState<Record<string, SubmissionSummary | null>>({});
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "assignments"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setList(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Assignment, "id">) })) as Assignment[]);
    });
    return () => unsub();
  }, []);

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

    const unsubscribers = assignmentIds.map((assignmentId) => {
      const subRef = doc(db, `assignments/${assignmentId}/submissions/${user.uid}`);
      return onSnapshot(subRef, (snap) => {
        setSubmissionMap((prev) => ({
          ...prev,
          [assignmentId]: snap.exists() ? (snap.data() as SubmissionSummary) : null,
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

  const toggleQuizChoice = (assignmentId: string, questionIndex: number, optionIndex: number) => {
    if (submissionMap[assignmentId]) return;
    setAnswers((prev) => {
      const prevEntry = Array.isArray(prev[assignmentId]) ? [...(prev[assignmentId] as QuizSubmission)] : [];
      const arr: QuizSubmission = [...prevEntry];
      const currentEntry = arr[questionIndex];
      const currentChoices = currentEntry && currentEntry.type === "mcq" ? [...currentEntry.choices] : [];
      const existingIdx = currentChoices.indexOf(optionIndex);
      if (existingIdx >= 0) {
        currentChoices.splice(existingIdx, 1);
      } else {
        currentChoices.push(optionIndex);
      }
      currentChoices.sort((a, b) => a - b);
      arr[questionIndex] = { type: "mcq", choices: currentChoices };
      return { ...prev, [assignmentId]: arr };
    });
  };

  const updateQuizTextAnswer = (assignmentId: string, questionIndex: number, value: string) => {
    if (submissionMap[assignmentId]) return;
    setAnswers((prev) => {
      const prevEntry = Array.isArray(prev[assignmentId]) ? [...(prev[assignmentId] as QuizSubmission)] : [];
      const arr: QuizSubmission = [...prevEntry];
      arr[questionIndex] = { type: "text", value };
      return { ...prev, [assignmentId]: arr };
    });
  };

  const canSubmit = (assignment: Assignment) => {
    if (loadingId) return false;
    if (submissionMap[assignment.id]) return false;

    if (assignment.type === "quiz") {
      const questions = Array.isArray(assignment.questions) ? assignment.questions : [];
      if (questions.length === 0) return false;
      const stored = answers[assignment.id];
      if (!Array.isArray(stored)) return false;
      return questions.every((q, idx) => {
        const entry = stored[idx];
        if (q.type === "mcq") {
          return Boolean(entry && entry.type === "mcq" && entry.choices.length > 0);
        }
        return Boolean(entry && entry.type === "text" && entry.value.trim().length > 0);
      });
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
            [assignment.id]: { status: "submitted", awardedPoints: undefined, autoScore: null },
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
              tx.set(userRef, { totalScore: increment(fallbackAwardedPoints) }, { merge: true });
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

  return (
    <Layout pageTitle="Tugas & Kuis">
      <div className="max-w-full space-y-6">
        {list.length === 0 ? (
          <div className="text-sm text-gray-500">Belum ada tugas/kuis yang aktif.</div>
        ) : (
          list.map((a) => {
            const isQuiz = a.type === "quiz";
            const questionList = Array.isArray(a.questions) ? a.questions : [];
            const stored = answers[a.id];
            const submissionInfo = submissionMap[a.id];
            const alreadySubmitted = Boolean(submissionInfo);
            const statusLabel = submissionInfo?.status ? STATUS_LABELS[submissionInfo.status] : STATUS_LABELS.submitted;
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
                        {typeof submissionInfo?.autoScore === "number"
                          ? ` Skor otomatis ${(submissionInfo.autoScore * 100).toFixed(0)}%.`
                          : ""}
                      </div>
                    ) : null}

                    {isQuiz ? (
                      questionList.length === 0 ? (
                        <div className="text-xs text-red-500">Kuis belum dikonfigurasi oleh admin.</div>
                      ) : (
                        <div className="space-y-3">
                          {a.autoGrading ? (
                            <div className="text-xs text-emerald-600">
                              Penilaian otomatis aktif. Nilai dihitung per soal yang benar.
                            </div>
                          ) : null}
                          {questionList.map((q, idx) => {
                            const entry = Array.isArray(stored) ? (stored[idx] as QuizAnswerEntry | undefined) : undefined;
                            const options = Array.isArray(q.options) ? q.options : [];
                            return (
                              <div
                                key={`${a.id}-${idx}`}
                                className="space-y-2 rounded-lg border p-3 bg-white dark:bg-neutral-950/40"
                              >
                                <div className="text-sm font-medium">
                                  {idx + 1}. {q.prompt}
                                </div>
                                {q.type === "mcq" ? (
                                  options.length === 0 ? (
                                    <div className="text-xs text-red-500">Opsi jawaban belum tersedia.</div>
                                  ) : (
                                    <div className="space-y-2">
                                      {options.map((opt, optIdx) => {
                                        const selected = Boolean(entry && entry.type === "mcq" && entry.choices.includes(optIdx));
                                        return (
                                          <label
                                            key={`${a.id}-${idx}-${optIdx}`}
                                            className="flex items-center gap-2 text-sm"
                                          >
                                            <input
                                              type="checkbox"
                                              className="h-4 w-4"
                                              checked={selected}
                                              onChange={() => toggleQuizChoice(a.id, idx, optIdx)}
                                              disabled={alreadySubmitted}
                                            />
                                            <span>{opt}</span>
                                          </label>
                                        );
                                      })}
                                      <p className="text-[11px] text-gray-500">Bisa memilih lebih dari satu jawaban.</p>
                                    </div>
                                  )
                                ) : (
                                  <Textarea
                                    rows={2}
                                    placeholder="Jawaban singkat kamu..."
                                    value={entry && entry.type === "text" ? entry.value : ""}
                                    onChange={(e) => updateQuizTextAnswer(a.id, idx, e.target.value)}
                                    disabled={alreadySubmitted}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )
                    ) : (
                      <Textarea
                        placeholder="Jawaban kamu (tuliskan ringkas & jelas)…"
                        value={typeof stored === "string" ? stored : ""}
                        onChange={(e) => handleTaskAnswerChange(a.id, e.target.value)}
                        disabled={alreadySubmitted}
                      />
                    )}

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
