"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/useAuth";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  onSnapshot,
} from "firebase/firestore";
import Layout from "@/components/layout";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { toast } from "sonner";
import { CheckCircle, Lock } from "lucide-react";

type Course = {
  id: string;
  title: string;
  description: string;
  mentor: string;
  imageUrl: string;
  isFree: boolean;
  materialType: string;
};

type ProfileData = {
  name: string;
  email: string;
  claimedCourses?: string[];
};

type SubscriptionDocLite = {
  status?: string;
  currentPeriodEnd?: { toMillis: () => number };
};

export default function CoursesPage() {
  const { user, loading } = useAuth();
const [profile, setProfile] = useState<ProfileData | null>(null);
const [courses, setCourses] = useState<Course[]>([]);
const [claiming, setClaiming] = useState<string>("");
const [isAuthenticated, setIsAuthenticated] = useState(false);
const [sub, setSub] = useState<SubscriptionDocLite | null>(null);
const [search, setSearch] = useState("");
const [typeFilter, setTypeFilter] = useState<"all" | "video" | "module">("all");
const [accessFilter, setAccessFilter] = useState<"all" | "free" | "premium">("all");

useEffect(() => {
  const fetchProfileAndCourses = async (uid: string) => {
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);

    if (!snap.exists() && user) {
      await setDoc(userRef, {
        name: user.displayName || "",
        email: user.email || "",
        claimedCourses: [],
      });
      setProfile({
        name: user.displayName || "",
        email: user.email || "",
        claimedCourses: [],
      });
    } else {
      setProfile(snap.data() as ProfileData);
    }

    const snapCourses = await getDocs(collection(db, "courses"));
    const data: Course[] = [];
    snapCourses.forEach((doc) => {
      data.push({ id: doc.id, ...doc.data() } as Course);
    });
    setCourses(data);
  };

  if (user) {
    setIsAuthenticated(true);
    fetchProfileAndCourses(user.uid);
    const unsub = onSnapshot(doc(db, "subscriptions", user.uid), (snap) => {
      setSub((snap.data() as SubscriptionDocLite) ?? null);
    });
    return () => unsub();
  }
}, [user]); 

  const subActive = useMemo(() => {
    if (!sub || sub.status !== "active") return false;
    const end = sub.currentPeriodEnd?.toMillis?.() ?? 0;
    return end >= Date.now();
  }, [sub]);

  const handleClaim = async (courseId: string) => {
    if (!user || !profile) return;
    const course = courses.find((c) => c.id === courseId);
    if (course && !course.isFree && !subActive) {
      toast.error("Kelas premium hanya untuk pelanggan aktif. Silakan berlangganan terlebih dahulu.");
      return;
    }

    try {
      setClaiming(courseId);
      const userRef = doc(db, "users", user.uid);
      const claimed = new Set(profile.claimedCourses || []);
      claimed.add(courseId);

      await setDoc(
        userRef,
        { claimedCourses: Array.from(claimed) },
        { merge: true }
      );

      setProfile({ ...profile, claimedCourses: Array.from(claimed) });
      toast.success("Berhasil mengikuti kelas!");
    } catch (err) {
      console.error("Gagal claim:", err);
      toast.error("Gagal mengikuti kelas.");
    } finally {
      setClaiming("");
    }
  };

  if (loading)
    return <div className="flex items-center justify-center h-screen">Loading...</div>;

  if (!isAuthenticated)
    return (
      <div className="flex items-center justify-center h-screen flex-col">
        <p className="text-center mb-2">Kamu belum login. Silakan login terlebih dahulu.</p>
        <Link href="/auth/login" className="text-blue-500 hover:underline">
          Ke Halaman Login
        </Link>
      </div>
    );

  const claimed = profile?.claimedCourses || [];
  const normalized = (s: string) => s.toLowerCase();
  const filteredCourses = courses.filter((c) => {
    const matchesSearch = !search
      ? true
      : [c.title, c.description, c.mentor].some((x) => normalized(x || "").includes(normalized(search)));
    const matchesType = typeFilter === "all" ? true : c.materialType === typeFilter;
    const matchesAccess =
      accessFilter === "all" ? true : accessFilter === "free" ? c.isFree : !c.isFree;
    return matchesSearch && matchesType && matchesAccess;
  });

  return (
    <Layout pageTitle="Kelas Kamu">
      <div className="space-y-10">
        <section>
          <h2 className="text-2xl font-bold mb-4">Kelas yang Kamu Ikuti</h2>
          {claimed.length === 0 ? (
            <div className="p-6 flex flex-col items-center text-center text-gray-500">
              <p>Kamu belum mengikuti kelas apapun.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
              {courses
                .filter((c) => claimed.includes(c.id))
                .map((course) => (
                  <Link key={course.id} href={`/pages/courses/${course.id}`} className="block">
                    <Card className="flex flex-col h-full p-4 cursor-pointer hover:shadow-lg transition">
                      <div className="relative w-full h-40 rounded-md overflow-hidden mb-3 bg-muted">
                        <Image
                          src={course.imageUrl || "/photos/working.jpg"}
                          alt={course.title}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="object-cover"
                          priority={false}
                        />
                        {!course.isFree && (
                          <span className="absolute top-2 right-2 bg-amber-500 text-white text-[10px] font-semibold px-2 py-1 rounded">
                            Premium
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold leading-snug min-h-[48px]">{course.title}</h3>
                      <p className="text-sm text-gray-600 min-h-[40px] overflow-hidden">{course.description}</p>
                      <div className="text-xs text-gray-500 mt-1">
                        Mentor: {course.mentor} • {course.materialType} • {course.isFree ? "Gratis" : "Premium"}
                      </div>
                      <div className="flex-1" />
                      <div className="mt-3 flex items-center justify-end">
                        <span className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm bg-neutral-50 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100 pointer-events-none">
                          <CheckCircle className="h-4 w-4" />
                          Buka Kelas
                        </span>
                      </div>
                    </Card>
                  </Link>
                ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Daftar Kelas Tersedia</h2>
          <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari judul, deskripsi, atau mentor..."
              className="col-span-1 md:col-span-2 border rounded-md px-3 py-2"
            />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as "all" | "video" | "module")}
              className="border rounded-md px-3 py-2"
            >
              <option value="all">Semua Tipe</option>
              <option value="video">Video</option>
              <option value="module">E-Module</option>
            </select>
            <select
              value={accessFilter}
              onChange={(e) => setAccessFilter(e.target.value as "all" | "free" | "premium")}
              className="border rounded-md px-3 py-2"
            >
              <option value="all">Semua Akses</option>
              <option value="free">Gratis</option>
              <option value="premium">Premium</option>
            </select>
          </div>
          {courses.length === 0 ? (
            <div className="p-6 flex flex-col items-center text-center text-gray-500">
              <p>Belum ada kelas tersedia saat ini.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
              {filteredCourses.map((course) => {
                const isClaimed = claimed.includes(course.id);
                const locked = !course.isFree && !subActive && !isClaimed;
                return (
                  <Card key={course.id} className="flex flex-col h-full p-4">
                    <div className="relative w-full h-40 rounded-md overflow-hidden mb-3 bg-muted">
                      <Image
                        src={course.imageUrl || "/photos/working.jpg"}
                        alt={course.title}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover"
                        priority={false}
                      />
                      {!course.isFree && (
                        <span className="absolute top-2 right-2 bg-amber-500 text-white text-[10px] font-semibold px-2 py-1 rounded">
                          Premium
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold leading-snug min-h-[48px]">{course.title}</h3>
                    <p className="text-sm text-gray-600 min-h-[40px] overflow-hidden">{course.description}</p>
                    <div className="text-xs text-gray-500 mt-1">
                      Mentor: {course.mentor} • {course.materialType} • {course.isFree ? "Gratis" : "Premium"}
                    </div>
                    <div className="flex-1" />
                    <div className="mt-3 flex items-center gap-3">
                      {isClaimed ? (
                        <Button asChild variant="secondary" className="flex-1">
                          <Link href={`/pages/courses/${course.id}`} className="inline-flex items-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            Buka Kelas
                          </Link>
                        </Button>
                      ) : (
                        <Button
                          className={`flex-1 ${locked ? "cursor-not-allowed" : ""}`}
                          onClick={() => handleClaim(course.id)}
                          disabled={claiming === course.id || locked}
                        >
                          {claiming === course.id
                            ? "Mengikuti..."
                            : locked
                            ? (<span className="inline-flex items-center gap-2"><Lock className="h-4 w-4" /> Terkunci</span>)
                            : "Ikuti Kelas"}
                        </Button>
                      )}
                      {locked && (
                        <Link href="/pages/subscription" className="text-blue-600 text-xs underline whitespace-nowrap">
                          Langganan untuk akses
                        </Link>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}
