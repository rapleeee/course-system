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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {courses
                .filter((c) => claimed.includes(c.id))
                .map((course) => (
                  <Link key={course.id} href={`/pages/courses/${course.id}`}>
                    <Card className="p-4 space-y-2 cursor-pointer hover:shadow-lg transition">
                      <Image
                        src={course.imageUrl || "/photos/working.jpg"}
                        alt={course.title}
                        width={400}
                        height={200}
                        className="rounded w-full h-40 object-cover"
                      />
                      <h3 className="text-lg font-semibold">{course.title}</h3>
                      <p className="text-sm text-gray-600">{course.description}</p>
                      <p className="text-sm text-gray-500">
                        Mentor: {course.mentor} | {course.materialType} |{" "}
                        {course.isFree ? "Gratis" : "Berbayar"}
                      </p>
                    </Card>
                  </Link>
                ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Daftar Kelas Tersedia</h2>
          {courses.length === 0 ? (
            <div className="p-6 flex flex-col items-center text-center text-gray-500">
              <p>Belum ada kelas tersedia saat ini.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {courses.map((course) => {
                const isClaimed = claimed.includes(course.id);
                const locked = !course.isFree && !subActive && !isClaimed;
                return (
                  <Card key={course.id} className="p-4 space-y-2">
                    <Image
                      src={course.imageUrl || "/photos/working.jpg"}
                      alt={course.title}
                      width={400}
                      height={200}
                      className="rounded w-full h-40 object-cover"
                    />
                    <h3 className="text-lg font-semibold">{course.title}</h3>
                    <p className="text-sm text-gray-600">{course.description}</p>
                    <p className="text-sm text-gray-500">
                      Mentor: {course.mentor} | {course.materialType} |{" "}
                      {course.isFree ? "Gratis" : "Berbayar"}
                    </p>
                    <div className="flex justify-between items-center">
                      <Button
                        onClick={() => handleClaim(course.id)}
                        disabled={isClaimed || claiming === course.id || locked}
                      >
                        {isClaimed
                          ? "Sudah Diikuti"
                          : claiming === course.id
                          ? "Mengikuti..."
                          : locked
                          ? "Terkunci"
                          : "Ikuti Kelas"}
                      </Button>
                      {locked ? (
                        <span className="text-amber-600 text-sm">Premium</span>
                      ) : isClaimed ? (
                        <span className="text-green-500 text-sm">✔</span>
                      ) : null}
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
