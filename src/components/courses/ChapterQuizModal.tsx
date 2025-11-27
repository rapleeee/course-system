"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Chapter } from "./types";
import type { QuizQuestion } from "@/types/assignments";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { toast } from "sonner";

type ChapterQuizModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  chapter: Chapter;
  onQuizUpdated?: () => void;
};

type QuestionDraft = {
  id: string;
  prompt: string;
  options: string[];
  correctIndices: number[];
};

const genId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function createQuestionDraft(partial: Partial<QuestionDraft> = {}): QuestionDraft {
  const draft: QuestionDraft = {
    id: partial.id ?? genId(),
    prompt: partial.prompt ?? "",
    options:
      Array.isArray(partial.options) && partial.options.length > 0
        ? [...partial.options]
        : ["", ""],
    correctIndices: Array.isArray(partial.correctIndices)
      ? partial.correctIndices.filter((n) => Number.isInteger(n) && n >= 0)
      : [],
  };

  while (draft.options.length < 2) draft.options.push("");
  draft.correctIndices = draft.correctIndices.filter((idx) => idx < draft.options.length);

  return draft;
}

function mapToDrafts(questions?: QuizQuestion[]): QuestionDraft[] {
  if (!Array.isArray(questions)) return [];
  return questions.map((q) =>
    createQuestionDraft({
      prompt: typeof q.prompt === "string" ? q.prompt : "",
      options: Array.isArray(q.options)
        ? q.options.map((opt) => (typeof opt === "string" ? opt : String(opt ?? "")))
        : undefined,
      correctIndices: Array.isArray(q.correctIndices)
        ? q.correctIndices
            .map((n) => (typeof n === "number" ? n : parseInt(String(n), 10)))
            .filter((n) => Number.isInteger(n) && n >= 0)
        : undefined,
    })
  );
}

function normalizeQuestions(drafts: QuestionDraft[]): QuizQuestion[] {
  return drafts.map<QuizQuestion>((draft) => {
    const prompt = draft.prompt.trim();
    const options = draft.options.map((opt) => opt.trim());
    const correctIndices = Array.from(
      new Set(
        draft.correctIndices.filter(
          (idx) => Number.isInteger(idx) && idx >= 0 && idx < options.length
        )
      )
    );

    return {
      prompt,
      type: "mcq",
      options,
      correctIndices,
    };
  });
}

function validateDrafts(drafts: QuestionDraft[]): { ok: boolean; reason?: string } {
  if (drafts.length === 0) {
    return { ok: false, reason: "Minimal 1 pertanyaan untuk kuis chapter." };
  }

  for (const draft of drafts) {
    if (!draft.prompt.trim()) {
      return { ok: false, reason: "Setiap pertanyaan harus memiliki teks." };
    }

    const trimmedOptions = draft.options.map((opt) => opt.trim());
    if (trimmedOptions.length < 2) {
      return { ok: false, reason: "Setiap pertanyaan minimal punya 2 opsi jawaban." };
    }
    if (trimmedOptions.some((opt) => opt.length === 0)) {
      return { ok: false, reason: "Tidak boleh ada opsi kosong." };
    }

    const uniqueCorrect = Array.from(new Set(draft.correctIndices));
    if (uniqueCorrect.length === 0) {
      return { ok: false, reason: "Tandai minimal 1 jawaban benar untuk setiap pertanyaan." };
    }
    if (uniqueCorrect.some((idx) => !Number.isInteger(idx) || idx < 0 || idx >= trimmedOptions.length)) {
      return { ok: false, reason: "Pilihan jawaban benar tidak valid." };
    }
  }

  return { ok: true };
}

export function ChapterQuizModal({
  open,
  onOpenChange,
  courseId,
  chapter,
  onQuizUpdated,
}: ChapterQuizModalProps) {
  const [drafts, setDrafts] = useState<QuestionDraft[]>(() =>
    mapToDrafts(chapter.quizQuestions)
  );
  const [minScore, setMinScore] = useState<string>(
    typeof chapter.quizMinScore === "number" ? String(chapter.quizMinScore) : "70"
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDrafts(mapToDrafts(chapter.quizQuestions));
    setMinScore(
      typeof chapter.quizMinScore === "number" ? String(chapter.quizMinScore) : "70"
    );
  }, [open, chapter.quizQuestions, chapter.quizMinScore]);

  const validation = useMemo(() => validateDrafts(drafts), [drafts]);
  const canSave = validation.ok && !saving;

  const addQuestion = () => {
    setDrafts((prev) => [...prev, createQuestionDraft()]);
  };

  const removeQuestion = (id: string) => {
    setDrafts((prev) => prev.filter((q) => q.id !== id));
  };

  const updateQuestion = (id: string, updater: (prev: QuestionDraft) => QuestionDraft) => {
    setDrafts((prev) => prev.map((q) => (q.id === id ? updater(q) : q)));
  };

  const handleSave = async () => {
    if (!validation.ok) {
      if (validation.reason) toast.error(validation.reason);
      return;
    }

    const parsedMin = (() => {
      const n = Number(minScore);
      if (!Number.isFinite(n)) return 0;
      return Math.max(0, Math.min(100, Math.floor(n)));
    })();

    const payloadQuestions = normalizeQuestions(drafts);

    try {
      setSaving(true);
      const chapterRef = doc(db, "courses", courseId, "chapters", chapter.id);
      await updateDoc(chapterRef, {
        quizQuestions: payloadQuestions,
        quizMinScore: parsedMin,
      });
      toast.success("Kuis chapter berhasil disimpan.");
      onOpenChange(false);
      onQuizUpdated?.();
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      toast.error(msg || "Gagal menyimpan kuis chapter.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="chapter-quiz-desc">
        <DialogHeader>
          <DialogTitle>Kuis untuk: {chapter.title}</DialogTitle>
          <p id="chapter-quiz-desc" className="text-xs text-gray-500">
            Kuis ini akan muncul di halaman murid setelah materi chapter. Chapter dianggap
            selesai jika siswa mencapai skor minimal.
          </p>
        </DialogHeader>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div className="space-y-1">
            <label className="text-sm font-medium">
              Skor minimal lulus (%)
            </label>
            <Input
              type="number"
              min={0}
              max={100}
              value={minScore}
              onChange={(e) => setMinScore(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              Contoh: isi 70 berarti siswa harus menjawab benar setara 70% soal untuk dianggap
              lulus chapter ini.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Daftar Pertanyaan</span>
              <Button size="sm" variant="outline" type="button" onClick={addQuestion}>
                Tambah Pertanyaan
              </Button>
            </div>

            {drafts.length === 0 ? (
              <p className="text-xs text-gray-500">
                Belum ada pertanyaan. Tambahkan minimal satu pertanyaan untuk mengaktifkan kuis.
              </p>
            ) : null}

            <div className="space-y-3">
              {drafts.map((q, idx) => (
                <div
                  key={q.id}
                  className="border rounded-lg p-3 space-y-3 bg-neutral-50 dark:bg-neutral-900/40"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold">Pertanyaan {idx + 1}</div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => removeQuestion(q.id)}
                    >
                      Hapus
                    </Button>
                  </div>
                  <Textarea
                    placeholder="Teks pertanyaan"
                    value={q.prompt}
                    onChange={(e) =>
                      updateQuestion(q.id, (prev) => ({ ...prev, prompt: e.target.value }))
                    }
                  />
                  <div className="space-y-2">
                    {q.options.map((opt, optIdx) => (
                      <div key={optIdx} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={q.correctIndices.includes(optIdx)}
                          onChange={() =>
                            updateQuestion(q.id, (prev) => {
                              const exists = prev.correctIndices.includes(optIdx);
                              const correctIndices = exists
                                ? prev.correctIndices.filter((idx) => idx !== optIdx)
                                : [...prev.correctIndices, optIdx];
                              return { ...prev, correctIndices };
                            })
                          }
                        />
                        <Input
                          className="flex-1"
                          placeholder={`Opsi ${optIdx + 1}`}
                          value={opt}
                          onChange={(e) =>
                            updateQuestion(q.id, (prev) => {
                              const options = [...prev.options];
                              options[optIdx] = e.target.value;
                              return { ...prev, options };
                            })
                          }
                        />
                        {q.options.length > 2 ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              updateQuestion(q.id, (prev) => {
                                if (prev.options.length <= 2) return prev;
                                const options = prev.options.filter((_, i) => i !== optIdx);
                                const correctIndices = prev.correctIndices
                                  .filter((idx) => idx !== optIdx)
                                  .map((idx) => (idx > optIdx ? idx - 1 : idx));
                                return { ...prev, options, correctIndices };
                              })
                            }
                          >
                            Hapus
                          </Button>
                        ) : null}
                      </div>
                    ))}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        updateQuestion(q.id, (prev) => ({
                          ...prev,
                          options: [...prev.options, ""],
                        }))
                      }
                    >
                      Tambah opsi
                    </Button>
                    <p className="text-xs text-gray-500">
                      Centang opsi yang benar. Bisa lebih dari satu jawaban benar.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" disabled={saving}>
              Batal
            </Button>
          </DialogClose>
          <Button onClick={handleSave} disabled={!canSave}>
            {saving ? "Menyimpan..." : "Simpan Kuis"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

