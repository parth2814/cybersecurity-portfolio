"use client"

import type React from "react"
import { useState } from "react"
import { Mail, Linkedin, Github, Twitter, CheckCircle, AlertCircle, Loader } from "lucide-react"
import emailjs from "@emailjs/browser"

const EMAILJS_SERVICE_ID = "service_3z3dalc"   // e.g. service_abc123
const EMAILJS_TEMPLATE_ID = "template_x3oaly9" // e.g. template_xyz456
const EMAILJS_PUBLIC_KEY = "1x1GPvxORyXtJt48W"   // e.g. user_xxxxxxxx

export default function Contact() {
  const [formData, setFormData] = useState({ name: "", email: "", message: "" })
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.email || !formData.message) return

    setStatus("loading")

    try {
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          from_name: formData.name,
          from_email: formData.email,
          message: formData.message,
          to_email: "parthkpanchal12@gmail.com",
        },
        EMAILJS_PUBLIC_KEY,
      )
      setStatus("success")
      setFormData({ name: "", email: "", message: "" })
    } catch (err) {
      console.error("EmailJS error:", err)
      setStatus("error")
    }
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
              required
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground placeholder-foreground/50 focus:outline-none focus:border-accent"
            />
            <input
              type="email"
              placeholder="Your Email"
              value={formData.email}
              required
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground placeholder-foreground/50 focus:outline-none focus:border-accent"
            />
            <textarea
              placeholder="Your Message"
              value={formData.message}
              required
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground placeholder-foreground/50 focus:outline-none focus:border-accent resize-none"
            />

            {/* Status Messages */}
            {status === "success" && (
              <div className="flex items-center gap-2 text-green-400 text-sm">
                <CheckCircle size={16} />
                <span>Message sent! I'll get back to you soon.</span>
              </div>
            )}
            {status === "error" && (
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle size={16} />
                <span>Something went wrong. Try emailing me directly.</span>
              </div>
            )}

            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {status === "loading" ? (
                <>
                  <Loader size={16} className="animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Message"
              )}
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
                <a
                  href="https://github.com/parth2814"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-foreground/70 hover:text-accent transition-colors"
                >
                  <Github size={20} />
                  <span>GitHub</span>
                </a>
                <a
                  href="https://linkedin.com/in/m0n4rch"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-foreground/70 hover:text-accent transition-colors"
                >
                  <Linkedin size={20} />
                  <span>LinkedIn</span>
                </a>
                <a
                  href="https://x.com/052Parth"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-foreground/70 hover:text-accent transition-colors"
                >
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