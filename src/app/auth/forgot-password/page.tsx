"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Send } from "lucide-react"
import { sendPasswordResetEmail } from "firebase/auth"
import { FirebaseError } from "firebase/app"
import { toast } from "sonner"

import { auth } from "@/lib/firebase"
import { Toaster } from "@/components/ui/sonner"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [statusMessage, setStatusMessage] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!email.trim()) {
      setError("Email wajib diisi.")
      return
    }

    setError("")
    setStatusMessage("")
    setLoading(true)

    try {
      await sendPasswordResetEmail(auth, email.trim())
      const message = "Link reset password sudah kami kirim ke email kamu."
      setStatusMessage(message)
      toast.success(message)
      setEmail("")
    } catch (err) {
      if (err instanceof FirebaseError) {
        switch (err.code) {
          case "auth/invalid-email":
            setError("Format email tidak valid.")
            break
          case "auth/user-not-found":
            setError("Email tidak terdaftar di sistem kami.")
            break
          case "auth/too-many-requests":
            setError("Terlalu banyak percobaan. Coba lagi nanti.")
            break
          default:
            setError("Gagal mengirim email reset. Silakan coba lagi.")
        }
      } else if (err instanceof Error) {
        setError(err.message)
      } else {
        setError("Terjadi kesalahan yang tidak diketahui.")
      }
      toast.error("Gagal mengirim email reset password.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="flex justify-center items-center min-h-screen px-6 py-8">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold">Reset Password</h1>
          <p className="text-sm text-muted-foreground">
            Masukkan email yang kamu gunakan untuk akun ini. Kami akan kirim link reset password.
          </p>
        </div>

        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}
        {statusMessage && (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {statusMessage}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-medium text-foreground" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-lg border bg-transparent px-3 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B3C53]"
            placeholder="kamu@email.com"
          />
          <Button
            type="submit"
            className="flex w-full items-center justify-center gap-2 bg-[#1B3C53] hover:bg-[#456882]"
            disabled={loading}
          >
            {loading ? "Mengirim..." : "Kirim Link Reset"}
            <Send className="h-5 w-5" />
          </Button>
        </form>

        <div className="flex flex-col gap-2 text-sm text-muted-foreground">
          <Link href="/auth/login" className="inline-flex items-center justify-center gap-2 text-[#1B3C53] hover:underline">
            <ArrowLeft className="h-4 w-4" />
            Kembali ke halaman login
          </Link>
          <span className="text-center">
            Belum punya akun?{" "}
            <Link href="/auth/register" className="text-[#1B3C53] hover:underline">
              Daftar sekarang
            </Link>
          </span>
        </div>
      </div>
      <Toaster />
    </section>
  )
}
