"use client"
import { motion } from "framer-motion"
import Image from "next/image"

export default function TestimonialsSection() {
  const testimonials = [
    {
      name: "Aldi Ramdani",
      role: "Mahasiswa UI",
      image: "/testimonials/aldi.jpg",
      content: "Berkat KaTo, saya bisa lebih memahami jurusan yang saya pilih dan akhirnya diterima di universitas impian.",
      university: "Fakultas Teknik"
    },
    {
      name: "Sarah Amalia",
      role: "Mahasiswa ITB",
      image: "/testimonials/sarah.jpg",
      content: "Mentor-mentornya sangat membantu dalam mempersiapkan ujian masuk. Materinya lengkap dan mudah dipahami.",
      university: "Fakultas FMIPA"
    },
    {
      name: "Reza Pratama",
      role: "Mahasiswa UGM",
      image: "/testimonials/reza.jpg",
      content: "Program persiapan kuliah yang sangat membantu. Saya jadi lebih percaya diri menghadapi perkuliahan.",
      university: "Fakultas Kedokteran"
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
                <Image
                  src={testimonial.image}
                  alt={testimonial.name}
                  width={56}
                  height={56}
                  className="rounded-full"
                />
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