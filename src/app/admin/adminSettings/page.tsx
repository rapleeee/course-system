"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import AdminLayout from "@/components/layouts/AdminLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { storage, db } from "@/lib/firebase";
import { useAdminProfile } from "@/hooks/useAdminProfile";
import { toast } from "sonner";
import { doc, setDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { Loader2, UploadCloud, ShieldCheck } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ProfileForm = {
  name: string;
  username: string;
  level: string;
  description: string;
  teachingSubject: string;
};

const SUBJECT_OPTIONS = [
  "Matematika",
  "Bahasa Indonesia",
  "Bahasa Inggris",
  "Ilmu Pengetahuan Alam",
  "Fisika",
  "Kimia",
  "Biologi",
  "Ilmu Pengetahuan Sosial",
  "Sejarah",
  "Geografi",
  "Ekonomi",
  "Sosiologi",
  "Teknologi Informasi",
  "Pemrograman",
  "Rekayasa Perangkat Lunak",
  "TKJ",
  "Desain Grafis",
  "DKV (Desain Komunikasi Visual)",
  "Bahasa Jepang",
  "Bahasa Arab",
  "Agama",
  "Kewirausahaan",
  "PKN",
] as const;

export default function AdminSettingsPage() {
  const { user, profile, profileLoading } = useAdminProfile();
  const [form, setForm] = useState<ProfileForm>({
    name: "",
    username: "",
    level: "",
    description: "",
    teachingSubject: "",
  });
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [photoURL, setPhotoURL] = useState<string | undefined>(undefined);

  const isGuru = profile?.role === "guru";

  useEffect(() => {
    if (!profileLoading && profile) {
      setForm({
        name:
          (typeof profile.name === "string" && profile.name) ||
          (typeof profile.nama === "string" && profile.nama) ||
          "",
        username:
          (typeof profile.username === "string" && profile.username) ||
          (typeof profile.email === "string" && profile.email.split("@")[0]) ||
          "",
        level: (typeof profile.level === "string" && profile.level) || "",
        description: (typeof profile.description === "string" && profile.description) || "",
        teachingSubject:
          (typeof profile.teachingSubject === "string" && profile.teachingSubject) ||
          (typeof (profile as Record<string, unknown>).subject === "string" && (profile as Record<string, string>).subject) ||
          (typeof (profile as Record<string, unknown>).mataPelajaran === "string" &&
            (profile as Record<string, string>).mataPelajaran) ||
          "",
      });
      setPhotoURL(
        (typeof profile.photoURL === "string" && profile.photoURL) || undefined
      );
    }
  }, [profile, profileLoading]);

  const displayEmail = useMemo(() => {
    if (typeof profile?.email === "string" && profile.email) return profile.email;
    if (user?.email) return user.email;
    return "-";
  }, [profile?.email, user?.email]);

  const avatarFallback = useMemo(() => {
    const candidates = [
      form.name,
      profile?.name,
      profile?.nama,
      profile?.username,
      displayEmail,
    ];
    const source = candidates.find((value) => typeof value === "string" && value.trim().length > 0) ?? "A";
    return source
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [displayEmail, form.name, profile?.name, profile?.nama, profile?.username]);

  const handleUploadPhoto = async (file: File) => {
    if (!user?.uid) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran foto maksimal 2MB.");
      return;
    }
    setUploadingPhoto(true);
    try {
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const storageRef = ref(storage, `admins/${user.uid}/avatar-${Date.now()}-${sanitizedName}`);
      await uploadBytes(storageRef, file);
      const uploadedUrl = await getDownloadURL(storageRef);
      setPhotoURL(uploadedUrl);
      await setDoc(
        doc(db, "users", user.uid),
        {
          photoURL: uploadedUrl,
          updatedAt: new Date(),
        },
        { merge: true }
      );
      toast.success("Foto profil berhasil diperbarui.");
    } catch (error) {
      console.error("Failed to upload avatar:", error);
      toast.error("Gagal mengunggah foto. Coba lagi.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user?.uid) {
      toast.error("Pengguna tidak terautentikasi.");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        username: form.username,
        level: form.level,
        description: form.description,
        teachingSubject: form.teachingSubject,
        updatedAt: new Date(),
      };
      if (profile?.role) {
        payload.role = profile.role;
      }
      await setDoc(doc(db, "users", user.uid), payload, { merge: true });
      toast.success("Profil berhasil diperbarui.");
    } catch (error) {
      console.error("Failed to save profile:", error);
      toast.error("Gagal menyimpan pengaturan. Coba lagi.");
    } finally {
      setSaving(false);
    }
  };

  if (profileLoading) {
    return (
      <AdminLayout pageTitle="Pengaturan Profil">
        <div className="flex h-[60vh] items-center justify-center">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Memuat profil…
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!user) {
    return (
      <AdminLayout pageTitle="Pengaturan Profil">
        <div className="flex h-[60vh] items-center justify-center text-muted-foreground">
          Pengguna tidak ditemukan. Silakan login ulang.
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout pageTitle="Pengaturan Profil">
      <div className="mx-auto flex max-w-full flex-col gap-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <Card className="border-border/60 bg-card/95 shadow-sm">
            <CardHeader className="space-y-2">
              <CardTitle>Ringkasan Akun</CardTitle>
              <CardDescription>
                Kelola identitas Anda yang terlihat oleh siswa ataupun admin lain.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="relative">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src={photoURL ?? ""} alt={form.name} />
                    <AvatarFallback>{avatarFallback}</AvatarFallback>
                  </Avatar>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="absolute -bottom-3 left-1/2 -translate-x-1/2 gap-2"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                  >
                    {uploadingPhoto ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Mengunggah…
                      </>
                    ) : (
                      <>
                        <UploadCloud className="h-4 w-4" />
                        Ganti Foto
                      </>
                    )}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        void handleUploadPhoto(file);
                      }
                      event.target.value = "";
                    }}
                  />
                </div>
                <div className="flex-1 space-y-2 text-sm">
                  <div className="text-lg font-semibold text-foreground">{form.name || "Nama belum diatur"}</div>
                  <div className="text-muted-foreground">{displayEmail}</div>
                  <div className="flex flex-wrap items-center gap-2">
                    {profile?.role ? (
                      <Badge variant="secondary" className="capitalize">
                        {profile.role}
                      </Badge>
                    ) : null}
                    {form.level ? <Badge variant="outline">Level {form.level}</Badge> : null}
                    <Badge variant="outline" className="gap-1 text-xs">
                      <ShieldCheck className="h-3 w-3" />
                      {isGuru ? "Akses Guru" : "Akses Admin"}
                    </Badge>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Bio</h3>
                <p className="text-sm text-muted-foreground">
                  {form.description || "Belum ada deskripsi. Ceritakan pengalaman mengajar Anda."}
                </p>
                {form.teachingSubject ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Mengajar: {form.teachingSubject}
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/95 shadow-sm">
            <CardHeader>
              <CardTitle>Edit Profil</CardTitle>
              <CardDescription>
                Informasi ini akan terlihat pada halaman course serta notifikasi yang Anda kirim.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="settings-name">Nama Lengkap</Label>
                  <Input
                    id="settings-name"
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="Nama lengkap Anda"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-username">Username</Label>
                  <Input
                    id="settings-username"
                    value={form.username}
                    onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
                    placeholder="username"
                  />
                  <p className="text-xs text-muted-foreground">
                    Username ditampilkan di detail course dan dashboard internal.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-level">Level Pengajar (opsional)</Label>
                  <Input
                    id="settings-level"
                    value={form.level}
                    onChange={(event) => setForm((prev) => ({ ...prev, level: event.target.value }))}
                    placeholder="Contoh: Senior Mentor, Kepala Program"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-description">Deskripsi Singkat</Label>
                  <Textarea
                    id="settings-description"
                    rows={4}
                    value={form.description}
                    onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                    placeholder="Tuliskan pengalaman atau fokus mengajar Anda."
                  />
                  <p className="text-xs text-muted-foreground">
                    Deskripsi ini membantu siswa mengenal latar belakang Anda.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-subject">Mata Pelajaran / Keahlian</Label>
                  <Select
                    value={form.teachingSubject || "none"}
                    onValueChange={(value) =>
                      setForm((prev) => ({
                        ...prev,
                        teachingSubject: value === "none" ? "" : value,
                      }))
                    }
                  >
                    <SelectTrigger id="settings-subject">
                      <SelectValue placeholder="Pilih mata pelajaran" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Belum diatur</SelectItem>
                      {SUBJECT_OPTIONS.map((subject) => (
                        <SelectItem key={subject} value={subject}>
                          {subject}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Data ini digunakan untuk menampilkan nama pengampu pada tugas & kuis.
                  </p>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      "Simpan Perubahan"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
