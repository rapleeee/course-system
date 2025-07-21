"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, sendEmailVerification } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function VerifyEmailPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setEmail(user.email);
        if (user.emailVerified) {
          router.push("/auth/login");
        }
      } else {
        router.push("/auth/login");
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleResendEmail = async () => {
    if (!auth.currentUser) return;

    setLoading(true);
    try {
      await sendEmailVerification(auth.currentUser);
      toast.success("Email verifikasi telah dikirim ulang!");
    } catch{
      toast.error("Gagal mengirim email verifikasi. Coba lagi nanti.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full p-6 text-center">
        <h1 className="text-2xl font-bold mb-4">Verifikasi Email Anda</h1>
        <p className="mb-4">
          Kami telah mengirim email verifikasi ke:
          <br />
          <span className="font-semibold">{email}</span>
        </p>
        <p className="text-gray-600 mb-6">
          Silakan cek inbox email Anda dan klik link verifikasi yang kami kirim.
          Jika tidak menerima email, cek folder spam atau klik tombol di bawah untuk kirim ulang.
        </p>
        <Button
          onClick={handleResendEmail}
          disabled={loading}
          className="w-full"
        >
          {loading ? "Mengirim..." : "Kirim Ulang Email Verifikasi"}
        </Button>
      </div>
    </div>
  );
}