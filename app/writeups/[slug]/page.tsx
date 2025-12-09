import { notFound } from "next/navigation"
import { getWriteupBySlug, getAllWriteups, Heading } from "@/lib/writeups"
import { ChevronLeft, ChevronRight, Calendar, Clock, BookOpen } from "lucide-react"
import Link from "next/link"
import ReactMarkdown from "react-markdown"

// Helper function to extract text from React children
const getTextFromChildren = (children: any): string => {
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) {
    return children.map(getTextFromChildren).join('');
  }
  if (children?.props?.children) {
    return getTextFromChildren(children.props.children);
  }
  return String(children || '');
};

// Helper function to slugify text
const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// TOC Component
const TableOfContents = ({ headings }: { headings: Heading[] }) => {
  if (headings.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="flex items-center gap-2 text-lg font-semibold border-b border-border pb-2 text-accent">
        <BookOpen className="w-5 h-5" />
        Table of Contents
      </h3>
      <nav>
        <ul className="space-y-2 text-sm">
          {headings.map((heading) => (
            <li key={heading.slug} className={`${heading.level === 2 ? 'pl-4' : ''}`}>
              <a 
                href={`#${heading.slug}`} 
                className="text-foreground/70 hover:text-accent transition-colors"
              >
                {heading.text}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

export async function generateStaticParams() {
  const writeups = getAllWriteups()
  return writeups.map((writeup) => ({
    slug: writeup.slug,
  }))
}

// FIX: The component now awaits the params Promise to resolve the Next.js Error
export default async function WriteupPage({ params }: { params: Promise<{ slug: string }> }) {
  
  // Await the params to resolve the Promise
  const { slug } = await params

  const writeup = getWriteupBySlug(slug)

  if (!writeup) {
    notFound()
  }

  const allWriteups = getAllWriteups()
  const currentIndex = allWriteups.findIndex((w) => w.slug === slug)
  const previousWriteup = currentIndex < allWriteups.length - 1 ? allWriteups[currentIndex + 1] : null
  const nextWriteup = currentIndex > 0 ? allWriteups[currentIndex - 1] : null
  
  return (
    <main className="min-h-screen bg-background pt-24 pb-20">
      <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-4 lg:gap-10">

        {/* Main Content Area (3/4 width on large screens) */}
        <div className="lg:col-span-3">
          <article className="max-w-3xl lg:max-w-full mx-auto">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-foreground/60 mb-8">
              <Link href="/" className="hover:text-accent transition-colors">Home</Link>
              <span>/</span>
              <Link href="/writeups" className="hover:text-accent transition-colors">Writeups</Link>
              <span>/</span>
              <span className="text-foreground">{writeup.title}</span>
            </div>

            {/* Header */}
            <header className="mb-12">
              <div className="mb-4 flex items-center gap-2">
                <span className="text-xs font-mono text-accent">{writeup.platform}</span>
                <span className="text-xs px-2 py-1 bg-card rounded border border-border text-foreground/60">
                  {writeup.difficulty}
                </span>
              </div>

              <h1 className="text-4xl md:text-5xl font-bold mb-6">{writeup.title}</h1>

              <div className="flex flex-wrap gap-6 text-sm text-foreground/60 mb-6">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {new Date(writeup.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {writeup.readingTime} min read
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {writeup.tags.map((tag) => (
                  <span key={tag} className="px-3 py-1 text-xs bg-card rounded border border-border text-foreground/70">
                    {tag}
                  </span>
                ))}
              </div>
            </header>

            {/* Content with Hydration Fix */}
            <div className="prose prose-invert max-w-none mb-12 break-words"> 
              <ReactMarkdown
                components={{
                  h1: ({ node, ...props }) => {
                    const text = getTextFromChildren(props.children);
                    const id = slugify(text); 
                    return <h1 id={id} className="text-3xl font-bold mt-8 mb-4" {...props} />;
                  },
                  h2: ({ node, ...props }) => {
                    const text = getTextFromChildren(props.children);
                    const id = slugify(text); 
                    return <h2 id={id} className="text-2xl font-bold mt-6 mb-3" {...props} />;
                  },
                  h3: ({ node, ...props }) => <h3 className="text-xl font-bold mt-4 mb-2" {...props} />,
                  
                  img: ({ node, ...props }) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      className="rounded-lg border border-border my-6 w-full"
                      loading="lazy"
                      alt={props.alt || "Writeup image"}
                      {...props}
                    />
                  ),
                  // Block code container: Apply styling to the <pre> tag
                  pre: ({ node, ...props }) => (
                    <pre 
                      className="block p-4 bg-card rounded border border-border text-foreground/80 font-mono text-sm overflow-x-auto mb-4"
                      {...props} 
                    />
                  ),
                  // Inline code: Apply styling to the <code> tag
                  code: ({ node, inline, ...props }) =>
                    inline ? (
                      <code
                        className="px-2 py-1 bg-card rounded border border-border text-accent font-mono text-sm"
                        {...props}
                      />
                    ) : (
                      // Block code: No extra styling needed here as 'pre' takes the background/border
                      <code {...props} />
                    ),
                  
                  ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-4 space-y-2" {...props} />,
                  ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-4 space-y-2" {...props} />,
                  li: ({ node, ...props }) => <li className="text-foreground/80" {...props} />,
                  blockquote: ({ node, ...props }) => (
                    <blockquote className="border-l-4 border-accent pl-4 py-2 mb-4 italic text-foreground/70" {...props} />
                  ),
                  a: ({ node, ...props }) => <a className="text-accent hover:text-accent/80 underline" {...props} />,
                }}
              >
                {writeup.content}
              </ReactMarkdown>
            </div>

            {/* Navigation */}
            <div className="grid md:grid-cols-2 gap-6 pt-12 border-t border-border">
              {previousWriteup ? (
                <Link
                  href={`/writeups/${previousWriteup.slug}`}
                  className="p-4 bg-card border border-border rounded-lg hover:border-accent transition-all group"
                >
                  <div className="flex items-center gap-2 text-sm text-foreground/60 mb-2">
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </div>
                  <h3 className="font-semibold group-hover:text-accent transition-colors">{previousWriteup.title}</h3>
                </Link>
              ) : (
                <div />
              )}

              {nextWriteup ? (
                <Link
                  href={`/writeups/${nextWriteup.slug}`}
                  className="p-4 bg-card border border-border rounded-lg hover:border-accent transition-all group text-right"
                >
                  <div className="flex items-center justify-end gap-2 text-sm text-foreground/60 mb-2">
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </div>
                  <h3 className="font-semibold group-hover:text-accent transition-colors">{nextWriteup.title}</h3>
                </Link>
              ) : (
                <div />
              )}
            </div>
          </article>
        </div>

        {/* TOC Sidebar */}
        <aside className="hidden lg:block lg:col-span-1 sticky top-24 h-fit max-h-[calc(100vh-6rem)] overflow-y-auto pt-20">
          <TableOfContents headings={writeup.headings} />
        </aside>
      </div>
    </main>
  )
} 