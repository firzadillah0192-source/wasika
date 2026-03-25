"use client"

"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Search, User, MapPin, ChevronRight, Loader2 } from "lucide-react"
import { BottomNav } from "@/components/wasika/bottom-nav"

interface Person {
  id: string
  name: string
  city: string | null
  province: string | null
  generation?: number
}

export default function SearchPage() {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Person[]>([])
  const [loading, setLoading] = useState(false)
  const [baniId, setBaniId] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace("/login")
        return
      }
      const { data: profile } = await supabase.from("profiles").select("bani_id").eq("id", user.id).single()
      setBaniId(profile?.bani_id)
    }
    init()
  }, [router])

  const handleSearch = useCallback(async (q: string) => {
    if (!q.trim() || !baniId) {
      setResults([])
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from("persons")
      .select("id, name, city, province")
      .eq("bani_id", baniId)
      .ilike("name", `%${q}%`)
      .limit(20)
    
    if (data) {
      setResults(data as Person[])
    }
    setLoading(false)
  }, [baniId])

  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch(query)
    }, 300)
    return () => clearTimeout(timer)
  }, [query, handleSearch])

  return (
    <main className="min-h-screen bg-wasika-cream pb-24">
      {/* Dark Header */}
      <div className="bg-wasika-dark px-5 py-4">
        <h1 className="font-serif text-xl text-wasika-gold">Cari Anggota</h1>
        <p className="text-wasika-text-muted text-sm mt-0.5">
          Temukan keluarga di pohon silsilah
        </p>
      </div>

      {/* Search Input */}
      <div className="px-5 py-4 sticky top-0 bg-wasika-cream border-b border-wasika-text-muted/20 z-10">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-wasika-text-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ketik nama atau kota..."
            className="w-full bg-white border border-wasika-text-muted/30 rounded-xl py-3 pl-12 pr-4 text-wasika-brown-dark placeholder:text-wasika-text-muted/60 focus:outline-none focus:border-wasika-gold focus:ring-1 focus:ring-wasika-gold/50 text-base"
          />
        </div>
      </div>

      {/* Results */}
      <div className="px-5 py-4">
        {query.trim() === "" ? (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-wasika-text-muted/40 mx-auto mb-3" />
            <p className="text-wasika-text-muted text-sm">
              Mulai ketik untuk mencari anggota keluarga
            </p>
          </div>
        ) : loading ? (
          <div className="text-center py-12">
            <Loader2 className="w-10 h-10 text-wasika-gold mx-auto mb-3 animate-spin" />
            <p className="text-wasika-text-muted text-sm">Mencari...</p>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-wasika-text-muted text-sm">
              Tidak ditemukan hasil untuk &quot;{query}&quot;
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-wasika-text-muted text-xs mb-3">
              {results.length} hasil ditemukan
            </p>
            {results.map((member) => (
              <Link
                key={member.id}
                href={`/profile/${member.id}`}
                className="flex items-center gap-3 bg-white rounded-xl p-4 border border-wasika-text-muted/20 hover:border-wasika-gold transition-colors"
              >
                <div className="w-11 h-11 rounded-full bg-wasika-cream flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-wasika-copper" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-wasika-brown-dark font-medium truncate">
                    {member.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {member.generation && (
                      <span className="text-wasika-text-muted text-xs">
                        Gen. {member.generation} ·
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-wasika-text-muted text-xs">
                      <MapPin className="w-3 h-3" />
                      {member.city || member.province || "Lokasi tidak diset"}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-wasika-text-muted flex-shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  )
}
