import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Tracker from "@/components/Tracker";
import NoContextMenu from "@/components/NoContextMenu";
import ConsoleGreeting from "@/components/ConsoleGreeting";
import AwayTitle from "@/components/AwayTitle";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Portfolio | Developer & Engineer",
  description: "Full-stack developer, robotics engineer, and designer portfolio",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pl"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="min-h-screen bg-background text-foreground noise-overlay">
        <Tracker />
        <NoContextMenu />
        <ConsoleGreeting />
        <AwayTitle />
        {children}
      </body>
    </html>
  );
}
