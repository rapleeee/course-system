"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Trash2, Pencil, ChevronDown, ChevronUp, ListChecks } from "lucide-react";
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import EditChapterModal from "./EditChapterModal";
import { Chapter } from "./types";
import { ChapterQuizModal } from "./ChapterQuizModal";
import YouTube from 'react-youtube';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type Props = {
    chapters: Chapter[];
    courseId: string;
    onChapterUpdated?: () => void;
};

export default function ChapterList({ chapters, courseId, onChapterUpdated }: Props) {
    const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
    const [quizChapter, setQuizChapter] = useState<Chapter | null>(null);
    const [openIndex, setOpenIndex] = useState<number | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<Chapter | null>(null);

    const toggleOpen = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    const handleDelete = async () => {
        if (!confirmDelete) return;
        try {
            await deleteDoc(doc(db, "courses", courseId, "chapters", confirmDelete.id));
            toast.success("Chapter berhasil dihapus");
            setConfirmDelete(null);
            onChapterUpdated?.();
        } catch (err) {
            console.error(err);
            toast.error("Gagal menghapus chapter");
        }
    };

    const renderChapterContent = (chapter: Chapter) => {
        switch (chapter.type) {
            case "quiz":
                return (
                    <div className="p-4 bg-emerald-50 text-emerald-800 rounded-lg text-sm">
                        Chapter ini adalah <span className="font-semibold">kuis</span>. Konten utamanya
                        berupa pertanyaan yang dikerjakan siswa di halaman kursus.
                    </div>
                );

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
                                },
                            }}
                            className="w-full h-full"
                            onError={() => toast.error("Gagal memuat video")}
                        />
                    </div>
                ) : (
                    <div className="p-4 bg-yellow-50 text-yellow-600 rounded-lg">
                        Video tidak tersedia
                    </div>
                );

            case "pdf":
                return chapter.pdfUrl ? (
                    <div className="w-full h-[600px] rounded-lg overflow-hidden border border-gray-200">
                        <iframe
                            src={`${chapter.pdfUrl}#toolbar=0`}
                            className="w-full h-full"
                            title={`PDF: ${chapter.title}`}
                        />
                    </div>
                ) : (
                    <div className="p-4 bg-yellow-50 text-yellow-600 rounded-lg">
                        PDF tidak tersedia
                    </div>
                );

            case "module":
                return chapter.image ? (
                    <div className="relative w-full h-[400px]">
                        <Image
                            src={chapter.image}
                            alt={chapter.title}
                            fill
                            className="rounded-lg object-contain"
                            loading="lazy"
                        />
                    </div>
                ) : (
                    <div className="p-4 bg-yellow-50 text-yellow-600 rounded-lg">
                        Gambar tidak tersedia
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="space-y-4">
            {chapters.map((chapter, index) => (
                <div key={chapter.id} className="border rounded-lg overflow-hidden bg-white dark:bg-neutral-900">
                    <button
                        className="w-full flex justify-between items-center p-4 text-left hover:bg-gray-50 dark:hover:bg-neutral-800"
                        onClick={() => toggleOpen(index)}
                    >
                        <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-500">#{index + 1}</span>
                            <span className="font-medium">{chapter.title}</span>
                            {chapter.type === "quiz" && (
                                <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 border border-emerald-200">
                                    {Array.isArray(chapter.quizQuestions) && chapter.quizQuestions.length > 0
                                        ? `Kuis • ${chapter.quizQuestions.length} soal`
                                        : "Kuis • belum ada soal"}
                                </span>
                            )}
                        </div>
                        {openIndex === index ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </button>

                    {openIndex === index && (
                        <div className="px-4 pb-4 space-y-4">
                            {renderChapterContent(chapter)}

                            {chapter.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                    {chapter.description}
                                </p>
                            )}

                            {chapter.text && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 whitespace-pre-wrap">
                                    {chapter.text}
                                </p>
                            )}

                            <div className="flex gap-2 pt-2">
                                <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => setEditingChapter(chapter)}
                                >
                                    <Pencil className="w-4 h-4 mr-1" />
                                    Edit
                                </Button>
                                {chapter.type === "quiz" && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setQuizChapter(chapter)}
                                    >
                                        <ListChecks className="w-4 h-4 mr-1" />
                                        Kuis
                                    </Button>
                                )}
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setConfirmDelete(chapter);
                                    }}
                                >
                                    <Trash2 className="w-4 h-4 mr-1" />
                                    Hapus
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            ))}

            {confirmDelete && (
                <Dialog open onOpenChange={() => setConfirmDelete(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Hapus Chapter</DialogTitle>
                        </DialogHeader>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            Yakin ingin menghapus chapter <strong>{confirmDelete.title}</strong>?
                        </p>
                        <DialogFooter>
                            <Button variant="secondary" onClick={() => setConfirmDelete(null)}>
                                Batal
                            </Button>
                            <Button variant="destructive" onClick={handleDelete}>
                                Ya, Hapus
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}

            {editingChapter && (
                <EditChapterModal
                    open={!!editingChapter}
                    onOpenChange={() => setEditingChapter(null)}
                    chapter={editingChapter}
                    courseId={courseId}
                    onChapterUpdated={() => {
                        setEditingChapter(null);
                        onChapterUpdated?.();
                    }}
                />
            )}
            {quizChapter && (
                <ChapterQuizModal
                    open={!!quizChapter}
                    onOpenChange={(open) => {
                        if (!open) setQuizChapter(null);
                    }}
                    chapter={quizChapter}
                    courseId={courseId}
                    onQuizUpdated={() => {
                        setQuizChapter(null);
                        onChapterUpdated?.();
                    }}
                />
            )}
        </div>
    );
}
