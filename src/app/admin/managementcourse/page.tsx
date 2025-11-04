"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import AdminLayout from "@/components/layouts/AdminLayout";
import { db } from "@/lib/firebase";
import { collection, getDocs, orderBy, query, Timestamp } from "firebase/firestore";
import CourseCard from "@/components/ui/CourseCard";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw } from "lucide-react";
import { useAdminProfile } from "@/hooks/useAdminProfile";

type Course = {
  id: string;
  title: string;
  mentor: string;
  imageUrl?: string;
  accessType?: "free" | "subscription" | "paid";
  isFree?: boolean;
  price?: number;
  materialType: string;
  createdBy?: string;
  createdAt?: Timestamp;
};

export default function ManagementCoursePage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, profile, profileLoading } = useAdminProfile();
  const userId = user?.uid ?? null;
  const profileName = useMemo(() => {
    if (!profile) return "";
    return (
      (typeof profile.name === "string" && profile.name) ||
      (typeof profile.nama === "string" && profile.nama) ||
      (typeof profile.username === "string" && profile.username) ||
      (typeof profile.email === "string" && profile.email.split("@")[0]) ||
      ""
    );
  }, [profile]);

  const isGuru = profile?.role === "guru";

  // Buat fungsi untuk fetch ulang course
  const fetchCourses = useCallback(async () => {
    if (!userId) {
      setCourses([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let snap;
      if (isGuru) {
        snap = await getDocs(collection(db, "courses"));
      } else {
        const adminQuery = query(collection(db, "courses"), orderBy("createdAt", "desc"));
        snap = await getDocs(adminQuery);
      }

      const data = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Course[];

      const filteredData = isGuru
        ? data.filter((course) => {
            if (course.createdBy && userId) {
              return course.createdBy === userId;
            }
            if (!profileName) return false;
            return (course.mentor ?? "").toLowerCase() === profileName.toLowerCase();
          })
        : data;

      const sortedData = isGuru
        ? [...filteredData].sort((a, b) => {
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
        : filteredData;

      setCourses(sortedData);
    } catch (error) {
      console.error("Failed to fetch courses:", error);
    } finally {
      setLoading(false);
    }
  }, [isGuru, userId, profileName]);

  // Panggil pertama kali saat mount
  useEffect(() => {
    if (profileLoading) return;
    void fetchCourses();
  }, [fetchCourses, profileLoading]);

  const emptyStateCopy = useMemo(() => {
    if (isGuru) {
      return {
        title: "Belum ada course milik Anda",
        description:
          "Mulai buat course pertama untuk membagikan materi kepada siswa Anda. Data mentor akan terhubung ke akun Anda.",
        action: "Tambah course pertama",
      };
    }
    return {
      title: "Belum ada course",
      description:
        "Mulai tambahkan course baru untuk mengisi katalog pembelajaran dan pastikan member mendapatkan materi terbaik.",
      action: "Buat course pertama",
    };
  }, [isGuru]);

  return (
    <AdminLayout pageTitle="Manajemen Course">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Daftar Course
          </h1>
          <p className="text-muted-foreground">
            Pantau dan kelola seluruh materi pembelajaran yang tersedia untuk
            member.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={fetchCourses}
            disabled={loading}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Muat ulang
          </Button>
          <Button asChild>
            <Link href="/admin/addcourses">Tambah Course</Link>
          </Button>
        </div>
      </div>

      <section className="mt-8">
        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={`course-skeleton-${index}`}
                className="flex h-full flex-col rounded-xl border bg-card p-4 shadow-sm"
              >
                <Skeleton className="h-40 w-full rounded-lg" />
                <div className="mt-4 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
                <div className="mt-auto flex items-center gap-2 pt-6">
                  <Skeleton className="h-9 flex-1 rounded-md" />
                  <Skeleton className="h-9 w-16 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed bg-card px-10 py-16 text-center shadow-sm">
            <h2 className="text-2xl font-semibold">{emptyStateCopy.title}</h2>
            <p className="max-w-md text-sm text-muted-foreground">{emptyStateCopy.description}</p>
            <Button asChild>
              <Link href="/admin/addcourses">{emptyStateCopy.action}</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {courses.map((course) => (
              <CourseCard key={course.id} {...course} onDeleted={fetchCourses} />
            ))}
          </div>
        )}
      </section>
    </AdminLayout>
  );
}
