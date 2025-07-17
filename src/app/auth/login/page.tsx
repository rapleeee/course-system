"use client"
import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowRight, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { auth, googleProvider } from '@/lib/firebase'
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth'
import axios from 'axios'
import { toast } from 'sonner'
import { setCookie } from 'cookies-next'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [quote, setQuote] = useState('')
  const [author, setAuthor] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

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

const handleEmailLogin = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault()
  setLoading(true)

  try {
    await signInWithEmailAndPassword(auth, email, password)
    const token = await auth.currentUser?.getIdToken()
    if (token) {
      setCookie('token', token)
    }

    toast.success('Login successful!')
    setTimeout(() => {
      const isAdmin = auth.currentUser?.email === 'admin@gmail.com'
      window.location.href = isAdmin ? '/admin/dashboard' : '/pages/dashboard'
    }, 1500)
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
    try {
      await signInWithPopup(auth, googleProvider)
      toast.success('Login successful!')
      window.location.href = '/pages/dashboard' 
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error('Google login failed: ' + err.message)
        setError(err.message)
      }
    }
  }

  return (
    <section className="flex flex-col md:flex-row items-center min-h-screen w-full px-6 py-8 md:px-16 lg:px-24">
      <div className="w-full md:w-1/2 max-w-md mx-auto">
        <h2 className="text-4xl font-bold mb-2">Login dulu brok!</h2>
        <p className="text-base mb-6 text-neutral-400">Halow! Belajar biar makin jago ngodingnya</p>
        {error && <div className="text-red-500 text-center mb-4">{error}</div>}

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 border rounded-lg bg-transparent"
            required
          />
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border rounded-lg bg-transparent"
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
          <Button
            type="submit"
            size="lg"
            className="w-full bg-[#1B3C53] hover:bg-[#456882] text-white"
            disabled={loading}
          >
            {loading ? 'Logging In...' : 'Login'}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </form>

        <div className="text-center mt-4">Atau mau login pake</div>
        <Button onClick={handleGoogleLogin} size="lg" variant="outline" className="w-full mt-4">
          Login with Google
        </Button>

        <div className="text-center mt-4 text-sm text-gray-600">
          Don’t have an account?{' '}
          <Link href="/auth/register" className="text-[#1B3C53] hover:underline">Sign up</Link>
        </div>
      </div>

      <div className="w-full md:w-1/2 mt-10 md:mt-0 bg-[#1B3C53] p-8 rounded-lg text-white flex justify-center items-center min-h-[300px]">
        <div className="max-w-lg">
          <p className="text-2xl font-semibold mb-4">“{quote}”</p>
          <p className="text-lg">— {author}</p>
        </div>
      </div>
    </section>
  )
}