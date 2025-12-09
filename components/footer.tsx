export default function Footer() {
  return (
    <footer className="border-t border-border py-8 px-4">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-foreground/60 text-sm">
        <p>&copy; 2025 Security Researcher. All rights reserved.</p>
        <div className="flex gap-6">
          <a href="#" className="hover:text-accent transition-colors">
            Privacy
          </a>
          <a href="#" className="hover:text-accent transition-colors">
            Terms
          </a>
          <a href="#" className="hover:text-accent transition-colors">
            RSS Feed
          </a>
        </div>
      </div>
    </footer>
  )
}
