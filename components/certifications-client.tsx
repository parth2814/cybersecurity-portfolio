"use client"

import { useState } from "react"
import { ExternalLink, Award } from "lucide-react"
import type { Certification } from "@/lib/certifications"

interface CertificationsClientProps {
  certifications: Certification[]
  categories: string[]
}

export default function CertificationsClient({ certifications, categories }: CertificationsClientProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const filteredCerts = selectedCategory
    ? certifications.filter((c) => c.category === selectedCategory)
    : certifications

  return (
    <section id="certifications" className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold mb-4">Certifications</h2>
        <p className="text-foreground/70 mb-12">Professional credentials and achievements</p>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-12">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              selectedCategory === null
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-foreground/70 hover:border-accent"
            }`}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedCategory === category
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-foreground/70 hover:border-accent"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Certifications Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCerts.map((cert) => (
            <div
              key={cert.name}
              className="group p-6 bg-card border border-border rounded-lg hover:border-accent transition-all duration-300 hover:shadow-lg hover:shadow-accent/10"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-background rounded-lg group-hover:bg-primary/10 transition-colors">
                  <Award className="w-6 h-6 text-accent" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold group-hover:text-accent transition-colors">{cert.name}</h3>
                  <p className="text-sm text-foreground/60">{cert.issuer}</p>
                </div>
              </div>

              <div className="mb-4 text-sm text-foreground/70">
                <p>Earned: {new Date(cert.date).toLocaleDateString("en-US", { year: "numeric", month: "long" })}</p>
                {cert.credentialId && <p className="text-xs text-foreground/50 mt-1">ID: {cert.credentialId}</p>}
              </div>

              {cert.credentialUrl && (
                <a
                  href={cert.credentialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-accent hover:text-accent/80 transition-colors"
                >
                  Verify Credential
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          ))}
        </div>

        {filteredCerts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-foreground/60">No certifications in this category.</p>
          </div>
        )}
      </div>
    </section>
  )
}