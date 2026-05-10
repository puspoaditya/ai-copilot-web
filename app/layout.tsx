import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const BASE_URL = 'https://ai-copilot-web.vercel.app';

export const metadata: Metadata = {
  title: "AI Interview Copilot — Bantuan AI Real-time saat Interview",
  description: "Transkripsi otomatis + jawaban AI instan saat interview. Tidak terlihat saat screen share. Coba gratis 3 hari.",
  metadataBase: new URL(BASE_URL),
  icons: {
    icon: '/icon.ico',
  },
  openGraph: {
    title: "AI Interview Copilot — Bantuan AI Real-time saat Interview",
    description: "Transkripsi otomatis + jawaban AI instan saat interview. Tidak terlihat saat screen share. Coba gratis 3 hari.",
    url: BASE_URL,
    siteName: "AI Interview Copilot",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Interview Copilot — Bantuan AI Real-time saat Interview",
    description: "Transkripsi otomatis + jawaban AI instan saat interview. Tidak terlihat saat screen share. Coba gratis 3 hari.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
