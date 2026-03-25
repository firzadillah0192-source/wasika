"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { BatikParang } from "@/components/wasika/batik-parang"
import { WaSiKaLogo } from "@/components/wasika/wasika-logo"
import { Users, Plus, ArrowRight, Copy, Check } from "lucide-react"

export default function JoinPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<"choose" | "create" | "join">("choose")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Form states
  const [baniCode, setBaniCode] = useState("")
  const [baniName, setBaniName] = useState("")

  // Created bani result
  const [createdBani, setCreatedBani] = useState<{ name: string; code: string } | null>(null)

  const [userProfile, setUserProfile] = useState<any>(null)

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.replace("/login")
        return
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()

      setUserProfile(profile)

      // If user already has a bani, skip to checkin
      if (profile?.bani_id) {
        router.replace("/checkin")
        return
      }

      setLoading(false)
    }
    init()
  }, [router])

  const handleCreateBani = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!baniName.trim()) {
      setError("Nama keluarga wajib diisi.")
      return
    }
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch("/api/bani/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: baniName }),
      })

      const result = await res.json()

      if (!res.ok) {
        setError(result.error || "Gagal membuat keluarga.")
        setSubmitting(false)
        return
      }

      setCreatedBani({ name: baniName, code: result.baniCode })
      setMode("choose") // Will be overridden by createdBani state
    } catch (err) {
      setError("Terjadi kesalahan jaringan.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleJoinBani = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!baniCode.trim()) {
      setError("Kode Bani wajib diisi.")
      return
    }
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch("/api/bani/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baniCode }),
      })

      const result = await res.json()

      if (!res.ok) {
        setError(result.error || "Gagal bergabung.")
        setSubmitting(false)
        return
      }

      router.replace("/checkin")
    } catch (err) {
      setError("Terjadi kesalahan jaringan.")
      setSubmitting(false)
    }
  }

  const handleCopyCode = async () => {
    if (createdBani) {
      await navigator.clipboard.writeText(createdBani.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
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
          <p className="text-wasika-gold font-serif animate-pulse">Memuat...</p>
        </div>
      </main>
    )
  }

  // Show success screen after creating bani
  if (createdBani) {
    return (
      <main className="relative min-h-screen bg-wasika-dark overflow-hidden">
        <BatikParang />
        <div className="relative z-10 min-h-screen px-6 py-8 flex flex-col items-center justify-center">
          <div className="max-w-sm w-full text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-wasika-gold/20 flex items-center justify-center">
              <Check className="w-10 h-10 text-wasika-gold" />
            </div>
            <h1 className="font-serif text-2xl text-wasika-gold mb-2">Keluarga Dibuat!</h1>
            <p className="text-wasika-text-muted text-sm mb-8">
              Bagikan kode ini kepada anggota keluarga agar mereka bisa bergabung.
            </p>

            {/* Bani Code Display */}
            <div className="bg-wasika-brown-dark/60 border-2 border-wasika-gold/40 rounded-2xl p-6 mb-6">
              <p className="text-wasika-text-muted text-xs mb-1">Nama Keluarga</p>
              <p className="text-wasika-gold font-serif text-lg mb-4">{createdBani.name}</p>
              <p className="text-wasika-text-muted text-xs mb-2">Kode Bani</p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-wasika-gold font-mono text-3xl font-bold tracking-wider">
                  {createdBani.code}
                </span>
                <button
                  onClick={handleCopyCode}
                  className="p-2 rounded-lg bg-wasika-gold/10 hover:bg-wasika-gold/20 transition-colors"
                >
                  {copied ? (
                    <Check className="w-5 h-5 text-green-400" />
                  ) : (
                    <Copy className="w-5 h-5 text-wasika-gold" />
                  )}
                </button>
              </div>
              {copied && <p className="text-green-400 text-xs mt-2">Tersalin!</p>}
            </div>

            <button
              onClick={() => router.replace("/checkin")}
              className="w-full flex items-center justify-center gap-2 bg-wasika-gold hover:bg-wasika-gold-light text-wasika-brown-dark font-bold py-4 px-6 rounded-[11px] transition-colors"
            >
              Lanjut ke Aplikasi
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="relative min-h-screen bg-wasika-dark overflow-hidden">
      <BatikParang />

      <div className="relative z-10 min-h-screen px-6 py-8">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 mt-8">
          <WaSiKaLogo size={56} className="mb-2" />
          <h1 className="text-xl font-bold text-wasika-gold font-serif">Selamat Datang!</h1>
          <p className="text-wasika-text-muted text-sm mt-1 text-center">
            Pilih cara untuk memulai perjalanan silsilah Anda
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="max-w-sm mx-auto mb-4 bg-red-500/20 border border-red-500/40 rounded-[11px] px-4 py-3 text-center">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Choose Mode */}
        {mode === "choose" && (
          <div className="max-w-sm mx-auto space-y-4">
            {/* Create Family */}
            <button
              onClick={() => { setMode("create"); setError(null) }}
              className="w-full p-6 rounded-2xl border-2 border-wasika-gold/30 bg-wasika-brown-dark/40 hover:border-wasika-gold hover:bg-wasika-gold/5 transition-all text-left group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-wasika-gold/15 flex items-center justify-center flex-shrink-0 group-hover:bg-wasika-gold/25 transition-colors">
                  <Plus className="w-6 h-6 text-wasika-gold" />
                </div>
                <div>
                  <h3 className="text-wasika-gold font-bold text-lg mb-1">Buat Keluarga Baru</h3>
                  <p className="text-wasika-text-muted text-sm leading-relaxed">
                    Anda akan menjadi pengelola (panitia) keluarga dan mendapatkan kode unik untuk dibagikan.
                  </p>
                </div>
              </div>
            </button>

            {/* Join Family */}
            <button
              onClick={() => { setMode("join"); setError(null) }}
              className="w-full p-6 rounded-2xl border-2 border-wasika-copper/30 bg-wasika-brown-dark/40 hover:border-wasika-copper hover:bg-wasika-copper/5 transition-all text-left group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-wasika-copper/15 flex items-center justify-center flex-shrink-0 group-hover:bg-wasika-copper/25 transition-colors">
                  <Users className="w-6 h-6 text-wasika-copper" />
                </div>
                <div>
                  <h3 className="text-wasika-copper font-bold text-lg mb-1">Gabung Keluarga</h3>
                  <p className="text-wasika-text-muted text-sm leading-relaxed">
                    Masukkan kode Bani yang diberikan pengelola keluarga Anda.
                  </p>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Create Family Form */}
        {mode === "create" && (
          <div className="max-w-sm mx-auto">
            <button
              onClick={() => { setMode("choose"); setError(null) }}
              className="text-wasika-text-muted hover:text-wasika-gold text-sm mb-6 inline-flex items-center gap-1 transition-colors"
            >
              ← Kembali
            </button>

            <div className="bg-wasika-brown-dark/40 border border-wasika-gold/20 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-wasika-gold/15 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-wasika-gold" />
                </div>
                <div>
                  <h2 className="text-wasika-gold font-bold">Buat Keluarga Baru</h2>
                  <p className="text-wasika-text-muted text-xs">Anda akan menjadi pengelola</p>
                </div>
              </div>

              <form onSubmit={handleCreateBani} className="space-y-4">
                <div>
                  <label className="block text-wasika-text-muted text-sm mb-2">Nama Keluarga</label>
                  <input
                    type="text"
                    value={baniName}
                    onChange={(e) => setBaniName(e.target.value)}
                    placeholder="Contoh: Bani Hasan Al-Mubarak"
                    className="w-full bg-wasika-brown-dark/60 border border-wasika-gold/30 rounded-[11px] py-3.5 px-4 text-wasika-text-on-dark placeholder:text-wasika-text-muted/60 focus:outline-none focus:border-wasika-gold focus:ring-1 focus:ring-wasika-gold/50 text-base"
                    required
                  />
                  <p className="text-[10px] text-wasika-text-muted mt-1 px-1">
                    Kode unik akan dibuat otomatis setelah pembuatan.
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-wasika-gold hover:bg-wasika-gold-light text-wasika-brown-dark font-bold py-3.5 px-4 rounded-[11px] transition-colors disabled:opacity-50"
                >
                  {submitting ? "Membuat..." : "Buat Keluarga"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Join Family Form */}
        {mode === "join" && (
          <div className="max-w-sm mx-auto">
            <button
              onClick={() => { setMode("choose"); setError(null) }}
              className="text-wasika-text-muted hover:text-wasika-gold text-sm mb-6 inline-flex items-center gap-1 transition-colors"
            >
              ← Kembali
            </button>

            <div className="bg-wasika-brown-dark/40 border border-wasika-copper/20 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-wasika-copper/15 flex items-center justify-center">
                  <Users className="w-5 h-5 text-wasika-copper" />
                </div>
                <div>
                  <h2 className="text-wasika-copper font-bold">Gabung Keluarga</h2>
                  <p className="text-wasika-text-muted text-xs">Masukkan kode dari pengelola</p>
                </div>
              </div>

              <form onSubmit={handleJoinBani} className="space-y-4">
                <div>
                  <label className="block text-wasika-text-muted text-sm mb-2">Kode Bani</label>
                  <input
                    type="text"
                    value={baniCode}
                    onChange={(e) => setBaniCode(e.target.value.toUpperCase())}
                    placeholder="Masukkan kode, contoh: X4K9M2PQ"
                    className="w-full bg-wasika-brown-dark/60 border border-wasika-gold/30 rounded-[11px] py-3.5 px-4 text-wasika-text-on-dark placeholder:text-wasika-text-muted/60 focus:outline-none focus:border-wasika-gold focus:ring-1 focus:ring-wasika-gold/50 text-base font-mono tracking-wider text-center text-lg"
                    required
                  />
                  <p className="text-[10px] text-wasika-text-muted mt-1 px-1">
                    Tanyakan kode ini kepada pengelola keluarga Anda.
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-wasika-copper hover:bg-wasika-copper/90 text-white font-bold py-3.5 px-4 rounded-[11px] transition-colors disabled:opacity-50"
                >
                  {submitting ? "Menggabung..." : "Gabung Keluarga"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
