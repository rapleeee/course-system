"use client";

import { useState } from "react";
import Navbar from "@/components/layouts/Navbar";
import { ArrowRightCircle, ChevronDown, ChevronUp } from "lucide-react";
import Image from "next/image";

export default function Recruitment() {
  const jobs = [
    {
      title: "Web Developer",
      description:
        "We are looking for a talented Fullstack Web Developer to join our team.",
      responsibilities: [
        "Develop and maintain web applications",
        "Collaborate with designers and backend developers",
        "Optimize application for maximum speed and scalability",
        "Ensure the technical feasibility of UI/UX designs",
        "Implement responsive design",
        "Troubleshoot and debug applications",
      ],
      linkwebsite: "https://docs.google.com/forms/d/e/1FAIpQLSc4TBuX9vb4kSof_6BDX9w8V_Q02v8hz0uI28LgeKgHk74gOg/viewform"
    },
    {
      title: "Mentor Programmer",
      description: "Join us as a Mentor Programmer to guide and support our students.",
      responsibilities: [
        "Provide mentorship and guidance to students",
        "Conduct coding sessions and workshops",
        "Review student projects and provide feedback",
        "Help students overcome coding challenges",
        "Foster a positive learning environment",
        "Stay updated with the latest programming trends",
        "Assist in curriculum development",
        "Encourage and motivate students",
      ],
      linkwebsite: "https://docs.google.com/forms/d/e/1FAIpQLSfNaNUMYwEVNP1FMUYgdA8r7RHFIGuv0on8bwyBAumfh6SxFw/viewform"
    },
    {
      title: "Design and Publication",
      description: "Helps us create and manage our design and publication needs for social media and other platforms.",
      responsibilities: [
        "Create visually appealing designs for social media",
        "Manage publication schedules and content",
        "Collaborate with the marketing team",
        "Ensure brand consistency across all platforms",
        "Design graphics, banners, and promotional materials",
        "Stay updated with design trends",
        "Assist in video editing and production",
        "Engage with the community through creative content",
        "Analyze engagement metrics and adjust strategies accordingly",
        "Work with the team to develop creative campaigns",
        "Participate in brainstorming sessions for new content ideas",
      ],
      linkwebsite: "https://docs.google.com/forms/d/e/1FAIpQLSeCLzS4bjdkwaUzbgPNA-T-IrahM_AvJRCokIexeXCPKak3GA/viewform"
    },
  ];
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleAccordion = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen mt-24 flex flex-col items-center px-6 md:px-10">
        <div className="max-w-5xl w-full text-left sm:text-center">
          <h1 className="mt-3 text-3xl sm:text-5xl font-extrabold tracking-tight">
            <span className="text-[#1d857c] bg-[#f5bb64] px-1 py-0.5">Join Our Team</span> — Collaborate with talented individuals
          </h1>
          <p className="text-neutral-300 text-base sm:text-lg mt-4">
            Level up with us. Explore open roles and apply in minutes.
          </p>
          <div className="mt-6">
            <Image
              src="/photos/progammer.webp"
              alt="Team collaborating on a web project"
              width={1200}
              height={600}
              sizes="(max-width: 768px) 100vw, 800px"
              className="rounded-xl shadow-lg w-full h-auto object-cover"
              priority
            />
          </div>
        </div>

        <section className="max-w-5xl w-full my-10" aria-labelledby="jobs-heading">
          <h2 id="jobs-heading" className="sr-only">Open Positions</h2>
          <ul className="space-y-4">
            {jobs.map((job, index) => {
              const isOpen = openIndex === index;
              const buttonId = `job-accordion-button-${index}`;
              const panelId = `job-accordion-panel-${index}`;
              return (
                <li key={job.title}>
                  <article className="rounded-xl border border-neutral-700/60 bg-neutral-800/60 backdrop-blur-sm shadow-md overflow-hidden">
                    <header>
                      <button
                        id={buttonId}
                        className="w-full text-left p-5 sm:p-6 flex justify-between items-center font-semibold text-lg sm:text-xl text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#f5bb64] focus-visible:ring-offset-neutral-900 transition-colors"
                        onClick={() => toggleAccordion(index)}
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                      >
                        <span className="pr-3">{job.title}</span>
                        {isOpen ? (
                          <ChevronUp aria-hidden className="text-neutral-300" />
                        ) : (
                          <ChevronDown aria-hidden className="text-neutral-300" />
                        )}
                      </button>
                    </header>
                    <div
                      id={panelId}
                      role="region"
                      aria-labelledby={buttonId}
                      className={`${isOpen ? 'block' : 'hidden'} p-5 sm:p-6 border-t border-neutral-700/60 text-neutral-100`}
                    >
                      <p className="text-base font-medium">{job.description}</p>
                      <h3 className="text-sm font-semibold mt-4">Responsibilities</h3>
                      <ul className="list-disc pl-5 text-sm mt-2 space-y-1 text-neutral-200">
                        {job.responsibilities.map((responsibility, i) => (
                          <li key={`${job.title}-resp-${i}`}>{responsibility}</li>
                        ))}
                      </ul>
                      <div className="mt-4">
                        <a
                          href={job.linkwebsite}
                          target="_blank"
                          rel="noopener noreferrer nofollow external"
                          aria-label={`Apply now for ${job.title}`}
                          className="inline-flex items-center gap-2 rounded-lg border border-[#f5bb64] px-4 py-2 text-sm font-semibold text-white hover:bg-[#f5bb64] hover:text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f5bb64] focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 transition-colors"
                        >
                          <span>Apply Now</span>
                          <ArrowRightCircle aria-hidden className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </>
  );
}
