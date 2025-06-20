"use client"
import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowRight, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link' 
import { auth, googleProvider } from '@/lib/firebase'
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth'
import axios from 'axios'
import { toast } from 'sonner'  

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

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await signInWithEmailAndPassword(auth, email, password)
      setLoading(false)

      toast.success('Login successful!', {
        duration: 5000,
      })

      setTimeout(() => {
        window.location.href = '/pages/dashboard'
      }, 2000)
    } catch (err: unknown) {
      if(err instanceof Error) {
        setLoading(false)
        setError('Hayoo! Login gagal, coba lagi. cek email dan password kamu')
        toast.error('Login failed: ' + err.message, {
        duration: 5000,
      })
      }
      
    }
  }

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider)
      toast.success('Login successful!', {
        duration: 5000,
      })
      window.location.href = '/dashboard'
    } catch (err: unknown) {
      if (err instanceof Error) {
          setError('Login failed: ' + err.message)
          toast.error('Login failed: ' + err.message, { duration: 5000 })
        } else {
          setError('An unknown error occurred')
        }
      }
  }

  return (
    <section className="flex items-center min-h-screen max-w-7xl mx-auto">
      <div className="max-w-md w-full p-6">
        <h2 className="text-4xl font-bold mb-2">Login dulu brok!</h2>
        <h2 className="text-base mb-6 text-neutral-400">Halow! Belajar biar makin jago ngodingnya</h2>
        {error && <div className="text-red-500 text-center mb-4">{error}</div>}

        <form onSubmit={handleEmailLogin} className="space-y-4">
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
          <Button type="submit" size="lg" className="w-full bg-[#35bdbd] hover:bg-[#2a9b9b] text-white cursor-pointer" disabled={loading}>
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
          <Link href="/auth/register" className="text-[#35bdbd] hover:underline">
             Sign up
          </Link>
        </div>
      </div>
      <div className="flex-1 bg-[#2a9b9b] p-8 rounded-lg text-white flex justify-center items-center">
        <div className=" max-w-lg">
          <p className="text-2xl font-semibold mb-4">"{quote}"</p> 
          <p className="text-lg">-{author}</p>
        </div>
      </div>
    </section>
  )
}