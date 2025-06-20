"use client"
import React from 'react'
import { Quote } from 'lucide-react'
import { motion } from 'framer-motion'
import Navbar from '@/components/layouts/Navbar'
import Image from 'next/image'

export default function AboutPage() {
  return (
    <section className="">
      <Navbar/>
      <div className="py-12 sm:py-16 ">
      <div className="max-w-7xl mx-auto">
       <div className="grid grid-cols-1 md:grid-cols-3 gap-8 justify-center items-center  ">
        <div className="col-span-1  p-6 ">
          <h1>About us.</h1>
          <h1>About team.</h1>
          <h1>Education</h1>
        </div>
        <div className="col-span-2 P-6">
          <h1 className="text-4xl font-bold mb-4">ABOUT US.</h1>
          <p  className="text-sm sm:text-base text-justify mb-6">
            We are a team of passionate individuals dedicated to creating innovative solutions that make a difference. Our journey began with a shared vision of excellence and a commitment to pushing the boundaries of what is possible. 
            We believe in the power of <span className='text-[#1d857c] bg-[#f5bb64]'>collaboration and creativity</span>, and we strive to bring together diverse talents to achieve our goals. Our mission is to deliver <span className='text-[#1d857c] bg-[#f5bb64]'>high-quality Education</span> and services that exceed expectations and drive positive change in the world.
            Powered by a culture of continuous learning and improvement, we embrace challenges as opportunities for growth. We are not just a team <span className='text-[#1d857c] bg-[#f5bb64]'>we are a community united</span>  by our values and our passion for making an impact.
          </p>
        </div>
      </div>
      <Image
          src="/photos/progammer.webp"
          alt="About Us Image" 
          width={600} 
          height={400} 
          className="rounded-lg w-full h-100 object-cover shadow-md mt-12"
        />


        <div className="mt-20">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-12 items-center">
            <div className="space-y-4">
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="text-lg sm:text-xl"
              >
                After a fortunate encounter with copywriter and content manager Anna Scardovelli, Studio Marani gained another key member. Anna was already collaborating with big international brands like Barilla, Volkswagen, Campari, and others.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                className="flex items-center gap-2"
              >
                <Quote size={24} className="text-[#f5bb64]" />
                <span className="text-lg font-semibold text-neutral-400">"Our work does make sense only if it is a faithful witness of his time." - Jean-Philippe Nuel, Director</span>
              </motion.div>
            </div>

            <div className="flex justify-center">
              <Image 
                src="/photos/working.jpg" 
                alt="Team working" 
                width={600} 
                height={400} 
                className="rounded-lg "
              />
            </div>
          </div>
        </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-12 mt-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Image
            src="/photos/working.jpg"
            alt="Team Image"
            width={600}
            height={400}
            className="rounded-lg w-full h-100 object-cover shadow-md mb-4"
          />
          </motion.div>
        <div className="mt-20">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="text-2xl sm:text-3xl font-bold mb-6"
          >
            The Team.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1 }}
            className="text-lg sm:text-xl text-neutral-300"
          >
            All art is quite useless. One can never consent to creep when one feels an impulse to soar. Words do not express thoughts very well; they always become a little different immediately after they are expressed.
          </motion.p>

        <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div>
            <h3 className="text-xl font-semibold">600</h3>
            <p className="text-sm text-neutral-400">Million sq ft of sustainable work</p>
          </div>
          <div>
            <h3 className="text-xl font-semibold">700</h3>
            <p className="text-sm text-neutral-400">Million gallons of water saved annually</p>
          </div>
          <div>
            <h3 className="text-xl font-semibold">1.2</h3>
            <p className="text-sm text-neutral-400">Million sq ft of LEED certified projects</p>
          </div>
          <div>
            <h3 className="text-xl font-semibold">110</h3>
            <p className="text-sm text-neutral-400">USGBC certified projects</p>
          </div>
        </div>
      </div>
      </div>
      </div>
      </div>
    </section>
  )
}