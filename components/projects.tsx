import { Github, ExternalLink, Star } from "lucide-react"
import { getAllProjects } from "@/lib/projects"

export default function Projects() {
  const projects = getAllProjects()

  return (
    <section id="projects" className="py-20 px-4 bg-card/30">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold mb-4">Projects</h2>
        <p className="text-foreground/70 mb-12">Security tools, research projects, and open source contributions</p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div
              key={project.slug}
              className="group p-6 bg-background rounded-lg border border-border hover:border-accent transition-all duration-300 hover:shadow-lg hover:shadow-accent/10"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold group-hover:text-accent transition-colors">{project.name}</h3>
                </div>
                <span
                  className={`ml-2 text-xs px-2 py-1 rounded border transition-all ${
                    project.status === "active"
                      ? "bg-green-500/10 border-green-500/30 text-green-400"
                      : project.status === "maintained"
                        ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                        : "bg-gray-500/10 border-gray-500/30 text-gray-400"
                  }`}
                >
                  {project.status}
                </span>
              </div>

              {/* Description */}
              <p className="text-sm text-foreground/70 mb-4 line-clamp-2">{project.description}</p>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-6">
                {project.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 text-xs bg-card rounded border border-border text-foreground/60 hover:border-accent/50 transition-colors"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div className="flex items-center gap-2">
                  {project.stars && (
                    <div className="flex items-center gap-1 text-xs text-foreground/60">
                      <Star className="w-3 h-3" />
                      {project.stars}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {project.demo && (
                    <a
                      href={project.demo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded hover:bg-card transition-colors"
                      aria-label="View demo"
                    >
                      <ExternalLink className="w-4 h-4 text-foreground/60 hover:text-accent transition-colors" />
                    </a>
                  )}
                  {project.github && (
                    <a
                      href={project.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded hover:bg-card transition-colors"
                      aria-label="View on GitHub"
                    >
                      <Github className="w-4 h-4 text-foreground/60 hover:text-accent transition-colors" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {projects.length === 0 && (
          <div className="text-center py-12">
            <p className="text-foreground/60">No projects yet. Check back soon!</p>
          </div>
        )}
      </div>
    </section>
  )
}
