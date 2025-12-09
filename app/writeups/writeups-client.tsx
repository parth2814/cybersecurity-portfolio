"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Search, ChevronRight } from "lucide-react"
import type { Writeup } from "@/lib/writeups"

interface WriteupsClientProps {
  writeups: Writeup[]
  categories: string[]
}

export default function WriteupsClient({ writeups, categories }: WriteupsClientProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const filteredWriteups = useMemo(() => {
    return writeups.filter((writeup) => {
      const matchesCategory = !selectedCategory || writeup.category === selectedCategory
      const matchesSearch =
        writeup.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        writeup.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        writeup.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      return matchesCategory && matchesSearch
    })
  }, [selectedCategory, searchQuery, writeups])

  return (
    <main className="min-h-screen bg-background pt-24 pb-20">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Writeups & Research</h1>
          <p className="text-foreground/70 text-lg">
            Detailed walkthroughs of security challenges, vulnerabilities, and research findings.
          </p>
        </div>

        {/* Search and Filter */}
        <div className="mb-12 space-y-6">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/50" />
            <input
              type="text"
              placeholder="Search writeups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-card border border-border rounded-lg text-foreground placeholder-foreground/50 focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedCategory === null
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-foreground/70 hover:border-accent"
              }`}
            >
              All Categories
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
        </div>

        {/* Writeups Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredWriteups.length > 0 ? (
            filteredWriteups.map((writeup) => (
              <Link
                key={writeup.slug}
                href={`/writeups/${writeup.slug}`}
                className="group p-6 bg-card border border-border rounded-lg hover:border-accent transition-all duration-300 hover:shadow-lg hover:shadow-accent/10"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="text-xs font-mono text-accent mb-2">{writeup.platform}</div>
                    <h3 className="text-lg font-bold group-hover:text-accent transition-colors line-clamp-2">
                      {writeup.title}
                    </h3>
                  </div>
                  <span className="ml-2 text-xs px-2 py-1 bg-background rounded border border-border text-foreground/60">
                    {writeup.difficulty}
                  </span>
                </div>

                <p className="text-sm text-foreground/70 mb-4 line-clamp-2">{writeup.excerpt}</p>

                <div className="flex flex-wrap gap-2 mb-4">
                  {writeup.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 text-xs bg-background rounded border border-border text-foreground/60"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs text-foreground/50 pt-4 border-t border-border">
                  <span>{writeup.readingTime} min read</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-foreground/60">No writeups found matching your criteria.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}