export interface ProjectFrontmatter {
  name: string
  description: string
  tags: string[]
  github?: string
  demo?: string
  status: "active" | "maintained" | "archived"
  stars?: number
}

export interface Project extends ProjectFrontmatter {
  slug: string
  content: string
}

// Hardcoded projects data
const PROJECTS: Project[] = [
  {
    slug: "recon-tool",
    name: "Advanced Recon Tool",
    description: "Automated reconnaissance framework for security assessments",
    tags: ["Python", "Automation", "Reconnaissance"],
    github: "https://github.com/yourusername/recon-tool",
    demo: "https://recon-tool-demo.com",
    status: "active",
    stars: 342,
    content: "A comprehensive reconnaissance tool for security professionals...",
  },
  {
    slug: "vulnerable-app",
    name: "Vulnerable Web App",
    description: "Intentionally vulnerable application for security training",
    tags: ["Node.js", "Express", "Security Training"],
    github: "https://github.com/yourusername/vulnerable-app",
    status: "maintained",
    stars: 189,
    content: "Educational vulnerable application with multiple security flaws...",
  },
  {
    slug: "api-scanner",
    name: "API Security Scanner",
    description: "Automated scanner for common API vulnerabilities",
    tags: ["Python", "API Security", "Automation"],
    github: "https://github.com/yourusername/api-scanner",
    demo: "https://api-scanner.com",
    status: "active",
    stars: 256,
    content: "Comprehensive API security scanning tool...",
  },
]

export function getAllProjects(): Project[] {
  return PROJECTS
}

export function getFeaturedProjects(): Project[] {
  return PROJECTS.filter((p) => p.status === "active").slice(0, 3)
}

export function getProjectBySlug(slug: string): Project | undefined {
  return PROJECTS.find((p) => p.slug === slug)
}
