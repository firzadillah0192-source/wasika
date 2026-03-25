"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { BatikKawung } from "@/components/wasika/batik-kawung"
import { WaSiKaLogo } from "@/components/wasika/wasika-logo"
import { GoldDivider } from "@/components/wasika/gold-divider"
import { Search, QrCode } from "lucide-react"

export default function LandingPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [showDropdown, setShowDropdown] = useState(false)
  const [filteredResults, setFilteredResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const searchBanis = async () => {
      if (searchQuery.length >= 2) {
        setIsSearching(true)
        try {
          const res = await fetch(`/api/bani/search?q=${encodeURIComponent(searchQuery)}`)
          const data = await res.json()
          setFilteredResults(data.results || [])
        } catch(e) {
          console.error(e)
          setFilteredResults([])
        }
        setShowDropdown(true)
        setIsSearching(false)
      } else {
        setFilteredResults([])
        setShowDropdown(false)
      }
    }

    const timer = setTimeout(() => {
      searchBanis()
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSelectBani = (bani: any) => {
    setSearchQuery(bani.name)
    setShowDropdown(false)
    // Navigate to login with bani context
    window.location.href = `/login?bani=${bani.bani_code}`
  }

  return (
    <main className="relative min-h-screen bg-wasika-dark overflow-hidden">
      {/* Kawung Batik Pattern Background */}
      <BatikKawung />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-12">
        {/* Logo and Branding */}
        <div className="flex flex-col items-center mb-8">
          <WaSiKaLogo size={80} className="mb-4" />
          <h1 
            className="text-[28px] font-bold text-wasika-gold font-serif tracking-wide"
          >
            WaSiKa
          </h1>
          <p className="text-wasika-text-muted text-sm mt-1 tracking-widest uppercase">
            Warisan Silsilah Keluarga
          </p>
        </div>

        {/* Bismillah Arabic */}
        <div className="arabic-text text-wasika-gold text-2xl mb-6" dir="rtl">
          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
        </div>

        {/* Gold Divider */}
        <GoldDivider className="mb-10" />

        {/* Search Section */}
        <div ref={searchRef} className="w-full max-w-sm relative mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-wasika-text-muted" />
            <input
              type="text"
              placeholder="Nama bani atau kode keluarga..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.length > 0 && setShowDropdown(true)}
              className="w-full bg-wasika-brown-dark/60 border border-wasika-gold/30 rounded-[11px] py-4 pl-12 pr-4 text-wasika-text-on-dark placeholder:text-wasika-text-muted/60 focus:outline-none focus:border-wasika-gold focus:ring-1 focus:ring-wasika-gold/50 transition-all"
            />
          </div>

          {/* Autocomplete Dropdown */}
          {showDropdown && filteredResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-wasika-brown-dark border border-wasika-gold/30 rounded-[11px] overflow-hidden shadow-xl z-20">
              {filteredResults.map((bani) => (
                <button
                  key={bani.id}
                  onClick={() => handleSelectBani(bani)}
                  className="w-full px-4 py-3 text-left hover:bg-wasika-gold/10 transition-colors border-b border-wasika-gold/10 last:border-b-0"
                >
                  <p className="text-wasika-text-on-dark font-medium">{bani.name}</p>
                  <p className="text-wasika-text-muted text-sm">
                    {bani.bani_code || "Tanpa Kode"} {bani.location ? `• ${bani.location}` : ""}
                  </p>
                </button>
              ))}
            </div>
          )}

          {showDropdown && filteredResults.length === 0 && !isSearching && searchQuery.length >= 2 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-wasika-brown-dark border border-wasika-gold/30 rounded-[11px] p-4 text-center">
              <p className="text-wasika-text-muted">Keluarga tidak ditemukan</p>
            </div>
          )}
          
          {isSearching && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-wasika-brown-dark border border-wasika-gold/30 rounded-[11px] p-4 text-center">
              <p className="text-wasika-text-muted animate-pulse">Mencari...</p>
            </div>
          )}
        </div>

        {/* OR Divider */}
        <div className="flex items-center gap-4 w-full max-w-sm mb-6">
          <div className="flex-1 h-px bg-wasika-gold/30" />
          <span className="text-wasika-text-muted text-sm">ATAU</span>
          <div className="flex-1 h-px bg-wasika-gold/30" />
        </div>

        {/* QR Scan Box */}
        <button className="w-full max-w-sm border-2 border-dashed border-wasika-gold/40 rounded-[11px] py-8 flex flex-col items-center gap-3 hover:border-wasika-gold hover:bg-wasika-gold/5 transition-all group">
          <div className="w-16 h-16 rounded-xl bg-wasika-gold/10 flex items-center justify-center group-hover:bg-wasika-gold/20 transition-colors">
            <QrCode className="w-8 h-8 text-wasika-gold" />
          </div>
          <div className="text-center">
            <p className="text-wasika-text-on-dark font-medium">Scan QR Code</p>
            <p className="text-wasika-text-muted text-sm">Pindai kode undangan keluarga</p>
          </div>
        </button>

        {/* Footer Link */}
        <div className="mt-12">
          <Link
            href="/login?mode=register&role=panitia"
            className="text-wasika-text-muted hover:text-wasika-gold transition-colors text-sm underline underline-offset-4 decoration-wasika-gold/30 hover:decoration-wasika-gold"
          >
            Pengelola keluarga? Daftar di sini
          </Link>
        </div>
      </div>
    </main>
  )
}
