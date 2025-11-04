"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/layouts/AdminLayout";
import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  limit,
  startAfter,
  where,
} from "firebase/firestore";
import type { Timestamp, QueryDocumentSnapshot, DocumentData, QueryConstraint } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAdminProfile } from "@/hooks/useAdminProfile";

type Announcement = {
  id: string;
  title: string;
  body?: string;
  courseId?: string;
  createdAt?: Timestamp;
  createdBy?: string;
  createdByName?: string;
};

export default function AnnouncementsAdminPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [courseId, setCourseId] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(false);

  // Edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editCourseId, setEditCourseId] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Delete confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [confirmTitle, setConfirmTitle] = useState<string>("");

  const { user, profile, profileLoading } = useAdminProfile();
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

  const load = useCallback(
    async (cursor: QueryDocumentSnapshot<DocumentData> | null = null) => {
      if (!userId) {
        setItems([]);
        setLastDoc(null);
        setHasMore(false);
        setLoading(false);
        return;
      }

      const constraints: QueryConstraint[] = [];
      if (isGuru) {
        constraints.push(where("createdBy", "==", userId));
      }
      constraints.push(orderBy("createdAt", "desc"));
      if (cursor) {
        constraints.push(startAfter(cursor));
      }
      constraints.push(limit(10));

      try {
        const q = query(collection(db, "announcements"), ...constraints);
        const snap = await getDocs(q);
        const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Announcement, "id">) })) as Announcement[];
        if (cursor) {
          setItems((prev) => [...prev, ...rows]);
        } else {
          setItems(rows);
        }
        setLastDoc(snap.docs[snap.docs.length - 1] ?? null);
        setHasMore(snap.docs.length === 10);
      } catch (err) {
        console.error("Failed to load announcements", err);
        toast.error("Gagal memuat pengumuman.");
      } finally {
        setLoading(false);
      }
    },
    [isGuru, userId]
  );

  useEffect(() => {
    if (profileLoading) return;
    setLoading(true);
    void load(null);
  }, [load, profileLoading]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (!userId) {
      toast.error("Pengguna tidak terautentikasi.");
      return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, "announcements"), {
        title: title.trim(),
        body: body.trim() || null,
        courseId: courseId.trim() || null,
        createdAt: serverTimestamp(),
        createdBy: userId,
        createdByName: profileName || title.trim(),
      });
      toast.success("Pengumuman ditambahkan.");
      setTitle("");
      setBody("");
      setCourseId("");
      await load(null);
    } catch (err) {
      console.error(err);
      toast.error("Gagal menambahkan pengumuman.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    setBusyId(id);
    try {
      await deleteDoc(doc(db, "announcements", id));
      toast.success("Pengumuman dihapus.");
      await load(null);
    } catch (err) {
      console.error(err);
      toast.error("Gagal menghapus pengumuman.");
    } finally {
      setBusyId(null);
    }
  };

  const loadMore = async () => {
    if (!lastDoc) return;
    setLoading(true);
    await load(lastDoc);
  };

  const openEdit = (a: Announcement) => {
    setEditId(a.id);
    setEditTitle(a.title);
    setEditBody(a.body || "");
    setEditCourseId(a.courseId || "");
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editId) return;
    setEditSaving(true);
    try {
      await updateDoc(doc(db, "announcements", editId), {
        title: editTitle.trim(),
        body: editBody.trim() || null,
        courseId: editCourseId.trim() || null,
        updatedAt: serverTimestamp(),
      });
      setEditOpen(false);
      toast.success("Pengumuman diperbarui.");
      await load(null);
    } catch (err) {
      console.error(err);
      toast.error("Gagal memperbarui pengumuman.");
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <AdminLayout pageTitle="Pengumuman">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form onSubmit={submit} className="rounded-xl border p-4 bg-white dark:bg-neutral-900 lg:col-span-1">
          <h2 className="text-lg font-semibold mb-3">Buat Pengumuman</h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm mb-1 block">Judul</label>
              <input
                className="w-full border rounded px-3 py-2"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Judul pengumuman"
                required
              />
            </div>
            <div>
              <label className="text-sm mb-1 block">Isi (opsional)</label>
              <textarea
                className="w-full border rounded px-3 py-2 min-h-24"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Detail pengumuman"
              />
            </div>
            <div>
              <label className="text-sm mb-1 block">Course ID (opsional)</label>
              <input
                className="w-full border rounded px-3 py-2 font-mono"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                placeholder="Masukkan ID course untuk tautan"
              />
              <p className="text-xs text-muted-foreground mt-1">Jika diisi, user bisa klik &quot;Buka kelas&quot; pada pengumuman.</p>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>{saving ? "Menyimpan..." : "Tambah Pengumuman"}</Button>
            </div>
          </div>
        </form>

        <div className="lg:col-span-2 rounded-xl border p-4 bg-white dark:bg-neutral-900">
          <h2 className="text-lg font-semibold mb-3">Daftar Pengumuman</h2>
          {loading ? (
            <div className="text-sm text-muted-foreground">Memuat...</div>
          ) : items.length === 0 ? (
            <div className="text-sm text-muted-foreground">Belum ada pengumuman.</div>
          ) : (
            <ul className="space-y-3">
              {items.map((a) => {
                const d = a.createdAt?.toDate?.();
                const t = d ? d.toLocaleString("id-ID") : "-";
                const expired = d ? (Date.now() - d.getTime()) > 5 * 24 * 60 * 60 * 1000 : false;
                return (
                  <li key={a.id} className="rounded-md border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">{a.title}</div>
                        {a.body && <div className="text-sm text-muted-foreground">{a.body}</div>}
                        <div className="text-xs text-muted-foreground mt-1">{t}</div>
                        {a.createdByName ? (
                          <div className="text-xs text-muted-foreground mt-1">Oleh {a.createdByName}</div>
                        ) : null}
                        {a.courseId && (
                          <div className="text-xs mt-1">Course ID: <span className="font-mono">{a.courseId}</span></div>
                        )}
                        {expired && (
                          <div className="mt-1 inline-flex items-center rounded bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-semibold">
                            Sudah melewati 5 hari (disembunyikan di dashboard)
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(a)}>Edit</Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={busyId === a.id}
                          onClick={() => {
                            setConfirmId(a.id);
                            setConfirmTitle(a.title);
                            setConfirmOpen(true);
                          }}
                        >
                          Hapus
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {hasMore && (
            <div className="mt-3 flex justify-center">
              <Button variant="outline" onClick={loadMore}>Muat lebih</Button>
            </div>
          )}
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Pengumuman</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm mb-1 block">Judul</label>
              <input className="w-full border rounded px-3 py-2" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div>
              <label className="text-sm mb-1 block">Isi</label>
              <textarea className="w-full border rounded px-3 py-2 min-h-24" value={editBody} onChange={(e) => setEditBody(e.target.value)} />
            </div>
            <div>
              <label className="text-sm mb-1 block">Course ID</label>
              <input className="w-full border rounded px-3 py-2 font-mono" value={editCourseId} onChange={(e) => setEditCourseId(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>Batal</Button>
            <Button onClick={saveEdit} disabled={editSaving}>{editSaving ? "Menyimpan..." : "Simpan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Pengumuman</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Anda yakin ingin menghapus pengumuman
            {" "}
            <span className="font-medium">{confirmTitle}</span>? Tindakan ini tidak dapat dibatalkan.
          </p>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>Batal</Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!confirmId) return;
                await remove(confirmId);
                setConfirmOpen(false);
              }}
              disabled={busyId === confirmId}
            >
              {busyId === confirmId ? "Menghapus..." : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
