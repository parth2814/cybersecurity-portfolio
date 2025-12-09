# 🔐 Cybersecurity Portfolio

A modern, responsive portfolio website showcasing cybersecurity projects, CTF writeups, certifications, and professional experience. Built with Next.js 14, TypeScript, and Tailwind CSS.

## 🌟 Features

- **Interactive Design**: Modern UI with smooth animations and transitions
- **CTF Writeups**: Detailed walkthroughs of Hack The Box challenges and CTF competitions
- **Project Showcase**: Security tools and applications I've developed
- **Certifications**: Display of professional security certifications
- **Experience Timeline**: Career progression and achievements
- **Dark/Light Mode**: Toggle between themes for comfortable viewing
- **Responsive Design**: Optimized for all devices (desktop, tablet, mobile)
- **Fast Performance**: Built with Next.js for optimal loading speeds
- **SEO Optimized**: Proper meta tags and structure for search engines

## 🛠️ Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Deployment**: [Vercel](https://vercel.com/)

## 📁 Project Structure

```
cybersecurity-portfolio/
├── app/                      # Next.js app directory
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Homepage
│   └── writeups/            # CTF writeups pages
├── components/              # React components
│   ├── ui/                  # shadcn/ui components
│   ├── about.tsx
│   ├── certifications.tsx
│   ├── contact.tsx
│   ├── experience.tsx
│   ├── hero.tsx
│   ├── navigation.tsx
│   ├── projects.tsx
│   └── writeups.tsx
├── content/                 # Content files
│   ├── certifications.json
│   ├── projects/           # Project markdown files
│   └── writeups/           # CTF writeup markdown files
├── lib/                    # Utility functions
├── public/                 # Static assets
│   └── images/            # Screenshots and images
└── styles/                # Additional styles
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or pnpm package manager

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/parth2814/cybersecurity-portfolio.git
cd cybersecurity-portfolio
```

2. **Install dependencies**
```bash
npm install
# or
pnpm install
```

3. **Run the development server**
```bash
npm run dev
# or
pnpm dev
```

4. **Open your browser**
Navigate to [http://localhost:3000](http://localhost:3000)

## 📝 Adding Content

### Adding a New CTF Writeup

1. Create a new markdown file in `content/writeups/`:
```bash
content/writeups/your-writeup-name.md
```

2. Add frontmatter and content:
```markdown
---
title: "Machine Name - Difficulty"
date: "2024-12-09"
platform: "HackTheBox"
difficulty: "Medium"
tags: ["Web", "Linux", "Privilege Escalation"]
---

Your writeup content here...
```

3. Add images to `public/images/your-writeup-name_images/`

### Adding a New Project

1. Create a new markdown file in `content/projects/`:
```bash
content/projects/your-project-name.md
```

2. Follow the same frontmatter format as writeups

### Adding Certifications

Edit `content/certifications.json` and add your certification details.

## 🎨 Customization

### Colors and Theme

Edit `app/globals.css` to customize the color scheme:
```css
:root {
  --primary: your-color;
  --secondary: your-color;
  /* ... */
}
```

### Content

- Update personal information in `components/about.tsx`
- Modify hero section in `components/hero.tsx`
- Edit contact details in `components/contact.tsx`

## 📦 Build for Production

```bash
npm run build
npm start
```

## 🌐 Deployment

This project is configured for easy deployment on Vercel:

1. Push your code to GitHub
2. Import the repository in [Vercel](https://vercel.com)
3. Vercel will auto-detect Next.js and deploy
4. Your site will be live with automatic deployments on every push

### Other Deployment Options

- **Netlify**: Connect your GitHub repository
- **AWS Amplify**: Deploy via AWS Console
- **Docker**: Use the provided Dockerfile (if added)

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/parth2814/cybersecurity-portfolio/issues).

## 📧 Contact

**Parth Panchal**
- GitHub: [@parth2814](https://github.com/parth2814)
- Email: parthkpanchal12@gmail.com
- Portfolio: [Your deployed URL]

## 🙏 Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) for the beautiful component library
- [Hack The Box](https://www.hackthebox.com/) for the amazing platform
- [Vercel](https://vercel.com/) for seamless deployment

---

⭐ Star this repo if you find it helpful!

**Made with ❤️ and ☕ by Parth Panchal**
