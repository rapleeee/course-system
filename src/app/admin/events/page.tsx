"use client";

import React, { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/layouts/AdminLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  deleteDoc,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { Filter, Search, Plus } from "lucide-react";
import Link from "next/link";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CATEGORIES, STATUSES, MODES } from "@/lib/events-schema";
import { DataTable } from "@/components/ui/data-table";
import { eventColumns } from "@/components/feature-events/columns";
import { useAdminProfile } from "@/hooks/useAdminProfile";

export type Category = (typeof CATEGORIES)[number];
export type Status = (typeof STATUSES)[number];
export type Mode = (typeof MODES)[number];

export type EventDoc = {
  title: string;
  category: Category;
  location: string;
  description: string;
  gform: string;
  imageUrl: string;
  slug: string;
  status: Status;
  mode: Mode;
  meetingUrl: string;
  mapsUrl: string;
  capacity: number;
  rsvpCount: number;
  startAt: Timestamp | null;
  endAt: Timestamp | null;
  createdAt: Timestamp | null;
  createdBy?: string;
  createdByName?: string;
  createdByEmail?: string | null;
};

export type Event = EventDoc & { id: string };

function buildIcs(ev: Event): string {
  const dt = (t: Timestamp | null) => {
    if (!t) return "";
    const d = t.toDate();
    const pad = (n: number) => n.toString().padStart(2, "0");
    const yyyy = d.getUTCFullYear();
    const mm = pad(d.getUTCMonth() + 1);
    const dd = pad(d.getUTCDate());
    const hh = pad(d.getUTCHours());     // ✅ pakai hours yang benar
    const mi = pad(d.getUTCMinutes());
    const ss = pad(d.getUTCSeconds());
    return `${yyyy}${mm}${dd}T${hh}${mi}${ss}Z`;
  };
  const start = dt(ev.startAt);
  const end = dt(ev.endAt ?? ev.startAt);
  const desc = (ev.description || "").replace(/\n/g, "\\n");
  const loc =
    ev.mode === "online" ? ev.meetingUrl || "Online" : ev.location || "Offline";
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Mentora//Event//ID",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${ev.id}@mentora`,
    start ? `DTSTART:${start}` : "",
    end ? `DTEND:${end}` : "",
    `SUMMARY:${ev.title}`,
    `DESCRIPTION:${desc}`,
    `LOCATION:${loc}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}

function downloadIcs(ev: Event) {
  const ics = buildIcs(ev);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${ev.slug || ev.id}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function AdminEventsListPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [search, setSearch] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | Category>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
  const [modeFilter, setModeFilter] = useState<"all" | Mode>("all");
  const [timeFilter, setTimeFilter] = useState<"upcoming" | "all" | "past">(
    "upcoming"
  );

  const [openDelete, setOpenDelete] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { user, profile, profileLoading } = useAdminProfile();
  const userId = user?.uid ?? null;
  const isGuru = profile?.role === "guru";

  useEffect(() => {
    if (profileLoading) return;
    if (!userId) {
      setEvents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const baseQuery =
      isGuru && userId
        ? query(collection(db, "events"), where("createdBy", "==", userId))
        : query(collection(db, "events"), orderBy("startAt", "asc"));

    const unsubscribe = onSnapshot(
      baseQuery,
      (snap) => {
        const rows: Event[] = snap.docs.map((d) => {
          const v = d.data() as Partial<EventDoc>;
          return {
            id: d.id,
            title: v.title ?? "",
            category: (v.category ?? "Workshop") as Category,
            location: v.location ?? "",
            description: v.description ?? "",
            gform: v.gform ?? "",
            imageUrl: v.imageUrl ?? "",
            slug: v.slug ?? d.id,
            status: (v.status ?? "draft") as Status,
            mode: (v.mode ?? "offline") as Mode,
            meetingUrl: v.meetingUrl ?? "",
            mapsUrl: v.mapsUrl ?? "",
            capacity: typeof v.capacity === "number" ? v.capacity : 0,
            rsvpCount: typeof v.rsvpCount === "number" ? v.rsvpCount : 0,
            startAt: (v.startAt as Timestamp | null) ?? null,
            endAt: (v.endAt as Timestamp | null) ?? null,
            createdAt: (v.createdAt as Timestamp | null) ?? null,
            createdBy: v.createdBy,
            createdByName: v.createdByName,
            createdByEmail: v.createdByEmail,
          };
        });

        const sorted = isGuru
          ? rows.sort((a, b) => {
              const aTime =
                a.createdAt instanceof Timestamp
                  ? a.createdAt.toMillis()
                  : typeof a.createdAt === "number"
                  ? a.createdAt
                  : 0;
              const bTime =
                b.createdAt instanceof Timestamp
                  ? b.createdAt.toMillis()
                  : typeof b.createdAt === "number"
                  ? b.createdAt
                  : 0;
              return bTime - aTime;
            })
          : rows;

        setEvents(sorted);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        toast.error("Gagal memuat data event.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isGuru, profileLoading, userId]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    const now = new Date(); // ✅ pindahkan ke dalam useMemo

    return events.filter((e) => {
      const matchSearch =
        !s ||
        e.title.toLowerCase().includes(s) ||
        e.location.toLowerCase().includes(s) ||
        e.description.toLowerCase().includes(s);

      const matchCat =
        categoryFilter === "all" || e.category === categoryFilter;
      const matchStatus = statusFilter === "all" || e.status === statusFilter;
      const matchMode = modeFilter === "all" || e.mode === modeFilter;

      const startDate = e.startAt?.toDate() ?? null;
      const isUpcoming = startDate ? startDate >= now : true;
      const isPast = startDate ? startDate < now : false;
      const matchTime =
        timeFilter === "all"
          ? true
          : timeFilter === "upcoming"
          ? isUpcoming
          : isPast;

      return matchSearch && matchCat && matchStatus && matchMode && matchTime;
    });
  }, [events, search, categoryFilter, statusFilter, modeFilter, timeFilter]);

  const confirmDelete = (id: string) => {
    setDeletingId(id);
    setOpenDelete(true);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteDoc(doc(db, "events", deletingId));
      toast.success("Event dihapus.");
    } catch (e) {
      console.error(e);
      toast.error("Gagal menghapus event.");
    } finally {
      setOpenDelete(false);
      setDeletingId(null);
    }
  };

  const copyPublicLink = (ev: Event) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/events/${ev.slug || ev.id}`;
    navigator.clipboard
      .writeText(url)
      .then(() => toast.success("Link event disalin."))
      .catch(() => toast.error("Gagal menyalin link."));
  };

  return (
    <AdminLayout pageTitle="Admin • Kelola Event">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Kelola Event</h1>
            <p className="text-neutral-600 dark:text-neutral-300">
              Tambah, ubah, arsipkan, dan kelola event komunitas.
            </p>
          </div>
          <Button asChild className="gap-2">
            <Link href="/admin/events/new">
              <Plus className="h-4 w-4" /> Event Baru
            </Link>
          </Button>
        </div>

        {/* Toolbar */}
        <Card className="p-4">
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Cari judul, lokasi, atau deskripsi…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <ToggleGroup
                  type="single"
                  value={modeFilter}
                  onValueChange={(v) =>
                    v && setModeFilter(v as typeof modeFilter)
                  }
                >
                  <ToggleGroupItem value="all">Semua</ToggleGroupItem>
                  <ToggleGroupItem value="online">Online</ToggleGroupItem>
                  <ToggleGroupItem value="offline">Offline</ToggleGroupItem>
                </ToggleGroup>
                <ToggleGroup
                  type="single"
                  value={timeFilter}
                  onValueChange={(v) =>
                    v && setTimeFilter(v as typeof timeFilter)
                  }
                >
                  <ToggleGroupItem value="upcoming">Soon</ToggleGroupItem>
                  <ToggleGroupItem value="all">Semua</ToggleGroupItem>
                  <ToggleGroupItem value="past">Past</ToggleGroupItem>
                </ToggleGroup>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Select
                  value={categoryFilter}
                  onValueChange={(v) =>
                    setCategoryFilter(v as typeof categoryFilter)
                  }
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Kategori</SelectItem>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={statusFilter}
                  onValueChange={(v) =>
                    setStatusFilter(v as typeof statusFilter)
                  }
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </Card>

        {/* DataTable */}
        <Card className="p-0">
          <div className="p-4">
            {loading ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                Memuat data…
              </div>
            ) : (
              <DataTable
                columns={eventColumns({
                  onExportIcs: downloadIcs,
                  onCopyLink: copyPublicLink,
                  onDelete: confirmDelete,
                })}
                data={filtered}
                initialColumnVisibility={{
                  // contoh: bisa sembunyikan kolom tertentu di mobile, kalau mau
                  // category: false,
                  // status: false,
                }}
              />
            )}
          </div>
        </Card>

        {/* Delete dialog */}
        <Dialog open={openDelete} onOpenChange={setOpenDelete}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Hapus Event?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Tindakan ini tidak dapat dibatalkan.
            </p>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setOpenDelete(false)}>
                Batal
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Hapus
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
