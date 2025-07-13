"use client"

import React, { useEffect, useState } from "react"
import { useAuth } from "@/lib/useAuth"
import Layout from "@/components/layout"
import Link from "next/link"
import CardDashboard from "@/components/ui/CardDashboard"
import { db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"

type ProfileData = {
  name: string
  email: string
  level?: string
  description?: string
  photoURL?: string
  claimedCourses?: string[]
  claimedCertificates?: string[]
}

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [profile, setProfile] = useState<ProfileData | null>(null)

  useEffect(() => {
    if (user) {
      setIsAuthenticated(true)
      fetchProfile(user.uid)
    } else {
      setIsAuthenticated(false)
    }
  }, [user])

  const fetchProfile = async (uid: string) => {
    try {
      const docRef = doc(db, "users", uid)
      const docSnap = await getDoc(docRef)
      if (docSnap.exists()) {
        const data = docSnap.data() as ProfileData
        setProfile(data)
      }
    } catch (error) {
      console.error("Gagal mengambil data profil:", error)
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center">
        <p className="mb-2">You must be logged in to access this page. Redirecting...</p>
        <Link href="/auth/login" className="text-blue-500 hover:underline">
          Go to Login
        </Link>
      </div>
    )
  }

  const totalKelas = profile?.claimedCourses?.length || 0
  const totalSertifikat = profile?.claimedCertificates?.length || 0
  const ongoingCourses = totalKelas // diasumsikan semua kelas masih berjalan

  return (
    <Layout pageTitle="Dashboard">
      <main>
        <div className="mb-6">
          <h1 className="text-2xl">
            Halow, <span className="font-bold">{profile?.name || "User"}!</span>
          </h1>
          <p className="text-base text-neutral-500">Selamat datang di dasbor kamu.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <CardDashboard count={totalKelas} title="Total Kelas" />
          <CardDashboard count={ongoingCourses} title="Sedang Berjalan" />
          <CardDashboard count={totalSertifikat} title="Sertifikat" />
        </div>
      </main>
    </Layout>
  )
}