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
    name: "eJPT",
    issuer: "INE Security",
    date: "2024-09-28",
    category: "Penetration Testing",
    credentialId: "66f841b8-9f0e-4998-bf30-e9e93699ce13",
    credentialUrl: "https://certs.ine.com/66f841b8-9f0e-4998-bf30-e9e93699ce13#acc.5j03qTLB",
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