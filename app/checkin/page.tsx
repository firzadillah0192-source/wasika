"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { BatikStarDiamond } from "@/components/wasika/batik-star-diamond"
import { ArrowRight, Clock } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

type MoodCategory = "positif" | "netral" | "berat"

interface MoodOption {
  id: string
  emoji: string
  label: string
  category: MoodCategory
}

const moodOptions: MoodOption[] = [
  // POSITIF - 8 options
  { id: "bahagia", emoji: "\u{1F604}", label: "Bahagia", category: "positif" },
  { id: "terharu", emoji: "\u{1F917}", label: "Terharu", category: "positif" },
  { id: "tenang", emoji: "\u{1F60A}", label: "Tenang", category: "positif" },
  { id: "penuh-kasih", emoji: "\u{1F970}", label: "Penuh kasih", category: "positif" },
  { id: "bersyukur", emoji: "\u{1F607}", label: "Bersyukur", category: "positif" },
  { id: "antusias", emoji: "\u{1F929}", label: "Antusias", category: "positif" },
  { id: "lega", emoji: "\u{1F60C}", label: "Lega", category: "positif" },
  { id: "meriah", emoji: "\u{1F973}", label: "Meriah", category: "positif" },
  // NETRAL - 6 options
  { id: "biasa-saja", emoji: "\u{1F610}", label: "Biasa saja", category: "netral" },
  { id: "banyak-pikiran", emoji: "\u{1F914}", label: "Banyak pikiran", category: "netral" },
  { id: "canggung", emoji: "\u{1F605}", label: "Canggung", category: "netral" },
  { id: "lelah", emoji: "\u{1F634}", label: "Lelah", category: "netral" },
  { id: "cukup-baik", emoji: "\u{1F642}", label: "Cukup baik", category: "netral" },
  { id: "tak-bisa-kata", emoji: "\u{1F636}", label: "Tak bisa kata-kata", category: "netral" },
  // BERAT DI HATI - 6 options
  { id: "rindu", emoji: "\u{1F622}", label: "Rindu", category: "berat" },
  { id: "khawatir", emoji: "\u{1F61F}", label: "Khawatir", category: "berat" },
  { id: "sedih", emoji: "\u{1F614}", label: "Sedih", category: "berat" },
  { id: "gelisah", emoji: "\u{1F630}", label: "Gelisah", category: "berat" },
  { id: "butuh-support", emoji: "\u{1F97A}", label: "Butuh support", category: "berat" },
  { id: "overwhelmed", emoji: "\u{1F629}", label: "Overwhelmed", category: "berat" },
]

const categoryConfig: Record<MoodCategory, { title: string; color: string; ringColor: string; gridCols: string }> = {
  positif: {
    title: "POSITIF",
    color: "text-green-400",
    ringColor: "ring-green-400 border-green-400",
    gridCols: "grid-cols-4",
  },
  netral: {
    title: "NETRAL",
    color: "text-wasika-gold",
    ringColor: "ring-wasika-gold border-wasika-gold",
    gridCols: "grid-cols-3",
  },
  berat: {
    title: "BERAT DI HATI",
    color: "text-wasika-copper",
    ringColor: "ring-wasika-copper border-wasika-copper",
    gridCols: "grid-cols-3",
  },
}

export default function CheckinPage() {
  const router = useRouter()
  const [selectedMood, setSelectedMood] = useState<string | null>(null)
  const [note, setNote] = useState("")
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [activeEvent, setActiveEvent] = useState<any>(null)
  const [person, setPerson] = useState<any>(null)
  const [baniData, setBaniData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.replace("/login")
        return
      }

      // Fetch profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()
      
      setUserProfile(profile)

      if (profile?.bani_id) {
        // Fetch bani status
        const { data: bData } = await supabase.from("banis").select("*").eq("id", profile.bani_id).single()
        setBaniData(bData)

        if (bData?.status !== 'active' && profile.role !== 'superadmin') {
           // If pending/suspended, don't proceed yet
           setLoading(false)
           return
        }

        // Fetch latest event for this bani
        const { data: events } = await supabase
          .from("events")
          .select("*")
          .eq("bani_id", profile.bani_id)
          .order("date", { ascending: false })
          .limit(1)
        
        const event = events?.[0]
        setActiveEvent(event)

        // Fetch person record for this user
        const { data: personData } = await supabase
          .from("persons")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle()
        
        setPerson(personData)

        if (!personData) {
          // If no person record yet, must go to form setup
          router.replace("/form")
          return
        }

        if (event) {
          // Check if already checked in today
          const today = new Date().toISOString().split("T")[0]
          const { data: existingCheckin } = await supabase
            .from("mood_checkins")
            .select("id")
            .eq("person_id", personData.id)
            .eq("event_id", event.id)
            .gte("created_at", `${today}T00:00:00`)
            .maybeSingle()
          
          if (existingCheckin) {
            router.replace("/tree")
            return
          }
        }
      } else {
        // No bani selected? Go to join page
        router.replace("/join")
        return
      }
      setLoading(false)
    }

    init()
  }, [router])

  const handleContinue = async () => {
    if (!selectedMood) return
    setSubmitting(true)
    setError(null)

    const mood = moodOptions.find(m => m.id === selectedMood)
    if (!mood) return

    try {
      const supabase = createClient()
      
      if (person && activeEvent) {
        // Save mood checkin
        const { error: moodErr } = await supabase.from("mood_checkins").insert({
          person_id: person.id,
          event_id: activeEvent.id,
          mood_id: mood.id,
          mood_emoji: mood.emoji,
          mood_label: mood.label,
          mood_category: mood.category,
          note: note
        })
        if (moodErr) throw moodErr

        // Save attendance (defensive, ignore if already exists)
        try {
          await supabase.from("attendances").upsert(
            { person_id: person.id, event_id: activeEvent.id },
            { onConflict: 'person_id, event_id' }
          )
        } catch (atErr) {
          console.warn("Attendance recording skipped or already exists:", atErr)
        }
      }

      // Even if no person/event, we proceed to tree or form
      if (!person) {
        router.replace("/form")
      } else {
        router.replace("/tree")
      }
    } catch (err: any) {
      console.error("Check-in error:", err)
      setError("Gagal menyimpan check-in. Silakan coba lagi.")
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <main className="relative min-h-screen bg-wasika-dark flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-14 h-14 mx-auto mb-4">
            <div className="absolute inset-0 border-4 border-wasika-gold/20 rounded-full animate-pulse" />
            <div className="absolute inset-0 border-4 border-t-wasika-gold rounded-full animate-spin" />
          </div>
          <p className="text-wasika-gold font-serif animate-pulse">Menyiapkan check-in...</p>
        </div>
      </main>
    )
  }

  if (baniData?.status === 'pending' && userProfile?.role !== 'superadmin') {
     return (
       <main className="relative min-h-screen bg-wasika-dark flex items-center justify-center p-6 text-center">
         <div className="bg-white/5 border border-wasika-gold/20 rounded-3xl p-8 max-w-sm">
           <div className="w-16 h-16 bg-wasika-gold/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Clock className="w-8 h-8 text-wasika-gold animate-pulse" />
           </div>
           <h1 className="font-serif text-2xl text-wasika-gold mb-3">Pendaftaran Diproses</h1>
           <p className="text-wasika-text-muted text-sm leading-relaxed mb-8">
             Keluarga <span className="text-white font-bold">{baniData.name}</span> berhasil didaftarkan. 
             Admin pusat akan segera meninjau dan mengaktifkan akun Anda. Mohon tunggu ya!
           </p>
           <button 
             onClick={() => window.location.reload()}
             className="w-full py-3 bg-wasika-gold text-wasika-brown-dark font-bold rounded-xl"
           >
             CEK LAGI
           </button>
         </div>
       </main>
     )
  }

  const userName = userProfile?.full_name?.split(" ")[0] || "Keluarga"

  const getMoodsByCategory = (category: MoodCategory) => {
    return moodOptions.filter((mood) => mood.category === category)
  }

  return (
    <main className="relative min-h-screen bg-wasika-dark overflow-hidden">
      {/* Star/Diamond Pattern Background */}
      <BatikStarDiamond />

      {/* Content */}
      <div className="relative z-10 min-h-screen px-5 py-8 pb-24">
        {/* Greeting */}
        <div className="text-center mb-6">
          <h1 className="font-serif text-2xl text-wasika-gold mb-2">
            Assalamualaikum, <span className="font-bold">{userName}</span>
          </h1>
        </div>

        {/* Question */}
        <div className="text-center mb-8">
          <p className="text-wasika-text-on-dark text-lg leading-relaxed">
            Bagaimana kabar hatimu<br />
            hari yang mulia ini?
          </p>
        </div>

        {/* Mood Grid Sections */}
        <div className="space-y-8 max-w-md mx-auto">
          {/* POSITIF Section */}
          <section>
            <p className={`text-xs font-bold tracking-wider mb-4 ${categoryConfig.positif.color}`}>
              {categoryConfig.positif.title}
            </p>
            <div className={`grid ${categoryConfig.positif.gridCols} gap-3`}>
              {getMoodsByCategory("positif").map((mood) => (
                <button
                  key={mood.id}
                  onClick={() => setSelectedMood(mood.id)}
                  className={`flex flex-col items-center py-4 px-2 rounded-xl transition-all ${
                    selectedMood === mood.id
                      ? `bg-green-400/15 ring-2 ring-green-400 border-green-400 border-2`
                      : "bg-wasika-brown-dark/40 border border-wasika-gold/20 hover:border-wasika-gold/40"
                  }`}
                >
                  <span className="text-3xl mb-2">{mood.emoji}</span>
                  <span className={`text-[11px] text-center leading-tight ${
                    selectedMood === mood.id ? "text-green-300" : "text-wasika-text-muted"
                  }`}>
                    {mood.label}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* NETRAL Section */}
          <section>
            <p className={`text-xs font-bold tracking-wider mb-4 ${categoryConfig.netral.color}`}>
              {categoryConfig.netral.title}
            </p>
            <div className={`grid ${categoryConfig.netral.gridCols} gap-3`}>
              {getMoodsByCategory("netral").map((mood) => (
                <button
                  key={mood.id}
                  onClick={() => setSelectedMood(mood.id)}
                  className={`flex flex-col items-center py-4 px-2 rounded-xl transition-all ${
                    selectedMood === mood.id
                      ? `bg-wasika-gold/15 ring-2 ring-wasika-gold border-wasika-gold border-2`
                      : "bg-wasika-brown-dark/40 border border-wasika-gold/20 hover:border-wasika-gold/40"
                  }`}
                >
                  <span className="text-3xl mb-2">{mood.emoji}</span>
                  <span className={`text-[11px] text-center leading-tight ${
                    selectedMood === mood.id ? "text-wasika-gold" : "text-wasika-text-muted"
                  }`}>
                    {mood.label}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* BERAT DI HATI Section */}
          <section>
            <p className={`text-xs font-bold tracking-wider mb-4 ${categoryConfig.berat.color}`}>
              {categoryConfig.berat.title}
            </p>
            <div className={`grid ${categoryConfig.berat.gridCols} gap-3`}>
              {getMoodsByCategory("berat").map((mood) => (
                <button
                  key={mood.id}
                  onClick={() => setSelectedMood(mood.id)}
                  className={`flex flex-col items-center py-4 px-2 rounded-xl transition-all ${
                    selectedMood === mood.id
                      ? `bg-wasika-copper/15 ring-2 ring-wasika-copper border-wasika-copper border-2`
                      : "bg-wasika-brown-dark/40 border border-wasika-gold/20 hover:border-wasika-gold/40"
                  }`}
                >
                  <span className="text-3xl mb-2">{mood.emoji}</span>
                  <span className={`text-[11px] text-center leading-tight ${
                    selectedMood === mood.id ? "text-wasika-copper" : "text-wasika-text-muted"
                  }`}>
                    {mood.label}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Optional Note */}
        <div className="max-w-md mx-auto mt-8">
          <label className="block text-wasika-text-muted text-sm mb-2">
            Catatan (opsional)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Tuliskan perasaanmu lebih lanjut..."
            rows={3}
            className="w-full bg-wasika-brown-dark/60 border border-wasika-gold/30 rounded-[11px] py-3 px-4 text-wasika-text-on-dark placeholder:text-wasika-text-muted/60 focus:outline-none focus:border-wasika-gold focus:ring-1 focus:ring-wasika-gold/50 resize-none"
          />
        </div>

        {/* Fixed Bottom Actions */}
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[#1c0e00] via-[#1c0e00] to-transparent pt-8 pb-6 px-5">
          <div className="max-w-md mx-auto space-y-3">
            {error && (
              <div className="bg-red-500/20 border border-red-500/40 rounded-[11px] px-4 py-3 text-red-300 text-sm text-center">
                {error}
              </div>
            )}
            <button
              onClick={handleContinue}
              disabled={!selectedMood || submitting}
              className={`w-full flex items-center justify-center gap-2 py-4 px-6 rounded-[11px] font-bold transition-all ${
                selectedMood && !submitting
                  ? "bg-wasika-gold hover:bg-wasika-gold-light text-wasika-brown-dark"
                  : "bg-wasika-gold/30 text-wasika-brown-dark/50 cursor-not-allowed"
              }`}
            >
              {submitting ? "Menyimpan..." : "Lanjut ke Silsilah"}
              {!submitting && <ArrowRight className="w-5 h-5" />}
            </button>
            <button
              onClick={() => router.replace("/tree")}
              className="w-full block text-center text-wasika-text-muted hover:text-wasika-gold transition-colors text-sm py-2"
            >
              Lewati untuk sekarang
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
