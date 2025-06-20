"use client";

import { useState } from "react";
import Navbar from "@/components/layouts/Navbar";
import { ArrowRightCircleIcon, ChevronDown, ChevronUp } from "lucide-react";
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
      title: "Design and publication",
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
  setOpenIndex(openIndex === index ? null : index);
};

  return (
    <>
      <Navbar />
      <div className="min-h-screen mt-24 flex flex-col items-center px-6 md:px-10">
        <div className="max-w-5xl w-full text-left sm:text-center">
          <h1 className="text-3xl sm:text-5xl font-bold ">
            <span className="text-[#1d857c] bg-[#f5bb64] p-1 ">WE LOOK FORWARD </span> TO
            COLLABORATING WITH TALENTED INDIVIDUALS.
          </h1>
          <p className="text-neutral-400 text-lg sm:text-2xl mt-6">
            Lets level up together and join us during our next recruitment.
          </p>
          <div>
            <Image
              src="/photos/recruitment.webp"
              alt="Recruitment Image"
              width={600}
              height={400}
              className="rounded-lg shadow-md w-full h-100 object-cover mt-6"
            />
          </div>
        </div>

        <div className="max-w-5xl w-full my-10 space-y-6">
          {jobs.map((job, index) => (
            <div key={index} className="bg-neutral-700 shadow-lg rounded-xl overflow-hidden">
              <button
                className="w-full text-left p-6 flex justify-between items-center text-neutral-800 font-semibold text-xl"
                onClick={() => toggleAccordion(index)}
              >
                <span className="text-white"> <span></span> {job.title}</span>
                {openIndex === index ? (
                  <ChevronUp className="text-white" />
                ) : (
                  <ChevronDown className="text-white" />
                )}
              </button>
              {openIndex === index && (
                <div className="p-6 bg-neutral-700 text-neutral-100">
                  <p className="text-base font-medium text-neutral-100">{job.description}</p>
                  <h3 className="text-base font-semibold mt-3">Responsibilities:</h3>
                  <ul className="list-disc pl-5 text-sm mt-2 text-neutral-100">
                    {job.responsibilities.map((responsibility, i) => (
                      <li key={i}>{responsibility}</li>
                    ))}
                  </ul>
                  <div className="">
                    <a href={job.linkwebsite} target="_blank" rel="noopener noreferrer">
                      <button className="border py-1 px-4 mt-3 hover:bg-[#f5bb64] rounded-lg ">
                        <div className="flex items-center gap-4">
                        <span className="text-white text-sm">Apply Now </span>
                        <ArrowRightCircleIcon className="text-white text-xs" />
                        </div>
                      </button>
                    </a>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}