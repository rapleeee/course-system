"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/layouts/AdminLayout";
import { db } from "@/lib/firebase";
import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Layers, Plus, Search, Sparkles, CalendarClock, Pencil, Trash } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdminProfile } from "@/hooks/useAdminProfile";

type CategoryRecord = {
  name: string;
  description?: string;
  color?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  createdBy?: string;
  createdByName?: string;
};

type Category = CategoryRecord & {
  id: string;
};

type CategoryFormState = {
  name: string;
  description: string;
  color: string;
};

const COLOR_PRESETS = [
  "#6366F1",
  "#F97316",
  "#22C55E",
  "#0EA5E9",
  "#EC4899",
  "#FACC15",
  "#14B8A6",
  "#A855F7",
];

const createEmptyForm = (): CategoryFormState => ({
  name: "",
  description: "",
  color: COLOR_PRESETS[0],
});

function formatDate(value?: Timestamp | Date | string | number) {
  if (!value) return "-";
  const date =
    value instanceof Timestamp
      ? value.toDate()
      : value instanceof Date
      ? value
      : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [formState, setFormState] = useState<CategoryFormState>(createEmptyForm);
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { user, profile } = useAdminProfile();

  const userId = user?.uid ?? null;
  const isGuru = profile?.role === "guru";

  const profileName = useMemo(() => {
    const fallback = user?.email ? user.email.split("@")[0] ?? "" : "";
    if (!profile) return fallback;
    return (
      (typeof profile.name === "string" && profile.name) ||
      (typeof profile.nama === "string" && profile.nama) ||
      (typeof profile.username === "string" && profile.username) ||
      (typeof profile.email === "string" && profile.email.split("@")[0]) ||
      fallback
    );
  }, [profile, user?.email]);

  useEffect(() => {
    const q = query(collection(db, "categories"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data: Category[] = snapshot.docs.map((docSnap) => {
          const payload = docSnap.data() as CategoryRecord;
          return {
            id: docSnap.id,
            ...payload,
          };
        });
        setCategories(data);
        setLoading(false);
      },
      (error) => {
        console.error("Failed to fetch categories:", error);
        toast.error("Gagal memuat kategori. Coba lagi sebentar.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const resetForm = useCallback(() => {
    setFormState(createEmptyForm());
    setActiveCategory(null);
  }, []);

  const handleDialogChange = useCallback(
    (open: boolean) => {
      setIsDialogOpen(open);
      if (!open) {
        resetForm();
      }
    },
    [resetForm]
  );

  const handleCreateClick = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleEditClick = (category: Category) => {
    setActiveCategory(category);
    setFormState({
      name: category.name ?? "",
      description: category.description ?? "",
      color: category.color ?? COLOR_PRESETS[0],
    });
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (category: Category) => {
    setCategoryToDelete(category);
    setIsConfirmOpen(true);
  };

  const handleSaveCategory = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = formState.name.trim();
    if (trimmedName.length < 3) {
      toast.error("Nama kategori minimal 3 karakter.");
      return;
    }
    setSaving(true);
    try {
      if (activeCategory) {
        const ref = doc(db, "categories", activeCategory.id);
        await updateDoc(ref, {
          name: trimmedName,
          description: formState.description.trim() || "",
          color: formState.color,
          updatedAt: serverTimestamp(),
        });
        toast.success("Kategori diperbarui.");
      } else {
        if (!userId) {
          throw new Error("Pengguna tidak terautentikasi.");
        }
        await addDoc(collection(db, "categories"), {
          name: trimmedName,
          description: formState.description.trim() || "",
          color: formState.color,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: userId,
          createdByName: profileName || trimmedName,
        });
        toast.success("Kategori baru ditambahkan.");
      }
      handleDialogChange(false);
    } catch (error) {
      console.error("Failed to save category:", error);
      toast.error("Tidak dapat menyimpan kategori.");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (deleting || !categoryToDelete) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, "categories", categoryToDelete.id));
      toast.success(`Kategori "${categoryToDelete.name}" dihapus.`);
      setIsConfirmOpen(false);
      setCategoryToDelete(null);
    } catch (error) {
      console.error("Failed to delete category:", error);
      toast.error("Gagal menghapus kategori.");
    } finally {
      setDeleting(false);
    }
  };

  const filteredCategories = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    const scoped = isGuru && userId ? categories.filter((category) => category.createdBy === userId) : categories;
    if (!keyword) return scoped;
    return scoped.filter((category) => {
      const name = category.name?.toLowerCase() ?? "";
      const description = category.description?.toLowerCase() ?? "";
      return name.includes(keyword) || description.includes(keyword);
    });
  }, [categories, searchTerm, isGuru, userId]);

  const totalCategories = useMemo(() => {
    if (isGuru && userId) {
      return categories.filter((category) => category.createdBy === userId).length;
    }
    return categories.length;
  }, [categories, isGuru, userId]);
  const visibleCount = filteredCategories.length;

  return (
    <AdminLayout pageTitle="Kategori Course">
      <div className="mx-auto max-w-6xl space-y-8 px-2 sm:px-4">
        <div className="flex flex-col gap-6 border-b border-border/60 pb-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <p className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Layers className="h-3.5 w-3.5" />
              Manajemen Kategori
            </p>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Rancang Struktur Pembelajaran
              </h1>
              <p className="max-w-xl text-xs text-muted-foreground">
                Simpan kategori yang rapih agar pengguna mudah menemukan course sesuai minat dan levelnya.
              </p>
            </div>
          </div>
          <div className="flex w-full flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
            <div className="relative sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Cari kategori..."
                className="pl-9"
              />
            </div>
            <Button onClick={handleCreateClick} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Kategori Baru
            </Button>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,2.6fr)_minmax(0,1fr)]">
          <section className="space-y-5">
            <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border/60 bg-muted/40 px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between sm:text-sm">
              <span className="font-medium text-muted-foreground">
                {visibleCount} kategori tampil • total {totalCategories}
              </span>
              <span className="text-muted-foreground">Data ter-update otomatis dari Firestore</span>
            </div>
            {loading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Card
                    key={`category-skeleton-${index}`}
                    className="flex h-full flex-col gap-4 rounded-xl border-border/50 bg-card/90 p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between">
                      <Skeleton className="h-5 w-1/3" />
                      <Skeleton className="h-10 w-10 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-4 w-1/3" />
                    <div className="mt-auto flex gap-3 pt-2">
                      <Skeleton className="h-9 w-full rounded-md" />
                      <Skeleton className="h-9 w-full rounded-md" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : visibleCount === 0 ? (
              <Card className="border border-dashed border-border/60 bg-muted/30 text-center shadow-none">
                <CardHeader>
                  <CardTitle className="text-2xl font-semibold text-foreground">Belum ada kategori</CardTitle>
                  <CardDescription className="text-sm">
                    Coba buat kategori baru untuk mengelompokkan course sesuai fokus pembelajaran.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={handleCreateClick}>
                    <Plus className="mr-2 h-4 w-4" />
                    Tambah Kategori Pertama
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                {filteredCategories.map((category) => (
                  <Card
                    key={category.id}
                    className="flex h-full flex-col gap-5 overflow-hidden rounded-xl border border-border/60 bg-card/95 shadow-sm transition hover:border-border/80"
                  >
                    <CardHeader className="space-y-4 pb-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1.5">
                          <CardTitle className="text-xl font-semibold text-foreground">
                            {category.name}
                          </CardTitle>
                          <CardDescription className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                            {category.description || "Belum ada deskripsi untuk kategori ini."}
                          </CardDescription>
                        </div>
                        <span
                          aria-hidden
                          className="h-10 w-10 shrink-0 rounded-full border border-border/50 shadow-inner"
                          style={{ background: category.color || COLOR_PRESETS[0] }}
                        />
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
                        <CalendarClock className="h-4 w-4" />
                        <span>Dibuat {formatDate(category.createdAt)}</span>
                        {category.updatedAt ? (
                          <span>• Diperbarui {formatDate(category.updatedAt)}</span>
                        ) : null}
                      </div>
                    </CardHeader>
                    <CardContent className="mt-auto space-y-4">
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <Badge variant="secondary" className="gap-2 bg-muted text-muted-foreground">
                          <span
                            className="h-2.5 w-2.5 rounded-full border border-border/50"
                            style={{ background: category.color || COLOR_PRESETS[0] }}
                          />
                          {category.color?.toUpperCase() ?? "DEFAULT"}
                        </Badge>
                        <Badge variant="outline">
                          ID: {category.id.slice(0, 6)}…
                        </Badge>
                        {category.createdByName ? (
                          <Badge variant="outline">Oleh {category.createdByName}</Badge>
                        ) : null}
                      </div>
                      <div className="flex gap-2 border-t border-border/60 pt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleEditClick(category)}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleDeleteClick(category)}
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          Hapus
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <Card className="rounded-xl border-border/60 bg-primary/5 shadow-sm">
              <CardHeader className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex p-2 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-lg text-foreground">Butuh Inspirasi?</CardTitle>
                    <CardDescription>
                      Kelompokkan course berdasarkan tema yang familiar bagi member.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <ul className="list-disc space-y-1 pl-5">
                  <li>Bidang keahlian: Frontend, Data Science, UI/UX.</li>
                  <li>Tingkat kemampuan: Pemula, Menengah, Advanced.</li>
                  <li>Tujuan belajar: Sertifikasi, Portfolio, Bootcamp.</li>
                </ul>
                <p className="rounded-md border border-dashed border-primary/40 bg-primary/10 p-3 text-xs text-primary">
                  Tip: gunakan warna konsisten agar kartu course mudah dibedakan.
                </p>
              </CardContent>
            </Card>
            <Card className="rounded-xl border-border/60 bg-card/95 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Checklist Singkat</CardTitle>
                <CardDescription>Pastikan kategori baru langsung siap digunakan.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <ul className="list-disc space-y-1 pl-5">
                  <li>Pakai nama singkat & mudah dipahami.</li>
                  <li>Tulis deskripsi 1–2 kalimat sebagai konteks.</li>
                  <li>Pilih warna yang kontras dengan brand.</li>
                  <li>Review kategori lama yang sudah tidak relevan.</li>
                </ul>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{activeCategory ? "Edit Kategori" : "Kategori Baru"}</DialogTitle>
            <DialogDescription>
              {activeCategory
                ? "Perbarui detail kategori agar tetap relevan dengan kurikulum."
                : "Lengkapi nama, deskripsi, dan warna untuk kategori baru."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveCategory} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="category-name" className="text-sm font-medium text-foreground">
                Nama kategori
              </label>
              <Input
                id="category-name"
                value={formState.name}
                maxLength={60}
                onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Contoh: Backend Development"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="category-description" className="text-sm font-medium text-foreground">
                Deskripsi singkat
              </label>
              <Textarea
                id="category-description"
                value={formState.description}
                onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Berikan konteks singkat untuk kategori ini."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Warna kategori</p>
              <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
                {COLOR_PRESETS.map((color) => {
                  const isActive = formState.color === color;
                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormState((prev) => ({ ...prev, color }))}
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full border-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                        isActive ? "border-primary" : "border-transparent"
                      )}
                      style={{ background: color }}
                      aria-label={`Pilih warna ${color}`}
                    >
                      {isActive ? <Layers className="h-4 w-4 text-white" /> : null}
                    </button>
                  );
                })}
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDialogChange(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Menyimpan..." : activeCategory ? "Simpan Perubahan" : "Tambah Kategori"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={isConfirmOpen}
        title="Hapus kategori?"
        description={`Kategori "${categoryToDelete?.name ?? ""}" akan dihapus dari katalog.`}
        confirmLabel={deleting ? "Menghapus..." : "Hapus"}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          if (deleting) return;
          setIsConfirmOpen(false);
          setCategoryToDelete(null);
        }}
      />
    </AdminLayout>
  );
}
