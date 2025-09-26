import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Clock, Flag, Layers } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { learningPaths } from "@/data/learning-paths"

import { JoinClassButton } from "./_components/JoinClassButton"

export function generateStaticParams() {
  return learningPaths.map((path) => ({ slug: path.slug }))
}

type PathParams = {
  slug: string
}

export default async function LearningPathPage({ params }: { params: Promise<PathParams> }) {
  const { slug } = await params
  const path = learningPaths.find((item) => item.slug === slug)

  if (!path) {
    notFound()
  }

  const VideoEmbed = path.videoId ? (
    <div className="aspect-video w-full overflow-hidden rounded-3xl border border-gray-200 bg-black dark:border-neutral-800">
      <iframe
        src={`https://www.youtube.com/embed/${path.videoId}`}
        title={`Introduction ${path.title}`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="h-full w-full"
      />
    </div>
  ) : (
    <div className="flex h-full min-h-[280px] w-full flex-col items-center justify-center rounded-3xl border border-dashed border-gray-300 bg-white dark:border-neutral-700 dark:bg-neutral-900">
      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Video pengantar segera hadir</p>
    </div>
  )

  return (
    <div className="bg-white dark:bg-neutral-950">
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10 flex items-center justify-between gap-4">
            <Link
              href="/roadmap"
              className="inline-flex items-center gap-2 text-sm font-medium text-[#1B3C53] hover:underline dark:text-[#D2C1B6]"
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali ke semua roadmap
            </Link>
            <div className="flex items-center gap-3 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              <span className="inline-flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {path.duration}
              </span>
              <span className="inline-flex items-center gap-2">
                <Layers className="h-4 w-4" />
                {path.modules.length} modul
              </span>
              <span className="hidden sm:inline-flex items-center gap-2">
                <Flag className="h-4 w-4" />
                {path.level}
              </span>
            </div>
          </div>

          <div className="grid gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start">
            <article className="space-y-8">
              <header className="flex flex-wrap items-start gap-6 rounded-3xl border border-gray-200 bg-neutral-50/80 p-8 dark:border-neutral-800 dark:bg-neutral-900/70">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1B3C53]/10 dark:bg-[#D2C1B6]/10">
                  <path.icon className="h-8 w-8 text-[#1B3C53] dark:text-[#D2C1B6]" />
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-[#1B3C53] dark:text-[#D2C1B6]">
                      {path.category}
                    </p>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                      {path.title}
                    </h1>
                  </div>
                  <p className="max-w-2xl text-base text-gray-600 dark:text-gray-300">
                    {path.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
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
              </header>

              <div className="space-y-8">
                {path.modules.map((module, index) => (
                  <div
                    key={module.title}
                    className="relative border-l border-dashed border-[#1B3C53]/30 pl-8 last:border-none"
                  >
                    <span className="absolute -left-[10px] top-2 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-[#1B3C53] text-xs font-semibold text-white shadow-md dark:border-neutral-950 dark:bg-[#D2C1B6] dark:text-neutral-900">
                      {index + 1}
                    </span>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                        {module.title}
                      </h2>
                      <span className="text-xs uppercase tracking-wide text-gray-400">
                        Phase {index + 1}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                      {module.summary}
                    </p>
                    <ul className="mt-4 grid gap-2 text-sm text-gray-600 dark:text-gray-300 sm:grid-cols-2">
                      {module.topics.map((topic) => (
                        <li key={topic} className="flex items-center gap-2">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#1B3C53] dark:bg-[#D2C1B6]" />
                          {topic}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="rounded-3xl border border-gray-200 bg-neutral-50/80 p-8 dark:border-neutral-800 dark:bg-neutral-900/70">
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                  Setelah lulus kamu akan mampu
                </h3>
                <ul className="mt-4 grid gap-3 text-sm text-gray-600 dark:text-gray-300 sm:grid-cols-2">
                  {path.outcomes.map((outcome) => (
                    <li key={outcome} className="flex items-center gap-3">
                      <span className="inline-block h-2 w-2 rounded-full bg-[#1B3C53] dark:bg-[#D2C1B6]" />
                      {outcome}
                    </li>
                  ))}
                </ul>
              </div>
            </article>

            <aside className="space-y-6 self-start lg:sticky lg:top-28">
              {VideoEmbed}
              <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                <h4 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Siap mulai belajar?
                </h4>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  Gabung kelas sekarang dan dapatkan akses mentor, komunitas, serta materi lengkap.
                </p>
                <JoinClassButton />
              </div>
              <div className="rounded-3xl border border-[#1B3C53]/20 bg-[#1B3C53]/10 p-6 text-[#1B3C53] shadow-sm dark:border-[#D2C1B6]/30 dark:bg-[#D2C1B6]/10 dark:text-[#1B3C53]">
                <h4 className="text-lg font-semibold">Lulus & Mau Jadi Mentor?</h4>
                <p className="mt-2 text-sm">
                  Kami rutin membuka peluang bagi alumni Mentora untuk gabung sebagai mentor, pengajar, atau tim pendukung.
                </p>
                <Button
                  asChild
                  size="sm"
                  className="mt-4 bg-white text-[#1B3C53] hover:bg-[#F9F3EF] dark:bg-neutral-900 dark:text-[#D2C1B6]"
                >
                  <Link href="/navbars/career">Lihat Kesempatan Karir</Link>
                </Button>
              </div>
              <div className="rounded-3xl border border-dashed border-[#1B3C53]/30 bg-[#1B3C53]/5 p-6 text-sm text-[#1B3C53] dark:border-[#D2C1B6]/30 dark:bg-[#D2C1B6]/10 dark:text-[#D2C1B6]">
                <p>
                  Belum yakin? Kamu bisa konsultasi dulu dengan mentor untuk menentukan jalur yang paling cocok.
                  Cukup kirim pesan lewat kanal favoritmu dan tim Mentora akan membantu menyusun rencana belajar.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </div>
  )
}
