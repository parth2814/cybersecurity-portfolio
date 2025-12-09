import fs from "fs"
import path from "path"
import matter from "gray-matter"

// --- NEW INTERFACES ---
export interface Heading {
  level: 1 | 2;
  text: string;
  slug: string;
}

export interface WriteupFrontmatter {
  title: string
  date: string
  platform: string
  category: string
  tags: string[]
  difficulty: "Easy" | "Medium" | "Hard" | "Insane" | "Beginner" | "Intermediate" | "Advanced" | "Expert"
  coverImage?: string
  excerpt: string
  readingTime: number
  featured?: boolean
}

export interface Writeup extends WriteupFrontmatter {
  slug: string
  content: string
  imagesFolder?: string
  headings: Heading[]; // Added field for Table of Contents
}
// --- END NEW INTERFACES ---

// --- NEW SLUGIFY HELPER ---
const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, '-') // Replace spaces and non-word chars with a single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};

export function getWriteupImagesPath(slug: string): string {
  return `/images/${slug}_images`
}

export function hasWriteupImages(slug: string): boolean {
  const imagesPath = path.join(process.cwd(), "public", "images", `${slug}_images`)
  return fs.existsSync(imagesPath)
}

const WRITEUPS_DIRECTORY = path.join(process.cwd(), "content/writeups")

// Cache writeups in memory for better performance
let cachedWriteups: Writeup[] | null = null

export function getAllWriteups(): Writeup[] {
  // Return cached writeups if available
  if (cachedWriteups) {
    return cachedWriteups
  }

  // Check if directory exists
  if (!fs.existsSync(WRITEUPS_DIRECTORY)) {
    console.warn(`Writeups directory not found: ${WRITEUPS_DIRECTORY}`)
    return []
  }

  // Get all markdown files
  const fileNames = fs.readdirSync(WRITEUPS_DIRECTORY)
  const markdownFiles = fileNames.filter((fileName) => fileName.endsWith(".md"))

  const writeups = markdownFiles.map((fileName) => {
    // Remove .md extension to get slug
    const slug = fileName.replace(/.md$/, "")

    // Read file content
    const fullPath = path.join(WRITEUPS_DIRECTORY, fileName)
    const fileContents = fs.readFileSync(fullPath, "utf8")

    // Parse frontmatter
    const { data, content } = matter(fileContents)

    // *** NEW: Extract Headings for TOC and store them with unique slugs ***
    const headings: Heading[] = [];
    // Regex for H1 and H2
    const headingRegex = /^(#{1,2})\s+(.*)$/gm;
    const tempContent = content; 
    let headingMatch;

    while ((headingMatch = headingRegex.exec(tempContent)) !== null) {
      const hashes = headingMatch[1];
      const text = headingMatch[2].trim();
      const level = hashes.length as 1 | 2;

      const headingSlug = slugify(text);
      headings.push({ level, text, slug: headingSlug });
    }
    
    // Process content to fix image paths
    let processedContent = content

    // 1. Convert Obsidian-style image links ![[image.png]] to markdown standard ![image.png](image.png)
    processedContent = processedContent.replace(/!\[\[([^\]]+)\]\]/g, (match, imageName) => {
      const [src, alt] = imageName.split('|').map((s: string) => s.trim());
      return `![${alt || src}](${src})`;
    })

    // 2. Fix the /public/images/... typo for absolute paths (for existing content error)
    processedContent = processedContent.replace(
      /!\[([^\]]*)\]\(\/public\/images\/([^\)]+)\)/g,
      (match, alt, imagePath) => {
        // Correct the URL by removing /public
        return `![${alt}](/images/${imagePath})`
      }
    )

    // 3. Convert relative image paths to writeup-specific images folder path
    processedContent = processedContent.replace(
      /!\[([^\]]*)\]\(([^)]+)\)/g,
      (match, alt, imagePath) => {
        // If image path is relative (doesn't start with http or /) and not already a /public/... link (handled above)
        if (!imagePath.startsWith("http") && !imagePath.startsWith("/")) {
          
          let cleanPath = imagePath.startsWith('./') ? imagePath.slice(2) : imagePath;
          const encodedImagePath = cleanPath.split('/').map((part: string | number | boolean) => encodeURIComponent(part)).join('/')
          
          return `![${alt}](/images/${slug}_images/${encodedImagePath})`
        }
        return match
      }
    )

    return {
      slug,
      title: data.title || slug,
      date: data.date || new Date().toISOString(),
      platform: data.platform || "Unknown",
      category: data.category || "Uncategorized",
      tags: data.tags || [],
      difficulty: data.difficulty || "Medium",
      coverImage: data.coverImage,
      excerpt: data.excerpt || content.substring(0, 150) + "...",
      readingTime: data.readingTime || Math.ceil(content.split(/\s+/).length / 200),
      featured: data.featured || false,
      content: processedContent,
      imagesFolder: hasWriteupImages(slug) ? getWriteupImagesPath(slug) : undefined,
      headings, // Added headings
    } as Writeup
  })

  // Sort by date (newest first)
  cachedWriteups = writeups.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  return cachedWriteups
}

export function getWriteupBySlug(slug: string): Writeup | null {
  const writeups = getAllWriteups()
  return writeups.find((w) => w.slug === slug) || null
}

export function getFeaturedWriteups(): Writeup[] {
  return getAllWriteups()
    .filter((w) => w.featured)
    .slice(0, 3)
}

export function getWriteupsByCategory(category: string): Writeup[] {
  return getAllWriteups().filter((w) => w.category === category)
}

export function getCategories(): string[] {
  const writeups = getAllWriteups()
  return Array.from(new Set(writeups.map((w) => w.category)))
}

export function getPlatforms(): string[] {
  const writeups = getAllWriteups()
  return Array.from(new Set(writeups.map((w) => w.platform)))
}