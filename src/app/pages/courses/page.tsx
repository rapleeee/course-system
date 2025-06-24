"use client";
import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/useAuth";
import Layout from "@/components/layout";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs, setDoc } from "firebase/firestore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type ProfileData = {
  name: string;
  email: string;
  level?: string;
  description?: string;
  photoURL?: string;
  claimedCourses?: string[];
};

type Course = {
  id: string;
  title: string;
  description: string;
};

export default function CoursesPage() {
  const { user, loading } = useAuth();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    if (user) {
      setIsAuthenticated(true);
      fetchProfile(user.uid);
      fetchCourses();
    } else {
      setIsAuthenticated(false);
    }
  }, [user]);

  const fetchProfile = async (uid: string) => {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      setProfile(docSnap.data() as ProfileData);
    }
  };

  const fetchCourses = async () => {
    const querySnap = await getDocs(collection(db, "courses"));
    const data: Course[] = [];
    querySnap.forEach((doc) => {
      data.push({ id: doc.id, ...doc.data() } as Course);
    });
    setCourses(data);
  };

  const handleClaim = async (courseId: string) => {
    if (!user) return;
    const userRef = doc(db, "users", user.uid);
    const current = profile?.claimedCourses || [];
    const updated = [...new Set([...current, courseId])];
    await setDoc(userRef, { claimedCourses: updated }, { merge: true });
    setProfile((prev) => (prev ? { ...prev, claimedCourses: updated } : prev));
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    );

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center">
        <p className="mb-2">
          You must be logged in to access this page. Redirecting...
        </p>
        <Link href="/auth/login" className="text-blue-500 hover:underline">
          Go to Login
        </Link>
      </div>
    );
  }

  const claimedCourses = profile?.claimedCourses || [];

  return (
    <Layout pageTitle="Kelas Kamu">
      <main className="space-y-8">
        {/* Bagian Kelas yang sudah diklaim */}
        <div>
          <h2 className="text-xl font-bold mb-4">Kelas yang Kamu Ikuti</h2>
          {claimedCourses.length === 0 ? (
            <p className="text-gray-500">Kamu belum mengikuti kelas manapun.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses
                .filter((c) => claimedCourses.includes(c.id))
                .map((course) => (
                  <Card key={course.id} className="p-4">
                    <h3 className="font-semibold text-lg">{course.title}</h3>
                    <p className="text-sm text-gray-600">
                      {course.description}
                    </p>
                  </Card>
                ))}
            </div>
          )}
        </div>

        {/* Bagian daftar semua kelas */}
        <div>
          <h2 className="text-xl font-bold mb-4">Daftar Kelas Tersedia</h2>
          {courses.length === 0 ? (
            <p className="text-gray-500">
              Belum ada kelas yang tersedia. Sabar ya, kelas akan segera dibuka
              oleh gurumu ✨
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.map((course) => (
                <Card key={course.id} className="p-4">
                  <h3 className="font-semibold text-lg">{course.title}</h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {course.description}
                  </p>
                  <Button
                    onClick={() => handleClaim(course.id)}
                    disabled={claimedCourses.includes(course.id)}
                  >
                    {claimedCourses.includes(course.id)
                      ? "Sudah Diikuti"
                      : "Ikuti Kelas"}
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </Layout>
  );
}
