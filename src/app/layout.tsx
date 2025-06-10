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
  title: "KaTo - Kampus Tutor",
  description: "Kampus Tutor adalah platform pembelajaran online yang menyediakan berbagai program pendidikan berkualitas tinggi untuk meningkatkan keterampilan dan pengetahuan Anda.",
  openGraph: {
    title: "KaTo - Kampus Tutor",
    description: "Kampus Tutor adalah platform pembelajaran online yang menyediakan berbagai program pendidikan berkualitas tinggi untuk meningkatkan keterampilan dan pengetahuan Anda.",
    url: "https://kato.id",
    siteName: "KaTo - Kampus Tutor",
    images: [
      {
        url: "https://kato.id/og-image.png",
        width: 1200,
        height: 630,
        alt: "KaTo - Kampus Tutor",
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