"use client"
import React from 'react'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center min-h-[calc(100vh-80px)] justify-center py-12 sm:py-16">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-4 text-center"
          >
            <h1 className="font-bold text-3xl sm:text-4xl md:text-5xl bg-clip-text">
              #AmbilLangkahPertama
            </h1>
            <h1 className="font-bold text-3xl sm:text-4xl md:text-5xl bg-clip-text">
              #KenalDuniaKampus
            </h1>
            <h1 className="font-bold text-3xl sm:text-4xl md:text-5xl bg-clip-text">
              #MahasiswaNextLevel
            </h1>
          </motion.div>

          {/* Description */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-8 max-w-3xl"
          >
            <p className="text-center text-lg sm:text-xl text-gray-600 dark:text-gray-300">
              Kampus Tutor adalah platform pembelajaran online yang menyediakan berbagai 
              program pendidikan berkualitas tinggi untuk meningkatkan keterampilan dan 
              pengetahuan Anda.
            </p>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-10 flex flex-col sm:flex-row gap-4"
          >
            <Button size="lg" className="bg-[#35bdbd] hover:bg-[#2a9b9b] text-white">
              Mulai Belajar
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline">
              Lihat Program
            </Button>
          </motion.div>

          {/* <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="mt-16 grid grid-cols-2 gap-8 sm:grid-cols-3 sm:gap-12"
          >
            {[
              { number: '1000+', label: 'Siswa Aktif' },
              { number: '50+', label: 'Mentor Berpengalaman' },
              { number: '100+', label: 'Program Tersedia' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold text-purple-600">{stat.number}</div>
                <div className="mt-1 text-gray-500 dark:text-gray-400">{stat.label}</div>
              </div>
            ))}
          </motion.div> */}
        </div>
      </div>
    </section>
  )
}