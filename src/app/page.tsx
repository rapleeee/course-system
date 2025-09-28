"use client";
import Navbar from "@/components/layouts/Navbar";
import HeroSection from "./sections/HeroSection";
import FeaturesSection from "./sections/Features";
import ProgramSection from "./sections/Programs";
import TestimonialsSection from "./sections/Testimonials";
import CTASection from "./sections/CTA";
import FAQSection from "./sections/FAQ";
import ConsultWidget from "@/components/chat/ConsultWidget";

export default function Home() {
  
  return (
    <div className="overflow-hidden">
      <Navbar />
      <main className="scroll-smooth">
        <HeroSection />
        <FeaturesSection />
        <ProgramSection />
        <TestimonialsSection />
        <FAQSection />
        <CTASection />
      </main>
      <ConsultWidget />
    </div>
  );
}
