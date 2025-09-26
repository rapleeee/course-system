"use client"

import { motion } from "framer-motion"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { learningPaths } from "@/data/learning-paths"
import Navbar from "@/components/layouts/Navbar"

export default function RoadmapPage() {
  return (
    <>
    <Navbar />
    <div className="bg-white dark:bg-neutral-950">
      <section className="relative overflow-hidden py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center mb-16"
          >
            <h1 className="text-4xl sm:text-5xl font-bold mb-6 text-gray-900 dark:text-gray-100">
              Roadmap Belajar Mentora
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Telusuri silabus lengkap dari setiap jalur belajar. Klik salah satu roadmap untuk
              melihat detail modul, materi yang dipelajari, dan target yang akan kamu capai.
            </p>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-2">
            {learningPaths.map((path, index) => (
              <motion.article
                key={path.slug}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                className="h-full rounded-3xl border border-gray-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/70 p-8 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-5 border-b border-gray-200 dark:border-neutral-800 pb-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1B3C53]/10 dark:bg-[#D2C1B6]/10">
                      <path.icon className="w-7 h-7 text-[#1B3C53] dark:text-[#D2C1B6]" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-[#1B3C53] dark:text-[#D2C1B6]">
                        {path.category}
                      </p>
                      <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                        {path.title}
                      </h2>
                      <p className="mt-3 max-w-md text-sm text-gray-600 dark:text-gray-300">
                        {path.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 text-sm">
                    <Badge
                      variant="secondary"
                      className="bg-[#1B3C53]/10 text-[#1B3C53] border-transparent dark:bg-[#D2C1B6]/10 dark:text-[#D2C1B6]"
                    >
                      {path.duration}
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="bg-[#1B3C53]/5 text-[#1B3C53] border-transparent dark:bg-[#D2C1B6]/10 dark:text-[#D2C1B6]"
                    >
                      {path.level}
                    </Badge>
                  </div>
                </div>

                <div className="mt-6 space-y-5">
                  {path.modules.slice(0, 2).map((module) => (
                    <div key={module.title} className="rounded-2xl bg-white/80 dark:bg-neutral-950/40 p-4">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {module.title}
                      </p>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                        {module.summary}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap gap-2">
                    {path.outcomes.slice(0, 2).map((outcome) => (
                      <Badge
                        key={outcome}
                        variant="outline"
                        className="border-[#1B3C53]/20 bg-white/60 text-[#1B3C53] dark:border-[#D2C1B6]/30 dark:bg-neutral-900/60 dark:text-[#D2C1B6]"
                      >
                        {outcome}
                      </Badge>
                    ))}
                    {path.outcomes.length > 2 ? (
                      <Badge
                        variant="outline"
                        className="border-dashed border-[#1B3C53]/20 bg-white/40 text-[#1B3C53] dark:border-[#D2C1B6]/30 dark:bg-neutral-900/40 dark:text-[#D2C1B6]"
                      >
                        +{path.outcomes.length - 2} manfaat lain
                      </Badge>
                    ) : null}
                  </div>
                  <Button
                    asChild
                    className="bg-[#1B3C53] hover:bg-[#456882] text-white dark:bg-[#D2C1B6] dark:text-neutral-900"
                  >
                    <Link href={`/roadmap/${path.slug}`} aria-label={`Lihat silabus ${path.title}`}>
                      Lihat Silabus
                    </Link>
                  </Button>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>
    </div>
    </>

  )
}
