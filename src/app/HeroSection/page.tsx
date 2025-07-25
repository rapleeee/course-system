"use client"
import React from 'react'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import Link from 'next/link'

export default function HeroSection() {

  return (
    <section className="relative overflow-hidden ">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center min-h-[calc(100vh-80px)] justify-center py-12 sm:py-16">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-4 text-center"
          >
            <h1 className="font-bold text-3xl sm:text-4xl md:text-5xl bg-clip-text">
              #JagoBeneran
            </h1>
            <h1 className="font-bold text-3xl sm:text-4xl md:text-5xl bg-clip-text">
              #KenalDuniaKerja
            </h1>
            <h1 className="font-bold text-3xl sm:text-4xl md:text-5xl bg-clip-text">
              #ProgrammerNextLevel
            </h1>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-8 max-w-3xl"
          >
            <p className="text-center text-lg sm:text-xl text-gray-600 dark:text-gray-300">
              Mentora adalah platform belajar coding menyenangkan dan mudah 
              dengan sistem modular dan gamifikasi. Program utama kami adalah<span className="font-bold bg-[#D2C1B6] dark:bg-[#1B3C53] rounded-lg px-2 text-[#1B3C53] dark:text-[#D2C1B6]">Kelas TaCo</span>, bakalan ngebimbing kamu dari baris code pertama sampai jadi programmer yang siap kerja. 
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-10 flex flex-col sm:flex-row gap-4"
          >
            <Link href="/auth/login">
              <Button 
                size="lg" 
                className="bg-[#1B3C53] hover:bg-[#456882] text-white cursor-pointer"
              >
                Mulai Belajar
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="#program">
              <Button size="lg" variant="outline" className='cursor-pointer bg-[#D2C1B6] hover:bg-[#D2C1B6]'>
                Lihat Program
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  )
}