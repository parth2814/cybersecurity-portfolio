"use client"

import { useEffect, useState } from "react"
import { Github, Linkedin, Twitter, ExternalLink, ChevronDown } from "lucide-react"

export default function Hero() {
  const [displayText, setDisplayText] = useState("")
  const [isLoaded, setIsLoaded] = useState(false)
  const fullText = "Security Researcher & Penetration Tester"

  useEffect(() => {
    setIsLoaded(true)
    let index = 0
    const interval = setInterval(() => {
      if (index < fullText.length) {
        setDisplayText(fullText.slice(0, index + 1))
        index++
      } else {
        clearInterval(interval)
      }
    }, 50)
    return () => clearInterval(interval)
  }, [])

  return (
    <section className="min-h-screen flex items-center justify-center pt-16 px-4 relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="max-w-4xl mx-auto text-center space-y-8">
        {/* Main Title */}
        <div className="space-y-4">
          <div
            className={`transition-all duration-1000 ${isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
          >
            <h1 className="text-5xl md:text-7xl font-bold">
              <span className="text-foreground">Parth K Panchal</span>
            </h1>
            <p className="text-sm md:text-base text-accent/70 font-mono mt-2">Security Researcher</p>
          </div>

          {/* Animated Subtitle */}
          <div className="h-12 flex items-center justify-center">
            <p className="text-xl md:text-2xl text-accent font-mono">
              {displayText}
              <span className="animate-pulse">|</span>
            </p>
          </div>
        </div>

        {/* Description */}
        <div
          className={`transition-all duration-1000 delay-300 ${isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
        >
          <p className="text-lg text-foreground/70 max-w-2xl mx-auto leading-relaxed">
            Exploring the intersection of security, code, and creativity. Specialized in web application security, cloud
            infrastructure, and advanced exploitation techniques.
          </p>
        </div>

        {/* Social Links */}
        <div
          className={`flex justify-center gap-6 pt-8 transition-all duration-1000 delay-500 ${isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
        >
          {[
            { icon: Github, href: "https://github.com/parth2814", label: "GitHub" },
            { icon: Linkedin, href: "http://www.linkedin.com/in/m0n4rch", label: "LinkedIn" },
            { icon: Twitter, href: "https://x.com/052Parth", label: "Twitter" },
            { icon: ExternalLink, href: "https://app.hackthebox.com/users/920261", label: "HackTheBox" },
          ].map(({ icon: Icon, href, label }) => (
            <a
              key={label}
              href={href}
              className="p-3 rounded-lg bg-card border border-border hover:border-accent hover:bg-card/50 transition-all duration-300 group hover:scale-110 hover:-translate-y-1"
              aria-label={label}
            >
              <Icon className="w-5 h-5 text-foreground/70 group-hover:text-accent transition-colors" />
            </a>
          ))}
        </div>

        {/* CTA Button */}
        <div
          className={`pt-8 transition-all duration-1000 delay-700 ${isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
        >
          <a
            href="#writeups"
            className="inline-block px-8 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-all duration-300 hover:shadow-lg hover:shadow-primary/50 hover:scale-105"
          >
            Explore My Work
          </a>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-6 h-6 text-accent/50" />
        </div>
      </div>
    </section>
  )
}
