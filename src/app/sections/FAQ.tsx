"use client"
import { motion } from "framer-motion"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

export default function FAQSection() {
  const faqs = [
    {
      question: "Bagaimana cara mendaftar di KaTo?",
      answer: "Pendaftaran dapat dilakukan melalui website dengan mengklik tombol 'Daftar Sekarang'. Isi formulir pendaftaran dan pilih program yang sesuai dengan kebutuhanmu."
    },
    {
      question: "Berapa biaya untuk mengikuti program di KaTo?",
      answer: "Biaya program bervariasi tergantung jenis dan durasi program yang dipilih. Kami menyediakan berbagai pilihan paket yang dapat disesuaikan dengan kebutuhan dan budget Anda."
    },
    {
      question: "Apakah ada trial class sebelum mendaftar?",
      answer: "Ya, kami menyediakan trial class gratis selama 3 hari untuk membantu Anda mengenal lebih jauh tentang sistem pembelajaran di KaTo."
    },
    {
      question: "Bagaimana sistem pembelajaran di KaTo?",
      answer: "Pembelajaran dilakukan secara online melalui platform kami dengan kombinasi video pembelajaran, latihan soal, dan pertemuan live dengan mentor setiap minggunya."
    },
    {
      question: "Apakah materi dapat diakses setelah program selesai?",
      answer: "Ya, semua materi pembelajaran dapat diakses seumur hidup setelah program selesai melalui akun KaTo Anda."
    },
    {
      question: "Bagaimana jika saya ketinggalan kelas live?",
      answer: "Setiap kelas live akan direkam dan dapat diakses kembali melalui platform kami. Anda juga dapat mengajukan pertanyaan melalui forum diskusi."
    }
  ]

  return (
    <section className="py-24 bg-gray-50 dark:bg-neutral-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl font-bold mb-4">
            Pertanyaan yang Sering Diajukan
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Temukan jawaban untuk pertanyaan umum tentang KaTo
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-4"
        >
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-gray-600 dark:text-gray-300">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  )
}