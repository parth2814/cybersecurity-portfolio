import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { getAllWriteups } from "@/lib/writeups"

export default function Writeups() {
  // Get the 3 most recent writeups
  const writeups = getAllWriteups().slice(0, 3)

  return (
    <section id="writeups" className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-12">
          <h2 className="text-4xl font-bold">Writeups & Research</h2>
          <Link
            href="/writeups"
            className="text-accent hover:text-accent/80 transition-colors flex items-center gap-2 text-sm font-medium"
          >
            View All
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {writeups.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {writeups.map((writeup) => (
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
                  <span className="ml-2 text-xs px-2 py-1 bg-background rounded border border-border text-foreground/60 shrink-0">
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
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-foreground/60">No writeups available yet. Check back soon!</p>
          </div>
        )}
      </div>
    </section>
  )
}