"use client"
import { AlignLeft, Phone, X, Home, BookOpen, Building2, Users, Route } from 'lucide-react'
import React, { useState, useEffect } from 'react'
import { ModeToggle } from '../ui/ModeToogle'
import Link from 'next/link'

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const menuItems = [
    { 
      name: 'Beranda', 
      href: '/', 
      icon: <Home className="w-6 h-6" />,
      description: 'Selamat datang di Mentora'
    },
    { 
      name: 'Daftar Program', 
      href: '/#program', 
      icon: <BookOpen className="w-6 h-6" />,
      description: 'Jelajahi program pembelajaran'
    },
    { 
      name: 'Roadmap Belajar', 
      href: '/roadmap', 
      icon: <Route className="w-6 h-6" />,
      description: 'Lihat silabus setiap jalur'
    },
    { 
      name: 'Kantor dan Sekolah', 
      href: '/navbars/location', 
      icon: <Building2 className="w-6 h-6" />,
      description: 'Lokasi kami'
    },
    { 
      name: 'Tentang Kami', 
      href: '/navbars/about', 
      icon: <Users className="w-6 h-6" />,
      description: 'Kenali kami lebih dekat'
    },
  ]

  const mobileMenu = (
    <div className={`
      fixed top-0 left-0 h-full w-80 bg-white dark:bg-neutral-950 shadow-xl 
      transform transition-transform duration-300 ease-in-out z-50
      ${isOpen ? 'translate-x-0' : '-translate-x-full'}
    `}>
      <div className="p-4 border-b dark:border-neutral-800">
        <button 
          onClick={() => setIsOpen(false)}
          className="flex items-center gap-2 p-2"
        >
          <X size={24} />
          <span className="text-lg ">Tutup</span>
        </button>
      </div>
      <div className="flex flex-col p-4 space-y-4">
        {menuItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            onClick={() => setIsOpen(false)}
            className="flex flex-col p-3 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <div className="flex items-center gap-3">
              {item.icon}
              <span className="font-semibold">{item.name}</span>
            </div>
            <span className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              {item.description}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )

  const desktopMenu = (
    <div className={`
      absolute w-full bg-white dark:bg-neutral-950 shadow-md transition-all duration-300 ease-in-out
      ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}
    `}>
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-5 gap-4 p-6">
          {menuItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className="flex flex-col items-center p-4 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-center"
            >
              {item.icon}
              <span className="font-semibold mt-2">{item.name}</span>
              <span className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                {item.description}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )

  if (!mounted) {
    return null
  }

  return (
     <div className="relative z-50">
      <div className="p-3 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mx-4 relative">
            <div className="absolute left-0 z-10">
              <button 
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 p-2 rounded-lg cursor-pointer "
              >
                {isOpen ? <X size={24} /> : <AlignLeft size={24} />}
                <span className="text-lg">
                  {isOpen ? 'Tutup' : 'Menu'}
                </span>
              </button>
            </div>

            <div className="flex-1 flex justify-center">
              <h1 className="font-bold text-xl sm:text-3xl md:text-3xl bg-clip-text">Mentora<span className="text-red-800">.</span></h1>
            </div>

            <div className="absolute right-0 z-10">
              <div className="flex items-center gap-2 cursor-pointer">
                <div className="hidden sm:block text-lg">Hubungi Kami</div>
                <Phone size={24} />
                <ModeToggle/>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="md:hidden">
        {mobileMenu}
        {isOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsOpen(false)}
          />
        )}
      </div>

      <div className="hidden md:block">
        {desktopMenu}
      </div>
    </div>
  )
}
