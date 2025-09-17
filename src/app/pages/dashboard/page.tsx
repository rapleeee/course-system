"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/useAuth";
import Layout from "@/components/layout";
import Link from "next/link";
import CardDashboard from "@/components/ui/CardDashboard";
import { db } from "@/lib/firebase";
import {
  collection, doc, getDoc, getDocs, limit, orderBy,
  query as fsQuery, Timestamp, where,
} from "firebase/firestore";
import Image from "next/image";
import { Megaphone } from "lucide-react";
import StreakWidget from "@/components/StreakWidget";

/* === Types === */
type ProfileData = {
  name: string;
  email: string;
  level?: string;
  description?: string;
  photoURL?: string;
  claimedCourses?: string[];
  claimedCertificates?: string[];
  lastCourseId?: string;
};

type Course = {
  id: string;
  title: string;
  level?: string;
  imageUrl?: string;
  shortDesc?: string;
};

type Announcement = {
  id: string;
  title: string;
  body?: string;
  createdAt?: Timestamp;
  courseId?: string;
};

/* Rekomendasi statis */
const RECOMMENDATIONS = [
  { href: "/courses?cat=dasar", title: "Dasar Pemrograman" },
  { href: "/courses?cat=desain", title: "Desain UI/UX Pemula" },
  { href: "/courses?cat=career", title: "Kelas Persiapan Karier" },
];

export default function DashboardPage() {
  const { user, loading } = useAuth();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [myCourses, setMyCourses] = useState<Course[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [busy, setBusy] = useState(false);

  const fetchMyCourses = useCallback(async (courseIds: string[]) => {
    try {
      if (!courseIds.length) {
        setMyCourses([]);
        return;
      }
      // Firestore "in" max 10
      const ids = courseIds.slice(0, 10);
      const q = fsQuery(collection(db, "courses"), where("__name__", "in", ids));
      const snap = await getDocs(q);
      const rows: Course[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Course, "id">),
      }));
      // urutkan sesuai urutan ids
      const ordered = ids
        .map((id) => rows.find((r) => r.id === id))
        .filter((x): x is Course => Boolean(x))
        .slice(0, 6);
      setMyCourses(ordered);
    } catch (e) {
      console.warn("Gagal ambil courses:", e);
      setMyCourses([]);
    }
  }, []);

  const fetchAnnouncements = useCallback(async () => {
    try {
      const cutoff = Timestamp.fromMillis(Date.now() - 5 * 24 * 60 * 60 * 1000);
      const q = fsQuery(
        collection(db, "announcements"),
        where("createdAt", ">=", cutoff),
        orderBy("createdAt", "desc"),
        limit(3)
      );
      const snap = await getDocs(q);
      const rows: Announcement[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Announcement, "id">),
      }));
      setAnnouncements(rows);
    } catch (e) {
      console.warn("Gagal ambil announcements:", e);
      setAnnouncements([]);
    }
  }, []);

  const fetchProfile = useCallback(async (uid: string) => {
    try {
      setBusy(true);
      const snap = await getDoc(doc(db, "users", uid));
      if (snap.exists()) {
        const data = snap.data() as ProfileData;
        setProfile(data);
        await Promise.all([
          fetchMyCourses(data.claimedCourses ?? []),
          fetchAnnouncements(),
        ]);
      } else {
        setProfile(null);
        await Promise.all([fetchMyCourses([]), fetchAnnouncements()]);
      }
    } catch (e) {
      console.error("Gagal mengambil data profil:", e);
    } finally {
      setBusy(false);
    }
  }, [fetchAnnouncements, fetchMyCourses]);

  useEffect(() => {
    if (user?.uid) {
      setIsAuthenticated(true);
      void fetchProfile(user.uid);
    } else {
      setIsAuthenticated(false);
    }
  }, [user?.uid, fetchProfile]);

  /* Early returns setelah semua hooks di atas */
  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen flex-col items-center justify-center text-center">
        <p className="mb-2">You must be logged in to access this page. Redirecting...</p>
        <Link href="/auth/login" className="text-blue-600 hover:underline">Go to Login</Link>
      </div>
    );
  }

  const totalKelas = profile?.claimedCourses?.length ?? 0;
  const totalSertifikat = profile?.claimedCertificates?.length ?? 0;
  const ongoingCourses = totalKelas;
  const lastCourseLink = profile?.lastCourseId ?? profile?.claimedCourses?.[0] ?? null;

  return (
    <Layout pageTitle="Dashboard">
      <main className="space-y-8">
        <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl">
                Halo, <span className="font-bold">{profile?.name || "User"}!</span>
              </h1>
              <p className="text-sm text-neutral-600 dark:text-neutral-300">
                Selamat datang kembali. Lanjutkan progres belajarmu atau jelajahi kelas baru.
              </p>
            </div>
            <div className="flex gap-2">
              {lastCourseLink ? (
                <Link
                  href={`/pages/courses/${lastCourseLink}`}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#176861] bg-[#1d857c]"
                >
                  Lanjutkan Belajar
                </Link>
              ) : (
                <Link
                  href="/pages/courses"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  Mulai Kelas Pertamamu
                </Link>
              )}
              <Link
                href="/pages/courses"
                className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-800"
              >
                Jelajahi Kelas
              </Link>
            </div>
          </div>
          <div className="mt-4">
            <StreakWidget />
          </div>
        </section>
        <section className="space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <CardDashboard count={totalKelas} title="Total Kelas" />
            <CardDashboard count={ongoingCourses} title="Sedang Berjalan" />
            <CardDashboard count={totalSertifikat} title="Sertifikat" />
          </div>
        </section>
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Kelas Saya</h2>
            <Link href="/pages/courses" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
              Lihat semua
            </Link>
          </div>

          {busy ? (
            <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
              Memuat kelas…
            </div>
          ) : myCourses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
              Kamu belum punya kelas.{" "}
              <Link href="/courses" className="text-blue-600 hover:underline dark:text-blue-400">
                Cari kelas
              </Link>{" "}
              yang cocok untukmu!
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {myCourses.map((c) => (
                <Link
                  key={c.id}
                  href={`/pages/courses/${c.id}`}
                  className="group overflow-hidden rounded-xl border border-neutral-200 bg-white transition hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900"
                >
                  <div className="aspect-[16/9] w-full bg-neutral-100 dark:bg-neutral-800 relative">
                    {c.imageUrl ? (
                      <Image
                        src={c.imageUrl}
                        alt={c.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover"
                        priority={false}
                      />
                    ) : null}
                  </div>
                  <div className="space-y-1 p-4">
                    <div className="line-clamp-1 font-medium">{c.title}</div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">
                      {c.level ?? "Semua Level"}
                    </div>
                    {c.shortDesc ? (
                      <p className="line-clamp-2 text-xs text-neutral-500 dark:text-neutral-400">{c.shortDesc}</p>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* PENGUMUMAN */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Pengumuman Terbaru</h2>
          {announcements.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
              Belum ada pengumuman.
            </div>
          ) : (
            <ul className="space-y-3">
              {announcements.map((a) => {
                const created = a.createdAt?.toDate();
                const dateStr = created
                  ? created.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
                  : "-";
                return (
                  <li key={a.id} className="w-full">
                    <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 text-white shadow-md">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-start gap-3">
                          <div className="shrink-0 rounded-full bg-white/20 p-2">
                            <Megaphone className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="text-xs/relaxed text-white/80">{dateStr}</div>
                            <div className="text-base md:text-lg font-semibold leading-snug">{a.title}</div>
                            {a.body ? (
                              <p className="mt-1 text-sm text-white/90 line-clamp-3">{a.body}</p>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {a.courseId ? (
                            <Link
                              href={`/pages/courses/${a.courseId}`}
                              className="inline-flex items-center rounded-lg bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/25"
                            >
                              Buka Kelas
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* REKOMENDASI */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Rekomendasi untukmu</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {RECOMMENDATIONS.map((r) => (
              <Link
                key={r.href}
                href={r.href}
                className="rounded-xl border border-neutral-200 bg-white p-4 text-sm shadow-sm transition hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800"
              >
                {r.title}
              </Link>
            ))}
          </div>
        </section>

        {/* QUICK LINKS */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Tautan Cepat</h2>
          <div className="flex flex-wrap gap-2">
            <Link href="/courses" className="rounded-lg border border-neutral-200 px-3 py-2 text-sm transition hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-800">
              Semua Kelas
            </Link>
            <Link href="/pages/assignments" className="rounded-lg border border-neutral-200 px-3 py-2 text-sm transition hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-800">
              Tugas & Kuis
            </Link>
            <Link href="/certificates" className="rounded-lg border border-neutral-200 px-3 py-2 text-sm transition hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-800">
              Sertifikat
            </Link>
            <Link href="/leaderboard" className="rounded-lg border border-neutral-200 px-3 py-2 text-sm transition hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-800">
              Leaderboard
            </Link>
            <Link href="/help" className="rounded-lg border border-neutral-200 px-3 py-2 text-sm transition hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-800">
              Pusat Bantuan
            </Link>
          </div>
        </section>
      </main>
    </Layout>
  );
}
