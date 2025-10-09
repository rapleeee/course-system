"use client";

import React, { useEffect, useState, useCallback } from "react";
import AdminLayout from "@/components/layouts/AdminLayout";
import { db } from "@/lib/firebase";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import CourseCard from "@/components/ui/CourseCard";

type Course = {
  id: string;
  title: string;
  mentor: string;
  imageUrl?: string;
  accessType?: "free" | "subscription" | "paid";
  isFree?: boolean;
  price?: number;
  materialType: string;
};

export default function ManagementCoursePage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  // Buat fungsi untuk fetch ulang course
  const fetchCourses = useCallback(async () => {
    setLoading(true);
    const q = query(collection(db, "courses"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    const data = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Course[];

    setCourses(data);
    setLoading(false);
  }, []);

  // Panggil pertama kali saat mount
  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  return (
    <AdminLayout pageTitle="Manajemen Course">
      <h1 className="font-bold text-3xl">Daftar Course</h1>
      {loading ? (
        <p className="text-gray-500">Loading courses...</p>
      ) : courses.length === 0 ? (
        <p className="text-center text-gray-500">Belum ada course.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {courses.map((course) => (
            <CourseCard key={course.id} {...course} onDeleted={fetchCourses} />
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
