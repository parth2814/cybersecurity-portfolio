"use client"

import { useEffect, useState } from "react"

export default function About() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 },
    )

    const element = document.getElementById("about-section")
    if (element) observer.observe(element)

    return () => observer.disconnect()
  }, [])

  return (
    <section id="about" className="py-20 px-4 bg-card/30">
      <div className="max-w-5xl mx-auto" id="about-section">
        <h2 className="text-4xl font-bold mb-12 text-center">About Me</h2>

        {/* Main Bio Content */}
        <div
          className={`mb-16 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <div className="prose prose-invert max-w-none">
            <p className="text-lg text-foreground/90 leading-relaxed mb-6">
              Hi, I'm <span className="font-mono text-accent font-semibold">0xMon4rch</span>, a cybersecurity
              professional passionate about defending digital infrastructure and uncovering vulnerabilities before
              malicious actors can exploit them. With a B.Tech from <span className="font-semibold">Nirma University</span>, 
              I've built my career at the intersection of offensive and defensive security.
            </p>

            <p className="text-lg text-foreground/90 leading-relaxed mb-6">
              Currently working as a <span className="font-semibold text-accent">SOC Analyst</span>, I spend my days
              monitoring security events, analyzing threats, and responding to incidents in real-time. My experience in
              security operations has given me deep insights into how attackers think and operate, which I leverage to
              build more resilient defense strategies.
            </p>

            <p className="text-lg text-foreground/90 leading-relaxed mb-6">
              Beyond my day job, I'm an active member of the cybersecurity community. I regularly participate in CTF
              competitions (15+ and counting), where I sharpen my skills in areas like web exploitation, cryptography,
              reverse engineering, and privilege escalation. I also share my knowledge through detailed writeups,
              helping others learn from the challenges I've conquered.
            </p>

            <p className="text-lg text-foreground/90 leading-relaxed">
              My approach to security is simple: <span className="italic text-accent">stay curious, think like an
              attacker, and never stop learning</span>. The threat landscape evolves every day, and I'm committed to
              evolving with it—whether that's through hands-on penetration testing, research, or pursuing advanced
              certifications to formalize my expertise.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Years Experience", value: "1+", icon: "💼" },
            { label: "CTF Competitions", value: "15+", icon: "🏆" },
            { label: "Certifications", value: "2+", icon: "📜" },
            { label: "Writeups Published", value: "10+", icon: "📝" },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className={`p-6 bg-background rounded-lg border border-border transition-all duration-500 hover:border-accent hover:scale-105 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <div className="text-3xl mb-2">{stat.icon}</div>
              <div className="text-2xl font-bold text-accent">{stat.value}</div>
              <div className="text-sm text-foreground/60 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}