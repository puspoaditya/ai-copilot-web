import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from "next/script";
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
  title: "IntervAI — Bantuan AI Real-time saat Interview",
  description: "Transkripsi otomatis + jawaban AI instan saat interview. Tidak terlihat saat screen share. Coba gratis 3 hari.",
  metadataBase: new URL(BASE_URL),
  openGraph: {
    title: "IntervAI — Bantuan AI Real-time saat Interview",
    description: "Transkripsi otomatis + jawaban AI instan saat interview. Tidak terlihat saat screen share. Coba gratis 3 hari.",
    url: BASE_URL,
    siteName: "IntervAI",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "IntervAI — Bantuan AI Real-time saat Interview",
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
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
        <SpeedInsights />
        <Script id="meta-pixel" strategy="afterInteractive">{`
          !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
          n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
          (window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
          fbq('init','1079559318572719');
          fbq('track','PageView');
        `}</Script>
        <noscript><img height="1" width="1" style={{display:'none'}} src="https://www.facebook.com/tr?id=1079559318572719&ev=PageView&noscript=1" alt="" /></noscript>
      </body>
    </html>
  );
}
