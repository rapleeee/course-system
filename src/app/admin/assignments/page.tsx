"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useAuth } from "@/lib/useAuth";
import { db, auth } from "@/lib/firebase";
import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp, Timestamp, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import AdminLayout from "@/components/layouts/AdminLayout";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { Label } from "@/components/ui/label";
import { parseDocxFile, type DocxParsedQuestion } from "@/lib/assignments/docx-import";

type QuizQuestion = {
  prompt: string;
  type: "mcq" | "text";
  options?: string[];
  correctIndices?: number[];
};

type QuestionDraft = {
  id: string;
  prompt: string;
  type: "mcq" | "text";
  options: string[];
  correctIndices: number[];
};

type Assignment = {
  id: string;
  title: string;
  description?: string;
  type: "task" | "quiz";
  points?: number;
  createdAt?: Timestamp;
  autoGrading?: boolean;
  questions?: QuizQuestion[];
};

const genId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function createQuestionDraft(partial: Partial<QuestionDraft> = {}): QuestionDraft {
  const draft: QuestionDraft = {
    id: partial.id ?? genId(),
    prompt: partial.prompt ?? "",
    type: partial.type === "text" ? "text" : "mcq",
    options: Array.isArray(partial.options) && partial.options.length > 0 ? [...partial.options] : ["", ""],
    correctIndices: Array.isArray(partial.correctIndices)
      ? [...new Set(partial.correctIndices.filter((n) => Number.isInteger(n) && n >= 0))]
      : [],
  };

  if (draft.type === "text") {
    draft.options = [];
    draft.correctIndices = [];
  } else {
    while (draft.options.length < 2) draft.options.push("");
    draft.correctIndices = draft.correctIndices.filter((idx) => idx < draft.options.length);
  }

  return draft;
}

function mapToDrafts(questions?: QuizQuestion[]): QuestionDraft[] {
  if (!Array.isArray(questions)) return [];
  return questions.map((q) =>
    createQuestionDraft({
      prompt: typeof q.prompt === "string" ? q.prompt : "",
      type: q.type === "text" ? "text" : "mcq",
      options: Array.isArray(q.options) ? q.options.map((opt) => (typeof opt === "string" ? opt : String(opt ?? ""))) : undefined,
      correctIndices: Array.isArray(q.correctIndices)
        ? q.correctIndices
            .map((n) => (typeof n === "number" ? n : parseInt(String(n), 10)))
            .filter((n) => Number.isInteger(n) && n >= 0)
        : undefined,
    })
  );
}

function normalizeQuestions(drafts: QuestionDraft[]): QuizQuestion[] {
  return drafts.map((draft) => {
    const prompt = draft.prompt.trim();
    if (draft.type === "text") {
      return { prompt, type: "text" } as QuizQuestion;
    }

    const options = draft.options.map((opt) => opt.trim());
    const correctIndices = Array.from(
      new Set(
        draft.correctIndices.filter((idx) => Number.isInteger(idx) && idx >= 0 && idx < options.length)
      )
    );

    return {
      prompt,
      type: "mcq",
      options,
      correctIndices,
    } as QuizQuestion;
  });
}

function validateQuizDraft(drafts: QuestionDraft[], autoGrading: boolean): { ok: boolean; reason?: string } {
  if (drafts.length === 0) return { ok: false, reason: "Minimal 1 pertanyaan untuk kuis." };

  let hasMcq = false;

  for (const draft of drafts) {
    if (!draft.prompt.trim()) {
      return { ok: false, reason: "Setiap pertanyaan harus memiliki teks." };
    }

    if (draft.type === "text") continue;

    hasMcq = true;
    const trimmedOptions = draft.options.map((opt) => opt.trim());
    if (trimmedOptions.length < 2) {
      return { ok: false, reason: "Pertanyaan pilihan ganda minimal punya 2 opsi." };
    }
    if (trimmedOptions.some((opt) => opt.length === 0)) {
      return { ok: false, reason: "Tidak boleh ada opsi kosong." };
    }
    const uniqueCorrect = Array.from(new Set(draft.correctIndices));
    if (uniqueCorrect.length === 0) {
      return { ok: false, reason: "Tandai minimal 1 jawaban benar." };
    }
    if (uniqueCorrect.some((idx) => !Number.isInteger(idx) || idx < 0 || idx >= trimmedOptions.length)) {
      return { ok: false, reason: "Pilihan jawaban benar tidak valid." };
    }
  }

  if (autoGrading && !hasMcq) {
    return { ok: false, reason: "Auto grading membutuhkan pertanyaan pilihan ganda." };
  }

  return { ok: true };
}

function docxQuestionsToDrafts(docQuestions: DocxParsedQuestion[]): QuestionDraft[] {
  return docQuestions.map((question) => {
    if (question.type === "text") {
      return createQuestionDraft({
        prompt: question.prompt,
        type: "text",
      });
    }

    const correctIndices = question.options.reduce<number[]>((acc, option, idx) => {
      if (option.correct) acc.push(idx);
      return acc;
    }, []);

    return createQuestionDraft({
      prompt: question.prompt,
      type: "mcq",
      options: question.options.map((option) => option.text),
      correctIndices,
    });
  });
}

function QuizQuestionEditor({
  questions,
  onChange,
}: {
  questions: QuestionDraft[];
  onChange: (next: QuestionDraft[]) => void;
}) {
  const updateQuestion = (id: string, updater: (prev: QuestionDraft) => QuestionDraft) => {
    onChange(questions.map((q) => (q.id === id ? updater(q) : q)));
  };

  const addQuestion = () => {
    onChange([...questions, createQuestionDraft()]);
  };

  const removeQuestion = (id: string) => {
    onChange(questions.filter((q) => q.id !== id));
  };

  const updatePrompt = (id: string, value: string) => {
    updateQuestion(id, (q) => ({ ...q, prompt: value }));
  };

  const updateType = (id: string, value: "mcq" | "text") => {
    updateQuestion(id, (q) => {
      const nextType = value === "text" ? "text" : "mcq";
      if (nextType === "text") {
        return { ...q, type: "text", options: [], correctIndices: [] };
      }
      const options = q.options.length > 0 ? [...q.options] : ["", ""];
      return { ...q, type: "mcq", options, correctIndices: [] };
    });
  };

  const updateOption = (id: string, optIdx: number, value: string) => {
    updateQuestion(id, (q) => {
      if (q.type !== "mcq") return q;
      const options = [...q.options];
      if (optIdx < 0 || optIdx >= options.length) return q;
      options[optIdx] = value;
      return { ...q, options };
    });
  };

  const addOption = (id: string) => {
    updateQuestion(id, (q) => {
      if (q.type !== "mcq") return q;
      return { ...q, options: [...q.options, ""] };
    });
  };

  const removeOption = (id: string, optIdx: number) => {
    updateQuestion(id, (q) => {
      if (q.type !== "mcq") return q;
      if (q.options.length <= 2) return q;
      const options = q.options.filter((_, idx) => idx !== optIdx);
      const correctIndices = q.correctIndices
        .filter((idx) => idx !== optIdx)
        .map((idx) => (idx > optIdx ? idx - 1 : idx));
      return { ...q, options, correctIndices };
    });
  };

  const toggleCorrect = (id: string, optIdx: number) => {
    updateQuestion(id, (q) => {
      if (q.type !== "mcq") return q;
      const exists = q.correctIndices.includes(optIdx);
      const correctIndices = exists
        ? q.correctIndices.filter((idx) => idx !== optIdx)
        : [...q.correctIndices, optIdx];
      return { ...q, correctIndices };
    });
  };

  return (
    <div className="space-y-3">
      {questions.map((q, index) => (
        <div key={q.id} className="border rounded-lg p-3 space-y-3 bg-neutral-50 dark:bg-neutral-900/40">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold">Pertanyaan {index + 1}</div>
            <div className="flex items-center gap-2">
              <select
                className="border rounded-md px-2 py-1 text-sm"
                value={q.type}
                onChange={(e) => updateType(q.id, e.target.value === "text" ? "text" : "mcq")}
              >
                <option value="mcq">Pilihan ganda</option>
                <option value="text">Jawaban singkat</option>
              </select>
              <Button type="button" variant="outline" size="sm" onClick={() => removeQuestion(q.id)}>
                Hapus
              </Button>
            </div>
          </div>
          <Textarea
            placeholder="Teks pertanyaan"
            value={q.prompt}
            onChange={(e) => updatePrompt(q.id, e.target.value)}
          />
          {q.type === "mcq" ? (
            <div className="space-y-2">
              {q.options.map((opt, optIdx) => (
                <div key={optIdx} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={q.correctIndices.includes(optIdx)}
                    onChange={() => toggleCorrect(q.id, optIdx)}
                  />
                  <Input
                    className="flex-1"
                    placeholder={`Opsi ${optIdx + 1}`}
                    value={opt}
                    onChange={(e) => updateOption(q.id, optIdx, e.target.value)}
                  />
                  {q.options.length > 2 ? (
                    <Button type="button" size="sm" variant="ghost" onClick={() => removeOption(q.id, optIdx)}>
                      Hapus
                    </Button>
                  ) : null}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => addOption(q.id)}>
                Tambah opsi
              </Button>
              <p className="text-xs text-gray-500">Centang opsi yang benar. Bisa lebih dari satu.</p>
            </div>
          ) : (
            <p className="text-xs text-gray-500">Jawaban singkat akan dinilai manual oleh admin.</p>
          )}
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
        Tambah pertanyaan
      </Button>
    </div>
  );
}

function DocxImportHelp({ context }: { context: "create" | "edit" }) {
  const replaceText =
    context === "create"
      ? "Impor menggantikan daftar pertanyaan dan otomatis mengaktifkan mode kuis."
      : "Impor menggantikan pertanyaan yang sedang diedit dan memastikan mode kuis aktif.";

  return (
    <div className="rounded-md border border-dashed border-gray-200 bg-white/70 p-3 text-xs text-gray-600 dark:border-neutral-700 dark:bg-neutral-900/40 dark:text-gray-400 space-y-1">
      <p className="font-semibold text-gray-700 dark:text-gray-200">Panduan cepat impor Word</p>
      <ul className="list-disc space-y-1 pl-4">
        <li>Unduh template agar struktur `[PERTANYAAN]`, `Tipe`, dan `Opsi` sesuai.</li>
        <li>Gunakan `mcq` untuk pilihan ganda atau `text` untuk jawaban singkat.</li>
        <li>Tandai jawaban benar dengan `[x]` di depan opsi, sisakan kosong untuk jawaban salah.</li>
        <li>Simpan dokumen sebagai `.docx` sebelum melakukan impor di sini.</li>
        <li>{replaceText}</li>
      </ul>
    </div>
  );
}

export default function AdminAssignmentsPage() {
  const MySwal = withReactContent(Swal);
  const { user } = useAuth();
  const [list, setList] = useState<Assignment[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"task" | "quiz">("task");
  const [points, setPoints] = useState<number>(10);
  const [autoGrading, setAutoGrading] = useState(false);
  const [questions, setQuestions] = useState<QuestionDraft[]>([createQuestionDraft()]);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Assignment | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editType, setEditType] = useState<"task" | "quiz">("task");
  const [editPoints, setEditPoints] = useState<number>(10);
  const [editAutoGrading, setEditAutoGrading] = useState(false);
  const [editQuestions, setEditQuestions] = useState<QuestionDraft[]>([]);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const importModeRef = useRef<"create" | "edit">("create");
  const [importingDoc, setImportingDoc] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "assignments"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Assignment, "id">) }));
      setList(rows as Assignment[]);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (type !== "quiz") {
      setAutoGrading(false);
      return;
    }
    if (questions.length === 0) {
      setQuestions([createQuestionDraft()]);
    }
  }, [type, questions.length]);

  useEffect(() => {
    if (!editing) return;
    if (editType !== "quiz") {
      setEditAutoGrading(false);
      return;
    }
    if (editQuestions.length === 0) {
      setEditQuestions([createQuestionDraft()]);
    }
  }, [editing, editType, editQuestions.length]);

  const openImportDialog = (mode: "create" | "edit") => {
    importModeRef.current = mode;
    importInputRef.current?.click();
  };

  const handleImportFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".docx")) {
      toast.error("Format tidak didukung. Gunakan file .docx dari template.");
      return;
    }
    try {
      setImportingDoc(true);
      const parsedQuestions = await parseDocxFile(file);
      const drafts = docxQuestionsToDrafts(parsedQuestions);
      if (drafts.length === 0) {
        toast.error("Tidak ada pertanyaan yang ditemukan dalam dokumen.");
        return;
      }
      const hasMcq = parsedQuestions.some((question) => question.type === "mcq");
      if (importModeRef.current === "edit") {
        setEditType("quiz");
        setEditQuestions(drafts);
        setEditAutoGrading((prev) => (prev && hasMcq));
      } else {
        setType("quiz");
        setQuestions(drafts);
        setAutoGrading((prev) => (prev && hasMcq));
      }
      toast.success(`Berhasil mengimpor ${drafts.length} pertanyaan dari dokumen.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(message);
    } finally {
      setImportingDoc(false);
    }
  };

  const createQuizValidation = useMemo(() => {
    if (type !== "quiz") return { ok: true } as const;
    return validateQuizDraft(questions, autoGrading);
  }, [type, questions, autoGrading]);

  const editQuizValidation = useMemo(() => {
    if (!editing || editType !== "quiz") return { ok: true } as const;
    return validateQuizDraft(editQuestions, editAutoGrading);
  }, [editing, editType, editQuestions, editAutoGrading]);

  const canSubmit = useMemo(
    () => title.trim().length > 0 && !busy && createQuizValidation.ok,
    [title, busy, createQuizValidation]
  );

  const canSubmitEdit = useMemo(
    () => Boolean(editing) && editTitle.trim().length > 0 && !busy && editQuizValidation.ok,
    [editing, editTitle, busy, editQuizValidation]
  );

  const handleCreate = async () => {
    let questionPayload: QuizQuestion[] = [];
    if (type === "quiz") {
      const validation = validateQuizDraft(questions, autoGrading);
      if (!validation.ok) {
        toast.error(validation.reason);
        return;
      }
      questionPayload = normalizeQuestions(questions);
    }

    try {
      setBusy(true);
      if (!user?.uid) throw new Error("Harus login");
      await addDoc(collection(db, "assignments"), {
        title,
        description: description || "",
        type,
        points: Math.max(0, Math.floor(points || 0)),
        autoGrading: type === "quiz" ? autoGrading : false,
        questions: questionPayload,
        dueAt: null,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
      });
      toast.success("Berhasil membuat tugas/kuis");
      setTitle("");
      setDescription("");
      setType("task");
      setPoints(10);
      setAutoGrading(false);
      setQuestions([createQuestionDraft()]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const openEdit = (a: Assignment) => {
    setEditing(a);
    setEditTitle(a.title);
    setEditDescription(a.description || "");
    setEditType(a.type);
    setEditPoints(a.points ?? 10);
    setEditAutoGrading(Boolean(a.autoGrading));
    setEditQuestions(a.type === "quiz" ? mapToDrafts(a.questions) : []);
  };

  const submitEdit = async () => {
    if (!editing) return;
    let questionPayload: QuizQuestion[] = [];
    if (editType === "quiz") {
      if (!editQuizValidation.ok) {
        toast.error(editQuizValidation.reason);
        return;
      }
      questionPayload = normalizeQuestions(editQuestions);
    }
    try {
      setBusy(true);
      await updateDoc(doc(db, "assignments", editing.id), {
        title: editTitle,
        description: editDescription,
        type: editType,
        points: Math.max(0, Math.floor(editPoints || 0)),
        autoGrading: editType === "quiz" ? editAutoGrading : false,
        questions: questionPayload,
        updatedAt: serverTimestamp(),
      });
      toast.success("Perubahan disimpan");
      setEditing(null);
      setEditQuestions([]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    const resConfirm = await MySwal.fire({
      title: "Hapus tugas/kuis?",
      text: "Semua submission juga akan dihapus.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#d33",
    });
    if (!resConfirm.isConfirmed) return;
    try {
      setBusy(true);
      void MySwal.fire({
        title: "Menghapus...",
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => {
          MySwal.showLoading();
        },
      });
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/assignments/${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        const errMsg = json?.error || "Gagal menghapus dari server";
        throw new Error(errMsg);
      }
      MySwal.close();
      setList((prev) => prev.filter((x) => x.id !== id));
      await MySwal.fire({ title: "Berhasil", text: "Tugas/kuis telah dihapus.", icon: "success" });
    } catch (e) {
      MySwal.close();
      try {
        // fallback client-side delete jika API belum siap
        await deleteDoc(doc(db, "assignments", id));
        setList((prev) => prev.filter((x) => x.id !== id));
        await MySwal.fire({ title: "Berhasil", text: "Tugas/kuis telah dihapus (fallback).", icon: "success" });
      } catch (fallbackError) {
        const message =
          e instanceof Error ? e.message : fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
        await MySwal.fire({ title: "Gagal", text: message, icon: "error" });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminLayout pageTitle="Tugas & Kuis">
      <input
        ref={importInputRef}
        type="file"
        accept=".docx"
        className="hidden"
        onChange={handleImportFileChange}
      />
      <div className="max-w-full p-2 sm:p-0 space-y-8">
        <h1 className="text-2xl font-bold">Kelola Tugas & Kuis</h1>

        <div className="rounded-xl border p-4 space-y-3">
          <div className="font-semibold">Buat Baru</div>
          <Input placeholder="Judul" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea placeholder="Deskripsi (opsional)" value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="flex flex-wrap gap-3 items-start md:items-center">
             <div className="flex flex-col gap-1">
              <Label htmlFor="assignment-points" className="text-xs font-medium">
                Bobot nilai (poin total)
              </Label>
            <select
              className="border rounded-md px-3 py-2"
              value={type}
              onChange={(e) => setType(e.target.value === "quiz" ? "quiz" : "task")}
            >
              <option value="task">Tugas (review manual)</option>
              <option value="quiz">Kuis (bisa auto-grade)</option>
            </select>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="assignment-points" className="text-xs font-medium">
                Bobot nilai (poin total)
              </Label>
              <Input
                id="assignment-points"
                type="number"
                placeholder="misal: 100"
                value={points}
                onChange={(e) => setPoints(parseInt(e.target.value || "0", 10))}
                className="w-36"
              />
            </div>
             <div className="flex flex-col gap-1">
              <Label htmlFor="assignment-points" className="text-xs font-medium">
                &nbsp;
              </Label>
            <Button disabled={!canSubmit} onClick={handleCreate}>Simpan</Button>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Bobot nilai menentukan skor maksimum yang bisa didapat peserta untuk tugas/kuis ini.
          </p>
          {type === "quiz" ? (
            <div className="space-y-3 rounded-lg border p-3 bg-neutral-50 dark:bg-neutral-900/40">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Button variant="outline" size="sm" asChild>
                  <a href="/api/assignments/template" target="_blank" rel="noopener noreferrer">
                    Unduh template Word
                  </a>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={importingDoc || busy}
                  onClick={() => openImportDialog("create")}
                >
                  {importingDoc ? "Memproses dokumen..." : "Import dari Word (.docx)"}
                </Button>
                <span className="text-xs text-gray-500">
                  Impor menggantikan daftar pertanyaan dan otomatis mengaktifkan mode kuis.
                </span>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={autoGrading}
                  onChange={(e) => setAutoGrading(e.target.checked)}
                />
                <span>Penilaian otomatis (beri nilai langsung jika jawaban benar).</span>
              </label>
              <QuizQuestionEditor questions={questions} onChange={setQuestions} />
              <DocxImportHelp context="create" />
            </div>
          ) : null}
        </div>

        <div className="space-y-3">
          <div className="font-semibold">Daftar</div>
          {list.length === 0 ? (
            <div className="text-sm text-gray-500">Belum ada tugas/kuis.</div>
          ) : (
            <ul className="space-y-2">
              {list.map((a) => (
                <li key={a.id} className="rounded-lg border p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{a.title}</div>
                    <div className="text-xs text-gray-500">{a.type} • {a.points ?? 0} poin</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" onClick={() => openEdit(a)} disabled={busy}>Edit</Button>
                    <Button variant="destructive" onClick={() => handleDelete(a.id)} disabled={busy}>Hapus</Button>
                    <a className="text-sm text-blue-600 hover:underline" href={`/admin/assignments/${a.id}`}>Review</a>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Toaster position="top-right" />
      </div>
      {editing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-xl w-full max-w-lg p-4" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-semibold mb-2">Edit Tugas/Kuis</div>
            <div className="space-y-4">
              <Input placeholder="Judul" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
              <Textarea placeholder="Deskripsi" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
              <div className="flex flex-wrap gap-3 items-start md:items-center">
                <select
                  className="border rounded-md px-3 py-2"
                  value={editType}
                  onChange={(e) => setEditType(e.target.value === "quiz" ? "quiz" : "task")}
                >
                  <option value="task">Tugas</option>
                  <option value="quiz">Kuis</option>
                </select>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="assignment-points-edit" className="text-xs font-medium">
                    Bobot nilai (poin total)
                  </Label>
                  <Input
                    id="assignment-points-edit"
                    type="number"
                    placeholder="misal: 100"
                    className="w-36"
                    value={editPoints}
                    onChange={(e) => setEditPoints(parseInt(e.target.value || "0", 10))}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Perubahan bobot nilai akan mengatur ulang skor maksimum untuk tugas/kuis ini.
              </p>
              {editType === "quiz" ? (
                <div className="space-y-3 rounded-lg border p-3 bg-neutral-50 dark:bg-neutral-900/40">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Button variant="outline" size="sm" asChild>
                      <a href="/api/assignments/template" target="_blank" rel="noopener noreferrer">
                        Unduh template Word
                      </a>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={importingDoc || busy}
                      onClick={() => openImportDialog("edit")}
                    >
                      {importingDoc ? "Memproses dokumen..." : "Import dari Word (.docx)"}
                    </Button>
                    <span className="text-xs text-gray-500">
                      Impor menggantikan pertanyaan yang sedang diedit dan memastikan mode kuis aktif.
                    </span>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={editAutoGrading}
                      onChange={(e) => setEditAutoGrading(e.target.checked)}
                    />
                    <span>Penilaian otomatis (beri nilai langsung jika jawaban benar).</span>
                  </label>
                  <QuizQuestionEditor questions={editQuestions} onChange={setEditQuestions} />
                  <DocxImportHelp context="edit" />
                </div>
              ) : null}
              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" onClick={() => setEditing(null)} disabled={busy}>Batal</Button>
                <Button onClick={submitEdit} disabled={!canSubmitEdit}>Simpan</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
