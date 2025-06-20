"use client"
import { motion } from "framer-motion"
import { ArrowRight, Phone, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function CTASection() {
  return (
    <section className="py-20 bg-gradient-to-br from-[#35bdbd] to-[#2a9b9b]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="lg:w-2/3"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Siap Untuk Memulai Perjalananmu?
            </h2>
            <p className="text-white/90 text-lg leading-relaxed">
              Bergabung dengan siswa lainnya dan mulai persiapkan masa depanmu bersama Mentora. 
              Dapatkan bimbingan terbaik dari mentor berpengalaman dan akses ke materi pembelajaran berkualitas.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto"
          >
            <Button 
              size="lg" 
              className="bg-white text-[#35bdbd] hover:bg-gray-50 shadow-lg font-semibold"
            >
              Mulai Sekarang
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-2  border-white text-[#35bdbd] hover:bg-white/5 font-semibold"
            >
              <Phone className="w-5 h-5 mr-2" />
              Konsultasi Gratis
            </Button>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16"
        >
          {[
            {
              text: "Akses Seumur Hidup",
              icon: <Clock className="w-5 h-5" />
            },
            {
              text: "Dukungan 24/7",
              icon: <Phone className="w-5 h-5" />
            }
          ].map((feature, index) => (
            <div 
              key={index}
              className="flex items-center justify-center gap-2 px-6 py-4 bg-white/10 backdrop-blur-sm rounded-xl text-white font-medium border border-white/10"
            >
              {feature.icon}
              {feature.text}
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}