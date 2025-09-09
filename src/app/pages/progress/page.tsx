"use client";

import React, { useEffect, useState } from "react";
import Layout from "@/components/layout";
import { useAuth } from "@/lib/useAuth";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import Link from "next/link";
import Image from "next/image";

type ProgressDoc = {
  completedChapterIds?: string[];
  courseTitle?: string;
  courseImageUrl?: string;
};

type CourseProgress = {
  courseId: string;
  title: string;
  imageUrl?: string;
  completed: number;
  total: number;
};

export default function ProgressPage() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<CourseProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || authLoading) return;
    const run = async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, "users", user.uid, "progress"));
        const entries = await Promise.all(
          snap.docs.map(async (d) => {
            const courseId = d.id;
            const data = d.data() as ProgressDoc;
            let title = data.courseTitle;
            let imageUrl = data.courseImageUrl;
            const completed = data.completedChapterIds?.length || 0;

            if (!title || !imageUrl) {
              const courseSnap = await getDoc(doc(db, "courses", courseId));
              if (courseSnap.exists()) {
                const c = courseSnap.data() as { title?: string; imageUrl?: string };
                title = title || c.title;
                imageUrl = imageUrl || c.imageUrl;
              }
            }

            const chaptersSnap = await getDocs(collection(db, "courses", courseId, "chapters"));
            const total = chaptersSnap.size;

            return {
              courseId,
              title: title || `Kelas ${courseId}`,
              imageUrl,
              completed,
              total,
            } as CourseProgress;
          })
        );
        setItems(entries.sort((a, b) => a.title.localeCompare(b.title)));
      } catch (err) {
        console.error("Failed to load progress", err);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [user, authLoading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div aria-label="Memuat" className="animate-spin rounded-full h-10 w-10 border-2 border-muted-foreground/30 border-t-foreground" />
      </div>
    );
  }

  return (
    <Layout pageTitle="Progress Belajar">
      <div className="max-w-6xl mx-auto">
        {items.length === 0 ? (
          <div className="rounded-lg border bg-card p-8 text-center">
            <p className="text-muted-foreground">Belum ada progres yang tercatat. Mulai belajar di salah satu kelas.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((it) => {
              const percent = it.total > 0 ? Math.round((it.completed / it.total) * 100) : 0;
              return (
                <div key={it.courseId} className="rounded-lg border bg-card shadow-sm overflow-hidden">
                  {it.imageUrl && (
                    <div className="relative h-28">
                      <Image src={it.imageUrl} alt={it.title} fill className="object-cover" />
                    </div>
                  )}
                  <div className="p-5 space-y-3">
                    <h3 className="font-semibold text-foreground line-clamp-2 min-h-[2lh]">{it.title}</h3>
                    <div className="text-xs text-muted-foreground">{it.completed} dari {it.total} chapter</div>
                    <div className="h-2 rounded bg-muted overflow-hidden">
                      <div
                        className="h-full bg-foreground/80"
                        style={{ width: `${percent}%` }}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={percent}
                        role="progressbar"
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{percent}% selesai</span>
                      <Link href={`/pages/courses/${it.courseId}`} className="underline hover:no-underline">Lanjutkan</Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
