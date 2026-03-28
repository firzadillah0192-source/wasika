"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Gift, Sparkles, Coins, ArrowLeft, RefreshCw, Trophy, Package } from "lucide-react"
import { BottomNav } from "@/components/wasika/bottom-nav"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"

const REWARDS = [
  { id: "r1", name: "Sembako Premium", icon: Package, probability: 0.1, color: "text-amber-600" },
  { id: "r2", name: "Voucher Belanja Rp 50rb", icon: Gift, probability: 0.2, color: "text-purple-600" },
  { id: "r3", name: "Poin Tambahan +100", icon: Coins, probability: 0.3, color: "text-blue-600" },
  { id: "r4", name: "Kehormatan Keluarga", icon: Trophy, probability: 0.4, color: "text-gray-400" },
]

const COST = 50

export default function GachaPage() {
  const [points, setPoints] = useState(0)
  const [personId, setPersonId] = useState<string | null>(null)
  const [isSpinning, setIsSpinning] = useState(false)
  const [result, setResult] = useState<typeof REWARDS[0] | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: person } = await supabase
      .from("persons")
      .select("id, points")
      .eq("user_id", user.id)
      .single()
    
    if (person) {
      setPoints(person.points || 0)
      setPersonId(person.id)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSpin = async () => {
    if (points < COST || isSpinning) return

    setIsSpinning(true)
    setResult(null)

    // Simulate spin delay
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Weighted random selection
    const rand = Math.random()
    let cumulative = 0
    let selected = REWARDS[REWARDS.length - 1]
    
    for (const reward of REWARDS) {
      cumulative += reward.probability
      if (rand < cumulative) {
        selected = reward
        break
      }
    }

    const newPoints = points - COST
    // Update Points locally (DB points are being phased out)
    setPoints(newPoints)
    setResult(selected)
    setIsSpinning(false)
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-wasika-cream flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-wasika-gold animate-spin" />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-wasika-cream pb-24">
      {/* Header */}
      <div className="bg-wasika-dark px-6 pt-10 pb-20 rounded-b-[40px] relative">
        <Link 
          href="/activities"
          className="absolute left-6 top-10 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="text-center">
          <Sparkles className="w-12 h-12 text-wasika-gold mx-auto mb-2" />
          <h1 className="text-wasika-gold text-2xl font-serif">Gacha Hadiah</h1>
          <p className="text-wasika-text-muted text-sm">Gunakan poinmu untuk keberuntungan!</p>
        </div>
      </div>

      <div className="px-6 -mt-10">
        {/* Points Card */}
        <div className="bg-white rounded-3xl p-6 shadow-xl border border-wasika-text-muted/10 flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600">
              <Coins size={24} />
            </div>
            <div>
              <p className="text-wasika-text-muted text-xs uppercase font-bold tracking-wider">Saldo Poin</p>
              <p className="text-wasika-brown-dark text-2xl font-black">{points}</p>
            </div>
          </div>
          <div className="bg-wasika-cream px-3 py-1 rounded-full border border-wasika-gold/30">
            <p className="text-wasika-gold text-[10px] font-bold">-{COST} / SPIN</p>
          </div>
        </div>

        {/* Gacha Machine Simulation */}
        <div className="flex flex-col items-center">
          <div className="relative w-64 h-64 mb-10">
            {/* Spinning Circle */}
            <motion.div 
              animate={isSpinning ? { rotate: 360 } : { rotate: 0 }}
              transition={isSpinning ? { repeat: Infinity, duration: 0.5, ease: "linear" } : { duration: 0.5 }}
              className="w-full h-full rounded-full border-8 border-wasika-gold border-dashed flex items-center justify-center p-8 bg-wasika-dark shadow-2xl"
            >
              <div className="w-full h-full rounded-full bg-wasika-brown-dark flex items-center justify-center border-4 border-wasika-gold/20">
                <Gift className={`w-20 h-20 ${isSpinning ? "text-wasika-gold" : "text-wasika-gold/20"}`} />
              </div>
            </motion.div>

            {/* Result Popup */}
            <AnimatePresence>
              {result && (
                <motion.div 
                  initial={{ scale: 0, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="absolute inset-0 bg-white rounded-3xl shadow-2xl border-4 border-wasika-gold flex flex-col items-center justify-center p-6 z-30"
                >
                  <Sparkles className="text-wasika-gold mb-2 w-10 h-10 animate-bounce" />
                  <p className="text-wasika-text-muted text-xs font-bold uppercase mb-1">SELAMAT!</p>
                  <result.icon className={`w-12 h-12 mb-2 ${result.color}`} />
                  <h3 className="text-wasika-brown-dark font-black text-center text-lg leading-tight mb-4">{result.name}</h3>
                  <button 
                    onClick={() => setResult(null)}
                    className="bg-wasika-gold text-wasika-brown-dark text-xs font-bold px-6 py-2 rounded-full shadow-sm"
                  >
                    KLAIM
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={handleSpin}
            disabled={isSpinning || points < COST}
            className={`w-full max-w-xs py-4 rounded-2xl font-black text-lg transition-all shadow-lg active:scale-95 ${
              isSpinning || points < COST
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-gradient-to-r from-wasika-gold to-wasika-gold-light text-wasika-brown-dark"
            }`}
          >
            {isSpinning ? "MEMUTAR..." : "PUTAR SEKARANG"}
          </button>
          
          {points < COST && !isSpinning && (
             <p className="text-red-500 text-xs font-bold mt-4 animate-pulse">Poin tidak cukup!</p>
          )}
        </div>

        {/* Rewards List */}
        <div className="mt-12">
          <h3 className="text-wasika-brown-dark font-serif text-lg mb-4">Probabilitas Hadiah</h3>
          <div className="grid grid-cols-2 gap-3">
            {REWARDS.map((reward) => (
              <div key={reward.id} className="bg-white p-4 rounded-2xl border border-wasika-text-muted/10 shadow-sm flex items-center gap-3">
                <reward.icon size={20} className={reward.color} />
                <div className="min-w-0">
                  <p className="text-wasika-brown-dark font-bold text-[10px] truncate">{reward.name}</p>
                  <p className="text-wasika-text-muted text-[10px] font-medium">Chance: {reward.probability * 100}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <BottomNav />
    </main>
  )
}
