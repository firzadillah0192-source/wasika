"use client"
import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Users, AlertTriangle, GitBranch, Layers, MessageCircle, Edit3, Calendar, Plus, ChevronRight, QrCode } from "lucide-react"
import { BottomNav } from "@/components/wasika/bottom-nav"

interface MoodStat {
  emoji: string
  label: string
  count: number
  category: string
}

interface AttentionMember {
  id: string
  name: string
  mood: string
  note: string | null
}

export default function PanitiaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [bani, setBani] = useState<any>(null)
  const [stats, setStats] = useState({ present: 0, attention: 0, silsilah: 0, generations: 0 })
  const [moodStats, setMoodStats] = useState<MoodStat[]>([])
  const [needsAttention, setNeedsAttention] = useState<AttentionMember[]>([])
  const [totalMoodCount, setTotalMoodCount] = useState(0)
  const [maxMoodCount, setMaxMoodCount] = useState(0)
  const [events, setEvents] = useState<any[]>([])

  const fetchData = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.replace("/login")
      return
    }

    const { data: profile } = await (supabase.from("profiles").select("*, banis(*)").eq("id", user.id).single() as any)
    console.log("Panitia Debug - Profile:", profile)
    
    // Auto-fix for Panitia without matching bani_id link
    const { data: ownedBani } = await supabase.from("banis").select("*").eq("owner_id", user.id).single()
    console.log("Panitia Debug - Owned Bani:", ownedBani)

    // Auto-generate bani_code if missing
    if (ownedBani && !ownedBani.bani_code) {
      const newCode = Math.random().toString(36).substring(2, 8).toUpperCase()
      await supabase.from("banis").update({ bani_code: newCode }).eq("id", ownedBani.id)
      ownedBani.bani_code = newCode
    }

    if (ownedBani && profile && (!profile.bani_id || profile.bani_id !== ownedBani.id)) {
       console.log("Panitia Debug - Auto-linking profile to owned bani")
       await supabase.from("profiles").update({ bani_id: ownedBani.id }).eq("id", user.id)
       await supabase.from("persons").update({ bani_id: ownedBani.id }).eq("user_id", user.id)
       // Refresh local
       profile.bani_id = ownedBani.id
       profile.banis = ownedBani
    }

    setUserProfile(profile)
    setBani(profile?.banis || ownedBani)

    if (profile?.bani_id) {
      // 1. Fetch Present Count (latest event)
      const { data: events } = await supabase.from("events").select("id").eq("bani_id", profile.bani_id).order("date", { ascending: false }).limit(1)
      const eventId = events?.[0]?.id
      
      let presentCount = 0
      if (eventId) {
        const { count } = await supabase.from("attendances").select("*", { count: "exact", head: true }).eq("event_id", eventId)
        presentCount = count || 0
      }

      // 2. Fetch Mood Checkins for stats and attention
      if (eventId) {
        const { data: moodData } = await (supabase.from("mood_checkins")
          .select("*, persons(id, name)")
          .eq("event_id", eventId)
          .order("created_at", { ascending: false }) as any)
      
      if (moodData) {
        setTotalMoodCount(moodData.length)
        
        // Aggregate
        const agg: Record<string, MoodStat> = {}
        const attentionArr: AttentionMember[] = []

        moodData.forEach((m: any) => {
          if (!agg[m.mood_id]) {
            agg[m.mood_id] = { emoji: m.mood_emoji, label: m.mood_label, count: 0, category: m.mood_category }
          }
          agg[m.mood_id].count++

          if (m.mood_category === "berat") {
            attentionArr.push({
              id: m.persons?.id,
              name: m.persons?.name || "Keluarga",
              mood: `${m.mood_emoji} ${m.mood_label}`,
              note: m.note
            })
          }
        })

        const sortedMoods = Object.values(agg).sort((a, b) => b.count - a.count)
        setMoodStats(sortedMoods)
        setMaxMoodCount(Math.max(...sortedMoods.map(m => m.count), 1))
        setNeedsAttention(attentionArr)
        setStats(prev => ({ ...prev, attention: attentionArr.length, present: presentCount }))
      }
    }

      // 3. Silsilah Stats
      const { data: persons } = await supabase.from("persons").select("id").eq("bani_id", profile.bani_id)
      const { data: relations } = await supabase.from("relationships").select("person_id").eq("bani_id", profile.bani_id)
      
      if (persons && persons.length > 0) {
        const withRelations = new Set(relations?.map(r => r.person_id)).size
        const perc = Math.round((withRelations / persons.length) * 100)
        setStats(prev => ({ ...prev, silsilah: perc }))
      }

      // 4. Fetch All Events
      const { data: allEvents } = await supabase.from("events").select("*").eq("bani_id", profile.bani_id).order("date", { ascending: false })
      if (allEvents) setEvents(allEvents)
    }
    setLoading(false)
  }, [router])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <main className="min-h-screen bg-wasika-cream flex items-center justify-center">
        <div className="text-wasika-gold">Memuat dashboard...</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-wasika-cream pb-24">
      {/* Dark Header */}
      <div className="bg-wasika-dark px-5 py-4">
        <div className="flex items-center gap-2">
          <h1 className="font-serif text-xl text-wasika-gold">
            Dashboard Pengelola
          </h1>
          <span className="flex items-center gap-1.5 text-green-400 text-xs">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Live
          </span>
        </div>
        <p className="text-wasika-text-muted text-sm mt-0.5">
          {bani?.name || "Keluarga"}
        </p>
      </div>

      {/* Info Bani & QR Section */}
      <div className="px-5 mt-4">
        <div className="bg-gradient-to-br from-wasika-gold to-[#f5c842] rounded-2xl p-5 shadow-lg border border-white/20">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-wasika-brown-dark/60 font-bold text-[10px] uppercase tracking-wider mb-1">Kode Keluarga Anda</p>
              <code className="bg-wasika-brown-dark/10 px-2 py-1 rounded text-wasika-brown-dark font-bold text-lg">
                {bani?.bani_code || bani?.id?.slice(0, 8) || "Memuat..."}
              </code>
            </div>
            <div className="w-16 h-16 bg-white p-1 rounded-lg shadow-inner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {bani?.id ? (
                <img 
                  src={`/api/qr/generate?text=${encodeURIComponent(bani.id)}`} 
                  alt="QR Code Bani" 
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full bg-wasika-cream animate-pulse rounded" />
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 text-wasika-brown-dark/70">
            <Users className="w-4 h-4" />
            <p className="text-xs font-medium">Tunjukkan QR ini agar keluarga lain bisa bergabung.</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 py-5 space-y-5">
        {/* Stats Grid 2x2 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl border border-wasika-text-muted/20 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-green-600" />
              <span className="text-wasika-text-muted text-xs">Hadir hari ini</span>
            </div>
            <p className="text-wasika-brown-dark text-2xl font-bold">{stats.present}</p>
          </div>

          <div className="bg-white rounded-2xl border border-wasika-copper/40 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-wasika-copper" />
              <span className="text-wasika-copper text-xs font-medium">Perlu perhatian</span>
            </div>
            <p className="text-wasika-copper text-2xl font-bold">{stats.attention}</p>
          </div>

          <div className="bg-white rounded-2xl border border-wasika-text-muted/20 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <GitBranch className="w-5 h-5 text-wasika-gold" />
              <span className="text-wasika-text-muted text-xs">Data silsilah</span>
            </div>
            <p className="text-wasika-brown-dark text-2xl font-bold">{stats.silsilah}%</p>
          </div>

          <div className="bg-white rounded-2xl border border-wasika-text-muted/20 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-5 h-5 text-wasika-gold" />
              <span className="text-wasika-text-muted text-xs">Generasi</span>
            </div>
            <p className="text-wasika-brown-dark text-2xl font-bold">{stats.generations || "-"}</p>
          </div>
        </div>

        {/* Mood Bar Chart */}
        <section className="bg-white rounded-2xl border border-wasika-text-muted/20 overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-wasika-text-muted/15">
            <h2 className="text-wasika-brown-dark font-bold text-sm">KONDISI HATI KELUARGA</h2>
            <p className="text-wasika-text-muted text-xs mt-0.5">{totalMoodCount} response tercatat</p>
          </div>
          <div className="px-4 py-4 space-y-2 max-h-[300px] overflow-y-auto">
            {moodStats.map((mood) => {
                const percentage = (mood.count / maxMoodCount) * 100
                const barColor =
                  mood.category === "positif"
                    ? "bg-green-500"
                    : mood.category === "netral"
                    ? "bg-wasika-gold"
                    : "bg-wasika-copper"

                return (
                  <div key={mood.label} className="flex items-center gap-2">
                    <span className="text-lg w-6">{mood.emoji}</span>
                    <span className="text-wasika-brown-dark text-xs w-24 truncate">{mood.label}</span>
                    <div className="flex-1 h-5 bg-wasika-cream rounded-full overflow-hidden">
                      <div
                        className={`h-full ${barColor} rounded-full transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-wasika-text-muted text-xs w-8 text-right">
                      {((mood.count / (totalMoodCount || 1)) * 100).toFixed(0)}%
                    </span>
                  </div>
                )
              })}
          </div>
        </section>

        {/* Needs Attention Alert Cards */}
        <section className="bg-wasika-copper/10 border border-wasika-copper/30 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-wasika-copper/20 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-wasika-copper" />
            <h2 className="text-wasika-copper font-bold text-sm">PERLU DIDATANGI</h2>
          </div>
          <div className="divide-y divide-wasika-copper/15">
            {needsAttention.map((member) => (
              <Link
                key={member.id}
                href={`/profile/${member.id}`}
                className="px-4 py-3 flex items-center gap-3 hover:bg-wasika-copper/10 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-wasika-copper/20 flex items-center justify-center">
                  <span className="text-lg">{member.mood.split(" ")[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-wasika-brown-dark font-medium text-sm">{member.name}</p>
                  <p className="text-wasika-copper text-xs">{member.mood}</p>
                  {member.note && (
                    <p className="text-wasika-text-muted text-xs mt-0.5 truncate">&quot;{member.note}&quot;</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Events Management Section */}
        <section className="bg-white rounded-2xl border border-wasika-text-muted/20 overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-wasika-text-muted/15 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-wasika-gold" />
              <h2 className="text-wasika-brown-dark font-bold text-sm">MANAJEMEN ACARA</h2>
            </div>
            <Link 
              href="/panitia/events/new"
              className="bg-wasika-gold text-wasika-brown-dark text-[10px] font-bold px-3 py-1.5 rounded-lg hover:bg-wasika-gold-light transition-colors"
            >
              + BUAT ACARA
            </Link>
          </div>
          <div className="divide-y divide-wasika-text-muted/10">
            {events.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-wasika-text-muted text-xs italic">Belum ada acara direncanakan.</p>
              </div>
            ) : (
              events.map((ev) => (
                <div key={ev.id} className="px-4 py-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-wasika-brown-dark font-bold text-sm">{ev.name}</p>
                    <p className="text-wasika-text-muted text-xs">{new Date(ev.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link href={`/panitia/events/${ev.id}/qr`} className="p-2 bg-wasika-cream rounded-full text-wasika-gold hover:bg-wasika-gold/10 transition-colors">
                      <QrCode className="w-4 h-4" />
                    </Link>
                    <ChevronRight className="w-5 h-5 text-wasika-text-muted" />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Quick Links */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/tree"
            className="bg-white rounded-2xl border border-wasika-text-muted/20 p-4 shadow-sm hover:border-wasika-gold transition-colors"
          >
            <Edit3 className="w-6 h-6 text-wasika-gold mb-2" />
            <p className="text-wasika-brown-dark font-medium text-sm">Kelola silsilah</p>
            <p className="text-wasika-text-muted text-xs mt-0.5">Edit akses penuh</p>
          </Link>

          <Link
            href="/forum"
            className="bg-white rounded-2xl border border-wasika-text-muted/20 p-4 shadow-sm hover:border-wasika-gold transition-colors"
          >
            <MessageCircle className="w-6 h-6 text-wasika-gold mb-2" />
            <p className="text-wasika-brown-dark font-medium text-sm">Forum Keluarga</p>
            <p className="text-wasika-text-muted text-xs mt-0.5">Lihat diskusi</p>
          </Link>
        </div>
      </div>

      <BottomNav />
    </main>
  )
}
