"use client"

import type React from "react"

import { useState } from "react"
import { Mail, Linkedin, Github, Twitter } from "lucide-react"

export default function Contact() {
  const [formData, setFormData] = useState({ name: "", email: "", message: "" })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Form submitted:", formData)
    setFormData({ name: "", email: "", message: "" })
  }

  return (
    <section id="contact" className="py-20 px-4">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-4xl font-bold mb-12 text-center">Get In Touch</h2>

        <div className="grid md:grid-cols-2 gap-12">
          {/* Contact Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              placeholder="Your Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground placeholder-foreground/50 focus:outline-none focus:border-accent"
            />
            <input
              type="email"
              placeholder="Your Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground placeholder-foreground/50 focus:outline-none focus:border-accent"
            />
            <textarea
              placeholder="Your Message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground placeholder-foreground/50 focus:outline-none focus:border-accent resize-none"
            />
            <button
              type="submit"
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
            >
              Send Message
            </button>
          </form>

          {/* Contact Info */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold mb-4">Connect With Me</h3>
              <div className="space-y-3">
                <a
                  href="mailto:parthkpanchal12@gmail.com"
                  className="flex items-center gap-3 text-foreground/70 hover:text-accent transition-colors"
                >
                  <Mail size={20} />
                  <span>parthkpanchal12@gmail.com</span>
                </a>
                <a href="#" className="flex items-center gap-3 text-foreground/70 hover:text-accent transition-colors">
                  <Github size={20} />
                  <span>GitHub</span>
                </a>
                <a href="#" className="flex items-center gap-3 text-foreground/70 hover:text-accent transition-colors">
                  <Linkedin size={20} />
                  <span>LinkedIn</span>
                </a>
                <a href="#" className="flex items-center gap-3 text-foreground/70 hover:text-accent transition-colors">
                  <Twitter size={20} />
                  <span>Twitter</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
