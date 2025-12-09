import { getAllCertifications, getCategories } from "@/lib/certifications"
import CertificationsClient from "./certifications-client"

export default function Certifications() {
  const certifications = getAllCertifications()
  const categories = getCategories()

  return <CertificationsClient certifications={certifications} categories={categories} />
}