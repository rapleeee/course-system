"use client";
import Navbar from "@/components/layouts/Navbar";
import HeroSection from "./HeroSection/page";
import FeaturesSection from "./sections/Features";
import ProgramSection from "./sections/Programs";
import TestimonialsSection from "./sections/Testimonials";
import CTASection from "./sections/CTA";
import FAQSection from "./sections/FAQ";

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
    </div>
  );
}
