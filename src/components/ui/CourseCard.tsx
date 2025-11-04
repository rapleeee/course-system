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
import { Badge } from "@/components/ui/badge";
type CourseAccessType = "free" | "subscription" | "paid";

type CourseCardProps = {
  id: string;
  title: string;
  mentor: string;
  imageUrl?: string;
  accessType?: CourseAccessType;
  isFree?: boolean;
  price?: number;
  materialType: string;
  onDeleted?: () => void;
};

export default function CourseCard({
  id,
  title,
  mentor,
  imageUrl,
  accessType,
  isFree,
  price,
  materialType,
  onDeleted,
}: CourseCardProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const normalizedAccess: CourseAccessType =
    accessType ?? (typeof isFree === "boolean" ? (isFree ? "free" : "subscription") : "subscription");
  const displayedPrice = normalizedAccess === "paid" ? price ?? 0 : 0;

  // State lokal untuk edit form
  const [editTitle, setEditTitle] = useState(title);
  const [editMentor, setEditMentor] = useState(mentor);
  const [editAccessType, setEditAccessType] = useState<CourseAccessType>(normalizedAccess);
  const [editPrice, setEditPrice] = useState<string>(displayedPrice ? String(displayedPrice) : "0");

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
        accessType: editAccessType,
        price: editAccessType === "paid" ? Number(editPrice) || 0 : 0,
        isFree: editAccessType === "free",
      });

      toast.success("Course berhasil diperbarui.");
      setShowEditModal(false);
      onDeleted?.(); // pakai untuk refresh list
    } catch (error) {
      console.error("Gagal update course:", error);
      toast.error("Gagal memperbarui course.");
    }
  };

  const accessLabel =
    normalizedAccess === "paid"
      ? "Berbayar"
      : normalizedAccess === "subscription"
      ? "Subscriber"
      : "Gratis";

  const priceLabel =
    normalizedAccess === "paid"
      ? `Berbayar • Rp ${displayedPrice.toLocaleString("id-ID")}`
      : normalizedAccess === "subscription"
      ? "Hanya Subscriber"
      : "Gratis";

  const accessBadgeVariant =
    normalizedAccess === "paid"
      ? "default"
      : normalizedAccess === "subscription"
      ? "secondary"
      : "outline";

  const priceTextClass =
    normalizedAccess === "paid" ? "text-primary font-semibold" : "text-muted-foreground";

  return (
    <Card className="relative flex h-full flex-col overflow-hidden rounded-xl border border-border/60 bg-card/90 px-0 py-0 shadow-sm transition-colors duration-200 dark:border-border/40">
      <Link
        href={`/admin/course/${id}`}
        className="group flex flex-1 flex-col gap-4 p-4"
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-border/40 bg-muted">
          <Image
            src={displayedImage}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            priority={false}
          />
        </div>
        <div className="flex flex-1 flex-col gap-3 text-left">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
            <Badge variant="secondary" className="uppercase tracking-wide">
              {materialType}
            </Badge>
            <Badge variant={accessBadgeVariant}>{accessLabel}</Badge>
          </div>
          <h3 className="text-lg font-semibold leading-tight line-clamp-2">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground">
            Mentor: <span className="font-medium text-foreground">{mentor}</span>
          </p>
          <p className={`text-sm ${priceTextClass}`}>{priceLabel}</p>
        </div>
      </Link>

      <div className="flex items-center gap-2 border-t border-border/60 bg-card/80 px-4 py-4">
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              className="flex-1"
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
              <div>
                <label className="block text-sm mb-1">Tipe Akses</label>
                <select
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={editAccessType}
                  onChange={(e) => setEditAccessType(e.target.value as CourseAccessType)}
                >
                  <option value="free">Gratis</option>
                  <option value="subscription">Hanya Subscriber</option>
                  <option value="paid">Berbayar (Manual)</option>
                </select>
              </div>
              {editAccessType === "paid" && (
                <div>
                  <label className="block text-sm mb-1">Harga Course (Rp)</label>
                  <Input
                    type="number"
                    min={0}
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Pengguna dengan langganan aktif mendapatkan diskon Rp5.000.
                  </p>
                </div>
              )}
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
              className="flex-1"
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
