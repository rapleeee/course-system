"use client";

import AdminLayout from "@/components/layouts/AdminLayout";
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  query as fsQuery,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  increment,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Trophy,
  Star,
  Plus,
  Minus,
  Trash2,
  Search,
  GraduationCap,
  Users,
} from "lucide-react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const MySwal = withReactContent(Swal);

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => (n?.[0] || "").toUpperCase())
    .join("");

type Siswa = {
  id: string;
  nama: string;
  kelas: string;
  bintang: number;
  createdAt?: Timestamp | null;
};

const getErrorMessage = (e: unknown) => {
  if (e instanceof Error) return e.message;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
};

export default function Mentorapesat() {
  const [siswa, setSiswa] = useState<Siswa[]>([]);
  const [namaBaru, setNamaBaru] = useState("");
  const [kelasBaru, setKelasBaru] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [kelasFilter, setKelasFilter] = useState<string>("ALL");
  const [busyId, setBusyId] = useState<string | null>(null);

  const siswaRef = collection(db, "siswa");

  useEffect(() => {
    // real-time leaderboard, ordered by bintang desc then createdAt asc for stability
    const q = fsQuery(
      siswaRef,
      orderBy("bintang", "desc"),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Siswa, "id">),
      }));
      setSiswa(data as Siswa[]);
    });
    return () => unsub();
  }, []);

  const uniqueClasses = useMemo(() => {
    const set = new Set<string>();
    siswa.forEach((s) => set.add(s.kelas));
    return ["ALL", ...Array.from(set).sort()];
  }, [siswa]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return siswa.filter((s) => {
      const matchText =
        s.nama.toLowerCase().includes(q) || s.kelas.toLowerCase().includes(q);
      const matchClass = kelasFilter === "ALL" || s.kelas === kelasFilter;
      return matchText && matchClass;
    });
  }, [siswa, query, kelasFilter]);

  const tambahSiswa = async () => {
    if (!namaBaru.trim() || !kelasBaru.trim()) {
      toast.error("Lengkapi nama dan kelas.");
      return;
    }
    setIsAdding(true);
    try {
      await addDoc(siswaRef, {
        nama: namaBaru.trim(),
        kelas: kelasBaru.trim(),
        bintang: 0,
        createdAt: serverTimestamp(),
      });
      setNamaBaru("");
      setKelasBaru("");
      toast.success("Siswa ditambahkan.");
    } catch (e: unknown) {
      toast.error(getErrorMessage(e) ?? "Gagal menambahkan siswa.");
    } finally {
      setIsAdding(false);
    }
  };

  const ubahBintang = async (id: string, delta: number) => {
    const found = siswa.find((s) => s.id === id);
    if (!found) return;

    // Guard: jangan sampai negatif
    if (found.bintang + delta < 0) {
      toast.warning("Nilai bintang tidak boleh negatif.");
      return;
    }

    setBusyId(id);
    try {
      const siswaDoc = doc(db, "siswa", id);
      // Atomic increment di Firestore
      await updateDoc(siswaDoc, { bintang: increment(delta) });
      toast.success(`${delta > 0 ? "+" : ""}${delta} bintang berhasil.`);
    } catch (e: unknown) {
      toast.error(getErrorMessage(e) ?? "Gagal memperbarui bintang.");
    } finally {
      setBusyId(null);
    }
  };

  const hapusSiswa = async (id: string, nama: string) => {
    const res = await MySwal.fire({
      title: "Hapus Siswa?",
      html: `<div style="text-align:left">Anda akan menghapus <strong>${nama}</strong> dari leaderboard. Tindakan ini tidak dapat dibatalkan.</div>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
      reverseButtons: true,
      focusCancel: true,
      confirmButtonColor: "#ef4444",
    });
    if (!res.isConfirmed) return;

    setBusyId(id);
    try {
      await deleteDoc(doc(db, "siswa", id));
      toast.success("Siswa dihapus.");
    } catch (e: unknown) {
      toast.error(getErrorMessage(e) ?? "Gagal menghapus siswa.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-6xl p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Trophy className="h-7 w-7" /> Leaderboard SMK PESAT
            </h1>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" /> Total peserta: <span className="font-medium">{siswa.length}</span>
            </p>
          </div>

          {/* Search + Filter */}
          <div className="flex w-full md:w-auto items-center gap-2">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama/kelas..."
                className="pl-9"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <select
              className="h-9 rounded-md border bg-background px-3 text-sm"
              value={kelasFilter}
              onChange={(e) => setKelasFilter(e.target.value)}
            >
              {uniqueClasses.map((k) => (
                <option key={k} value={k}>
                  {k === "ALL" ? "Semua Kelas" : k}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tambah Siswa */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-xl">
              <GraduationCap className="h-5 w-5" /> Tambah Siswa
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-4">
            <Input
              placeholder="Nama siswa"
              value={namaBaru}
              onChange={(e) => setNamaBaru(e.target.value)}
            />
            <Input
              placeholder="Kelas (mis. XI RPL)"
              value={kelasBaru}
              onChange={(e) => setKelasBaru(e.target.value)}
            />
            <div className="md:col-span-2 flex gap-2">
              <Button
                onClick={tambahSiswa}
                className="w-full md:w-auto"
                disabled={isAdding || !namaBaru.trim() || !kelasBaru.trim()}
              >
                Tambah Siswa
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setNamaBaru("");
                  setKelasBaru("");
                }}
                className="w-full md:w-auto"
              >
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Leaderboard List */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((s, i) => {
            const rank = i + 1;
            const rankStyle =
              rank === 1
                ? "bg-yellow-100 text-yellow-800 border-yellow-300"
                : rank === 2
                ? "bg-gray-100 text-gray-800 border-gray-300"
                : rank === 3
                ? "bg-amber-100 text-amber-800 border-amber-300"
                : "bg-secondary text-secondary-foreground border-transparent";
            return (
              <Card key={s.id} className="relative overflow-hidden">
                <div className="absolute right-3 top-3">
                  <Badge className={rankStyle}>{`#${rank}`}</Badge>
                </div>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback className="text-sm font-semibold">
                        {initials(s.nama)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="truncate leading-tight">{s.nama}</CardTitle>
                      <p className="text-sm text-muted-foreground truncate">Kelas: {s.kelas}</p>
                    </div>
                    <div className="flex items-center gap-1 text-base font-semibold whitespace-nowrap">
                      <Star className="h-5 w-5" /> {s.bintang ?? 0}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-2 pt-0">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => ubahBintang(s.id, +1)}
                      disabled={busyId === s.id}
                      aria-label={`Tambah bintang untuk ${s.nama}`}
                    >
                      <Plus className="h-4 w-4 mr-1" /> +1
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => ubahBintang(s.id, -1)}
                      disabled={busyId === s.id || (s.bintang ?? 0) <= 0}
                      aria-label={`Kurangi bintang untuk ${s.nama}`}
                    >
                      <Minus className="h-4 w-4 mr-1" /> -1
                    </Button>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => hapusSiswa(s.id, s.nama)}
                    disabled={busyId === s.id}
                    aria-label={`Hapus ${s.nama}`}
                  >
                    <Trash2 className="h-4 w-4 mr-1" /> Hapus
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center text-muted-foreground py-16">
            Tidak ada data cocok dengan filter.
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
