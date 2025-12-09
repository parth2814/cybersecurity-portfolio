"use client"

import { useEffect, useState } from "react"

export default function Experience() {
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

    const element = document.getElementById("experience-section")
    if (element) observer.observe(element)

    return () => observer.disconnect()
  }, [])

  const experiences = [
    {
      title: "SOC Analyst",
      duration: "1 Year",
      description:
        "Monitoring and analyzing security events, managing SIEM platforms, and responding to security incidents in real-time.",
      highlights: ["Threat Detection", "Incident Response", "Log Analysis", "Alert Triage"],
    },
    {
      title: "CTF Competitor",
      duration: "Ongoing",
      description:
        "Active participant in Capture The Flag competitions, developing expertise in exploitation, reverse engineering, and cryptography.",
      highlights: ["15+ Competitions", "Web Exploitation", "Reverse Engineering", "Cryptography"],
    },
    {
      title: "Security Researcher",
      duration: "Ongoing",
      description:
        "Pursuing advanced certifications and continuously learning new security techniques and methodologies.",
      highlights: ["eJPT Certified", "PT1 Certified", "CPTS In Progress", "Continuous Learning"],
    },
  ]

  return (
    <section className="py-20 px-4 bg-background">
      <div className="max-w-6xl mx-auto" id="experience-section">
        <h2 className="text-4xl font-bold mb-12">Experience & Journey</h2>

        <div className="space-y-8">
          {experiences.map((exp, i) => (
            <div
              key={exp.title}
              className={`p-8 bg-card/50 rounded-lg border border-border transition-all duration-500 hover:border-accent hover:shadow-lg hover:shadow-accent/10 ${
                isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
              }`}
              style={{ transitionDelay: `${i * 150}ms` }}
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-accent">{exp.title}</h3>
                  <p className="text-foreground/60 text-sm mt-1">{exp.duration}</p>
                </div>
              </div>

              <p className="text-foreground/80 mb-4 leading-relaxed">{exp.description}</p>

              <div className="flex flex-wrap gap-2">
                {exp.highlights.map((highlight) => (
                  <span
                    key={highlight}
                    className="px-3 py-1 bg-accent/10 text-accent text-sm rounded-full border border-accent/20 hover:border-accent transition-colors"
                  >
                    {highlight}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
