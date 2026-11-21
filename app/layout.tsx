import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import FeedbackButton from "@/components/FeedbackButton";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import Footer from "@/components/Footer";
import InAppBrowserWarning from "@/components/InAppBrowserWarning";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ระบบจองห้องประชุม (PR Rooms Booking System)",
  description: "ระบบจองห้องประชุมออนไลน์ ค้นหาและจองห้องประชุมได้ทันที",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "จองห้องประชุม",
  },
  icons: {
    icon: "/school-logo.png",
    apple: "/school-logo.png",
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
        <FeedbackButton />
        <ServiceWorkerRegister />
        <InAppBrowserWarning />
        <Footer />
      </body>
    </html>
  );
}
