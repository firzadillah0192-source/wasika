"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Trophy, Medal, Search, TrendingUp, Users, ChevronRight } from "lucide-react"
import { BottomNav } from "@/components/wasika/bottom-nav"
import Link from "next/link"

interface LeaderboardEntry {
  id: string
  name: string
  points: number
  rank: number
  city?: string
}

export default function LeaderboardPage() {
  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [query, setQuery] = useState("")
  const [baniId, setBaniId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase.from("profiles").select("bani_id").eq("id", user.id).single()
    if (!profile?.bani_id) return
    setBaniId(profile.bani_id)

    // Fetch persons ordered by points
    const { data } = await supabase
      .from("persons")
      .select("id, name, points, city")
      .eq("bani_id", profile.bani_id)
      .order("points", { ascending: false })
      .limit(50)
    
    if (data) {
      setEntries(data.map((d: any, index: number) => ({
        id: d.id,
        name: d.name,
        points: d.points || 0,
        rank: index + 1,
        city: d.city
      })))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const filteredEntries = entries.filter(e => 
    e.name.toLowerCase().includes(query.toLowerCase())
  )

  const topThree = entries.slice(0, 3)
  const others = filteredEntries.slice(3)

  if (loading) {
    return (
      <main className="min-h-screen bg-wasika-cream flex items-center justify-center">
        <div className="text-wasika-gold animate-pulse">Memuat klasemen...</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-wasika-cream pb-24">
      {/* Dark Header */}
      <div className="bg-wasika-dark px-5 pt-8 pb-12 rounded-b-[40px] shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-wasika-gold/10 rounded-full blur-3xl -mr-16 -mt-16" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-wasika-copper/10 rounded-full blur-2xl -ml-12 -mb-12" />
        
        <div className="relative z-10 flex flex-col items-center">
          <Trophy className="w-12 h-12 text-wasika-gold mb-3" />
          <h1 className="font-serif text-3xl text-wasika-gold">Klasemen Bani</h1>
          <p className="text-wasika-text-muted text-sm mt-1">Siapa yang paling aktif hari ini?</p>
        </div>
      </div>

      {/* Podium */}
      <div className="px-5 -mt-8 flex items-end justify-center gap-2 mb-8 relative z-20">
        {/* Rank 2 */}
        {topThree[1] && (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full border-4 border-gray-300 bg-white shadow-md flex items-center justify-center mb-2 overflow-hidden">
               <span className="text-wasika-brown-dark font-bold text-lg">{topThree[1].name[0]}</span>
            </div>
            <div className="bg-white/80 backdrop-blur rounded-t-xl w-24 h-24 flex flex-col items-center justify-center border-x border-t border-gray-200 shadow-sm px-2">
              <Medal className="w-6 h-6 text-gray-400 mb-1" />
              <p className="text-wasika-brown-dark font-bold text-[10px] truncate w-full text-center">{topThree[1].name}</p>
              <p className="text-wasika-copper text-xs font-bold">{topThree[1].points} pts</p>
            </div>
          </div>
        )}

        {/* Rank 1 */}
        {topThree[0] && (
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 rounded-full border-4 border-wasika-gold bg-white shadow-lg flex items-center justify-center mb-2 relative scale-110 overflow-hidden">
               <Trophy className="absolute -top-1 -right-1 w-6 h-6 text-wasika-gold drop-shadow-md z-10" />
               <span className="text-wasika-brown-dark font-bold text-2xl">{topThree[0].name[0]}</span>
            </div>
            <div className="bg-wasika-gold rounded-t-xl w-28 h-32 flex flex-col items-center justify-center shadow-lg border-x border-t border-wasika-gold/30 px-2 transition-all hover:scale-105">
              <Medal className="w-8 h-8 text-wasika-brown-dark mb-1" />
              <p className="text-wasika-brown-dark font-bold text-xs truncate w-full text-center">{topThree[0].name}</p>
              <p className="text-wasika-brown-dark/80 text-sm font-bold">{topThree[0].points} pts</p>
            </div>
          </div>
        )}

        {/* Rank 3 */}
        {topThree[2] && (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full border-4 border-[#CD7F32] bg-white shadow-md flex items-center justify-center mb-2 overflow-hidden">
               <span className="text-wasika-brown-dark font-bold text-lg">{topThree[2].name[0]}</span>
            </div>
            <div className="bg-white/80 backdrop-blur rounded-t-xl w-24 h-20 flex flex-col items-center justify-center border-x border-t border-gray-200 shadow-sm px-2">
              <Medal className="w-5 h-5 text-[#CD7F32] mb-1" />
              <p className="text-wasika-brown-dark font-bold text-[10px] truncate w-full text-center">{topThree[2].name}</p>
              <p className="text-wasika-copper text-xs font-bold">{topThree[2].points} pts</p>
            </div>
          </div>
        )}
      </div>

      <div className="px-5 space-y-4">
        {/* Search & Stats */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-wasika-text-muted" />
            <input
              type="text"
              placeholder="Cari keluarga..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-white border border-wasika-text-muted/20 rounded-xl py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-wasika-gold"
            />
          </div>
          <div className="bg-wasika-gold/10 border border-wasika-gold/30 rounded-xl px-4 py-2 flex items-center gap-2">
            <Users className="w-4 h-4 text-wasika-gold" />
            <span className="text-wasika-brown-dark font-bold text-sm">{entries.length}</span>
          </div>
        </div>

        {/* List */}
        <div className="bg-white rounded-3xl border border-wasika-text-muted/15 overflow-hidden shadow-sm">
          <div className="divide-y divide-wasika-text-muted/10">
            {others.map((member) => (
              <Link
                key={member.id}
                href={`/profile/${member.id}`}
                className="flex items-center gap-3 p-4 hover:bg-wasika-cream/30 transition-colors"
              >
                <div className="w-8 text-center text-wasika-text-muted font-bold text-sm">
                  {member.rank}
                </div>
                <div className="w-10 h-10 rounded-full bg-wasika-cream flex items-center justify-center flex-shrink-0">
                  <span className="text-wasika-copper font-bold">{member.name[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-wasika-brown-dark font-medium truncate">{member.name}</p>
                  <p className="text-wasika-text-muted text-[10px]">{member.city || "Kota belum diatur"}</p>
                </div>
                <div className="text-right">
                  <p className="text-wasika-copper font-bold">{member.points}</p>
                  <p className="text-wasika-text-muted text-[10px]">pts</p>
                </div>
                <ChevronRight className="w-4 h-4 text-wasika-text-muted/40" />
              </Link>
            ))}

            {others.length === 0 && query && (
              <div className="p-8 text-center">
                <p className="text-wasika-text-muted text-sm">Tidak ditemukan hasil</p>
              </div>
            )}
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-gradient-to-br from-wasika-dark to-wasika-brown-dark rounded-3xl p-5 text-white shadow-lg relative overflow-hidden">
          <TrendingUp className="absolute top-0 right-0 w-24 h-24 text-white/5 -mr-4 -mt-4" />
          <h3 className="font-serif text-lg text-wasika-gold mb-1">Misi Harian</h3>
          <p className="text-wasika-text-muted text-xs mb-4">Dapatkan poin ekstra dengan mengikuti kegiatan silaturahmi.</p>
          <div className="flex gap-2">
            <Link 
              href="/forum"
              className="flex-1 bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold py-2 rounded-lg text-center transition-colors border border-white/10"
            >
              KIRIM PESAN
            </Link>
            <Link 
              href="/map"
              className="flex-1 bg-wasika-gold hover:bg-wasika-gold-light text-wasika-brown-dark text-[10px] font-bold py-2 rounded-lg text-center transition-colors"
            >
              LIHAT PETA
            </Link>
          </div>
        </div>
      </div>

      <BottomNav />
    </main>
  )
}
