"use client"

import { useCallback, useEffect, useState } from "react"
import { ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"

function hasTokenCookie() {
  if (typeof document === "undefined") {
    return false
  }

  return document.cookie.split(";").some((cookie) => cookie.trim().startsWith("token="))
}

export function JoinClassButton() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    setIsLoggedIn(hasTokenCookie())
  }, [])

  const handleClick = useCallback(() => {
    const target = isLoggedIn ? "/pages/dashboard" : "/auth/login"
    window.location.href = target
  }, [isLoggedIn])

  return (
    <div className="mt-6 space-y-2">
      <Button
        onClick={handleClick}
        className="w-full bg-[#1B3C53] hover:bg-[#456882] text-white dark:bg-[#D2C1B6] dark:text-neutral-900"
      >
        {isLoggedIn ? "Lanjut ke Dashboard" : "Join kelas sekarang"}
        <ArrowRight className="ml-2 h-5 w-5" />
      </Button>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {isLoggedIn
          ? "Kami akan membuka dashboard belajarmu."
          : "Login terlebih dahulu jika belum memiliki akun."}
      </p>
    </div>
  )
}
