"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { auth, createUserWithEmailAndPassword } from "@/lib/firebase";
import Link from "next/link";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { sendEmailVerification } from "firebase/auth";
import { useRouter } from "next/navigation";
import { ensureUserProfile } from "@/lib/user-profile";

export default function SignUpPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

   const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      // Create user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await ensureUserProfile(user, { name: fullName, email });

      // Send verification email
      await sendEmailVerification(user);

      setLoading(false);
      
      toast.success(
        "Pendaftaran berhasil! Silakan cek email Anda untuk verifikasi.", 
        { duration: 5000 }
      );

      // Redirect to verification pending page
      router.push("/auth/verify-email");
    } catch (err: unknown) {
      setLoading(false);
      if (err instanceof Error) {
        // Handle specific Firebase errors
        switch (err.message) {
          case 'auth/email-already-in-use':
            setError("Email sudah terdaftar. Silakan gunakan email lain.");
            break;
          case 'auth/invalid-email':
            setError("Format email tidak valid.");
            break;
          case 'auth/weak-password':
            setError("Password terlalu lemah. Minimal 6 karakter.");
            break;
          default:
            setError(`Error: ${err.message}`);
        }
      } else {
        setError("Terjadi kesalahan saat membuat akun.");
      }
    }
  };

  return (
    <section className="flex justify-center items-center min-h-screen max-w-7xl mx-auto">
      <div className="max-w-md w-full p-6">
        <h2 className="text-4xl font-bold mb-2">Daftar yak!</h2>
        <h2 className="text-base mb-6 text-neutral-400">
          Daftar gratis aman ga ada duit keluar
        </h2>
        {error && <div className="text-red-500 text-center mb-4">{error}</div>}

        <form onSubmit={handleSignUp} className="space-y-4">
          <input
            type="text"
            placeholder="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full p-3 border rounded-lg"
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 border rounded-lg"
            required
          />

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border rounded-lg"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
            >
              {showPassword ? <EyeOff /> : <Eye />}
            </button>
          </div>

          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-3 border rounded-lg"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
            >
              {showConfirmPassword ? <EyeOff /> : <Eye />}
            </button>
          </div>

          <Button
            type="submit"
            size="lg"
            className={`w-full ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-[#1B3C53] hover:bg-[#456882]"
            } text-white cursor-pointer`}
            disabled={loading}
          >
            {loading ? "Signing Up..." : "Sign Up"}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </form>

        <div className="text-center mt-4 text-sm text-gray-600">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-[#1B3C53] hover:underline">
            Login
          </Link>
        </div>
      </div>
      <Toaster />
    </section>
  );
}
