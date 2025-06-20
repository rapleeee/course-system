"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { auth, createUserWithEmailAndPassword } from "@/lib/firebase";
import Link from "next/link";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export default function SignUpPage() {
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
      await createUserWithEmailAndPassword(auth, email, password);
      setLoading(false);

      toast.success("Pendaftaran berhasil! Silakan login.", {
        duration: 5000,
      });

      setTimeout(() => {
        window.location.href = "/auth/login";
      }, 2000);
    } catch (err: unknown) {
      setLoading(false);
      if (err instanceof Error) {
        setError(`Error creating account: ${err.message}`);
      } else {
        setError("Something went wrong while creating account.");
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
                : "bg-[#35bdbd] hover:bg-[#2a9b9b]"
            } text-white cursor-pointer`}
            disabled={loading}
          >
            {loading ? "Signing Up..." : "Sign Up"}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </form>

        <div className="text-center mt-4 text-sm text-gray-600">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-[#35bdbd] hover:underline">
            Login
          </Link>
        </div>
      </div>
      <Toaster />
    </section>
  );
}
