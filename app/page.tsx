import Navigation from "@/components/navigation"
import Hero from "@/components/hero"
import About from "@/components/about"
import Experience from "@/components/experience"
import Writeups from "@/components/writeups"
import Projects from "@/components/projects"
import Certifications from "@/components/certifications"
import Achievements from "@/components/achievements"
import Contact from "@/components/contact"
import Footer from "@/components/footer"

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <Navigation />
      <Hero />
      <About />
      <Experience />
      <Writeups />
      <Projects />
      <Certifications />
      <Achievements />
      <Contact />
      <Footer />
    </main>
  )
}
