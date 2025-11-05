"use client"
import React, { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { auth, db, googleProvider, RecaptchaVerifier, signInWithPhoneNumber } from '@/lib/firebase'
import { onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import axios from 'axios'
import { toast } from 'sonner'
import { deleteCookie, setCookie } from 'cookies-next'
import { ensureUserProfile } from '@/lib/user-profile'
import type { ConfirmationResult } from 'firebase/auth'

export default function LoginPage() {
  const router = useRouter()
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [error, setError] = useState('')
  const [quote, setQuote] = useState('')
  const [author, setAuthor] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [phoneLoading, setPhoneLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string; phone?: string; otp?: string }>({})
  const [showPassword, setShowPassword] = useState(false)
  const confirmationResultRef = useRef<ConfirmationResult | null>(null)
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null)

  useEffect(() => {
    return () => {
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear()
        recaptchaVerifierRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (authMethod !== 'phone') {
      setError('')
      setPhoneNumber('')
      setOtp('')
      setOtpSent(false)
      setPhoneLoading(false)
      setFieldErrors((prev) => ({
        ...prev,
        phone: undefined,
        otp: undefined,
      }))
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear()
        recaptchaVerifierRef.current = null
      }
      return
    }

    if (typeof window === 'undefined') return
    if (recaptchaVerifierRef.current) return

    try {
      const verifier = new RecaptchaVerifier(auth, 'phone-sign-in-recaptcha', {
        size: 'invisible',
        callback: () => {},
        'expired-callback': () => {
          recaptchaVerifierRef.current?.clear()
          recaptchaVerifierRef.current = null
        },
      })
      recaptchaVerifierRef.current = verifier
      verifier.render().catch(() => {
        recaptchaVerifierRef.current = null
      })
    } catch (recaptchaErr) {
      console.error('Failed to initialize reCAPTCHA verifier:', recaptchaErr)
      recaptchaVerifierRef.current = null
    }
  }, [authMethod])

  const resolveDestination = async (currentUser: typeof auth.currentUser | null) => {
    if (!currentUser) return '/auth/login'
    const adminEmail = currentUser.email === 'admin@gmail.com'
    if (adminEmail) return '/admin/dashboard'
    try {
      const snap = await getDoc(doc(db, 'users', currentUser.uid))
      if (snap.exists()) {
        const data = snap.data() as { role?: string; roles?: string[] } | undefined
        const roles = Array.isArray(data?.roles) ? data?.roles : []
        const role = data?.role
        if (role === 'admin' || role === 'guru' || roles.includes('admin') || roles.includes('guru')) {
          return '/admin/dashboard'
        }
      }
    } catch (err) {
      console.error('Failed to resolve user role:', err)
    }
    return '/pages/dashboard'
  }

  useEffect(() => {
    const fetchQuote = async () => {
      try {
        const response = await axios.get('https://dummyjson.com/quotes/random')
        setQuote(response.data.quote)
        setAuthor(response.data.author)
      } catch (err) {
        console.error('Error fetching quote:', err)
      }
    }
    fetchQuote()
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        deleteCookie('token')
        return
      }

      const token = await currentUser.getIdToken()
      if (token) {
        setCookie('token', token, { maxAge: 60 * 60 * 24 * 7, path: '/' })
      }

      if (typeof window !== 'undefined' && window.location.pathname === '/auth/login') {
        const destination = await resolveDestination(currentUser)
        router.replace(destination)
      }
    })

    return () => unsubscribe()
  }, [router])

  const normalizePhoneNumber = (value: string) => {
    const digitsOnly = value.replace(/\D/g, '')
    if (!digitsOnly) return ''
    if (value.trim().startsWith('+')) {
      return `+${digitsOnly}`
    }
    if (digitsOnly.startsWith('62')) {
      return `+${digitsOnly}`
    }
    if (digitsOnly.startsWith('0')) {
      return `+62${digitsOnly.slice(1)}`
    }
    return `+${digitsOnly}`
  }

  const ensureRecaptcha = async () => {
    if (typeof window === 'undefined') return null
    if (!recaptchaVerifierRef.current) {
      try {
        const verifier = new RecaptchaVerifier(auth, 'phone-sign-in-recaptcha', {
          size: 'invisible',
          callback: () => {},
          'expired-callback': () => {
            recaptchaVerifierRef.current?.clear()
            recaptchaVerifierRef.current = null
          },
        })
        recaptchaVerifierRef.current = verifier
        await verifier.render()
      } catch (recaptchaErr) {
        console.error('Failed to initialize reCAPTCHA verifier:', recaptchaErr)
        recaptchaVerifierRef.current = null
      }
    }
    return recaptchaVerifierRef.current
  }

  const sendOtp = async () => {
    const formatted = normalizePhoneNumber(phoneNumber)
    if (!formatted) {
      setFieldErrors((prev) => ({ ...prev, phone: 'Nomor telepon wajib diisi.' }))
      setError('Periksa nomor telepon kamu.')
      return
    }
    if (formatted.length < 10) {
      setFieldErrors((prev) => ({ ...prev, phone: 'Nomor telepon terlihat tidak valid.' }))
      setError('Periksa nomor telepon kamu.')
      return
    }

    setFieldErrors((prev) => ({ ...prev, phone: undefined }))
    setError('')
    setPhoneLoading(true)

    try {
      const verifier = await ensureRecaptcha()
      if (!verifier) {
        throw new Error('Tidak dapat menginisialisasi verifikasi keamanan. Muat ulang halaman dan coba lagi.')
      }
      const confirmation = await signInWithPhoneNumber(auth, formatted, verifier)
      confirmationResultRef.current = confirmation
      setOtpSent(true)
      setOtp('')
      toast.success('Kode verifikasi telah dikirim melalui SMS.')
    } catch (err) {
      console.error('Failed to send verification code:', err)
      recaptchaVerifierRef.current?.clear()
      recaptchaVerifierRef.current = null
      let message = 'Gagal mengirim kode verifikasi.'
      if (err && typeof err === "object" && "code" in err) {
        const code = (err as { code?: string }).code
        switch (code) {
          case "auth/billing-not-enabled":
            message = "Fitur autentikasi telepon under miantenance. sabar ya!"
            break
          case "auth/too-many-requests":
            message = "Terlalu banyak percobaan. Coba lagi beberapa saat."
            break
          case "auth/invalid-phone-number":
            message = "Nomor telepon tidak valid. Periksa kembali formatnya."
            setFieldErrors((prev) => ({ ...prev, phone: "Nomor telepon tidak valid." }))
            break
          default:
            message = (err as { message?: string }).message || message
        }
      } else if (err instanceof Error) {
        message = err.message || message
      }
      setError(message)
      toast.error(message)
    } finally {
      setPhoneLoading(false)
    }
  }

  const verifyOtp = async () => {
    if (!otp.trim()) {
      setFieldErrors((prev) => ({ ...prev, otp: 'Masukkan kode verifikasi.' }))
      setError('Masukkan kode verifikasi yang kamu terima.')
      return
    }
    if (otp.trim().length < 4) {
      setFieldErrors((prev) => ({ ...prev, otp: 'Kode verifikasi minimal 4 digit.' }))
      setError('Kode verifikasi minimal 4 digit.')
      return
    }
    const confirmation = confirmationResultRef.current
    if (!confirmation) {
      setError('Kirim kode verifikasi terlebih dahulu.')
      return
    }

    setFieldErrors((prev) => ({ ...prev, otp: undefined }))
    setError('')
    setPhoneLoading(true)

    try {
      const credential = await confirmation.confirm(otp.trim())
      await ensureUserProfile(credential.user)
      const token = await credential.user.getIdToken()
      if (token) {
        setCookie('token', token, { maxAge: 60 * 60 * 24 * 7, path: '/' })
      }
      toast.success('Login successful!')
      const destination = await resolveDestination(credential.user)
      router.replace(destination)
    } catch (err) {
      console.error('Failed to verify code:', err)
      if (err instanceof Error) {
        setError(err.message || 'Kode verifikasi salah atau kedaluwarsa.')
        toast.error(err.message || 'Kode verifikasi salah atau kedaluwarsa.')
      } else {
        setError('Kode verifikasi salah atau kedaluwarsa.')
        toast.error('Kode verifikasi salah atau kedaluwarsa.')
      }
    } finally {
      setPhoneLoading(false)
    }
  }

  const handlePhoneSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (otpSent) {
      await verifyOtp()
    } else {
      await sendOtp()
    }
  }

  const handleResendOtp = async () => {
    await sendOtp()
  }

  const handleEmailLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const nextFieldErrors: { email?: string; password?: string; phone?: string; otp?: string } = {}
    if (!email.trim()) {
      nextFieldErrors.email = 'Email wajib diisi.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextFieldErrors.email = 'Format email tidak valid.'
    }
    if (!password.trim()) {
      nextFieldErrors.password = 'Password wajib diisi.'
    } else if (password.trim().length < 6) {
      nextFieldErrors.password = 'Minimal 6 karakter.'
    }
    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors)
      setError('Periksa kembali data yang kamu masukkan.')
      return
    }

    setFieldErrors({})
    setLoading(true)

    try {
      const credential = await signInWithEmailAndPassword(auth, email, password)
      await ensureUserProfile(credential.user)
      const token = await credential.user.getIdToken()
      if (token) {
        setCookie('token', token, { maxAge: 60 * 60 * 24 * 7, path: '/' })
      }

      toast.success('Login successful!')
      const destination = await resolveDestination(credential.user)
      router.replace(destination)
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error('Login failed: ' + err.message)
        setError(err.message)
      } else {
        toast.error('Unknown error occurred.')
        setError('Unknown error')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    try {
      const result = await signInWithPopup(auth, googleProvider)
      await ensureUserProfile(result.user)
      const token = await result.user.getIdToken()
      if (token) {
        setCookie('token', token, { maxAge: 60 * 60 * 24 * 7, path: '/' })
      }
      toast.success('Login successful!')
      const destination = await resolveDestination(result.user)
      router.replace(destination)
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error('Google login failed: ' + err.message)
        setError(err.message)
      }
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <section className="flex flex-col md:flex-row items-center min-h-screen w-full px-6 py-8 md:px-16 lg:px-24 gap-10">
      <div className="w-full md:w-1/2 max-w-lg mx-auto">
        <h2 className="text-4xl font-bold mb-2 text-foreground">Masuk ke akun kamu</h2>
        <p className="text-base mb-6 text-muted-foreground">
          Dapatkan akses ke kelas favorit, progres belajar, dan komunitas langsung setelah login.
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

        <div className="mb-6 grid grid-cols-2 gap-2 rounded-full bg-muted/40 p-1">
          <Button
            type="button"
            size="sm"
            variant={authMethod === 'email' ? 'default' : 'ghost'}
            className={`w-full rounded-full ${authMethod === 'email' ? 'shadow-sm' : ''}`}
            onClick={() => setAuthMethod('email')}
          >
            Email
          </Button>
          <Button
            type="button"
            size="sm"
            variant={authMethod === 'phone' ? 'default' : 'ghost'}
            className={`w-full rounded-full ${authMethod === 'phone' ? 'shadow-sm' : ''}`}
            onClick={() => setAuthMethod('phone')}
          >
            Nomor telepon
          </Button>
        </div>

        {authMethod === 'email' ? (
          <form onSubmit={handleEmailLogin} className="space-y-4" noValidate>
            <input
              type="email"
              placeholder="Email"
              value={email}
              autoComplete="email"
              onChange={(e) => {
                setEmail(e.target.value)
                if (fieldErrors.email) {
                  setFieldErrors((prev) => ({ ...prev, email: undefined }))
                }
              }}
              className={`w-full p-3 border rounded-lg bg-transparent transition focus:outline-none focus:ring-2 focus:ring-primary ${
                fieldErrors.email ? 'border-destructive focus:ring-destructive/40' : 'border-border/60'
              }`}
              required
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? 'email-error' : undefined}
            />
            {fieldErrors.email && (
              <p id="email-error" className="text-sm text-destructive">
                {fieldErrors.email}
              </p>
            )}
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                autoComplete="current-password"
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (fieldErrors.password) {
                    setFieldErrors((prev) => ({ ...prev, password: undefined }))
                  }
                }}
                className={`w-full p-3 border rounded-lg bg-transparent transition focus:outline-none focus:ring-2 focus:ring-primary ${
                  fieldErrors.password ? 'border-destructive focus:ring-destructive/40' : 'border-border/60'
                }`}
                required
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? 'password-error' : undefined}
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
            <div className="flex justify-end text-sm">
              <Link href="/auth/forgot-password" className="text-[#1B3C53] hover:underline">
                Lupa password?
              </Link>
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
                  Masuk
                  <ArrowRight className="h-5 w-5" />
                </span>
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={handlePhoneSubmit} className="space-y-4" noValidate>
            <input
              type="tel"
              placeholder="Nomor telepon (mis. 0812 3456 7890)"
              value={phoneNumber}
              autoComplete="tel"
              onChange={(e) => {
                setPhoneNumber(e.target.value)
                if (fieldErrors.phone) {
                  setFieldErrors((prev) => ({ ...prev, phone: undefined }))
                }
              }}
              className={`w-full p-3 border rounded-lg bg-transparent transition focus:outline-none focus:ring-2 focus:ring-primary ${
                fieldErrors.phone ? 'border-destructive focus:ring-destructive/40' : 'border-border/60'
              }`}
              required
              aria-invalid={Boolean(fieldErrors.phone)}
              aria-describedby={fieldErrors.phone ? 'phone-error' : undefined}
            />
            {fieldErrors.phone && (
              <p id="phone-error" className="text-sm text-destructive">
                {fieldErrors.phone}
              </p>
            )}

            {otpSent && (
              <>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="Kode verifikasi"
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value)
                    if (fieldErrors.otp) {
                      setFieldErrors((prev) => ({ ...prev, otp: undefined }))
                    }
                  }}
                  className={`w-full p-3 border rounded-lg bg-transparent transition focus:outline-none focus:ring-2 focus:ring-primary ${
                    fieldErrors.otp ? 'border-destructive focus:ring-destructive/40' : 'border-border/60'
                  }`}
                  aria-invalid={Boolean(fieldErrors.otp)}
                  aria-describedby={fieldErrors.otp ? 'otp-error' : undefined}
                />
                {fieldErrors.otp && (
                  <p id="otp-error" className="text-sm text-destructive">
                    {fieldErrors.otp}
                  </p>
                )}
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Belum menerima kode?</span>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    className="font-medium text-[#1B3C53] hover:underline disabled:opacity-50"
                    disabled={phoneLoading}
                  >
                    Kirim ulang
                  </button>
                </div>
              </>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full bg-[#1B3C53] hover:bg-[#456882] text-white"
              disabled={phoneLoading}
            >
              {phoneLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Memproses...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  {otpSent ? 'Masuk dengan kode' : 'Kirim kode'}
                  <ArrowRight className="h-5 w-5" />
                </span>
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              Kami akan mengirim SMS untuk verifikasi. Tarif operator mungkin berlaku.
            </p>
          </form>
        )}

        <div className="text-center mt-6 text-sm text-muted-foreground">Atau masuk dengan</div>
        <Button
          onClick={handleGoogleLogin}
          size="lg"
          variant="outline"
          className="w-full mt-3"
          disabled={googleLoading}
        >
          {googleLoading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Menghubungkan...
            </span>
          ) : (
            'Login dengan Google'
          )}
        </Button>

        <p className="mt-3 text-center text-xs text-muted-foreground">
          Dengan masuk kamu menyetujui penggunaan cookies dan{' '}
          <Link href="/pages/settings#privacy" className="underline">
            kebijakan privasi Mentora
          </Link>.
        </p>

        <div className="text-center mt-6 text-sm text-muted-foreground">
          Belum punya akun?{' '}
          <Link href="/auth/register" className="text-[#1B3C53] hover:underline">Daftar sekarang</Link>
        </div>

        <div id="phone-sign-in-recaptcha" className="hidden" />
      </div>

      <div className="w-full md:w-1/2 mt-10 md:mt-0">
        <div className="bg-[#1B3C53] text-white rounded-2xl p-8 md:p-10 flex flex-col justify-between min-h-[260px] shadow-lg">
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.35em] text-white/60">Motivasi Hari Ini</p>
            <p className="text-2xl font-semibold leading-relaxed">
              “{quote || 'Semangat belajar, tiap baris kode mendekatkan kamu ke impian.'}”
            </p>
          </div>
          <p className="pt-6 text-sm text-white/80">
            — {author || 'Tim Mentora'}
          </p>
        </div>
      </div>
    </section>
  )
}
