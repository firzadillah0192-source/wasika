"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function ProfileRedirect() {
  const router = useRouter()

  useEffect(() => {
    async function redirect() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace("/login")
        return
      }

      // Find the person associated with this user
      const { data: person } = await supabase
        .from("persons")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle()

      if (person) {
        router.replace(`/profile/${person.id}`)
      } else {
        // If no person record, go to the silsilah form to create one
        router.replace("/form")
      }
    }
    redirect()
  }, [router])

  return (
    <div className="min-h-screen bg-wasika-dark flex items-center justify-center">
      <div className="text-wasika-gold animate-pulse">Menuju profil...</div>
    </div>
  )
}
