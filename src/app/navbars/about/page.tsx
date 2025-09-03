"use client";
import Navbar from "@/components/layouts/Navbar";
import Image from "next/image";
import Link from "next/link";
import {
  GraduationCap,
  BadgeCheck,
  Building2,
  Code2,
  Cpu,
  Palette,
  ArrowRightCircle,
} from "lucide-react";

export default function AboutPage() {
  const tracks = [
    {
      title: "RPL (Rekayasa Perangkat Lunak)",
      desc: "Fundamental hingga advanced untuk software engineering modern: web, API, dan best practice.",
      Icon: Code2,
    },
    {
      title: "TKJ (Teknik Komputer & Jaringan)",
      desc: "Jaringan, server, cloud dasar, dan keamanan—siap pakai di industri.",
      Icon: Cpu,
    },
    {
      title: "DKV (Desain Komunikasi Visual)",
      desc: "Branding, UI/UX dasar, motion & publikasi kreatif untuk sosial media.",
      Icon: Palette,
    },
  ] as const;

  const stats = [
    { label: "Mentor tersertifikasi", value: "10+" },
    { label: "Alumni terserap industri", value: "50+" },
    { label: "Siswa aktif", value: "100+" },
    { label: "Mitra industri", value: "10+" },
  ] as const;

  return (
    <>
      <Navbar />
      <div className="min-h-screen mt-16 flex flex-col items-center px-6 md:px-10">
        <div className="max-w-5xl w-full text-left sm:text-center">
          <h1 className="mt-3 text-3xl sm:text-5xl font-extrabold tracking-tight">
            <span className="text-[#1d857c] bg-[#f5bb64] px-1 py-0.5">Mentora</span> — Platform Belajar Tech
          </h1>
          <p className="text-neutral-300 text-base sm:text-lg mt-4">
            Mentora adalah platform belajar teknologi dengan fokus RPL, TKJ, dan DKV. Kami terafiliasi dengan SMK Pesat ITXPRO dan
            didukung pengajar bersertifikasi untuk pembelajaran yang relevan dengan industri.
          </p>
          <div className="mt-6">
            <Image
              src="/photos/working.jpg"
              alt="Sesi pembelajaran Mentora: mentor menjelaskan materi ke siswa"
              width={1200}
              height={600}
              sizes="(max-width: 768px) 100vw, 800px"
              className="rounded-xl shadow-lg w-full h-auto object-cover"
              priority
            />
          </div>
        </div>

        <section className="max-w-5xl w-full my-10 grid md:grid-cols-5 gap-6" aria-labelledby="about-highlights">
          <h2 id="about-highlights" className="sr-only">Sorotan Mentora</h2>
          <div className="md:col-span-3 space-y-6">
            <article className="rounded-xl border border-neutral-700/60 bg-neutral-800/60 backdrop-blur-sm shadow-md overflow-hidden">
              <header className="px-5 sm:px-6 pt-5 sm:pt-6">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <GraduationCap aria-hidden className="h-5 w-5 text-[#f5bb64]" /> Pembelajaran Berbasis Industri
                </h3>
              </header>
              <div className="p-5 sm:p-6 text-neutral-200">
                <p>
                  Kurikulum disusun praktis dan berjenjang, mengedepankan project-based learning serta pembiasaan workflow profesional
                  agar siswa siap terjun ke dunia kerja atau melanjutkan studi.
                </p>
              </div>
            </article>

            <article className="rounded-xl border border-neutral-700/60 bg-neutral-800/60 backdrop-blur-sm shadow-md overflow-hidden">
              <header className="px-5 sm:px-6 pt-5 sm:pt-6">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Building2 aria-hidden className="h-5 w-5 text-[#f5bb64]" /> Afiliasi Resmi
                </h3>
              </header>
              <div className="p-5 sm:p-6 text-neutral-200">
                <p>
                  Mentora terafiliasi dengan <span className="font-semibold text-white">SMK Pesat ITXPRO</span>, memperkuat ekosistem pembelajaran dan kesempatan kolaborasi
                  dengan tenaga pendidik dan fasilitas sekolah.
                </p>
              </div>
            </article>

            <article className="rounded-xl border border-neutral-700/60 bg-neutral-800/60 backdrop-blur-sm shadow-md overflow-hidden">
              <header className="px-5 sm:px-6 pt-5 sm:pt-6">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <BadgeCheck aria-hidden className="h-5 w-5 text-[#f5bb64]" /> Mentor Tersertifikasi
                </h3>
              </header>
              <div className="p-5 sm:p-6 text-neutral-200">
                <p>
                  Pengajar berpengalaman dan tersertifikasi memastikan materi tepat sasaran, dengan bimbingan personal dan review berkala.
                </p>
              </div>
            </article>
          </div>

          <aside className="md:col-span-2 space-y-4" aria-label="Statistik dan CTA">
            <div className="grid grid-cols-2 gap-4">
              {stats.map((s) => (
                <div key={s.label} className="rounded-xl border border-neutral-700/60 bg-neutral-800/60 p-4">
                  <div className="text-2xl font-bold text-white">{s.value}</div>
                  <div className="text-xs text-neutral-400 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
            <div>
              <Link
                href="/navbars/career"
                className="inline-flex items-center gap-2 rounded-lg border border-[#f5bb64] px-4 py-2 text-sm font-semibold text-white hover:bg-[#f5bb64] hover:text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f5bb64] focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 transition-colors"
                aria-label="Lihat peluang bergabung di Mentora"
              >
                Lihat Peluang — Careers
                <ArrowRightCircle aria-hidden className="h-4 w-4" />
              </Link>
            </div>
          </aside>
        </section>

        <section className="max-w-5xl w-full my-10" aria-labelledby="track-heading">
          <h2 id="track-heading" className="text-2xl sm:text-3xl font-bold text-white mb-6 text-left sm:text-center">
            Jalur Belajar Utama
          </h2>
          <ul className="grid md:grid-cols-3 gap-6">
            {tracks.map(({ title, desc, Icon }) => (
              <li key={title}>
                <article className="h-full rounded-xl border border-neutral-700/60 bg-neutral-800/60 backdrop-blur-sm shadow-md p-5 sm:p-6">
                  <div className="flex items-center gap-2 text-white font-semibold">
                    <Icon aria-hidden className="h-5 w-5 text-[#f5bb64]" /> {title}
                  </div>
                  <p className="text-sm text-neutral-300 mt-2">{desc}</p>
                </article>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
