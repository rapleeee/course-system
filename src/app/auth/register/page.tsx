"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
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
  const [fieldErrors, setFieldErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const benefits = [
    {
      title: "Kelas premium & live mentoring",
      description: "Akses kurikulum terkurasi dengan sesi langsung bersama mentor industri.",
    },
    {
      title: "Pengingat progres pintar",
      description: "Notifikasi otomatis agar kamu konsisten belajar hingga selesai.",
    },
    {
      title: "Komunitas & studi kasus nyata",
      description: "Diskusi bersama learner lain dan pecahkan tantangan dari project sungguhan.",
    },
  ];

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const nextErrors: {
      fullName?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
    } = {};

    if (!fullName.trim()) {
      nextErrors.fullName = "Nama lengkap wajib diisi.";
    } else if (fullName.trim().length < 3) {
      nextErrors.fullName = "Nama minimal 3 karakter.";
    }

    if (!email.trim()) {
      nextErrors.email = "Email wajib diisi.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = "Format email tidak valid.";
    }

    if (!password.trim()) {
      nextErrors.password = "Password wajib diisi.";
    } else if (password.length < 6) {
      nextErrors.password = "Password minimal 6 karakter.";
    }

    if (!confirmPassword.trim()) {
      nextErrors.confirmPassword = "Konfirmasi password wajib diisi.";
    } else if (password !== confirmPassword) {
      nextErrors.confirmPassword = "Konfirmasi password tidak sama.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setError("Periksa kembali data yang kamu isi.");
      return;
    }

    setFieldErrors({});
    setError("");
    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      await ensureUserProfile(user, { name: fullName.trim(), email: email.trim() });
      await sendEmailVerification(user);

      toast.success("Pendaftaran berhasil! Silakan cek email kamu untuk verifikasi.", { duration: 5000 });
      router.push("/auth/verify-email");
    } catch (err: unknown) {
      if (typeof err === "object" && err && "code" in err) {
        const code = (err as { code?: string }).code;
        switch (code) {
          case "auth/email-already-in-use":
            setFieldErrors((prev) => ({ ...prev, email: "Email ini sudah digunakan." }));
            setError("Email sudah terdaftar. Gunakan email lain atau masuk.");
            toast.error("Email sudah terdaftar.");
            break;
          case "auth/invalid-email":
            setFieldErrors((prev) => ({ ...prev, email: "Format email tidak valid." }));
            setError("Format email tidak valid.");
            toast.error("Format email tidak valid.");
            break;
          case "auth/weak-password":
            setFieldErrors((prev) => ({ ...prev, password: "Password terlalu lemah." }));
            setError("Password minimal 6 karakter.");
            toast.error("Password minimal 6 karakter.");
            break;
          default:
            setError("Terjadi kesalahan saat membuat akun. Coba lagi.");
            toast.error("Gagal membuat akun. Coba lagi.");
        }
      } else if (err instanceof Error) {
        setError(err.message || "Terjadi kesalahan saat membuat akun.");
        toast.error(err.message || "Terjadi kesalahan saat membuat akun.");
      } else {
        setError("Terjadi kesalahan saat membuat akun.");
        toast.error("Terjadi kesalahan saat membuat akun.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="flex flex-col md:flex-row items-center min-h-screen w-full px-6 py-10 md:px-16 lg:px-24 gap-10">
      <div className="w-full md:w-1/2 max-w-lg mx-auto">
        <h1 className="text-4xl font-bold text-foreground mb-2">Buat akun Mentora</h1>
        <p className="text-base text-muted-foreground mb-6">
          Gabung bersama ribuan learner lain dan mulai perjalanan karier barumu hari ini.
        </p>

        {error && (
          <div
            role="alert"
            aria-live="polite"
            className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSignUp} className="space-y-5" noValidate>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="fullName">
              Nama lengkap
            </label>
            <input
              id="fullName"
              type="text"
              placeholder="Masukkan nama lengkap"
              value={fullName}
              autoComplete="name"
              onChange={(e) => {
                setFullName(e.target.value)
                if (fieldErrors.fullName) {
                  setFieldErrors((prev) => ({ ...prev, fullName: undefined }))
                }
              }}
              className={`w-full rounded-lg border bg-transparent p-3 transition focus:outline-none focus:ring-2 focus:ring-primary ${
                fieldErrors.fullName ? 'border-destructive focus:ring-destructive/40' : 'border-border/60'
              }`}
              aria-invalid={Boolean(fieldErrors.fullName)}
              aria-describedby={fieldErrors.fullName ? 'fullName-error' : undefined}
              required
            />
            {fieldErrors.fullName && (
              <p id="fullName-error" className="text-sm text-destructive">
                {fieldErrors.fullName}
              </p>
            )}
          </div>

  <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="nama@email.com"
              value={email}
              autoComplete="email"
              onChange={(e) => {
                setEmail(e.target.value)
                if (fieldErrors.email) {
                  setFieldErrors((prev) => ({ ...prev, email: undefined }))
                }
              }}
              className={`w-full rounded-lg border bg-transparent p-3 transition focus:outline-none focus:ring-2 focus:ring-primary ${
                fieldErrors.email ? 'border-destructive focus:ring-destructive/40' : 'border-border/60'
              }`}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? 'email-error' : undefined}
              required
            />
            {fieldErrors.email && (
              <p id="email-error" className="text-sm text-destructive">
                {fieldErrors.email}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Minimal 6 karakter"
                value={password}
                autoComplete="new-password"
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (fieldErrors.password) {
                    setFieldErrors((prev) => ({ ...prev, password: undefined }))
                  }
                }}
                className={`w-full rounded-lg border bg-transparent p-3 transition focus:outline-none focus:ring-2 focus:ring-primary ${
                  fieldErrors.password ? 'border-destructive focus:ring-destructive/40' : 'border-border/60'
                }`}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-full p-1"
                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                aria-pressed={showPassword}
                title={showPassword ? "Sembunyikan password" : "Tampilkan password"}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>
            {fieldErrors.password && (
              <p id="password-error" className="text-sm text-destructive">
                {fieldErrors.password}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="confirmPassword">
              Konfirmasi password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Masukkan ulang password"
                value={confirmPassword}
                autoComplete="new-password"
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  if (fieldErrors.confirmPassword) {
                    setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }))
                  }
                }}
                className={`w-full rounded-lg border bg-transparent p-3 transition focus:outline-none focus:ring-2 focus:ring-primary ${
                  fieldErrors.confirmPassword ? 'border-destructive focus:ring-destructive/40' : 'border-border/60'
                }`}
                aria-invalid={Boolean(fieldErrors.confirmPassword)}
                aria-describedby={fieldErrors.confirmPassword ? 'confirmPassword-error' : undefined}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-full p-1"
                aria-label={showConfirmPassword ? "Sembunyikan konfirmasi password" : "Tampilkan konfirmasi password"}
                aria-pressed={showConfirmPassword}
                title={showConfirmPassword ? "Sembunyikan konfirmasi password" : "Tampilkan konfirmasi password"}
              >
                {showConfirmPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>
            {fieldErrors.confirmPassword && (
              <p id="confirmPassword-error" className="text-sm text-destructive">
                {fieldErrors.confirmPassword}
              </p>
            )}
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full bg-[#1B3C53] hover:bg-[#456882] text-white"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Memproses...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                Daftar sekarang
                <ArrowRight className="h-5 w-5" />
              </span>
            )}
          </Button>

          <p className="text-xs text-muted-foreground">
            Dengan mendaftar, kamu menyetujui{' '}
            <Link href="/pages/settings" className="underline">
              ketentuan layanan
            </Link>{" "}
            dan{' '}
            <Link href="/pages/settings#privacy" className="underline">
              kebijakan privasi
            </Link>{" "}
            Mentora.
          </p>
        </form>

        <div className="text-center mt-6 text-sm text-muted-foreground">
          Sudah punya akun?{' '}
          <Link href="/auth/login" className="text-[#1B3C53] hover:underline">
            Masuk sekarang
          </Link>
        </div>
      </div>

      <div className="w-full md:w-1/2 mt-12 md:mt-0">
        <div className="rounded-2xl bg-[#1B3C53] text-white p-8 md:p-10 shadow-lg space-y-6">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/60">Kenapa gabung Mentora?</p>
            <h3 className="mt-3 text-2xl font-semibold leading-tight">
              Belajar terarah bersama mentor berpengalaman dan roadmap yang jelas.
            </h3>
          </div>
          <ul className="space-y-4">
            {benefits.map((benefit, index) => (
              <li key={index} className="flex items-start gap-3">
                <CheckCircle2 className="mt-1 h-5 w-5 text-emerald-300" />
                <div>
                  <p className="font-medium text-white">{benefit.title}</p>
                  <p className="text-sm text-white/80">{benefit.description}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="rounded-lg border border-white/20 bg-white/10 p-4 text-sm text-white/80 backdrop-blur">
            Sudah ada akun? Kamu bisa lanjutkan kelas kapan saja dari perangkat apa pun hanya dengan masuk menggunakan email terdaftar.
          </div>
        </div>
      </div>
      <Toaster />
    </section>
  );
}
