"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft, Calendar, Save, Loader2, MapPin, Tag } from "lucide-react"
import Link from "next/link"

export default function NewEventPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [bani, setBani] = useState<any>(null)
  
  const [form, setForm] = useState({
    name: "",
    date: new Date().toISOString().split('T')[0],
    description: ""
  })

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/login")
        return
      }

      // Check if user is panitia and get their bani
      const { data: profile } = await supabase.from("profiles").select("*, banis(*)").eq("id", user.id).single()
      if (profile?.role !== 'panitia' && profile?.role !== 'superadmin') {
         router.push("/tree")
         return
      }
      setBani(profile.banis)
      setLoading(false)
    }
    init()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bani?.id) return
    setSaving(true)
    
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      const qrCode = Math.random().toString(36).substring(2, 12).toUpperCase()
      
      const { error } = await supabase.from("events").insert({
        name: form.name,
        date: form.date,
        bani_id: bani.id,
        qr_code: qrCode,
        created_by: user?.id
      })

      if (error) throw error
      router.push("/panitia")
    } catch (err) {
      console.error("Create event error:", err)
      alert("Gagal membuat acara.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="min-h-screen bg-wasika-cream flex items-center justify-center"><Loader2 className="w-8 h-8 text-wasika-gold animate-spin" /></div>

  return (
    <main className="min-h-screen bg-wasika-cream pb-10">
      <div className="bg-wasika-dark px-5 pt-6 pb-8">
        <Link href="/panitia" className="inline-flex items-center gap-1.5 text-wasika-text-muted hover:text-wasika-gold transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Kembali ke Dashboard</span>
        </Link>
        <h1 className="font-serif text-2xl text-wasika-gold">Buat Acara Baru</h1>
        <p className="text-wasika-text-muted text-sm mt-1">Definisikan kumpul keluarga atau acara spesial lainnya.</p>
      </div>

      <form onSubmit={handleSubmit} className="px-5 -mt-4 space-y-4">
        <div className="bg-white rounded-2xl border border-wasika-text-muted/20 p-5 shadow-sm space-y-5">
          <div>
            <label className="block text-wasika-text-muted text-xs font-bold uppercase tracking-wider mb-2">Nama Acara</label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-wasika-text-muted" />
              <input 
                required
                value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
                placeholder="Contoh: Arisan Bulanan Bani Rohimi"
                className="w-full bg-wasika-cream/50 border border-wasika-text-muted/30 rounded-xl py-3 pl-10 pr-4 text-wasika-brown-dark focus:outline-none focus:border-wasika-gold"
              />
            </div>
          </div>

          <div>
            <label className="block text-wasika-text-muted text-xs font-bold uppercase tracking-wider mb-2">Tanggal Pelaksanaan</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-wasika-text-muted" />
              <input 
                required
                type="date"
                value={form.date}
                onChange={e => setForm({...form, date: e.target.value})}
                className="w-full bg-wasika-cream/50 border border-wasika-text-muted/30 rounded-xl py-3 pl-10 pr-4 text-wasika-brown-dark focus:outline-none focus:border-wasika-gold"
              />
            </div>
          </div>

          <div>
            <label className="block text-wasika-text-muted text-xs font-bold uppercase tracking-wider mb-2">Catatan/Lokasi (Opsional)</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-4 h-4 text-wasika-text-muted" />
              <textarea 
                value={form.description}
                onChange={e => setForm({...form, description: e.target.value})}
                placeholder="Tuliskan alamat lengkap atau info tambahan..."
                rows={3}
                className="w-full bg-wasika-cream/50 border border-wasika-text-muted/30 rounded-xl py-3 pl-10 pr-4 text-wasika-brown-dark focus:outline-none focus:border-wasika-gold resize-none"
              />
            </div>
          </div>
        </div>

        <button 
          type="submit"
          disabled={saving}
          className="w-full bg-wasika-gold text-wasika-brown-dark font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 hover:bg-wasika-gold-light transition-all disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          PUBLIKASIKAN ACARA
        </button>
        
        <p className="text-center text-[10px] text-wasika-text-muted px-4">
          Acara yang Anda buat akan muncul di halaman silsilah keluarga agar anggota bisa melakukan Check-in Mood & Kehadiran.
        </p>
      </form>
    </main>
  )
}
