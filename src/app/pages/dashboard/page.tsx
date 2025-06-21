"use client"
import React, { useEffect, useState } from 'react'
import { useAuth } from '@/lib/useAuth'
import Layout from '@/components/layout'
import Link from 'next/link'

export default function DashboardPage() {
  const { user, loading } = useAuth()  // Menggunakan hook useAuth
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    if (user) {
      setIsAuthenticated(true)  // Set true jika sudah ada user yang login
    } else {
      setIsAuthenticated(false)  // Set false jika belum ada user
    }
  }, [user])

  if (loading) {
    return <div>Loading...</div>  // Loading state, tunggu hingga auth selesai diperiksa
  }

  if (!isAuthenticated) {
    // Redirect ke halaman login jika belum login
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>You must be logged in to access this page. Redirecting...</p>
        <Link href="/auth/login" className="te0 hover:underline">
          Go to Login
        </Link>
      </div>
    )
  }

  return (
    <Layout>
      <main className="p-8">
        <h1 className="text-3xl font-bold mb-4">Welcome to Your Dashboard</h1>
        <p className="text-lg mt-4">Here you can manage your account, view your programs, and more!</p>

        {/* Ringkasan Pengguna */}
        <div className="mt-6 mb-8">
          <div className=" p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold">Hello, {user?.fullname || "User"}!</h2>
            <p className="text-sm">Your account is active.</p>
            <Link href="/profile" className=" hover:underline">
              Edit Profile
            </Link>
          </div>
        </div>

        {/* Statistik Pengguna */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          <div className=" p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold">Programs Completed</h3>
            <p className="text-3xl font-bold">5</p>
          </div>
          <div className="b p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold">Ongoing Courses</h3>
            <p className="text-3xl font-bold">2</p>
          </div>
          <div className="bg p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold">Time Spent</h3>
            <p className="text-3xl font-bold">45 hours</p>
          </div>
        </div>

        {/* Section for Recent Activity or Notifications */}
        <div className="mt-12">
          <div className="p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold">Recent Activity</h3>
            <ul className="space-y-4">
              <li>
                <p className="font-semibold">Completed JavaScript Basics</p>
                <p className="text-sm text-gray-600">You successfully completed the JavaScript Basics course.</p>
              </li>
              <li>
                <p className="font-semibold">Joined React Group</p>
                <p className="text-sm text-gray-600">You joined the "Advanced React" study group.</p>
              </li>
            </ul>
          </div>
        </div>
      </main>
    </Layout>
  )
}