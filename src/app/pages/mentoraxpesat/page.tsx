"use client";

import React, { useEffect, useMemo, useState } from "react";
import Layout from "@/components/layout";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { Search, Star } from "lucide-react";
import { PodiumCard, Trend } from "@/components/ui/PodiumCard";

type Siswa = {
  id: string;
  nama: string;
  kelas: string;
  bintang: number;
  lastMonthBintang?: number; // opsional untuk Trend
  // photoURL?: string;
};

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => (n?.[0] ?? "").toUpperCase())
    .join("");

export default function Mentoraxpesat() {
  const [siswa, setSiswa] = useState<Siswa[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    const ref = collection(db, "siswa");
    const qq = query(ref, orderBy("bintang", "desc")); // 1 orderBy → tanpa composite index
    const unsub = onSnapshot(qq, (snap) => {
      const rows: Siswa[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Siswa, "id">),
      }));
      setSiswa(rows);
    });
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return siswa.filter(
      (x) => x.nama.toLowerCase().includes(s) || x.kelas.toLowerCase().includes(s)
    );
  }, [siswa, q]);

  const top3 = filtered.slice(0, 3);

  return (
    <Layout pageTitle="Leaderboard SMK Pesat">
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* PODIUM */}
        <div className="rounded-2xl bg-gradient-to-r from-blue-950 to-[#1B3C53] p-6 text-white shadow">
          <div className="grid grid-cols-3 items-end gap-4 sm:gap-6">
            <PodiumCard rank={2} data={top3[1]} height="h-28 sm:h-32" />
            <PodiumCard rank={1} data={top3[0]} height="h-40 sm:h-48" highlight />
            <PodiumCard rank={3} data={top3[2]} height="h-24 sm:h-28" />
          </div>
        </div>

        {/* SEARCH */}
        <div className="mt-6 flex items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari nama/kelas…"
              className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-[#1B3C53]"
            />
          </div>
          <div className="text-sm ">
            Total peserta: <span className="font-semibold ">{filtered.length}</span>
          </div>
        </div>

        {/* LIST */}
        <div className="mt-4 overflow-hidden rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 ">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-gray-500">Tidak ada data.</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {filtered.map((s, i) => (
                <li key={s.id} className="flex items-center gap-4 px-4 py-3">
                  <div className="w-8 shrink-0 text-center text-sm font-semibold ">
                    {i + 1}
                  </div>

                  {/* avatar (inisial) */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-400 text-sm font-bold ">
                    {initials(s.nama)}
                  </div>

                  {/* name + kelas */}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium ">{s.nama}</div>
                    <div className="truncate text-xs text-neutral-400">{s.kelas}</div>
                  </div>

                  {/* stars pakai ikon */}
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 rounded-md bg-yellow-50 px-2 py-1 text-sm font-semibold text-yellow-700">
                      <Star className="h-4 w-4" /> {s.bintang}
                    </span>
                  </div>

                  {/* trend opsional */}
                  <Trend last={s.lastMonthBintang} now={s.bintang} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Layout>
  );
}