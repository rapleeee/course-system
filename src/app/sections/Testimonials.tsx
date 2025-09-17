"use client"
import { motion } from "framer-motion"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { User } from "lucide-react"

export default function TestimonialsSection() {
  const testimonials = [
    {
      name: "Ichtiar Tegar",
      role: "Mahasiswa Urindo",
      image: "/testimonials/aldi.jpg",
      content: "Kelas TaCo sangat membantu saya memahami coding dengan cara yang menyenangkan. Mentor-mentornya sangat berpengalaman dan selalu siap membantu.",
      university: "Fakultas Teknologi Informasi"
    },
    {
      name: "Rafli Maulana",
      role: "Mahasiswa Urindo",
      image: "/testimonials/sarah.jpg",
      content: "Kelas TaCo Pro memberikan saya pengetahuan yang mendalam tentang teknologi terbaru. Saya merasa siap untuk memasuki dunia kerja.",
      university: "Fakultas Teknik Informasi"
    },
    {
      name: "Erian Sukarna Putera",
      role: "Mahasiswa Unbin",
      image: "/testimonials/reza.jpg",
      content: "Kelas TaCo sangat interaktif dan menyenangkan. Saya belajar banyak hal baru yang tidak saya dapatkan di kampus.",
      university: "Fakultas Sistem Informasi"
    }
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
          <h2 className="text-3xl font-bold mb-4">Apa Kata Mereka?</h2>
          <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Testimoni dari para siswa yang telah berhasil masuk perguruan tinggi impian
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-white dark:bg-neutral-800 p-6 rounded-2xl shadow-lg"
            >
              <div className="flex items-center gap-4 mb-4">
                <Avatar className="size-14">
                  <AvatarFallback className="bg-[#D2C1B6] dark:bg-[#1B3C53] text-[#1B3C53] dark:text-[#D2C1B6]">
                    <User className="w-6 h-6" aria-hidden="true" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">{testimonial.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {testimonial.role} - {testimonial.university}
                  </p>
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-300">
                {testimonial.content}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
