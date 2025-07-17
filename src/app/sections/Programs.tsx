"use client"
import { motion } from "framer-motion"
import { ArrowRight, BookOpen, Users, Clock, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function ProgramSection() {
  const programs = [
    {
      title: "Kelas TaCo",
      subtitle: "Tapak Coding",
      description: "Program kelas gratis untuk mengenal dunia coding dengan bimbingan mentor tiap minggu",
      features: [
        "1 sesi pembelajaran online",
        "1 sesi mentoring per minggu",
        "Akses materi seumur hidup",
        "Komunitas aktif",
        "Portfolio proyek"
      ],
      icon: <BookOpen className="w-8 h-8 text-[#F9F3EF]" />,
    },
    {
      title: "Kelas TaCo Pro",
      subtitle: "Taco Plus+",
      description: "Program kelas intensif untuk mempersiapkan karir di bidang teknologi",
      features: [
        "Pembelajaran mendalam",
        "Proyek nyata",
        "Sesi mentoring intensif",
        "Akses ke jaringan profesional",
        "Sertifikat kelulusan"
      ],
      icon: <Users className="w-8 h-8 text-neutral-600 dark:text-neutral-300" />,
      popular: true
    },
    {
      title: "Kelas TaCo Career",
      subtitle: "Career Path",
      description: "Program persiapan karir untuk lulusan yang ingin memasuki dunia kerja",
      features: [
        "Persiapan wawancara kerja",
        "Pengembangan soft skills",
        "Jaringan profesional",
        "Sesi coaching karir",
        "Dukungan pasca-kelas",
      ],
      icon: <Clock className="w-8 h-8 text-neutral-600 dark:text-neutral-300" />
    }
  ]

  return (
    <section id="program" className="py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold mb-4">
            Eksplor Program Unggulan Kami
          </h2>
          <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto text-lg">
            Pilih program yang sesuai dengan kebutuhan dan target kampus impianmu
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {programs.map((program, index) => (
            <motion.div
              key={program.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={cn(
                "relative bg-white dark:bg-neutral-800 rounded-xl shadow-md border border-gray-200 dark:border-neutral-700 ",
                program.popular && "ring-2 dark:ring-[#F9F3EF] ring-[#1B3C53]"
              )}
            >
              {program.popular && (
                <div className="absolute top-4 right-4">
                  <span className="px-3 py-1 text-xs font-semibold bg-[#1B3C53] text-[#F9F3EF] dark:text-[#1B3C53] dark:bg-[#F9F3EF] rounded-full">
                    Popular
                  </span>
                </div>
              )}
              <div className="p-8 border-b dark:border-neutral-700">
                <div className="w-16 h-16 bg-gray-50 dark:bg-neutral-700 rounded-xl flex items-center justify-center mb-4">
                  {program.icon}
                </div>
                <h3 className="text-2xl font-bold mb-1">{program.title}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">{program.subtitle}</p>
              </div>
              <div className="p-8">
                <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm">
                  {program.description}
                </p>
                <ul className="space-y-4 mb-8">
                  {program.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <Check className="w-4 h-4 text-[#F9F3EF]" />
                      <span className="text-gray-600 dark:text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  className="w-full bg-[#1B3C53] dark:bg-[#F9F3EF] dark:hover:bg-[#D2C1B6]/90 hover:bg-[#456882]/90 cursor-pointer"
                >
                  Daftar Sekarang
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}