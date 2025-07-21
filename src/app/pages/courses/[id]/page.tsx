"use client";

import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs, query, orderBy } from "firebase/firestore";
import { useEffect, useState } from "react";
import Layout from "@/components/layout";
import Image from "next/image";
import YouTube from 'react-youtube';
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
  description?: string;
  type: "video" | "module" | "pdf";
  videoId?: string;
  image?: string;
  pdfUrl?: string;
  text?: string;
  createdAt: Date | number;
};

const renderChapterContent = (chapter: Chapter) => {
  switch (chapter.type) {
    case "video":
      return chapter.videoId ? (
        <div className="aspect-video w-full rounded-lg overflow-hidden">
          <YouTube
            videoId={chapter.videoId}
            opts={{
              width: '100%',
              height: '100%',
              playerVars: {
                autoplay: 0,
                modestbranding: 1,
                rel: 0,
              },
            }}
            className="w-full h-full"
          />
        </div>
      ) : null;

    case "pdf":
      return chapter.pdfUrl ? (
        <div className="w-full h-[600px] rounded-lg overflow-hidden border border-gray-200">
          <iframe
            src={`${chapter.pdfUrl}#toolbar=0`}
            className="w-full h-full"
            title={`PDF: ${chapter.title}`}
          />
        </div>
      ) : null;

    case "module":
      return chapter.image ? (
        <div className="relative w-full h-[400px]">
          <Image
            src={chapter.image}
            alt={chapter.title}
            fill
            className="rounded-lg object-contain"
            loading="lazy"
          />
        </div>
      ) : null;

    default:
      return null;
  }
};

export default function CourseDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [hasAccess, setHasAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user && !authLoading) {
      router.push("/auth/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!id || !user) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch course data
        const courseSnap = await getDoc(doc(db, "courses", id as string));
        if (courseSnap.exists()) {
          setCourse(courseSnap.data() as Course);
        }

        // Check user access
        const userSnap = await getDoc(doc(db, "users", user.uid));
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const claimedCourses = userData.claimedCourses || [];
          setHasAccess(claimedCourses.includes(id));
        }

        // Fetch chapters
        const chapterRef = collection(db, "courses", id as string, "chapters");
        const q = query(chapterRef, orderBy("createdAt", "asc"));
        const chapterSnap = await getDocs(q);
        const chapterData = chapterSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Chapter[];
        setChapters(chapterData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id, user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <Layout pageTitle="Kelas Tidak Ditemukan">
        <div className="text-center p-10">
          <p className="text-lg font-semibold mb-2">Kelas tidak ditemukan.</p>
          <p className="text-gray-600">Silakan kembali ke halaman Kelas.</p>
        </div>
      </Layout>
    );
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
        {/* Course Header */}
        <div className="rounded-lg overflow-hidden shadow-lg border bg-white dark:bg-gray-900">
          <div className="relative h-48 md:h-64">
            <Image
              src={course.imageUrl || "/photos/working.jpg"}
              alt={course.title}
              fill
              className="object-cover"
            />
          </div>
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{course.title}</h1>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">Mentor: {course.mentor}</p>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{course.description}</p>
          </div>
        </div>

        {/* Chapters Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Materi Chapter
          </h2>
          
          {chapters.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">
              Belum ada chapter ditambahkan oleh pengajar.
            </p>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {chapters.map((chapter, index) => (
                <AccordionItem 
                  key={chapter.id} 
                  value={`item-${index}`}
                  className="border-b border-gray-200 dark:border-gray-700"
                >
                  <AccordionTrigger className="text-left hover:no-underline">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">#{index + 1}</span>
                      <span className="font-medium">{chapter.title}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    {renderChapterContent(chapter)}

                    {chapter.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {chapter.description}
                      </p>
                    )}

                    {chapter.text && (
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                        {chapter.text}
                      </p>
                    )}

                    {!chapter.videoId && !chapter.image && !chapter.pdfUrl && !chapter.text && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                        Konten belum tersedia.
                      </p>
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