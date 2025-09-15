"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import Image from "next/image";
import { Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/firebase";
import { doc, deleteDoc } from "firebase/firestore";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { updateDoc } from "firebase/firestore";
import { toast } from "sonner"; // pastikan kamu sudah install `sonner`
import { Switch } from "@/components/ui/switch";

type CourseCardProps = {
  id: string;
  title: string;
  mentor: string;
  imageUrl?: string;
  isFree: boolean;
  materialType: string;
  onDeleted?: () => void;
};

export default function CourseCard({
  id,
  title,
  mentor,
  imageUrl,
  isFree,
  materialType,
  onDeleted,
}: CourseCardProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // State lokal untuk edit form
  const [editTitle, setEditTitle] = useState(title);
  const [editMentor, setEditMentor] = useState(mentor);
  const [editIsFree, setEditIsFree] = useState(isFree);

  const handleDelete = async () => {
    await deleteDoc(doc(db, "courses", id));
    setShowDeleteModal(false);
    onDeleted?.();
  };

  const displayedImage =
    imageUrl && imageUrl.trim() !== "" ? imageUrl : "/photos/working.jpg";

  const handleEditSubmit = async () => {
  try {
    if (!editTitle.trim() || !editMentor.trim()) {
      toast.error("Judul dan mentor tidak boleh kosong.");
      return;
    }

    const ref = doc(db, "courses", id);
    await updateDoc(ref, {
      title: editTitle,
      mentor: editMentor,
      isFree: editIsFree,
    });

    toast.success("Course berhasil diperbarui.");
    setShowEditModal(false);
    onDeleted?.(); // pakai untuk refresh list
  } catch (error) {
    console.error("Gagal update course:", error);
    toast.error("Gagal memperbarui course.");
  }
};

  return (
    <Card className="flex flex-col border rounded-lg hover:shadow transition relative group">
      {/* Area yang dapat diklik untuk buka detail */}
      <Link
        href={`/admin/course/${id}`}
        className="p-4 block cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-800 transition rounded-t-lg"
      >
        <div className="relative w-full h-40 rounded-md overflow-hidden mb-3 bg-muted">
          <Image
            src={displayedImage}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw"
            className="object-cover"
            priority={false}
          />
        </div>
        <div className="flex flex-col items-start text-left mb-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-sm text-gray-500">Mentor: {mentor}</p>
          <p className="text-sm text-gray-500">
            Tipe: {materialType} | {isFree ? "Gratis" : "Premium"}
          </p>
        </div>
      </Link>

      {/* Tombol Edit & Hapus */}
      <div className="flex gap-2 px-4 pb-4">
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => e.stopPropagation()}
            >
              <Pencil className="w-4 h-4 mr-1" /> Edit
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Course</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                placeholder="Judul Course"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
              <Input
                placeholder="Mentor"
                value={editMentor}
                onChange={(e) => setEditMentor(e.target.value)}
              />
              <div className="flex items-center gap-3">
                <span className="text-sm">Gratis?</span>
                <Switch checked={editIsFree} onCheckedChange={setEditIsFree} />
                <span className="text-xs text-muted-foreground">{editIsFree ? "Gratis" : "Hanya Subscriber"}</span>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <DialogClose asChild>
                <Button variant="secondary">Batal</Button>
              </DialogClose>
              <Button onClick={handleEditSubmit}>Simpan</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              variant="destructive"
              onClick={(e) => e.stopPropagation()}
            >
              <Trash2 className="w-4 h-4 mr-1" /> Hapus
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Hapus Course</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-gray-600">
              Apakah kamu yakin ingin menghapus course{" "}
              <strong>{title}</strong>?
            </p>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="secondary">Batal</Button>
              </DialogClose>
              <Button variant="destructive" onClick={handleDelete}>
                Ya, Hapus
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Card>
  );
}
