"use client"

import { useState, useEffect, useCallback } from "react"
import dynamic from "next/dynamic"
import { ArrowLeft, MapPin, Users, Building2, Map } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { BottomNav } from "@/components/wasika/bottom-nav"
import { createClient } from "@/lib/supabase/client"

// Dynamically import map components to avoid SSR issues
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
)
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
)
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
)
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
)

// Fix Leaflet marker icons in Next.js
let L: any;
if (typeof window !== 'undefined') {
  import('leaflet').then((leaflet) => {
    L = leaflet.default;
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    });
  });
}

// Family member locations
interface MemberLocation {
  id: string
  name: string
  city: string
  province: string
  lat: number
  lng: number
  isCurrentUser?: boolean
}

export default function MapPage() {
  const router = useRouter()
  const [selectedMember, setSelectedMember] = useState<MemberLocation | null>(null)
  const [isClient, setIsClient] = useState(false)
  const [loading, setLoading] = useState(true)
  const [locations, setLocations] = useState<MemberLocation[]>([])
  const [bani, setBani] = useState<any>(null)
  const [stats, setStats] = useState({ total: 0, cities: 0, provinces: 0 })
  const [topCities, setTopCities] = useState<[string, number][]>([])
  const [maxCityCount, setMaxCityCount] = useState(0)

  useEffect(() => {
    setIsClient(true)
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace("/login")
        return
      }

      const { data: profile } = await (supabase.from("profiles").select("*, banis(*)").eq("id", user.id).single() as any)
      setBani(profile?.banis)

      if (profile?.bani_id) {
        const { data: persons } = await supabase
          .from("persons")
          .select("*")
          .eq("bani_id", profile.bani_id)
          .not("latitude", "is", null)
          .not("longitude", "is", null)
        
        if (persons) {
          const locs: MemberLocation[] = persons.map((p: any) => ({
            id: p.id,
            name: p.name,
            city: p.city || "Tidak diketahui",
            province: p.province || "Tidak diketahui",
            lat: Number(p.latitude),
            lng: Number(p.longitude),
            isCurrentUser: p.user_id === user.id
          }))
          setLocations(locs)

          // Calculate stats
          const uniqueCities = new Set(locs.map(l => l.city)).size
          const uniqueProvinces = new Set(locs.map(l => l.province)).size
          setStats({ total: locs.length, cities: uniqueCities, provinces: uniqueProvinces })

          // Top cities
          const cityCounts = locs.reduce((acc, m) => {
            acc[m.city] = (acc[m.city] || 0) + 1
            return acc
          }, {} as Record<string, number>)

          const sorted = Object.entries(cityCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
          setTopCities(sorted)
          setMaxCityCount(Math.max(...sorted.map(([, count]) => count), 1))
        } else {
          console.log("No location data found in persons for bani_id:", profile.bani_id)
        }
      } else {
        console.log("User has no bani_id")
      }
      setLoading(false)
    }
    init()
  }, [router])

  return (
    <main className="min-h-screen bg-[#e8f5e9] flex flex-col pb-20">
      {/* Dark Green Header */}
      <div className="bg-gradient-to-br from-[#1a3318] to-[#2d5a3d] px-5 py-4">
        <div className="flex items-center gap-3 mb-3">
          <Link 
            href="/tree" 
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-white" />
          </Link>
          <h1 className="font-serif text-xl text-white">
            Peta Sebaran
          </h1>
        </div>
        <p className="text-green-200 text-sm">
          Bani {bani?.name || "Keluarga"} tersebar di seluruh Nusantara
        </p>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative" style={{ minHeight: "400px" }}>
        {isClient && (
          <>
            <link
              rel="stylesheet"
              href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
              integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
              crossOrigin=""
            />
            <MapContainer
              center={[-2.5, 118]}
              zoom={4}
              style={{ height: "100%", width: "100%", minHeight: "400px" }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {locations.map((member) => (
                <Marker
                  key={member.id}
                  position={[member.lat, member.lng]}
                  eventHandlers={{
                    click: () => setSelectedMember(member),
                  }}
                />
              ))}
            </MapContainer>
            
            {/* Custom marker legend overlay */}
            <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-xl border border-wasika-text-muted/30 px-3 py-2 shadow-lg z-[1000]">
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-wasika-gold ring-2 ring-wasika-gold-light" />
                <span className="text-wasika-brown-dark">Anda</span>
              </div>
              <div className="flex items-center gap-2 text-xs mt-1">
                <div className="w-3 h-3 rounded-full bg-wasika-copper ring-2 ring-wasika-gold/50" />
                <span className="text-wasika-brown-dark">Anggota</span>
              </div>
            </div>
          </>
        )}

        {/* Loading placeholder for SSR */}
        {!isClient && (
          <div className="absolute inset-0 bg-[#e8f5e9] flex items-center justify-center">
            <div className="text-center">
              <Map className="w-12 h-12 text-[#2d5a3d] mx-auto mb-2 animate-pulse" />
              <p className="text-[#2d5a3d] text-sm">Memuat peta...</p>
            </div>
          </div>
        )}
      </div>

      {/* Stats Strip */}
      <div className="bg-white border-t border-wasika-text-muted/20 px-5 py-4">
        <div className="flex justify-around">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Users className="w-4 h-4 text-wasika-copper" />
              <span className="font-bold text-wasika-brown-dark text-lg">{stats.total}</span>
            </div>
            <p className="text-wasika-text-muted text-xs">Total Anggota</p>
          </div>
          <div className="w-px bg-wasika-text-muted/20" />
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Building2 className="w-4 h-4 text-wasika-copper" />
              <span className="font-bold text-wasika-brown-dark text-lg">{stats.cities}</span>
            </div>
            <p className="text-wasika-text-muted text-xs">Kota</p>
          </div>
          <div className="w-px bg-wasika-text-muted/20" />
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <MapPin className="w-4 h-4 text-wasika-copper" />
              <span className="font-bold text-wasika-brown-dark text-lg">{stats.provinces}</span>
            </div>
            <p className="text-wasika-text-muted text-xs">Provinsi</p>
          </div>
        </div>
      </div>

      {/* Top 5 Cities */}
      <div className="bg-white border-t border-wasika-text-muted/20 px-5 py-4">
        <h3 className="text-wasika-brown-dark font-bold text-sm mb-3">Top 5 Kota</h3>
        <div className="space-y-2.5">
          {topCities.map(([city, count], idx) => (
            <div key={city} className="flex items-center gap-3">
              <span className="text-wasika-text-muted text-xs w-4">{idx + 1}.</span>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-wasika-brown-dark text-sm font-medium">{city}</span>
                  <span className="text-wasika-copper text-sm font-bold">{count}</span>
                </div>
                <div className="h-2 bg-wasika-cream rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-wasika-copper rounded-full transition-all duration-500"
                    style={{ width: `${(count / maxCityCount) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Selected Member Popup */}
      {selectedMember && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-wasika-gold shadow-2xl z-[1001] animate-in slide-in-from-bottom duration-300">
          <div className="px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div 
                  className={`w-11 h-11 rounded-full flex items-center justify-center ${
                    selectedMember.isCurrentUser 
                      ? "bg-gradient-to-br from-wasika-copper to-wasika-gold" 
                      : "bg-wasika-cream border-2 border-wasika-copper"
                  }`}
                >
                  <MapPin className={`w-5 h-5 ${selectedMember.isCurrentUser ? "text-white" : "text-wasika-copper"}`} />
                </div>
                <div>
                  <p className="text-wasika-brown-dark font-bold">{selectedMember.name}</p>
                  <p className="text-wasika-text-muted text-sm">{selectedMember.city}, {selectedMember.province}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedMember(null)}
                className="text-wasika-text-muted hover:text-wasika-brown-dark transition-colors text-sm"
              >
                Tutup
              </button>
            </div>
            <Link
              href={`/profile/${selectedMember.id}`}
              className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-[11px] bg-wasika-gold text-wasika-brown-dark font-bold hover:bg-wasika-gold-light transition-colors"
            >
              Lihat Profil
            </Link>
          </div>
        </div>
      )}

      <BottomNav />
    </main>
  )
}
