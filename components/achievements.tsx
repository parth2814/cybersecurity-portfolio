"use client"

import { useEffect, useState } from "react"

export default function Achievements() {
  const [counts, setCounts] = useState({ bounties: 0, ctf: 0, certs: 0, talks: 0 })
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

    const element = document.getElementById("achievements-section")
    if (element) observer.observe(element)

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!isVisible) return

    const targets = { bounties: 50, ctf: 15, certs: 2, talks: 8 }
    const duration = 2000
    const steps = 60

    let currentStep = 0
    const interval = setInterval(() => {
      currentStep++
      const progress = currentStep / steps

      setCounts({
        bounties: Math.floor(targets.bounties * progress),
        ctf: Math.floor(targets.ctf * progress),
        certs: Math.floor(targets.certs * progress),
        talks: Math.floor(targets.talks * progress),
      })

      if (currentStep >= steps) {
        clearInterval(interval)
        setCounts(targets)
      }
    }, duration / steps)

    return () => clearInterval(interval)
  }, [isVisible])

  const achievements = [
    { label: "Bug Bounties", value: counts.bounties, icon: "🎯" },
    { label: "CTF Competitions", value: counts.ctf, icon: "🏆" },
    { label: "Certifications", value: counts.certs, icon: "📜" },
    { label: "Conference Talks", value: counts.talks, icon: "🎤" },
  ]

  return (
    <section className="py-20 px-4 bg-card/30">
      <div className="max-w-6xl mx-auto" id="achievements-section">
        <h2 className="text-4xl font-bold mb-12">Achievements</h2>

        <div className="grid md:grid-cols-4 gap-6">
          {achievements.map((achievement, i) => (
            <div
              key={achievement.label}
              className={`p-6 bg-background rounded-lg border border-border text-center transition-all duration-500 hover:border-accent hover:shadow-lg hover:shadow-accent/10 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <div className="text-4xl mb-4">{achievement.icon}</div>
              <div className="text-3xl font-bold text-accent mb-2">{achievement.value}+</div>
              <p className="text-foreground/70">{achievement.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
