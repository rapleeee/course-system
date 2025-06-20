"use client"
import React from 'react'
import { Quote } from 'lucide-react'
import { motion } from 'framer-motion'
import Navbar from '@/components/layouts/Navbar'
import Image from 'next/image'

export default function AboutPage() {
  return (
    <section className="">
      <Navbar />
      <div className="max-w-7xl pt-4 mx-auto px-6 sm:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 justify-center items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="col-span-1 p-6"
          >
            <h1>About us.</h1>
            <h1>About team.</h1>
            <h1>Education</h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="col-span-2 p-6"
          >
            <h1 className="text-4xl font-bold mb-4">ABOUT US.</h1>
            <p className="text-sm sm:text-base text-justify mb-6">
              We are a team of passionate individuals dedicated to creating innovative solutions. Our mission is to deliver <span className='text-[#1d857c] bg-[#f5bb64]'>high-quality Education</span> and services that drive positive change in the world.
            </p>
            <p className="text-sm sm:text-base text-justify mb-6">
              Powered by continuous learning, we embrace challenges as opportunities for growth. We are not just a team, we are a community united by our values.
              And we are committed to making a difference through our work. As a team, we believe in the power of collaboration and creativity to achieve our goals.
              Together, we strive to push boundaries and exceed expectations, always aiming for excellence in everything we do.
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-12 flex justify-center"
        >
          <Image
            src="/photos/progammer.webp"
            alt="About Us Image"
            width={600}
            height={400}
            className="rounded-lg shadow-md w-full h-100 object-cover"
          />
        </motion.div>
        <div className="mt-20">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="space-y-4"
            >
              <p className="text-lg sm:text-xl">
                After a fortunate encounter with copywriter and content manager Anna Scardovelli, Studio Marani gained another key member. Anna was already collaborating with big international brands like Barilla, Volkswagen, Campari, and others.
              </p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 1 }}
                className="flex items-center gap-2"
              >
                <Quote size={24} className="text-[#f5bb64]" />
                <span className="text-lg font-semibold text-neutral-400">
                  "Our work does make sense only if it is a faithful witness of his time." - Jean-Philippe Nuel, Director
                </span>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.2 }}
              className="flex justify-center"
            >
              <Image
                src="/photos/working.jpg"
                alt="Team working"
                width={600}
                height={400}
                className="rounded-lg"
              />
            </motion.div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-12 mt-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.4 }}
          >
            <Image
              src="/photos/working.jpg"
              alt="Team Image"
              width={600}
              height={400}
              className="rounded-lg shadow-md mb-4"
            />
          </motion.div>
          <div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.6 }}
              className="text-2xl sm:text-3xl font-bold mb-6"
            >
              The Team.
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.8 }}
              className="text-lg sm:text-xl "
            >
              Our team is a diverse group of professionals with expertise in various fields, including design, development, marketing, and project management. We work collaboratively to bring innovative ideas to life and ensure the success of our projects.
            </motion.p>

            <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 2 }}
              >
                <h3 className="text-xl font-semibold">10</h3>
                <p className="text-sm text-neutral-400">Mentor tervalidasi ketat oleh sistem kita</p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 2.2 }}
              >
                <h3 className="text-xl font-semibold">50+</h3>
                <p className="text-sm text-neutral-400">Alumni terserap di industri indonesia hingga luar negeri</p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 2.4 }}
              >
                <h3 className="text-xl font-semibold">100+</h3>
                <p className="text-sm text-neutral-400">Siswa aktif dan berkomunitas dengan sehat</p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 2.6 }}
              >
                <h3 className="text-xl font-semibold">10+</h3>
                <p className="text-sm text-neutral-400">Kerjasama dengan industri</p>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}