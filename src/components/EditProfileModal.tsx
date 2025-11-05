"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

const LEVEL_OPTIONS = ["beginner", "intermediate", "master"] as const;
type LevelOption = (typeof LEVEL_OPTIONS)[number];

const normalizeLevel = (value?: string | null): LevelOption | "" => {
  if (!value) return "";
  const normalized = value.toLowerCase() as LevelOption;
  return LEVEL_OPTIONS.includes(normalized) ? normalized : "";
};

type Props = {
  userId: string;
  initialData: {
    name?: string;
    level?: string | null;
    description?: string;
    photoURL?: string;
    email?: string;
  };
  onClose: () => void;
  onUpdated: () => Promise<void>;
};

export default function EditProfileModal({
  userId,
  initialData,
  onClose,
  onUpdated,
}: Props) {
  const [name, setName] = useState(initialData?.name || "");
  const [level, setLevel] = useState<string>(normalizeLevel(initialData?.level));
  const [description, setDescription] = useState(initialData?.description || "");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(true); // kontrol modal terbuka/tutup

  const handleClose = () => {
    setOpen(false);
    onClose();
  };

  const handleSave = async () => {
    if (!userId) {
      toast.error("User ID tidak ditemukan.");
      return;
    }

    setLoading(true);

    try {
      let photoURL = initialData?.photoURL || "";

      if (photoFile) {
        const storage = getStorage();
        const safeName = photoFile.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
        const photoRef = ref(storage, `users/${userId}/profile-${Date.now()}-${safeName}`);
        await uploadBytes(photoRef, photoFile);
        photoURL = await getDownloadURL(photoRef);
      }

      const userRef = doc(db, "users", userId);
      await setDoc(
        userRef,
        {
          name,
          level: level || "",
          description,
          photoURL,
          email: initialData?.email || "",
        },
        { merge: true }
      );

      toast.success("Profil berhasil diperbarui 🎉");
      await onUpdated();
      handleClose();
    } catch (err) {
      console.error("Gagal update:", err);
      toast.error("Gagal menyimpan data.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Profil</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div>
            <Label className="mb-2">Nama Lengkap</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div>
            <Label className="mb-2">Level</Label>
            <Select value={level || undefined} onValueChange={setLevel}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih level belajar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="master">Master</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-2">Headlines</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <Label className="mb-2">Foto Profil</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file && file.size > 1024 * 1024) {
                  toast.error("Ukuran gambar maksimal 1MB");
                  e.target.value = "";
                  return;
                }
                setPhotoFile(file || null);
              }}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose}>
            Batal
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Menyimpan..." : "Simpan"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
