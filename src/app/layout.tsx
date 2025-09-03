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
  title: {
    default: 'Mentora SMK Pesat',
    template: '%s | Mentora SMK Pesat',
  },
  description:
    'Mentora SMK Pesat adalah platform pembelajaran coding online dengan sistem modular dan gamifikasi. Belajar pemrograman, desain, dan IT dengan kurikulum relevan industri di SMK Pesat.',
  keywords:
    'Mentora SMK Pesat, mentora smkpesat, pembelajaran online, e-learning SMK Pesat, kursus coding SMK, platform pembelajaran, belajar coding, belajar pemrograman, desain grafis, multimedia, teknologi informasi',
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
    // Ganti dengan kode verifikasi Search Console yang valid
    google: 'tambahkan-kode-verifikasi-google-search-console-disini',
  },
  openGraph: {
    title: 'Mentora SMK Pesat',
    description: 'Platform E-Learning Resmi Mentora SMK Pesat',
    url: 'https://mentora.smkpesat.sch.id',
    siteName: 'Mentora SMK Pesat',
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
  twitter: {
    card: 'summary_large_image',
    title: 'Mentora SMK Pesat',
    description: 'Platform E-Learning Resmi Mentora SMK Pesat',
    images: ['/logo.png'],
    creator: '@smkpesat',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
    shortcut: '/favicon-32x32.png',
    other: [
      {
        rel: 'mask-icon',
        url: '/safari-pinned-tab.svg',
        color: '#5bbad5',
      },
    ],
  },
  themeColor: '#ffffff',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'Mentora x SMK Pesat',
    statusBarStyle: 'default',
    startupImage: [
      {
        url: '/apple-touch-startup-image-640x1136.png',
        media: '(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)',
      },
      {
        url: '/apple-touch-startup-image-750x1334.png',
        media: '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)',
      },
      {
        url: '/apple-touch-startup-image-1242x2208.png',
        media: '(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3)',
      },
    ],
  },
  formatDetection: {
    telephone: false,
    address: false,
    email: false,
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
