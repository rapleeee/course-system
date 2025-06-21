"use client"
import React, { useState, useEffect } from 'react'
import { useAuth } from '@/lib/useAuth'
import Layout from '@/components/layout'
import Link from 'next/link'

export default function SettingsPage() {
  const { user, loading } = useAuth() // Menggunakan useAuth untuk mengecek user
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Melakukan pengecekan status autentikasi ketika komponen di-mount
  useEffect(() => {
    if (user) {
      setIsAuthenticated(true); // Jika ada user, berarti sudah login
    } else {
      setIsAuthenticated(false); // Jika tidak ada user, anggap belum login
    }
  }, [user]);

  // Menampilkan loading atau halaman login jika belum autentikasi
  if (loading) {
    return <div>Loading...</div>; // Tampilkan loading jika status autentikasi sedang dicek
  }

  if (!isAuthenticated) {
    // Jika belum login, redirect ke halaman login
     return (
      <div className="flex justify-center items-center min-h-screen">
        <p>You must be logged in to access this page. Redirecting...</p>
        <Link href="/auth/login" className="text-blue-500 hover:underline">
          Go to Login
        </Link>
      </div>
    )
  }

  return (
    <Layout>
      <h1>Settings Page</h1>
      <p>Welcome to the Settings page. You can edit your preferences here.</p>
    </Layout>
  );
}