import fs from "fs"
import path from "path"
import matter from "gray-matter"

// ---------------- INTERFACES ----------------

export interface ProjectFrontmatter {
  name: string
  description: string
  tags: string[]
  github?: string
  demo?: string
  status: "active" | "maintained" | "archived"
  stars?: number
  featured?: boolean
}

export interface Project extends ProjectFrontmatter {
  slug: string
  content: string
}

// ---------------- CONFIG ----------------

const PROJECTS_DIRECTORY = path.join(process.cwd(), "content", "projects")


// Cache projects in memory for performance
let cachedProjects: Project[] | null = null

// ---------------- LOADERS ----------------

export function getAllProjects(): Project[] {
  // Return cached projects if available
  if (cachedProjects) {
    return cachedProjects
  }

  // Check if directory exists
  if (!fs.existsSync(PROJECTS_DIRECTORY)) {
    console.warn(`Projects directory not found: ${PROJECTS_DIRECTORY}`)
    return []
  }

  // Read markdown files
  const fileNames = fs.readdirSync(PROJECTS_DIRECTORY)
  const markdownFiles = fileNames.filter((file) => file.endsWith(".md"))

  const projects = markdownFiles.map((fileName) => {
    const slug = fileName.replace(/\.md$/, "")
    const fullPath = path.join(PROJECTS_DIRECTORY, fileName)
    const fileContents = fs.readFileSync(fullPath, "utf8")

    const { data, content } = matter(fileContents)

    return {
      slug,
      name: data.name || slug,
      description: data.description || "",
      tags: data.tags || [],
      github: data.github,
      demo: data.demo,
      status: data.status || "active",
      stars: data.stars || 0,
      featured: data.featured || false,
      content,
    } as Project
  })

  // Sort projects:
  // 1. Featured first
  // 2. Then by stars (desc)
  cachedProjects = projects.sort((a, b) => {
    if (a.featured && !b.featured) return -1
    if (!a.featured && b.featured) return 1
    return (b.stars || 0) - (a.stars || 0)
  })

  return cachedProjects
}

// ---------------- HELPERS ----------------

export function getProjectBySlug(slug: string): Project | null {
  const projects = getAllProjects()
  return projects.find((p) => p.slug === slug) || null
}

export function getFeaturedProjects(): Project[] {
  return getAllProjects()
    .filter((p) => p.featured || p.status === "active")
    .slice(0, 3)
}

export function getProjectTags(): string[] {
  const projects = getAllProjects()
  return Array.from(new Set(projects.flatMap((p) => p.tags)))
}
