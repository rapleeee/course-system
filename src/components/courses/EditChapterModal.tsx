// components/courses/EditChapterModal.tsx
"use client";

import React, { useState } from "react";
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
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Chapter } from "./types";

interface EditChapterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  chapter: Chapter;
  onChapterUpdated: () => void;
}

export default function EditChapterModal({
  open,
  onOpenChange,
  courseId,
  chapter,
  onChapterUpdated,
}: EditChapterModalProps) {
  const [title, setTitle] = useState(chapter.title);
  const [shortDesc, setShortDesc] = useState(chapter.shortDesc || "");

  const handleSave = async () => {
    const ref = doc(db, "courses", courseId, "chapters", chapter.id);
    await updateDoc(ref, {
      title,
      shortDesc,
    });
    onOpenChange(false);
    onChapterUpdated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Chapter</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder="Judul Chapter"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Textarea
            placeholder="Deskripsi Singkat Chapter"
            value={shortDesc}
            onChange={(e) => setShortDesc(e.target.value)}
          />
        </div>
        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <Button variant="secondary">Batal</Button>
          </DialogClose>
          <Button onClick={handleSave}>Simpan Perubahan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}