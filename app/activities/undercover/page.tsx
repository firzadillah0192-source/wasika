"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Users, Shield, UserX, Eye, Info, ArrowLeft, RefreshCw, Send, Trophy } from "lucide-react"
import { BottomNav } from "@/components/wasika/bottom-nav"
import Link from "next/link"

interface UndercoverPlayer {
  id: string
  person_id: string
  name: string
  is_eliminated: boolean
  is_undercover?: boolean
}

export default function UndercoverPage() {
  const [loading, setLoading] = useState(true)
  const [game, setGame] = useState<any>(null)
  const [players, setPlayers] = useState<UndercoverPlayer[]>([])
  const [myPersonId, setMyPersonId] = useState<string | null>(null)
  const [isUndercover, setIsUndercover] = useState(false)
  const [word, setWord] = useState("")
  const [showWord, setShowWord] = useState(false)

  const fetchData = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase.from("profiles").select("bani_id").eq("id", user.id).single()
    const { data: person } = await supabase.from("persons").select("id").eq("user_id", user.id).single()
    
    if (person) setMyPersonId(person.id)
    if (!profile?.bani_id) return

    // Find latest lobby or game for this bani
    const { data: latestGame } = await supabase
      .from("games_undercover")
      .select("*")
      .eq("bani_id", profile.bani_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (latestGame) {
      setGame(latestGame)
      // Fetch players with person names
      const { data: gamePlayers } = await supabase
        .from("games_undercover_players")
        .select("*, persons(name)")
        .eq("game_id", latestGame.id)
      
      if (gamePlayers) {
        setPlayers(gamePlayers.map((p: any) => ({
          id: p.id,
          person_id: p.person_id,
          name: p.persons.name,
          is_eliminated: p.is_eliminated
        })))

        const me = gamePlayers.find((p: any) => p.person_id === person?.id)
        if (me) {
          setIsUndercover(latestGame.undercover_id === person?.id)
          setWord(latestGame.undercover_id === person?.id ? latestGame.word_undercover : latestGame.word_normal)
        }
      }
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Real-time subscription
  useEffect(() => {
    if (!game) return
    const supabase = createClient()
    const channel = supabase.channel(`undercover-${game.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games_undercover_players', filter: `game_id=eq.${game.id}` }, () => {
        fetchData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games_undercover', filter: `id=eq.${game.id}` }, () => {
        fetchData()
      })
      .subscribe()
    
    return () => {
      supabase.removeChannel(channel)
    }
  }, [game, fetchData])

  const joinGame = async () => {
    if (!game || !myPersonId) return
    const supabase = createClient()
    await supabase.from("games_undercover_players").insert({
      game_id: game.id,
      person_id: myPersonId
    })
    fetchData()
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-wasika-cream flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-wasika-gold animate-spin" />
      </main>
    )
  }

  if (!game) {
    return (
      <main className="min-h-screen bg-wasika-cream flex flex-col items-center justify-center p-6 text-center">
        <Shield className="w-16 h-16 text-wasika-gold mb-4" />
        <h1 className="text-xl font-serif text-wasika-brown-dark mb-2">Belum ada Permainan</h1>
        <p className="text-wasika-text-muted text-sm mb-6">Minta panitia untuk memulai sesi permainan di dashboard mereka.</p>
        <Link 
          href="/activities"
          className="bg-wasika-gold text-wasika-brown-dark px-8 py-3 rounded-full font-bold shadow-md"
        >
          KEMBALI KE HUB
        </Link>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-wasika-cream pb-24">
      {/* Header */}
      <div className="bg-wasika-dark px-6 pt-10 pb-16 rounded-b-[40px] shadow-lg relative">
        <Link 
          href="/activities"
          className="absolute left-6 top-10 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="text-center">
          <Shield className="w-12 h-12 text-wasika-gold mx-auto mb-2" />
          <h1 className="text-wasika-gold text-2xl font-serif">Undercover</h1>
          <p className="text-wasika-text-muted text-xs uppercase tracking-widest font-bold">
            Status: <span className="text-wasika-gold">{game.status.toUpperCase()}</span>
          </p>
        </div>
      </div>

      <div className="px-6 -mt-8">
        {/* Word Reveal Card (Only if playing) */}
        {game.status === "playing" && players.some(p => p.person_id === myPersonId && !p.is_eliminated) && (
          <div className="bg-white rounded-3xl p-6 shadow-xl border border-wasika-text-muted/10 mb-6 flex flex-col items-center text-center">
            <h3 className="text-wasika-text-muted text-xs font-bold uppercase mb-3">Kata Rahasia Kamu</h3>
            <div 
              onClick={() => setShowWord(!showWord)}
              className="w-full bg-wasika-cream border-2 border-dashed border-wasika-gold/40 rounded-2xl py-8 cursor-pointer active:scale-[0.98] transition-all flex flex-col items-center"
            >
              {showWord ? (
                <p className="text-wasika-brown-dark font-black text-3xl">{word}</p>
              ) : (
                <div className="flex flex-col items-center text-wasika-gold/50">
                  <Eye className="w-10 h-10 mb-2" />
                  <p className="text-xs font-bold">TAP UNTUK LIHAT</p>
                </div>
              )}
            </div>
            <p className="text-wasika-text-muted text-[10px] mt-4 flex items-center gap-1">
              <Info size={12} /> Ssst! Jangan sampai terlihat keluarga lain ya.
            </p>
          </div>
        )}

        {/* Player List */}
        <section className="bg-white rounded-3xl border border-wasika-text-muted/15 overflow-hidden shadow-sm mb-6">
          <div className="px-5 py-4 border-b border-wasika-text-muted/10 flex justify-between items-center">
            <h2 className="text-wasika-brown-dark font-black text-sm uppercase tracking-wider">Pemain Terdaftar ({players.length})</h2>
            <div className="flex items-center gap-1 bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full text-[10px] font-bold">
              <Users size={12} /> {players.length}
            </div>
          </div>
          <div className="divide-y divide-wasika-text-muted/10">
            {players.length === 0 ? (
              <div className="p-10 text-center">
                <Users className="w-10 h-10 text-wasika-text-muted/20 mx-auto mb-2" />
                <p className="text-wasika-text-muted text-xs">Menunggu pemain lain bergabung...</p>
              </div>
            ) : (
              players.map((p) => (
                <div key={p.id} className={`flex items-center justify-between p-4 ${p.is_eliminated ? "bg-gray-50 bg-opacity-80" : ""}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold shadow-sm ${
                      p.is_eliminated ? "bg-gray-200 text-gray-400" : "bg-wasika-cream text-wasika-copper"
                    }`}>
                      {p.name[0]}
                    </div>
                    <div>
                    <h4 className={`text-sm font-bold truncate max-w-[140px] ${p.is_eliminated ? "text-gray-400 line-through" : "text-wasika-brown-dark"}`}>
                      {p.name} {p.person_id === myPersonId ? "(Anda)" : ""}
                    </h4>
                    {p.is_eliminated && <p className="text-red-500 text-[9px] font-bold uppercase">Tereliminasi</p>}
                    </div>
                  </div>
                  {!p.is_eliminated && game.status === "playing" && (
                     <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse shadow-sm shadow-green-200" title="Aktif" />
                  )}
                  {p.is_eliminated && <UserX className="w-4 h-4 text-red-300" />}
                </div>
              ))
            )}
          </div>
        </section>

        {/* Action Button */}
        {game.status === "lobby" && !players.some(p => p.person_id === myPersonId) && (
          <button
            onClick={joinGame}
            className="w-full bg-wasika-gold text-wasika-brown-dark font-black py-4 rounded-3xl shadow-lg active:scale-95 transition-all text-lg mb-8"
          >
            GABUNG PERMAINAN
          </button>
        )}

        {game.status === "finished" && (
           <div className="bg-gradient-to-br from-wasika-gold to-wasika-gold-light p-6 rounded-3xl shadow-xl flex flex-col items-center text-center">
              <Trophy className="w-12 h-12 text-wasika-brown-dark mb-2" />
              <h2 className="text-wasika-brown-dark font-black text-xl mb-1">Permainan Selesai!</h2>
              {isUndercover ? (
                 <p className="text-wasika-brown-dark/80 text-sm font-medium">Undercover menang telak! Rahasia tetap aman.</p>
              ) : (
                 <p className="text-wasika-brown-dark/80 text-sm font-medium">Bani menang! Undercover berhasil diungkap.</p>
              )}
           </div>
        )}
        
        {/* Helper Card */}
        <div className="bg-wasika-dark rounded-3xl p-5 text-white shadow-lg border border-white/5 relative overflow-hidden">
           <Shield className="absolute bottom-0 right-0 w-20 h-20 text-white opacity-5 -mr-4 -mb-4" />
           <p className="text-wasika-gold font-bold text-xs uppercase mb-2 tracking-widest">Cara Bermain</p>
           <ul className="text-xs space-y-2 text-wasika-text-muted">
              <li>1. Temukan siapa yang punya kata berbeda (Undercover).</li>
              <li>2. Deskripsikan katamu secara bergantian.</li>
              <li>3. Vote pemain yang menurutmu mencurigakan!</li>
           </ul>
        </div>
      </div>

      <BottomNav />
    </main>
  )
}
