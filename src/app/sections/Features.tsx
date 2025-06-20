"use client"
import { motion } from "framer-motion"
import { BookOpen, Users, Target, Award, CheckCircle } from "lucide-react"
import Image from "next/image"

export default function FeaturesSection() {
  const features = [
    {
      icon: <BookOpen className="w-12 h-12 text-[#35bdbd]" />,
      title: "Kurikulum Terstruktur",
      description: "Materi pembelajaran yang dirancang khusus untuk persiapan kuliah",
      benefits: [
        "Materi up-to-date",
        "Pembelajaran bertahap",
        "Latihan soal terkini"
      ]
    },
    {
      icon: <Users className="w-12 h-12 text-[#35bdbd]" />,
      title: "Mentor Berpengalaman",
      description: "Dibimbing oleh mentor yang ahli di bidangnya",
      benefits: [
        "Pendekatan gamifikasi",
        "Pengalaman 5+ tahun",
        "Tervalidasi industri"
      ]
    },
    {
      icon: <Target className="w-12 h-12 text-[#35bdbd]" />,
      title: "Pembelajaran Fokus",
      description: "Fokus pada jurusan yang sesuai dengan minat dan bakat",
      benefits: [
        "Kelas kecil",
        "Pendampingan intensif",
        "Evaluasi berkala"
      ]
    },
    {
      icon: <Award className="w-12 h-12 text-[#35bdbd]" />,
      title: "Memiliki Portfolio",
      description: "Mendapatkan portfolio yang dapat digunakan untuk melamar kerja",
      benefits: [
        "Diakui industri",
        "Portfolio profesional",
        "Pencapaian terukur"
      ]
    }
  ]

  const companies = [
    { name: "Gojek", logo: "/logos/gojek.png" },
    { name: "Tokopedia", logo: "/logos/tokopedia.png" },
    { name: "Traveloka", logo: "/logos/traveloka.webp" },
    { name: "Bukalapak", logo: "/logos/bukalapak.png" },
    { name: "Shopee", logo: "/logos/shopee.webp" },
    { name: "Dana", logo: "/logos/dana.png" },
    { name: "BCA", logo: "/logos/bca.png" },
    { name: "Mandiri", logo: "/logos/mandiri.png" },
  ]

  return (
    <section className="py-20 bg-gray-50 dark:bg-neutral-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl font-bold mb-4">Mengapa Memilih Kami?</h2>
          <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Kami menyediakan berbagai fitur untuk membantu persiapan kuliah Anda
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="p-6 bg-white dark:bg-neutral-800 rounded-xl shadow-lg hover:shadow-xl transition-shadow"
            >
              <div className="mb-4 bg-[#35bdbd]/10 p-3 rounded-lg inline-block">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">{feature.description}</p>
              <ul className="space-y-2">
                {feature.benefits.map((benefit, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <CheckCircle className="w-4 h-4 text-[#35bdbd]" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h3 className="text-2xl font-bold mb-4">
            Alumni Kami Bekerja di Perusahaan Terkemuka
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            Alumni kami bekerja di perusahaan terkemuka
          </p>
        </motion.div>
        <div className="relative overflow-hidden">
          <div className="flex space-x-12 animate-scroll">
            {[...companies, ...companies].map((company, index) => (
              <div
                key={index}
                className="flex-shrink-0 w-32 h-12 grayscale hover:grayscale-0 transition-all"
              >
                <Image
                  src={company.logo}
                  alt={company.name}
                  width={128}
                  height={48}
                  className="object-contain w-full h-full"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}