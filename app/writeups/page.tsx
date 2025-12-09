import { getAllWriteups, getCategories } from "@/lib/writeups"
import WriteupsClient from "./writeups-client"

export default function WriteupsPage() {
  const writeups = getAllWriteups()
  const categories = getCategories()

 
  return <WriteupsClient writeups={writeups} categories={categories} />
}