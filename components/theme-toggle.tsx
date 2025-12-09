"use client"

import { useEffect, useState } from "react"
import { Sun } from "lucide-react"

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <button
      onClick={() => {
        const html = document.documentElement
        html.classList.toggle("dark")
      }}
      className="fixed bottom-4 left-4 p-3 rounded-lg bg-card border border-border hover:border-accent transition-all z-40"
      aria-label="Toggle theme"
    >
      <Sun className="w-5 h-5 text-foreground/70 hover:text-accent transition-colors" />
    </button>
  )
}
