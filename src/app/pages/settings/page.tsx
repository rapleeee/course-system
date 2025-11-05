"use client";

import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/useAuth";
import Layout from "@/components/layout";
import Link from "next/link";
import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import EditProfileModal from "@/components/EditProfileModal";
import Image from "next/image";
import { getAuth, sendPasswordResetEmail } from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { toast } from "sonner";

type ProfileData = {
  name?: string;
  email?: string;
  level?: string | null;
  description?: string;
  photoURL?: string;
  claimedCourses?: string[];
};

type SubStatus =
  | "active" | "expired" | "pending" | "cancel" | "deny"
  | "failure" | "refund" | "chargeback" | "capture" | "settlement";

const LEVEL_LABELS: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  master: "Master",
};

const formatLevelLabel = (value?: string | null) => {
  if (!value) return "Belum ditentukan";
  const normalized = value.toLowerCase();
  return LEVEL_LABELS[normalized] ?? "Belum ditentukan";
};

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [subStatus, setSubStatus] = useState<SubStatus | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [resetSending, setResetSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (user) {
      setIsAuthenticated(true);
      fetchProfile(user.uid);
      const unsub = onSnapshot(doc(db, "subscriptions", user.uid), (snap) => {
        const data = snap.data() as { status?: SubStatus } | undefined;
        setSubStatus((data?.status as SubStatus) || null);
      });
      return () => unsub();
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

  const handleResetPassword = async () => {
    if (!user?.email) return;
    setResetSending(true);
    try {
      await sendPasswordResetEmail(getAuth(), user.email);
      toast.success("Link reset password telah dikirim ke email kamu.");
    } catch {
      toast.error("Gagal mengirim email reset password.");
    } finally {
      setResetSending(false);
    }
  };

  const handleQuickPhotoChange = async (file: File) => {
    if (!user?.uid) return;
    if (file.size > 1024 * 1024) {
      toast.error("Ukuran gambar maksimal 1MB");
      return;
    }
    setUploadingPhoto(true);
    try {
      const storage = getStorage();
      const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const photoRef = ref(storage, `users/${user.uid}/profile-${Date.now()}-${safeName}`);
      await uploadBytes(photoRef, file);
      const photoURL = await getDownloadURL(photoRef);
      await setDoc(doc(db, "users", user.uid), { photoURL }, { merge: true });
      await fetchProfile(user.uid);
      toast.success("Foto profil diperbarui");
    } catch {
      toast.error("Gagal mengunggah foto.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  return (
    <Layout pageTitle="Pengaturan Akun">
      <div className="max-w-5xl mx-auto grid gap-6 md:grid-cols-2">
        {/* Profile Card */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="w-24 h-24 rounded-full border overflow-hidden bg-muted">
                <Image
                  key={profile?.photoURL || "default-avatar"}
                  src={profile?.photoURL || "/photos/boy.png"}
                  alt="avatar"
                  fill
                  sizes="96px"
                  className="object-cover rounded-full"
                />
              </div>
              <button
                className="absolute -bottom-2 -right-2 text-xs rounded-md border bg-background px-2 py-1 shadow hover:bg-accent hover:text-accent-foreground"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
              >
                {uploadingPhoto ? "Mengunggah…" : "Ganti Foto"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleQuickPhotoChange(f);
                  e.currentTarget.value = "";
                }}
              />
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl font-bold truncate">{profile?.name || "Tanpa Nama"}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>Level: {formatLevelLabel(profile?.level)}</span>
                <span>•</span>
                <span>Kelas diikuti: {profile?.claimedCourses?.length ?? 0}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground line-clamp-3">
                {profile?.description || "Belum ada deskripsi."}
              </p>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button onClick={() => setModalOpen(true)}>Edit Profil</Button>
          </div>
        </div>

        {/* Account & Security */}
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Akun</h3>
            <div className="mt-3 text-sm text-muted-foreground">Email</div>
            <div className="text-foreground">{profile?.email || user?.email}</div>
          </div>
          <div>
            <h3 className="text-lg font-semibold">Keamanan</h3>
            <div className="mt-2 flex gap-3">
              <Button variant="outline" onClick={handleResetPassword} disabled={resetSending || !user?.email}>
                {resetSending ? "Mengirim…" : "Kirim Email Reset Password"}
              </Button>
              <Link href="/pages/subscription" className="inline-flex items-center rounded-md border bg-background px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground">
                Kelola Langganan
              </Link>
            </div>
            {subStatus && (
              <div className="mt-2 text-sm text-muted-foreground">Status langganan: <span className="font-medium text-foreground">{subStatus}</span></div>
            )}
          </div>
        </div>

        {/* Preferences placeholder (optional for future) */}
        <div className="rounded-xl border bg-card p-6 shadow-sm md:col-span-2">
          <h3 className="text-lg font-semibold">Preferensi</h3>
          <p className="mt-2 text-sm text-muted-foreground">Mode gelap/terang dapat diubah dari tombol kanan atas. Preferensi lainnya akan segera hadir.</p>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm md:col-span-2 space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Informasi Profil & Kebijakan</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Ketahui bagaimana data kamu digunakan serta dukungan apa saja yang tersedia untuk memastikan pengalaman belajar tetap aman.
            </p>
          </div>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="privacy">
              <AccordionTrigger className="text-left">Kebijakan Privasi</AccordionTrigger>
              <AccordionContent>
                <p className="text-sm text-muted-foreground">
                  Data profil seperti nama, level, dan deskripsi membantu kami menyesuaikan rekomendasi kelas serta pengalaman mentor. Informasi ini hanya digunakan di dalam platform dan tidak dibagikan ke pihak ketiga tanpa izinmu. Kamu bisa memperbarui atau menghapus data kapan saja melalui form edit profil.
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="terms">
              <AccordionTrigger className="text-left">Syarat Penggunaan</AccordionTrigger>
              <AccordionContent>
                <p className="text-sm text-muted-foreground">
                  Dengan menggunakan platform, kamu setuju untuk menjaga keamanan kredensial, tidak membagikan akses akun, serta mematuhi aturan komunitas saat berinteraksi di forum dan kelas live. Pelanggaran berat dapat mengakibatkan pembatasan akses agar lingkungan belajar tetap kondusif.
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="support">
              <AccordionTrigger className="text-left">Dukungan & Bantuan</AccordionTrigger>
              <AccordionContent>
                <p className="text-sm text-muted-foreground">
                  Butuh bantuan lebih lanjut? Tim support siap membantu terkait perubahan data pribadi, permintaan penghapusan akun, maupun pertanyaan keamanan. Gunakan tombol reset password di atas atau hubungi admin melalui kanal resmi komunitas.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
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
