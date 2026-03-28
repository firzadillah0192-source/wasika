"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, User, Loader2 } from "lucide-react"

export default function TreeEditPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get("edit")
  const parentId = searchParams.get("parentId")
  const spouseId = searchParams.get("spouseId")
  
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [name, setName] = useState("")
  const [gender, setGender] = useState<"male" | "female">("male")
  
  const [userProfile, setUserProfile] = useState<any>(null)

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.replace("/login")

      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
      setUserProfile(profile)

      if (editId) {
        const { data: person, error: pErr } = await supabase.from("persons").select("*").eq("id", editId).single()
        if (pErr) console.error(pErr)
        if (person) {
          setName(person.name)
          setGender(person.gender || (person.gender === 'female' ? "female" : "male"))
        }
      } else if (spouseId) {
        // Default gender for spouse based on target's gender if we could fetch it
        // For now just default to opposite of what might be expected or let user choose
        const { data: target } = await supabase.from("persons").select("gender").eq("id", spouseId).single()
        if (target) {
          setGender(target.gender === "male" ? "female" : "male")
        }
      }
      setLoading(false)
    }
    init()
  }, [editId, spouseId, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError("Nama tidak boleh kosong.")
      return
    }

    setSubmitting(true)
    setError(null)
    const supabase = createClient()

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      if (editId) {
        // Edit existing person
        const { error: updateErr } = await supabase
          .from("persons")
          .update({ name, gender })
          .eq("id", editId)
        
        if (updateErr) throw updateErr
      } else if (parentId && userProfile?.bani_id) {
        // Add new child
        const { data: newPerson, error: insertErr } = await supabase
          .from("persons")
          .insert({
            name,
            gender,
            bani_id: userProfile.bani_id,
            created_by: user.id
          })
          .select()
          .single()
        
        if (insertErr) throw insertErr

        // Link child to parent
        const { error: relErr } = await supabase
          .from("relationships")
          .insert({
            person_id: newPerson.id,
            related_person_id: parentId,
            type: "parent",
            bani_id: userProfile.bani_id
          })

        if (relErr) throw relErr
      } else if (spouseId && userProfile?.bani_id) {
        // Add new spouse
        const { data: newPerson, error: insertErr } = await supabase
          .from("persons")
          .insert({
            name,
            gender,
            bani_id: userProfile.bani_id,
            created_by: user.id
          })
          .select()
          .single()
        
        if (insertErr) throw insertErr

        // Link spouse
        const { error: relErr } = await supabase
          .from("relationships")
          .insert({
            person_id: spouseId,
            related_person_id: newPerson.id,
            type: "spouse",
            bani_id: userProfile.bani_id
          })

        if (relErr) throw relErr
      }

      router.push("/tree")
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Terjadi kesalahan.")
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-wasika-cream flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-wasika-gold animate-spin" />
    </div>
  )

  const title = editId ? "Edit Data Anggota" : (spouseId ? "Tambah Pasangan" : "Tambah Anak")

  return (
    <main className="min-h-screen bg-wasika-cream pb-20">
      {/* Header */}
      <div className="bg-wasika-dark/95 backdrop-blur-md px-5 pt-8 pb-6 shadow-md border-b border-wasika-gold/20" style={{ background: "linear-gradient(135deg, #2b1f1a 0%, #3d2b24 100%)" }}>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-wasika-gold hover:bg-white/20 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 text-center pr-10">
            <h1 className="font-serif text-2xl text-wasika-gold">{title}</h1>
          </div>
        </div>
      </div>

      <div className="px-5 py-8">
        <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-5 bg-white p-6 rounded-2xl shadow-sm border border-wasika-gold/10">
          <div>
            <label className="block text-wasika-brown-dark text-sm font-medium mb-2">
              Nama Lengkap
            </label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ketik nama lengkap..."
                className="w-full bg-wasika-cream/50 py-3.5 px-4 pl-12 rounded-[11px] text-wasika-brown-dark placeholder:text-wasika-text-muted/60 focus:outline-none focus:ring-2 border border-wasika-text-muted/20 focus:ring-wasika-gold/30 focus:border-wasika-gold transition-all"
              />
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-wasika-gold" />
            </div>
          </div>

          <div>
            <label className="block text-wasika-brown-dark text-sm font-medium mb-3">
              Jenis Kelamin
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setGender("male")}
                className={`py-3 px-4 rounded-[11px] border font-medium text-sm transition-all ${
                  gender === "male" 
                    ? "bg-wasika-gold text-wasika-brown-dark border-wasika-gold shadow-md" 
                    : "bg-white text-wasika-text-muted border-wasika-text-muted/20 hover:border-wasika-gold/50"
                }`}
              >
                Laki-laki
              </button>
              <button
                type="button"
                onClick={() => setGender("female")}
                className={`py-3 px-4 rounded-[11px] border font-medium text-sm transition-all ${
                  gender === "female" 
                    ? "bg-wasika-gold text-wasika-brown-dark border-wasika-gold shadow-md" 
                    : "bg-white text-wasika-text-muted border-wasika-text-muted/20 hover:border-wasika-gold/50"
                }`}
              >
                Perempuan
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center border border-red-200">
              {error}
            </div>
          )}

          <div className="pt-4">
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="w-full py-4 px-6 rounded-[11px] font-bold text-white transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: submitting || !name.trim()
                  ? "#9ca3af" 
                  : "linear-gradient(135deg, #cd7f32 0%, #d4a843 100%)",
              }}
            >
              {submitting ? "Menyimpan..." : "Simpan Data"}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
