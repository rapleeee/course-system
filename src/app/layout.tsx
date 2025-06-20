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
  metadataBase: new URL("https://mentora.id"),
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  keywords: [
    "mentora",
    "belajar coding",
    "kelas coding",
    "programming",
    "taCo",
    "kampus tutor",
    "bootcamp coding",
    "belajar pemrograman",
    "kursus online",
    "coding online",
    "programmer pemula",
    "belajar bahasa pemrograman",
    "belajar web development",
    "belajar mobile development",
    "belajar software development",
    "belajar data science",
    "belajar machine learning",
    "belajar artificial intelligence",
    "belajar game development",
    "belajar cloud computing",
    "belajar devops",
    "belajar cybersecurity",
    "belajar database",
    "belajar frontend",
    "belajar backend",
    "belajar fullstack",
    "belajar UI/UX",
    "belajar desain grafis",
    "belajar digital marketing",
    "belajar SEO",
    "belajar social media marketing",
    "belajar content marketing",
    "belajar email marketing",
    "belajar affiliate marketing",
    "belajar e-commerce",
    "belajar bisnis online",
    "belajar entrepreneurship",
    "belajar startup",
    "belajar manajemen proyek",
    "belajar agile",
    "belajar scrum",  
    "belajar product management",
    "belajar business analysis",
    "belajar data analysis",
    "belajar data visualization",
    "belajar data engineering",
    "belajar data analytics",
    "belajar data science online",
    "belajar coding online",
    "belajar coding untuk pemula",
    "belajar coding gratis",
    "belajar coding di rumah",
    "belajar coding dengan mentor",
    "belajar coding dengan gamifikasi",
    "belajar coding dengan modul",  
  ],
  authors: [
    {
      name: "Mentora Team",
      url: "https://mentora.id",
    },
  ],
  creator: "KaTo Team",
  publisher: "KaTo Team",
  applicationName: "KaTo - Kampus Tutor",
  formatDetection: {
    telephone: false,
    address: false,
    email: false,
  },
  title: "Mentora",
  description: "Mentora adalah platform belajar coding menyenangkan dan mudah dengan sistem modular dan gamifikasi. Program utama kami adalah Kelas TaCo, bakalan ngebimbing kamu dari baris code pertama sampai jadi programmer yang siap kerja.",
  openGraph: {
    title: "Mentora",
    description:
      "Mentora adalah platform belajar coding menyenangkan dan mudah dengan sistem modular dan gamifikasi. Program utama kami adalah Kelas TaCo, bakalan ngebimbing kamu dari baris code pertama sampai jadi programmer yang siap kerja.",
    url: "https://mentora.id",
    siteName: "Mentora",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Mentora - Belajar Coding",
      },
    ],
    locale: "id_ID",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
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