"use client";

import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs, query, orderBy } from "firebase/firestore";
import { useEffect, useState } from "react";
import Layout from "@/components/layout";
import Image from "next/image";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

type Course = {
  title: string;
  description: string;
  mentor: string;
  imageUrl: string;
  isFree: boolean;
  materialType: string;
};

type Chapter = {
  id: string;
  title: string;
  type: "video" | "module";
  videoUrl?: string;
  image?: string;
  pdfUrl?: string;
  text?: string;
};

export default function CourseDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [hasAccess, setHasAccess] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);

  useEffect(() => {
    if (!user && !loading) {
      router.push("/auth/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!id || !user) return;

    const fetchData = async () => {
      const courseSnap = await getDoc(doc(db, "courses", id as string));
      if (courseSnap.exists()) {
        setCourse(courseSnap.data() as Course);
      }

      const userSnap = await getDoc(doc(db, "users", user.uid));
      if (userSnap.exists()) {
        const data = userSnap.data();
        const claimedCourses = data.claimedCourses || [];
        setHasAccess(claimedCourses.includes(id));
        setProfileLoaded(true);
      }

      const chapterRef = collection(db, "courses", id as string, "chapters");
      const q = query(chapterRef, orderBy("createdAt", "asc"));
      const chapterSnap = await getDocs(q);
      const chapterData = chapterSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Chapter[];
      setChapters(chapterData);
    };

    fetchData();
  }, [id, user]);

  if (!profileLoaded || !course) {
    return <div className="p-6">Loading...</div>;
  }

  if (!hasAccess) {
    return (
      <Layout pageTitle="Akses Ditolak">
        <div className="text-center p-10">
          <p className="text-lg font-semibold mb-2">Kamu belum mengikuti kelas ini.</p>
          <p className="text-gray-600">Silakan kembali ke halaman Kelas dan klik Ikuti Kelas yang tersedia.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout pageTitle={course.title}>
      <div className="space-y-6">
        <div className="rounded-md overflow-hidden shadow border">
          <Image
            src={course.imageUrl || "/photos/working.jpg"}
            alt={course.title}
            width={800}
            height={200}
            className="w-full h-48 object-cover"
          />
          <div className="p-4">
            <h1 className="text-2xl font-bold">{course.title}</h1>
            <p className="text-sm text-gray-600">Mentor: {course.mentor}</p>
            <p className="text-sm text-gray-600 mt-1">{course.description}</p>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-3">Materi Chapter</h2>
          {chapters.length === 0 ? (
            <p className="text-gray-500">Belum ada chapter ditambahkan oleh pengajar.</p>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {chapters.map((chapter, index) => (
                <AccordionItem key={chapter.id} value={`item-${index}`}>
                  <AccordionTrigger className="text-left">
                    Chapter {index + 1}: {chapter.title}
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 mt-2">
                    {chapter.videoUrl && (
                      <video controls className="w-full rounded">
                        <source src={chapter.videoUrl} type="video/mp4" />
                        Browser tidak mendukung video.
                      </video>
                    )}
                    {chapter.image && (
                      <Image
                        src={chapter.image}
                        alt={chapter.title}
                        width={640}
                        height={360}
                        className="rounded object-cover"
                      />
                    )}
                    {chapter.pdfUrl && (
                      <iframe
                        src={chapter.pdfUrl}
                        className="w-full h-[500px] border rounded"
                        title={`PDF Chapter ${chapter.title}`}
                      />
                    )}
                    {chapter.text && (
                      <p className="text-sm text-gray-700 whitespace-pre-line">{chapter.text}</p>
                    )}
                    {!chapter.videoUrl && !chapter.image && !chapter.pdfUrl && !chapter.text && (
                      <p className="text-sm text-gray-500 italic">Konten belum tersedia.</p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      </div>
    </Layout>
  );
}