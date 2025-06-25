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

type CourseCardProps = {
  id: string;
  title: string;
  mentor: string;
  imageUrl?: string;
  isFree: boolean;
  materialType: string;
  onDeleted?: () => void; // untuk refresh list setelah hapus
};

export default function CourseCard({
  id,
  title,
  mentor,
  isFree,
  materialType,
  onDeleted,
}: CourseCardProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleDelete = async () => {
    await deleteDoc(doc(db, "courses", id));
    setShowDeleteModal(false);
    onDeleted?.(); // callback untuk refresh list
  };

  return (
    <Card className="p-4 flex-col border rounded-lg hover:shadow transition">
      <Image
        src="/photos/working.jpg"
        alt={title}
        width={550}
        height={80}
        className="rounded-md object-cover"
      />
      <div className=" flex flex-col items-start text-left">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-gray-500">Mentor: {mentor}</p>
        <p className="text-sm text-gray-500">
          Tipe: {materialType} | {isFree ? "Gratis" : "Berbayar"}
        </p>
      </div>
      <div className="flex gap-2">
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Pencil className="w-4 h-4 mr-1" /> Edit
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Course (Belum Implement)</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-gray-500">
              Fitur edit akan ditambahkan nanti.
            </p>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="secondary">Tutup</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
          <DialogTrigger asChild>
            <Button size="sm" variant="destructive">
              <Trash2 className="w-4 h-4 mr-1" /> Hapus
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Hapus Course</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-gray-600">
              Apakah kamu yakin ingin menghapus course <strong>{title}</strong>?
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