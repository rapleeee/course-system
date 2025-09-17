"use client"
import React from 'react'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import Link from 'next/link'

export default function HeroSection() {

  return (
    <section className="relative overflow-hidden " aria-labelledby="hero-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center min-h-[calc(100vh-80px)] justify-center py-12 sm:py-16">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-4 text-center"
          >
            <h1 id="hero-heading" className="font-bold text-3xl sm:text-4xl md:text-5xl bg-clip-text leading-tight">
              <span className="block">#JagoBeneran</span>
              <span className="block">#KenalDuniaKerja</span>
              <span className="block">#ProgrammerNextLevel</span>
            </h1>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-8 max-w-3xl"
          >
            <p className="text-center text-lg sm:text-xl text-gray-600 dark:text-gray-300">
              Mentora adalah platform belajar coding menyenangkan dan mudah, berkolaborasi dengan <span className="font-semibold">SMK Pesat</span>,
              dengan sistem modular dan gamifikasi. Program utama kami adalah <span className="font-bold bg-[#D2C1B6] dark:bg-[#1B3C53] rounded-lg px-2 text-[#1B3C53] dark:text-[#D2C1B6]">Kelas TaCo</span>,
              yang ngebimbing kamu dari baris kode pertama sampai siap kerja. 
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-10 flex flex-col sm:flex-row gap-4"
          >
            <Button 
              asChild
              size="lg" 
              className="bg-[#1B3C53] hover:bg-[#456882] text-white cursor-pointer"
            >
              <Link href="/auth/login" aria-label="Mulai belajar dengan masuk atau daftar akun">
                Mulai Belajar
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className='cursor-pointer bg-[#D2C1B6] hover:bg-[#D2C1B6]'>
              <Link href="/#program" aria-label="Lihat program yang tersedia">Lihat Program</Link>
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
