"use client"
import { motion } from "framer-motion"
import { GraduationCap, Users, School, Target, Trophy } from "lucide-react"

export default function StatsSection() {
  const stats = [
    {
      icon: <Users className="w-8 h-8 text-white" />,
      value: "5,000+",
      label: "Siswa Bergabung",
      description: "Siswa aktif belajar"
    },
    {
      icon: <GraduationCap className="w-8 h-8 text-white" />,
      value: "85%",
      label: "Tingkat Kelulusan",
      description: "Diterima PTN favorit"
    },
    {
      icon: <School className="w-8 h-8 text-white" />,
      value: "50+",
      label: "Kampus Partner",
      description: "Kerjasama dengan PTN/PTS"
    },
    {
      icon: <Target className="w-8 h-8 text-white" />,
      value: "100+",
      label: "Program Aktif",
      description: "Program pembelajaran"
    },
    {
      icon: <Trophy className="w-8 h-8 text-white" />,
      value: "1,000+",
      label: "Testimoni Positif",
      description: "Dari alumni sukses"
    }
  ]

  return (
    <section className="py-24 bg-[#35bdbd]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl font-bold text-white mb-4">
            KaTo dalam Angka
          </h2>
          <p className="text-white/80 max-w-2xl mx-auto">
            Pencapaian kami dalam membantu siswa meraih impian mereka
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="text-center"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/10 mb-4">
                {stat.icon}
              </div>
              <div className="text-3xl font-bold text-white mb-1">
                {stat.value}
              </div>
              <div className="text-lg font-medium text-white/90 mb-2">
                {stat.label}
              </div>
              <div className="text-sm text-white/70">
                {stat.description}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}