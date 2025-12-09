import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import TerminalEasterEgg from "@/components/terminal-easter-egg"
import ThemeToggle from "@/components/theme-toggle"
import ScrollProgress from "@/components/scroll-progress"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Security Researcher Portfolio",
  description: "Cybersecurity research, writeups, and projects",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`font-sans antialiased bg-background text-foreground`}>
        <ScrollProgress />
        <ThemeToggle />
        <TerminalEasterEgg />
        {children}
        <Analytics />
      </body>
    </html>
  )
}
