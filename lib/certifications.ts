export interface Certification {
  name: string
  issuer: string
  date: string
  category: string
  credentialId?: string
  credentialUrl?: string
}

export const certifications: Certification[] = [
  {
    name: "HTB Certified Penetration Testing Specialist (CPTS)",
    issuer: "HackTheBox",
    date: "2025-04-15",
    category: "Offensive Security",
    credentialId: "HTBCERT-8894B5D1FF",
    credentialUrl: "https://www.credly.com/badges/2d071f9f-73c4-458f-9182-af04bbe9380a",
  },
  {
    name: "Junior Penetration Tester (PT1)",
    issuer: "TryHackMe",
    date: "2025-01-10",
    category: "Penetration Testing",
    credentialId: "68a92de368c3f71ed7c3c3ca",
    credentialUrl: "https://assets.tryhackme.com/certification-certificate/68a92de368c3f71ed7c3c3ca.pdf",
  },
  {
    name: "Certified AppSec Practitioner",
    issuer: "The SecOps Group",
    date: "2024-08-15",
    category: "Application Security",
    credentialUrl: "https://www.pentestingexams.com/",
  },
  {
    name: "Google Cybersecurity Specialization",
    issuer: "Google (Coursera)",
    date: "2024-06-20",
    category: "General Security",
    credentialId: "3FB59QFQ93J6",
    credentialUrl: "https://www.coursera.org/account/accomplishments/specialization/3FB59QFQ93J6",
  },
]

export function getAllCertifications(): Certification[] {
  return certifications.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export function getCategories(): string[] {
  return Array.from(new Set(certifications.map((cert) => cert.category)))
}