"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/useAuth";
import Layout from "@/components/layout";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import EditProfileModal from "@/components/EditProfileModal";
import Image from "next/image";

type ProfileData = {
  name?: string;
  email?: string;
  level?: string;
  description?: string;
  photoURL?: string;
};

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (user) {
      setIsAuthenticated(true);
      fetchProfile(user.uid);
    } else {
      setIsAuthenticated(false);
    }
  }, [user]);

  const fetchProfile = async (uid: string) => {
    try {
      const docRef = doc(db, "users", uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProfile(docSnap.data() as ProfileData);
      }
    } catch (err) {
      console.error("Failed to fetch profile:", err);
    }
  };

  if (loading) return <div className="text-center mt-10">Loading...</div>;

  if (!isAuthenticated) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>You must be logged in to access this page. Redirecting...</p>
        <Link href="/auth/login" className="text-blue-500 hover:underline ml-2">
          Go to Login
        </Link>
      </div>
    );
  }

  return (
    <Layout pageTitle="Settings">
      <div className="w-full mx-auto shadow-md rounded-xl dark:bg-neutral-800 p-6 space-y-6 border">
        <div className="flex items-center space-x-5">
          <Image
            src={profile?.photoURL || "/photos/boy.png"}
            alt="avatar"
            width={96}
            height={96}
            className="rounded-full border object-cover"
          />
          <div>
            <h2 className="text-2xl font-bold">{profile?.name || "No Name"}</h2>
            <div className="flex gap-2 items-center flex-wrap">
              <p className="text-lg font-medium">
                {profile?.level || "Belum ditentukan"} 🔥
              </p>
              <p className="text-base text-gray-800 dark:text-gray-200">
                | {profile?.description || "Tidak ada headlines"}
              </p>
            </div>
          </div>
        </div>

        <div className="text-right">
          <Button
            variant="default"
            className="px-6 py-2 text-sm font-medium"
            onClick={() => setModalOpen(true)}
          >
            Edit Profil
          </Button>
        </div>
{modalOpen && user && profile && (
  <EditProfileModal
    userId={user.uid}
    initialData={profile}
    onClose={() => setModalOpen(false)}
    onUpdated={() => fetchProfile(user.uid)}
  />
)}
      </div>
    </Layout>
  );
}