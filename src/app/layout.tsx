import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://mentora.smkpesat.sch.id'),
  title: 'Mentora x Pesat - Platform Pembelajaran Coding Online',
  description: 'Mentora adalah platform pembelajaran coding online dengan sistem modular yang dirancang untuk kalian yang ingin belajar coding dengan metode gamified. Dengan berbagai materi pembelajaran yang lengkap dan mudah diakses, Mentora menyediakan pengalaman belajar yang menyenangkan dan efektif.',
  keywords: 'Mentora, SMK Pesat, pembelajaran online, elearning smk pesat, kursus online smk pesat, platform pembelajaran, materi pembelajaran, video tutorial, resources pendidikan, e-learning, pendidikan digital, sekolah menengah kejuruan, SMK Pesat, platform edukasi, pembelajaran digital, kursus online, materi pendidikan, video pembelajaran, resources smk pesat, belajar coding, belajar desain grafis, belajar multimedia, belajar bisnis, belajar teknologi informasi, coding, desain grafis, multimedia, bisnis, teknologi informasi, belajar coding online, belajar desain grafis online, belajar multimedia online, belajar bisnis online, belajar teknologi informasi online, coding online, desain grafis online, multimedia online, bisnis online, teknologi informasi online',
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'tambahkan-kode-verifikasi-google-search-console-disini',
  },
  openGraph: {
    title: 'Mentora x SMK Pesat',
    description: 'Platform E-Learning Resmi Mentora',
    url: 'https://mentora.smkpesat.sch.id',
    siteName: 'Mentora x SMK Pesat',
    images: [
      {
        url: '/logo.png',
        width: 800,
        height: 600,
      },
    ],
    locale: 'id_ID',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "EducationalOrganization",
            "name": "Mentora x Pesat",
            "description": "Platform pembelajaran coding online dengan sistem modular yang dirancang untuk kalian yang ingin belajar coding dengan metode gamified.",
            "url": "https://mentora.smkpesat.sch.id",
            "founder": {
              "@type": "Organization",
              "name": "SMK Pesat"
            },
            "foundingDate": "2024",
            "address": {
              "@type": "PostalAddress",
              "streetAddress": "Jl. Poras No. 7 Sindang Barang, Loji",
              "addressLocality": "Loji, Bogor Barat",
              "addressRegion": "Kota Bogor",
              "postalCode": "16116",
              "addressCountry": "ID"
            },
            "sameAs": [
              "https://www.instagram.com/mentoraxpesat",
              "https://smkpesat.sch.id"
            ],
            "offers": {
              "@type": "Offer",
              "category": "Online Learning Platform",
              "availabilityStarts": "2024-01"
            },
            "teaches": [
              "Coding",
              "Web Development",
              "Mobile Development",
              "UI/UX Design",
              "Digital Marketing"
            ],
            "hasCredential": {
              "@type": "EducationalOccupationalCredential",
              "credentialCategory": "Certificate",
              "educationalLevel": "Vocational Education"
            }
          })}
        </script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}