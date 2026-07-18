import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  metadataBase: new URL("https://disaster.comply54.io"),
  title: "Agent Disaster Lab — by comply54",
  description:
    "Watch AI agents cause real African regulatory disasters — then watch comply54 stop every single one. Live enforcement demos for CBN, NDPA, NHA, NAICOM, NFIU, KDPA and more.",
  openGraph: {
    title: "Agent Disaster Lab",
    description: "AI agents causing regulatory disasters — and comply54 stopping them.",
    url: "https://disaster.comply54.io",
    siteName: "Agent Disaster Lab",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#080a0f]">{children}</body>
      <Script
        defer
        data-domain="disaster.comply54.io"
        src="https://plausible.io/js/script.js"
        strategy="afterInteractive"
      />
    </html>
  );
}
