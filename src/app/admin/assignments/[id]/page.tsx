"use client";

import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, doc, getDoc, onSnapshot, orderBy, query, runTransaction, increment } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import AdminLayout from "@/components/layouts/AdminLayout";

type QuizQuestionDoc = {
  prompt?: string;
  type?: "mcq" | "text";
  options?: string[];
};

type AssignmentDoc = {
  title?: string;
  description?: string;
  points?: number;
  type?: "task" | "quiz";
  questions?: QuizQuestionDoc[];
};

type SubmissionDoc = {
  id: string;
  status: "submitted" | "approved" | "rejected" | "needs_correction";
  answers: unknown;
  autoScore?: number | null;
  awardedPoints?: number;
};

type UserProfile = {
  username?: string;
  name?: string;
  nama?: string;
  email?: string;
};

export default function ReviewAssignmentPage({ params }: { params: Promise<{ id: string }> }) {
  const [assignmentId, setAssignmentId] = useState<string>("");
  const [assignment, setAssignment] = useState<AssignmentDoc | null>(null);
  const [subs, setSubs] = useState<SubmissionDoc[]>([]);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile | null>>({});
  const [award, setAward] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      const p = await params;
      setAssignmentId(p.id);
    })();
  }, [params]);

  useEffect(() => {
    if (!assignmentId) return;
    (async () => {
      const asg = await getDoc(doc(db, "assignments", assignmentId));
      if (asg.exists()) setAssignment(asg.data() as AssignmentDoc);
    })();
    const q = query(collection(db, `assignments/${assignmentId}/submissions`), orderBy("updatedAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setSubs(
        snap.docs.map((d) => {
          const data = d.data() as Omit<SubmissionDoc, "id">;
          return { id: d.id, ...data };
        })
      );
    });
    return () => unsub();
  }, [assignmentId]);

  useEffect(() => {
    if (subs.length === 0) return;
    const missing = subs
      .map((s) => s.id)
      .filter((uid) => !(uid in userProfiles));
    if (missing.length === 0) return;

    let cancelled = false;

    (async () => {
      const entries = await Promise.all(
        missing.map(async (uid) => {
          try {
            const snap = await getDoc(doc(db, "users", uid));
            if (snap.exists()) {
              const data = snap.data() as UserProfile;
              return [uid, data] as const;
            }
          } catch {
            // ignore errors per user
          }
          return [uid, null] as const;
        })
      );
      if (cancelled) return;
      setUserProfiles((prev) => {
        const next = { ...prev };
        for (const [uid, profile] of entries) {
          if (next[uid] === undefined) {
            next[uid] = profile;
          }
        }
        return next;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [subs, userProfiles]);

  const resolveDisplayName = (uid: string) => {
    const profile = userProfiles[uid];
    if (!profile) return uid;

    const emailFallback =
      typeof profile.email === "string" && profile.email.includes("@")
        ? profile.email.split("@")[0]
        : undefined;
    const candidates = [profile.username, profile.name, profile.nama, emailFallback];
    const display = candidates.find((value) => typeof value === "string" && value.trim().length > 0);
    return display ?? uid;
  };

  const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null;

  const coerceIndex = (value: unknown): number | null => {
    if (typeof value === "number" && Number.isInteger(value) && value >= 0) return value;
    if (typeof value === "string") {
      const parsed = Number.parseInt(value, 10);
      if (Number.isInteger(parsed) && parsed >= 0) return parsed;
    }
    return null;
  };

  const extractQuizEntryList = (value: unknown): unknown[] => {
    if (Array.isArray(value)) return value;
    if (isRecord(value)) {
      const numericEntries = Object.entries(value)
        .map(([key, val]) => {
          const index = coerceIndex(key);
          return index === null ? null : ([index, val] as const);
        })
        .filter((pair): pair is [number, unknown] => pair !== null)
        .sort((a, b) => a[0] - b[0])
        .map(([, val]) => val);
      if (numericEntries.length > 0) return numericEntries;
    }
    return [];
  };

  const extractTextAnswer = (entry: unknown): string => {
    if (typeof entry === "string") return entry;
    if (isRecord(entry)) {
      if (typeof entry.value === "string") return entry.value;
      if (typeof entry.text === "string") return entry.text;
    }
    return "";
  };

  const extractTaskAnswer = (value: unknown): string => {
    if (typeof value === "string") return value;
    if (isRecord(value)) {
      if (typeof value.text === "string") return value.text;
      if (typeof value.value === "string") return value.value;
    }
    return "";
  };

  const extractMcqChoices = (entry: unknown): number[] => {
    const normalize = (source: unknown[]) =>
      Array.from(
        new Set(
          source
            .map((item) => coerceIndex(item))
            .filter((value): value is number => value !== null)
        )
      ).sort((a, b) => a - b);

    if (!entry) return [];

    if (Array.isArray(entry)) {
      return normalize(entry);
    }

    if (isRecord(entry)) {
      if (typeof entry.type === "string" && entry.type !== "mcq") return [];
      if (Array.isArray(entry.choices)) {
        return normalize(entry.choices);
      }
    }

    return [];
  };

  const renderTextAnswer = (entry: unknown) => {
    const value = extractTextAnswer(entry).trim();
    if (!value) {
      return <span className="text-gray-500 italic">Belum ada jawaban.</span>;
    }
    return <span className="block whitespace-pre-wrap">{value}</span>;
  };

  const renderMcqAnswer = (question: QuizQuestionDoc, entry: unknown) => {
    const choices = extractMcqChoices(entry);
    if (choices.length === 0) {
      return <span className="text-gray-500 italic">Belum ada jawaban.</span>;
    }

    const options = Array.isArray(question.options) ? question.options : [];
    return (
      <ul className="list-disc space-y-1 pl-5">
        {choices.map((choice) => {
          const optionLabel = options[choice];
          const label =
            typeof optionLabel === "string" && optionLabel.trim().length > 0
              ? optionLabel
              : `Pilihan ${choice + 1}`;
          return (
            <li key={choice} className="whitespace-pre-wrap">
              {label}
            </li>
          );
        })}
      </ul>
    );
  };

  const renderSubmissionAnswers = (submission: SubmissionDoc) => {
    if (!assignment) {
      return <div className="text-xs text-gray-500">Memuat detail tugas...</div>;
    }

    if (assignment.type === "quiz") {
      const questions = Array.isArray(assignment.questions) ? assignment.questions : [];
      if (questions.length === 0) {
        return <div className="text-xs text-gray-500">Soal belum tersedia untuk tugas ini.</div>;
      }

      const entries = extractQuizEntryList(submission.answers);

      return (
        <div className="space-y-3">
          {questions.map((question, index) => {
            const prompt =
              typeof question?.prompt === "string" && question.prompt.trim().length > 0
                ? question.prompt
                : "Pertanyaan belum tersedia.";
            const entry = entries[index];
            const answerNode = question?.type === "mcq" ? renderMcqAnswer(question, entry) : renderTextAnswer(entry);

            return (
              <div
                key={index}
                className="rounded-md border border-gray-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900/50"
              >
                <div className="text-xs font-semibold uppercase text-gray-500">Soal {index + 1}</div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-900 dark:text-gray-100">{prompt}</p>
                <div className="mt-3 text-xs font-semibold uppercase text-gray-500">Jawaban Siswa</div>
                <div className="mt-1 text-sm text-gray-900 dark:text-gray-100">{answerNode}</div>
              </div>
            );
          })}
        </div>
      );
    }

    const descriptionRaw = typeof assignment.description === "string" ? assignment.description : "";
    const titleFallback = typeof assignment.title === "string" ? assignment.title : "";
    const description = descriptionRaw.trim().length > 0
      ? descriptionRaw
      : titleFallback.trim().length > 0
      ? titleFallback
      : "Deskripsi soal belum tersedia.";
    const taskAnswer = extractTaskAnswer(submission.answers).trim();

    return (
      <div className="space-y-3">
        <div className="rounded-md border border-gray-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900/50">
          <div className="text-xs font-semibold uppercase text-gray-500">Soal</div>
          <p className="mt-1 whitespace-pre-wrap text-sm text-gray-900 dark:text-gray-100">{description}</p>
        </div>
        <div className="rounded-md border border-gray-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900/50">
          <div className="text-xs font-semibold uppercase text-gray-500">Jawaban Siswa</div>
          <p className="mt-1 whitespace-pre-wrap text-sm text-gray-900 dark:text-gray-100">
            {taskAnswer.length > 0 ? taskAnswer : "Belum ada jawaban."}
          </p>
        </div>
      </div>
    );
  };

  const decide = async (uid: string, decision: "approved" | "rejected" | "needs_correction") => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const points = award[uid] ?? assignment?.points ?? 0;
      const res = await fetch(`/api/assignments/${assignmentId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ uid, decision, awardedPoints: points }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Gagal memproses keputusan");
      toast.success("Tersimpan");
    } catch (e) {
      // Fallback: update langsung via client jika server admin belum tersedia
      try {
        if (!assignmentId) throw e;
        const subRef = doc(db, `assignments/${assignmentId}/submissions/${uid}`);
        const userRef = doc(db, `users/${uid}`);
        const pts = Math.max(0, Math.floor(award[uid] ?? assignment?.points ?? 0));

        await runTransaction(db, async (tx) => {
          const subSnap = await tx.get(subRef);
          if (!subSnap.exists()) throw new Error("Submission not found");
          const sub = subSnap.data() as SubmissionDoc | undefined;
          if (!sub) throw new Error("Submission not found");
          const alreadyApproved = sub.status === "approved" && (sub.awardedPoints || 0) > 0;

          tx.set(
            subRef,
            {
              status: decision,
              updatedAt: new Date(),
              awardedPoints: decision === "approved" ? pts : sub.awardedPoints || 0,
            },
            { merge: true }
          );

          if (decision === "approved" && !alreadyApproved && pts > 0) {
            tx.set(
              userRef,
              {
                totalScore: increment(pts),
                seasonalScore: increment(pts),
              },
              { merge: true }
            );
          }
        });
        toast.success("Tersimpan (fallback)");
      } catch (e2) {
        const message =
          e2 instanceof Error
            ? e2.message
            : e instanceof Error
            ? e.message
            : String(e2 ?? e);
        toast.error(message);
      }
    }
  };

  return (
    <AdminLayout pageTitle={`Review: ${assignment?.title || "Tugas"}`}>
      <div className="max-w-full space-y-6">
        <h1 className="text-2xl font-bold">Review: {assignment?.title}</h1>
        <p className="text-sm text-gray-500">Max poin: {assignment?.points ?? 0}</p>

        <div className="space-y-3">
          {subs.length === 0 ? (
            <div className="text-sm text-gray-500">Belum ada submission.</div>
          ) : (
            subs.map((s) => (
              <div key={s.id} className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {resolveDisplayName(s.id)}
                    <span className="ml-2 text-xs text-gray-500">UID: {s.id}</span>
                  </div>
                  <div className="text-xs text-gray-500">Status: {s.status}</div>
                </div>
                {renderSubmissionAnswers(s)}
                {typeof s.autoScore === "number" ? (
                  <div className="text-xs text-gray-500">AutoScore: {(s.autoScore * 100).toFixed(0)}%</div>
                ) : null}
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    className="w-28"
                    placeholder="Poin"
                    value={(award[s.id] ?? assignment?.points ?? 0) as number}
                    onChange={(e) => setAward((x) => ({ ...x, [s.id]: parseInt(e.target.value || "0", 10) }))}
                  />
                  <Button onClick={() => decide(s.id, "approved")} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    Approve
                  </Button>
                  <Button onClick={() => decide(s.id, "needs_correction")} variant="outline">
                    Perlu Koreksi
                  </Button>
                  <Button onClick={() => decide(s.id, "rejected")} variant="destructive">
                    Tolak
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
