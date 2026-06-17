"use client";

import { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/layouts/AdminLayout";
import { db } from "@/lib/firebase";
import { normalizeDiscountCode } from "@/lib/discount-code";
import { useAdminProfile } from "@/hooks/useAdminProfile";
import {
  collection,
  deleteDoc,
  DocumentData,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
  UpdateData,
  updateDoc,
} from "firebase/firestore";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Pencil, Plus, Search, Trash2, TicketPercent } from "lucide-react";

type DiscountScope = "all" | "course" | "subscription";
type DiscountType = "fixed" | "percentage";

type DiscountCodeItem = {
  id: string;
  title?: string;
  active: boolean;
  appliesTo: DiscountScope;
  targetCourseIds: string[];
  discountType: DiscountType;
  discountValue: number;
  minAmount: number;
  maxDiscount: number | null;
  startsAt: Timestamp | null;
  endsAt: Timestamp | null;
  createdBy?: string;
  createdByName?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

type CourseOption = {
  id: string;
  title: string;
  createdBy?: string;
};

type FormState = {
  code: string;
  title: string;
  active: boolean;
  appliesTo: DiscountScope;
  targetCourseIds: string[];
  discountType: DiscountType;
  discountValue: string;
  minAmount: string;
  maxDiscount: string;
  startsAt: string;
  endsAt: string;
};

const emptyForm: FormState = {
  code: "",
  title: "",
  active: true,
  appliesTo: "all",
  targetCourseIds: [],
  discountType: "fixed",
  discountValue: "",
  minAmount: "",
  maxDiscount: "",
  startsAt: "",
  endsAt: "",
};

const toNumber = (value: unknown, fallback = 0) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

const toTimestamp = (value: unknown): Timestamp | null => {
  if (!value) return null;
  if (value instanceof Timestamp) return value;
  if (value instanceof Date) return Timestamp.fromDate(value);
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return Timestamp.fromMillis(parsed);
  }
  const maybeTimestamp = value as { toMillis?: () => number };
  if (typeof maybeTimestamp.toMillis === "function") {
    const parsed = maybeTimestamp.toMillis();
    if (Number.isFinite(parsed)) return Timestamp.fromMillis(parsed);
  }
  return null;
};

const toStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    : [];

const toDatetimeLocalValue = (value: Timestamp | null) => {
  if (!value) return "";
  const date = new Date(value.toMillis());
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const formatDateTime = (value: Timestamp | null) => {
  if (!value) return "-";
  return new Date(value.toMillis()).toLocaleString("id-ID");
};

const formatCurrency = (value: number) => `Rp ${Math.max(0, Math.floor(value)).toLocaleString("id-ID")}`;

export default function DiscountCodesPage() {
  const { user, profile } = useAdminProfile();
  const [items, setItems] = useState<DiscountCodeItem[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [scopeFilter, setScopeFilter] = useState<"all" | DiscountScope>("all");

  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formState, setFormState] = useState<FormState>(emptyForm);
  const [editingItem, setEditingItem] = useState<DiscountCodeItem | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DiscountCodeItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isGuru = profile?.role === "guru";
  const userId = user?.uid ?? null;
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
    const unsub = onSnapshot(
      collection(db, "discount_codes"),
      (snap) => {
        const next = snap.docs.map((docSnap) => {
          const raw = docSnap.data() as Record<string, unknown>;
          const appliesToRaw = raw.appliesTo;
          const discountTypeRaw = raw.discountType;
          const appliesTo: DiscountScope =
            appliesToRaw === "course" || appliesToRaw === "subscription" || appliesToRaw === "all"
              ? appliesToRaw
              : "all";
          const discountType: DiscountType = discountTypeRaw === "percentage" ? "percentage" : "fixed";
          return {
            id: docSnap.id,
            title: typeof raw.title === "string" ? raw.title : "",
            active: raw.active !== false,
            appliesTo,
            targetCourseIds: toStringArray(raw.targetCourseIds),
            discountType,
            discountValue: Math.max(0, Math.floor(toNumber(raw.discountValue, 0))),
            minAmount: Math.max(0, Math.floor(toNumber(raw.minAmount, 0))),
            maxDiscount:
              raw.maxDiscount == null ? null : Math.max(0, Math.floor(toNumber(raw.maxDiscount, 0))),
            startsAt: toTimestamp(raw.startsAt),
            endsAt: toTimestamp(raw.endsAt),
            createdBy: typeof raw.createdBy === "string" ? raw.createdBy : undefined,
            createdByName: typeof raw.createdByName === "string" ? raw.createdByName : undefined,
            createdAt: toTimestamp(raw.createdAt) ?? undefined,
            updatedAt: toTimestamp(raw.updatedAt) ?? undefined,
          } satisfies DiscountCodeItem;
        });

        next.sort((a, b) => {
          const aTime = a.createdAt?.toMillis() ?? 0;
          const bTime = b.createdAt?.toMillis() ?? 0;
          return bTime - aTime;
        });

        setItems(next);
        setLoading(false);
      },
      (error) => {
        console.error("Failed to load discount codes:", error);
        toast.error("Gagal memuat data kode diskon.");
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "courses"),
      (snap) => {
        const next = snap.docs.map((docSnap) => {
          const raw = docSnap.data() as Record<string, unknown>;
          return {
            id: docSnap.id,
            title: typeof raw.title === "string" && raw.title.trim() ? raw.title : docSnap.id,
            createdBy: typeof raw.createdBy === "string" ? raw.createdBy : undefined,
          } satisfies CourseOption;
        });

        next.sort((a, b) => a.title.localeCompare(b.title));
        setCourses(next);
        setCoursesLoading(false);
      },
      (error) => {
        console.error("Failed to load courses:", error);
        toast.error("Gagal memuat daftar course.");
        setCoursesLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const courseTitleById = useMemo(() => {
    const map: Record<string, string> = {};
    courses.forEach((course) => {
      map[course.id] = course.title;
    });
    return map;
  }, [courses]);

  const selectableCourses = useMemo(() => {
    if (!isGuru || !userId) return courses;
    return courses.filter((course) => course.createdBy === userId);
  }, [courses, isGuru, userId]);

  const scopedItems = useMemo(() => {
    if (!isGuru || !userId) return items;
    return items.filter((item) => item.createdBy === userId);
  }, [isGuru, items, userId]);

  const filteredItems = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    return scopedItems.filter((item) => {
      if (statusFilter === "active" && !item.active) return false;
      if (statusFilter === "inactive" && item.active) return false;
      if (scopeFilter !== "all" && item.appliesTo !== scopeFilter) return false;
      if (!keyword) return true;
      return (
        item.id.toLowerCase().includes(keyword) ||
        (item.title || "").toLowerCase().includes(keyword)
      );
    });
  }, [scopedItems, searchTerm, scopeFilter, statusFilter]);

  const selectedCourseLabels = useMemo(() => {
    if (formState.targetCourseIds.length === 0) return [] as string[];
    return formState.targetCourseIds.map((courseId) => courseTitleById[courseId] ?? courseId);
  }, [courseTitleById, formState.targetCourseIds]);

  const resetForm = () => {
    setFormState(emptyForm);
    setEditingItem(null);
  };

  const openCreateForm = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEditForm = (item: DiscountCodeItem) => {
    setEditingItem(item);
    setFormState({
      code: item.id,
      title: item.title || "",
      active: item.active,
      appliesTo: item.appliesTo,
      targetCourseIds: item.targetCourseIds,
      discountType: item.discountType,
      discountValue: item.discountValue > 0 ? String(item.discountValue) : "",
      minAmount: item.minAmount > 0 ? String(item.minAmount) : "",
      maxDiscount: item.maxDiscount && item.maxDiscount > 0 ? String(item.maxDiscount) : "",
      startsAt: toDatetimeLocalValue(item.startsAt),
      endsAt: toDatetimeLocalValue(item.endsAt),
    });
    setFormOpen(true);
  };

  const handleToggleActive = async (item: DiscountCodeItem) => {
    if (isGuru && userId && item.createdBy !== userId) {
      toast.error("Guru hanya bisa mengubah kode diskon miliknya sendiri.");
      return;
    }
    try {
      await updateDoc(doc(db, "discount_codes", item.id), {
        active: !item.active,
        updatedAt: serverTimestamp(),
      });
      toast.success(`Kode ${item.id} ${item.active ? "dinonaktifkan" : "diaktifkan"}.`);
    } catch (error) {
      console.error("Failed to toggle discount code:", error);
      toast.error("Gagal mengubah status kode diskon.");
    }
  };

  const toggleTargetCourse = (courseId: string) => {
    setFormState((prev) => {
      const exists = prev.targetCourseIds.includes(courseId);
      return {
        ...prev,
        targetCourseIds: exists
          ? prev.targetCourseIds.filter((id) => id !== courseId)
          : [...prev.targetCourseIds, courseId],
      };
    });
  };

  const submitForm = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId) {
      toast.error("Pengguna tidak terautentikasi.");
      return;
    }

    const code = normalizeDiscountCode(formState.code);
    const discountValue = Math.max(0, Math.floor(toNumber(formState.discountValue, 0)));
    const minAmount = Math.max(0, Math.floor(toNumber(formState.minAmount, 0)));
    const maxDiscountRaw = Math.max(0, Math.floor(toNumber(formState.maxDiscount, 0)));
    const maxDiscount = formState.discountType === "percentage" && maxDiscountRaw > 0 ? maxDiscountRaw : null;
    const startsAt = formState.startsAt ? Timestamp.fromDate(new Date(formState.startsAt)) : null;
    const endsAt = formState.endsAt ? Timestamp.fromDate(new Date(formState.endsAt)) : null;

    if (!editingItem && !code) {
      toast.error("Kode diskon wajib diisi.");
      return;
    }
    if (code && !/^[A-Z0-9_-]+$/.test(code)) {
      toast.error("Kode diskon hanya boleh huruf, angka, _ atau -.");
      return;
    }
    if (discountValue <= 0) {
      toast.error("Nilai diskon harus lebih dari 0.");
      return;
    }
    if (formState.discountType === "percentage" && discountValue > 100) {
      toast.error("Diskon persentase maksimal 100%.");
      return;
    }
    if (startsAt && endsAt && endsAt.toMillis() < startsAt.toMillis()) {
      toast.error("Tanggal berakhir tidak boleh lebih awal dari tanggal mulai.");
      return;
    }

    const targetCourseIds =
      formState.appliesTo === "course"
        ? Array.from(new Set(formState.targetCourseIds)).filter((id) => id.length > 0)
        : [];

    if (formState.appliesTo === "course" && targetCourseIds.length === 0) {
      toast.error("Pilih minimal 1 course untuk diskon tipe course.");
      return;
    }

    if (isGuru && formState.appliesTo === "course") {
      const allowed = new Set(selectableCourses.map((course) => course.id));
      const invalidSelected = targetCourseIds.some((id) => !allowed.has(id));
      if (invalidSelected) {
        toast.error("Ada course yang bukan milik guru ini.");
        return;
      }
    }

    setSaving(true);
    try {
      const payload: UpdateData<DocumentData> = {
        title: formState.title.trim() || null,
        active: formState.active,
        appliesTo: formState.appliesTo,
        targetCourseIds,
        discountType: formState.discountType,
        discountValue,
        minAmount,
        maxDiscount,
        startsAt,
        endsAt,
        updatedAt: serverTimestamp(),
      };

      if (editingItem) {
        if (isGuru && userId && editingItem.createdBy !== userId) {
          toast.error("Guru hanya bisa mengubah kode diskon miliknya sendiri.");
          return;
        }

        await updateDoc(doc(db, "discount_codes", editingItem.id), payload);
        toast.success(`Kode ${editingItem.id} diperbarui.`);
      } else {
        const ref = doc(db, "discount_codes", code);
        const existing = await getDoc(ref);
        if (existing.exists()) {
          toast.error("Kode diskon sudah ada. Gunakan kode lain.");
          return;
        }
        await setDoc(ref, {
          ...payload,
          code,
          createdBy: userId,
          createdByName: profileName || null,
          createdAt: serverTimestamp(),
        });
        toast.success(`Kode ${code} berhasil dibuat.`);
      }

      setFormOpen(false);
      resetForm();
    } catch (error) {
      console.error("Failed to save discount code:", error);
      toast.error("Gagal menyimpan kode diskon.");
    } finally {
      setSaving(false);
    }
  };

  const requestDelete = (item: DiscountCodeItem) => {
    setDeleteTarget(item);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (isGuru && userId && deleteTarget.createdBy !== userId) {
      toast.error("Guru hanya bisa menghapus kode diskon miliknya sendiri.");
      setConfirmOpen(false);
      return;
    }

    setDeleting(true);
    try {
      await deleteDoc(doc(db, "discount_codes", deleteTarget.id));
      toast.success(`Kode ${deleteTarget.id} dihapus.`);
      setConfirmOpen(false);
      setDeleteTarget(null);
    } catch (error) {
      console.error("Failed to delete discount code:", error);
      toast.error("Gagal menghapus kode diskon.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminLayout pageTitle="Manajemen Kode Diskon">
      <div className="mx-auto max-w-6xl space-y-6">
        <Card>
          <CardHeader className="border-b border-border/60">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TicketPercent className="h-5 w-5" />
                  Kode Diskon
                </CardTitle>
                <CardDescription>
                  {isGuru
                    ? "Kelola kode diskon milikmu untuk pembelian course atau langganan."
                    : "Kelola kode diskon global untuk pembelian course atau langganan."}
                </CardDescription>
              </div>
              <Button onClick={openCreateForm}>
                <Plus className="mr-2 h-4 w-4" />
                Buat Kode
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Cari kode atau judul..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
              <select
                className="rounded-md border bg-background px-3 py-2 text-sm"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as "all" | "active" | "inactive")}
              >
                <option value="all">Semua Status</option>
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
              </select>
              <select
                className="rounded-md border bg-background px-3 py-2 text-sm"
                value={scopeFilter}
                onChange={(event) => setScopeFilter(event.target.value as "all" | DiscountScope)}
              >
                <option value="all">Semua Scope</option>
                <option value="course">Course</option>
                <option value="subscription">Subscription</option>
              </select>
            </div>

            {loading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Memuat kode diskon...</div>
            ) : filteredItems.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Belum ada kode diskon yang cocok dengan filter.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode</TableHead>
                    <TableHead>Diskon</TableHead>
                    <TableHead>Berlaku Untuk</TableHead>
                    <TableHead>Periode</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => {
                    const previewCourseNames = item.targetCourseIds
                      .slice(0, 2)
                      .map((courseId) => courseTitleById[courseId] ?? courseId);
                    const moreCourses = Math.max(0, item.targetCourseIds.length - previewCourseNames.length);

                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-semibold">{item.id}</span>
                            {item.title ? (
                              <span className="text-xs text-muted-foreground">{item.title}</span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col text-xs">
                            <span className="text-sm font-medium">
                              {item.discountType === "percentage"
                                ? `${item.discountValue}%`
                                : formatCurrency(item.discountValue)}
                            </span>
                            {item.minAmount > 0 ? (
                              <span className="text-muted-foreground">
                                Min. transaksi {formatCurrency(item.minAmount)}
                              </span>
                            ) : null}
                            {item.discountType === "percentage" && item.maxDiscount ? (
                              <span className="text-muted-foreground">
                                Maks. diskon {formatCurrency(item.maxDiscount)}
                              </span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.appliesTo === "course" ? (
                            <div className="text-xs">
                              <div className="font-medium">Course ({item.targetCourseIds.length})</div>
                              {item.targetCourseIds.length > 0 ? (
                                <div className="text-muted-foreground">
                                  {previewCourseNames.join(", ")}
                                  {moreCourses > 0 ? ` +${moreCourses} lainnya` : ""}
                                </div>
                              ) : (
                                <div className="text-muted-foreground">Semua course</div>
                              )}
                            </div>
                          ) : (
                            <span className="capitalize">{item.appliesTo}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs">
                            <div>Mulai: {formatDateTime(item.startsAt)}</div>
                            <div>Akhir: {formatDateTime(item.endsAt)}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.active ? "default" : "secondary"}>
                            {item.active ? "Aktif" : "Nonaktif"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void handleToggleActive(item)}
                            >
                              {item.active ? "Nonaktifkan" : "Aktifkan"}
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => openEditForm(item)}>
                              <Pencil className="mr-1 h-3.5 w-3.5" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-rose-600"
                              onClick={() => requestDelete(item)}
                            >
                              <Trash2 className="mr-1 h-3.5 w-3.5" />
                              Hapus
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingItem ? `Edit ${editingItem.id}` : "Buat Kode Diskon"}</DialogTitle>
            <DialogDescription>
              {editingItem
                ? "Ubah aturan kode diskon. Kode tidak bisa diganti saat edit."
                : "Isi aturan kode diskon yang akan dipakai user saat checkout manual."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submitForm} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm">Kode</label>
                <Input
                  value={formState.code}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      code: normalizeDiscountCode(event.target.value).replace(/[^A-Z0-9_-]/g, ""),
                    }))
                  }
                  placeholder="HEMAT10"
                  disabled={Boolean(editingItem)}
                  required={!editingItem}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm">Judul (opsional)</label>
                <Input
                  value={formState.title}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, title: event.target.value }))
                  }
                  placeholder="Promo Ramadhan"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm">Berlaku Untuk</label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={formState.appliesTo}
                  onChange={(event) => {
                    const appliesTo = event.target.value as DiscountScope;
                    setFormState((prev) => ({
                      ...prev,
                      appliesTo,
                      targetCourseIds: appliesTo === "course" ? prev.targetCourseIds : [],
                    }));
                  }}
                >
                  <option value="all">Semua</option>
                  <option value="course">Course</option>
                  <option value="subscription">Subscription</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm">Tipe Diskon</label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={formState.discountType}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      discountType: event.target.value as DiscountType,
                    }))
                  }
                >
                  <option value="fixed">Nominal (Rp)</option>
                  <option value="percentage">Persentase (%)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm">Status</label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={formState.active ? "active" : "inactive"}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      active: event.target.value === "active",
                    }))
                  }
                >
                  <option value="active">Aktif</option>
                  <option value="inactive">Nonaktif</option>
                </select>
              </div>
            </div>

            {formState.appliesTo === "course" && (
              <div className="space-y-2 rounded-md border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">Pilih Course Target</p>
                  <span className="text-xs text-muted-foreground">
                    {formState.targetCourseIds.length} dipilih
                  </span>
                </div>
                {coursesLoading ? (
                  <p className="text-xs text-muted-foreground">Memuat daftar course...</p>
                ) : selectableCourses.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {isGuru
                      ? "Belum ada course milik guru ini."
                      : "Belum ada course yang tersedia."}
                  </p>
                ) : (
                  <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
                    {selectableCourses.map((course) => {
                      const checked = formState.targetCourseIds.includes(course.id);
                      return (
                        <label key={course.id} className="flex items-start gap-2 rounded border p-2 text-sm">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleTargetCourse(course.id)}
                            className="mt-1"
                          />
                          <div className="min-w-0">
                            <div className="font-medium leading-tight">{course.title}</div>
                            <div className="text-xs text-muted-foreground">ID: {course.id}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
                {selectedCourseLabels.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Terpilih: {selectedCourseLabels.slice(0, 3).join(", ")}
                    {selectedCourseLabels.length > 3 ? ` +${selectedCourseLabels.length - 3} lainnya` : ""}
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm">
                  Nilai Diskon {formState.discountType === "percentage" ? "(%)" : "(Rp)"}
                </label>
                <Input
                  type="number"
                  min={1}
                  value={formState.discountValue}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, discountValue: event.target.value }))
                  }
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm">Min. Transaksi (Rp)</label>
                <Input
                  type="number"
                  min={0}
                  value={formState.minAmount}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, minAmount: event.target.value }))
                  }
                  placeholder="0"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm">Maks. Diskon (Rp, opsional)</label>
                <Input
                  type="number"
                  min={0}
                  value={formState.maxDiscount}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, maxDiscount: event.target.value }))
                  }
                  disabled={formState.discountType !== "percentage"}
                  placeholder="Khusus persentase"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm">Mulai Berlaku (opsional)</label>
                <Input
                  type="datetime-local"
                  value={formState.startsAt}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, startsAt: event.target.value }))
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-sm">Berakhir (opsional)</label>
                <Input
                  type="datetime-local"
                  value={formState.endsAt}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, endsAt: event.target.value }))
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setFormOpen(false);
                  resetForm();
                }}
              >
                Batal
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Menyimpan..." : editingItem ? "Simpan Perubahan" : "Buat Kode"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        title={`Hapus kode ${deleteTarget?.id ?? ""}?`}
        description="Data kode diskon akan dihapus permanen."
        confirmLabel={deleting ? "Menghapus..." : "Hapus"}
        onConfirm={() => void confirmDelete()}
        onCancel={() => {
          if (deleting) return;
          setConfirmOpen(false);
          setDeleteTarget(null);
        }}
      />
    </AdminLayout>
  );
}
