"use client";

import AdminLayout from "@/components/layouts/AdminLayout";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs, query, orderBy } from "firebase/firestore";
import { useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import AddChapterModal from "@/components/courses/AddChapterModal";
import ChapterList from "@/components/courses/ChapterList";

type Course = {
  title: string;
  description: string;
  mentor: string;
  isFree: boolean;
  materialType: string;
};

export type Chapter = {
  id: string;
  title: string;
  description?: string;
  shortDesc?: string;
  text?: string;
  type: "video" | "module" | "pdf";
  videoId?: string;
  pdfUrl?: string;
  image?: string;
  createdAt: Date | number;
};

export default function CourseDetailPage() {
  const { id } = useParams();
  const [course, setCourse] = useState<Course | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChapters = useCallback(async () => {
    if (!id) return;

    const docRef = doc(db, "courses", id as string);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      setCourse(snap.data() as Course);
    }

    const chapterRef = collection(db, "courses", id as string, "chapters");
    const q = query(chapterRef, orderBy("createdAt", "asc"));
    const snapChapters = await getDocs(q);
    const chaptersData = snapChapters.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Chapter[];

    setChapters(chaptersData);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchChapters();
  }, [fetchChapters]);

  if (loading) return <div className="p-6">Loading...</div>;
  if (!course) return <div className="p-6">Course tidak ditemukan.</div>;

  return (
    <AdminLayout pageTitle={`Detail Course: ${course.title}`}>
      <div className="space-y-4">
        <Card className="p-4 space-y-1">
          <h2 className="text-xl font-bold">{course.title}</h2>
          <p className="text-sm text-gray-600">Mentor: {course.mentor}</p>
          <p className="text-sm text-gray-600">
            Tipe: {course.materialType} | {course.isFree ? "Gratis" : "Berbayar"}
          </p>
        </Card>

        <div className="flex justify-between items-center mt-6">
          <h3 className="text-lg font-semibold">Daftar Chapter</h3>
          <AddChapterModal courseId={id as string} onChapterAdded={fetchChapters} />
        </div>

        <ChapterList
          chapters={chapters}
          courseId={id as string}
          onChapterUpdated={fetchChapters}
        />
      </div>
    </AdminLayout>
  );
}