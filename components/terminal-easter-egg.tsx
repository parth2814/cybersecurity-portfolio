"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"

interface TerminalCommand {
  command: string
  output: string
}

const commands: Record<string, string> = {
  help: "Available commands: whoami, ls, cat, pwd, echo, clear, exit",
  whoami: "Security Researcher & Penetration Tester",
  ls: "writeups/  projects/  certifications/  about.txt  contact.txt",
  pwd: "/home/security",
  cat: "Usage: cat <filename>",
  "cat about.txt": "Passionate about finding and exploiting vulnerabilities in complex systems.",
  "cat contact.txt": "Email: hello@example.com | GitHub: github.com/username",
  echo: "Usage: echo <text>",
  clear: "",
  exit: "CLOSE",
}

export default function TerminalEasterEgg() {
  const [isOpen, setIsOpen] = useState(false)
  const [history, setHistory] = useState<TerminalCommand[]>([])
  const [input, setInput] = useState("")

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        setIsOpen(!isOpen)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen])

  const handleCommand = (cmd: string) => {
    const trimmed = cmd.trim().toLowerCase()

    if (trimmed === "clear") {
      setHistory([])
      setInput("")
      return
    }

    if (trimmed === "exit") {
      setIsOpen(false)
      setHistory([])
      setInput("")
      return
    }

    const output = commands[trimmed] || `Command not found: ${trimmed}`

    setHistory([...history, { command: cmd, output }])
    setInput("")
  }

  if (!isOpen) return null

  return (
    <div className="fixed bottom-4 right-4 w-96 h-96 bg-background border-2 border-accent rounded-lg shadow-2xl shadow-accent/20 flex flex-col z-50 font-mono text-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-accent/30 bg-card">
        <span className="text-accent">terminal@security</span>
        <button onClick={() => setIsOpen(false)} className="text-foreground/60 hover:text-accent transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <div className="text-foreground/60">Type 'help' for available commands. Press Ctrl+K to toggle.</div>

        {history.map((item, i) => (
          <div key={i}>
            <div className="text-accent">$ {item.command}</div>
            <div className="text-foreground/80 ml-4">{item.output}</div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="border-t border-accent/30 p-4">
        <div className="flex items-center gap-2">
          <span className="text-accent">$</span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleCommand(input)
              }
            }}
            autoFocus
            className="flex-1 bg-transparent text-foreground outline-none"
            placeholder="Enter command..."
          />
        </div>
      </div>
    </div>
  )
}
