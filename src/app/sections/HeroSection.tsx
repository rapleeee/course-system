"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden" aria-labelledby="hero-heading">
      <div className="mx-auto flex min-h-[calc(100vh-80px)] max-w-7xl flex-col items-center justify-center px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-4 text-center"
        >
          <h1 id="hero-heading" className="text-3xl font-bold leading-tight sm:text-4xl md:text-5xl">
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
          <p className="text-center text-lg text-gray-600 dark:text-gray-300 sm:text-xl">
            Mentora adalah platform belajar coding menyenangkan dan mudah, berkolaborasi dengan
            <span className="font-semibold"> SMK Pesat</span>, dengan sistem modular dan gamifikasi. Program utama kami adalah
            <span className="rounded-lg bg-[#D2C1B6] px-2 font-bold text-[#1B3C53] dark:bg-[#1B3C53] dark:text-[#D2C1B6]"> Kelas TaCo</span>,
            yang ngebimbing kamu dari baris kode pertama sampai siap kerja.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-10 flex flex-col gap-4 sm:flex-row"
        >
          <Button asChild size="lg" className="cursor-pointer bg-[#1B3C53] text-white hover:bg-[#456882]">
            <Link href="/auth/login" aria-label="Mulai belajar dengan masuk atau daftar akun">
              Mulai Belajar
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="cursor-pointer bg-[#D2C1B6] text-[#1B3C53] hover:bg-[#c9b19f] dark:bg-[#1B3C53] dark:text-[#D2C1B6] dark:hover:bg-[#244665]"
          >
            <Link href="/#program" aria-label="Lihat program yang tersedia">
              Lihat Program
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
