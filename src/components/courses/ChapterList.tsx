"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Trash2, Pencil, ChevronDown, ChevronUp } from "lucide-react";
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import EditChapterModal from "./EditChapterModal";
import { Chapter } from "./types";
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
    return (
        <div className="space-y-4">
            {chapters.map((chapter, index) => (
                <div key={chapter.id} className="border rounded overflow-hidden">
                    <button
                        className="w-full flex justify-between items-center p-4 text-left hover:bg-gray-50 dark:hover:bg-neutral-800"
                        onClick={() => toggleOpen(index)}
                    >
                        <span className="font-semibold text-base">
                            Chapter {index + 1}: {chapter.title}
                        </span>
                        {openIndex === index ? <ChevronUp /> : <ChevronDown />}
                    </button>

                    {openIndex === index && (
                        <div className="px-4 pb-4 space-y-3">
                            {chapter.type === "video" && chapter.videoUrl && (
                                <video controls className="w-full rounded">
                                    <source src={chapter.videoUrl} type="video/mp4" />
                                    Browser tidak mendukung video.
                                </video>
                            )}

                            {chapter.image && (
                                <div className="w-full h-48 relative">
                                    <Image
                                        src={chapter.image}
                                        alt={chapter.title}
                                        fill
                                        className="rounded object-cover"
                                    />
                                </div>
                            )}

                            {chapter.pdfUrl && (
                                <iframe
                                    src={chapter.pdfUrl}
                                    className="w-full h-96 rounded border"
                                    title="PDF Viewer"
                                />
                            )}

                            {chapter.shortDesc && (
                                <p className="text-sm text-gray-600">{chapter.shortDesc}</p>
                            )}

                            <div className="flex gap-2 pt-2">
                                <Button size="sm" variant="outline" onClick={() => setEditingChapter(chapter)}>
                                    <Pencil className="w-4 h-4 mr-1" />
                                    Edit
                                </Button>

                                <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={(e) => {
                                        e.stopPropagation(); // Hindari buka accordion
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
                        <p className="text-sm text-gray-600">
                            Yakin ingin menghapus <strong>{confirmDelete.title}</strong>?
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
        </div>
    );
}