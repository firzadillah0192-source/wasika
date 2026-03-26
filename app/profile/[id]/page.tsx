"use client"

import { use } from "react"
import Link from "next/link"
import { ArrowLeft, Edit2, GitBranch, Phone, MapPin, Calendar, User, Users, Heart, ChevronRight, Check, LogOut } from "lucide-react"
import { BottomNav } from "@/components/wasika/bottom-nav"
import LocationPickerWrapper from "@/components/wasika/location-picker"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface PersonProfile {
  id: string
  name: string
  generation: number
  birthDate: string | null
  address: string | null
  phone: string | null
  lat?: number | null
  lng?: number | null
  city?: string | null
  province?: string | null
  userId?: string | null
  bani_id?: string | null
  bani_name?: string | null
  father?: { id: string; name: string }
  mother?: { id: string; name: string }
  spouse?: { id: string; name: string }
  siblings: { id: string; name: string }[]
  children: { id: string; name: string }[]
  attendanceHistory: { year: number; event: string; attended: boolean }[]
}

export default function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<PersonProfile | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState({ name: "", birthDate: "", address: "", phone: "" })
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  
  const [showMapPicker, setShowMapPicker] = useState(false)
  const [customPosition, setCustomPosition] = useState<{lat: number, lng: number} | null>(null)

  // API Wilayah States
  const [provinces, setProvinces] = useState<any[]>([])
  const [regencies, setRegencies] = useState<any[]>([])
  const [districts, setDistricts] = useState<any[]>([])
  const [selectedProvinceId, setSelectedProvinceId] = useState("")
  const [selectedRegencyId, setSelectedRegencyId] = useState("")
  const [selectedDistrictId, setSelectedDistrictId] = useState("")
  const [jalan, setJalan] = useState("")

  const fetchProfile = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUserId(user?.id || null)
    
    // 1. Fetch Person
    const { data: person, error } = await (supabase.from("persons").select("*, banis(name)").eq("id", id).single() as any)
    if (error || !person) {
      router.replace("/tree")
      return
    }

    // 2. Fetch Relationships using explicit foreign keys
    const { data: relations } = await supabase
      .from("relationships")
      .select(`
        type, 
        related_person_id, 
        person:persons!relationships_related_person_id_fkey(id, name, gender)
      `)
      .eq("person_id", id)
    
    // Reverse relationships for child -> parent
    const { data: reverseRelations } = await supabase
      .from("relationships")
      .select(`
        type, 
        person_id, 
        person:persons!relationships_person_id_fkey(id, name, gender)
      `)
      .eq("related_person_id", id)

    const prof: PersonProfile = {
      id: person.id,
      name: person.name,
      generation: 1, // To be calculated or fetched
      birthDate: person.birth_date,
      address: person.full_address,
      phone: person.phone,
      lat: person.latitude,
      lng: person.longitude,
      city: person.city,
      province: person.province,
      userId: person.user_id,
      bani_id: person.bani_id,
      bani_name: person.banis?.name,
      siblings: [],
      children: [],
      attendanceHistory: []
    }

    relations?.forEach((r: any) => {
      const relPerson = Array.isArray(r.person) ? r.person[0] : r.person
      if (!relPerson) return

      if (r.type === "parent") {
        if (relPerson.gender === 'male') {
          prof.father = { id: relPerson.id, name: relPerson.name }
        } else if (relPerson.gender === 'female') {
          prof.mother = { id: relPerson.id, name: relPerson.name }
        } else {
          if (!prof.father) prof.father = { id: relPerson.id, name: relPerson.name }
          else prof.mother = { id: relPerson.id, name: relPerson.name }
        }
      } else if (r.type === "child") {
        prof.children.push({ id: relPerson.id, name: relPerson.name })
      } else if (r.type === "spouse") {
        prof.spouse = { id: relPerson.id, name: relPerson.name }
      }
    })

    reverseRelations?.forEach((r: any) => {
      const relPerson = Array.isArray(r.person) ? r.person[0] : r.person
      if (!relPerson) return

      if (r.type === "parent") {
        prof.children.push({ id: relPerson.id, name: relPerson.name })
      } else if (r.type === "child") {
        if (relPerson.gender === 'male') {
          prof.father = { id: relPerson.id, name: relPerson.name }
        } else if (relPerson.gender === 'female') {
          prof.mother = { id: relPerson.id, name: relPerson.name }
        } else {
          if (!prof.father) prof.father = { id: relPerson.id, name: relPerson.name }
          else prof.mother = { id: relPerson.id, name: relPerson.name }
        }
      }
    })

    // 3. Fetch Attendances
    const { data: attendances } = await supabase
      .from("attendances")
      .select("*, events(name, date)")
      .eq("person_id", id)
      .order("checked_in_at", { ascending: false })
    
    if (attendances) {
      prof.attendanceHistory = attendances.map((a: any) => ({
        year: new Date(a.events?.date).getFullYear(),
        event: a.events?.name || "Acara Keluarga",
        attended: true
      }))
    }

    setProfile(prof)
    setEditForm({
      name: person.name || "",
      birthDate: person.birth_date || "",
      address: person.full_address || "",
      phone: person.phone || ""
    })
    setLoading(false)
  }, [id, router])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  // Fetch Provinces
  useEffect(() => {
    if (isEditing) {
      fetch("https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json")
        .then(res => res.json())
        .then(data => {
          setProvinces(data)
          // Attempt to restore previously selected province dropdown by matching names
          if (profile?.province && !selectedProvinceId) {
            const match = data.find((p: any) => p.name.toUpperCase() === profile.province?.toUpperCase())
            if (match) {
              setSelectedProvinceId(match.id)
            }
          }
        })
        .catch(err => console.error("Fetch provinces error:", err))
    }
  }, [isEditing, profile])

  // Fetch Regencies
  useEffect(() => {
    if (selectedProvinceId && selectedProvinceId !== "show") {
      fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/regencies/${selectedProvinceId}.json`)
        .then(res => res.json())
        .then(data => {
          setRegencies(data)
          // Attempt to restore previously selected regency dropdown by matching names
          if (profile?.city && !selectedRegencyId) {
            const match = data.find((r: any) => r.name.toUpperCase() === profile.city?.toUpperCase())
            if (match) {
              setSelectedRegencyId(match.id)
            }
          }
        })
    } else if (selectedProvinceId !== "show") {
      setRegencies([])
      setDistricts([])
    }
  }, [selectedProvinceId, profile])

  // Fetch Districts
  useEffect(() => {
    if (selectedRegencyId) {
      fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/districts/${selectedRegencyId}.json`)
        .then(res => res.json())
        .then(data => setDistricts(data))
    } else {
      setDistricts([])
    }
  }, [selectedRegencyId])

  if (loading) {
    return (
      <main className="min-h-screen bg-wasika-cream pb-20">
        <div className="bg-wasika-dark px-5 pt-6 pb-8">
          <div className="h-4 w-16 bg-wasika-gold/20 rounded animate-pulse mb-4" />
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-wasika-gold/20 animate-pulse" />
            <div className="flex-1">
              <div className="h-6 w-40 bg-wasika-gold/20 rounded animate-pulse mb-2" />
              <div className="h-4 w-24 bg-wasika-gold/10 rounded animate-pulse" />
            </div>
          </div>
        </div>
        <div className="px-5 py-6 space-y-5">
          <div className="bg-white rounded-2xl border border-wasika-text-muted/20 p-4 space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex gap-3">
                <div className="w-5 h-5 bg-wasika-text-muted/10 rounded animate-pulse" />
                <div className="flex-1">
                  <div className="h-3 w-20 bg-wasika-text-muted/10 rounded animate-pulse mb-2" />
                  <div className="h-4 w-36 bg-wasika-text-muted/20 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <BottomNav />
      </main>
    )
  }

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      const supabase = createClient()
      
      let lat = profile?.lat || null
      let lng = profile?.lng || null
      let city = profile?.city || null
      let province = profile?.province || null

      let fullAddress = editForm.address
      let fbDistrict = ""
      let fbRegency = ""
      let fbProvince = ""

      if (selectedProvinceId && selectedRegencyId) {
        const provName = provinces.find(p => p.id === selectedProvinceId)?.name || ""
        const regName = regencies.find(r => r.id === selectedRegencyId)?.name || ""
        const distName = districts.find(d => d.id === selectedDistrictId)?.name || ""
        
        fbDistrict = distName
        fbRegency = regName
        fbProvince = provName
        
        fullAddress = `${jalan}${jalan ? ", " : ""}${distName}${distName ? ", " : ""}${regName}, ${provName}`
        // Set basic city/province immediately in case all geocoding fails
        city = regName
        province = provName
      }

      if (customPosition) {
        lat = customPosition.lat
        lng = customPosition.lng
      } else if (fullAddress && (fullAddress !== profile?.address || !lat)) {
        try {
          const fetchGeo = async (addrToSearch: string) => {
            const geoRes = await fetch("/api/geo", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ address: addrToSearch })
            })
            if (geoRes.ok) return await geoRes.json()
            return null
          }

          // 1. Try full address (often fails if too specific like RT/RW)
          let geoData = await fetchGeo(fullAddress)
          
          // 2. Fallback: District + Regency + Province
          if (!geoData && fbDistrict) {
            console.log("Geocoding full address failed, falling back to District/Regency...")
            geoData = await fetchGeo(`${fbDistrict}, ${fbRegency}, ${fbProvince}`)
          }
          
          // 3. Fallback: Regency + Province
          if (!geoData && fbRegency) {
            console.log("Geocoding District failed, falling back to Regency...")
            geoData = await fetchGeo(`${fbRegency}, ${fbProvince}`)
          }

          if (geoData) {
            lat = geoData.lat
            lng = geoData.lng
            const details = geoData.addressDetails
            if (details) {
              city = details.city || details.town || details.village || details.city_district || city || null
              province = details.state || province || null
            }
          } else {
            console.error("All geocoding attempts failed.")
          }
        } catch (e) {
          console.error("Geocoding failed:", e)
        }
      }

      const { error } = await supabase
        .from("persons")
        .update({
          name: editForm.name,
          birth_date: editForm.birthDate || null,
          full_address: fullAddress || null,
          phone: editForm.phone || null,
          latitude: lat,
          longitude: lng,
          city: city,
          province: province,
          bani_id: profile?.bani_id
        })
        .eq("id", id)
      
      if (error) throw error
      setIsEditing(false)
      fetchProfile()
    } catch (err) {
      console.error("Save error:", err)
    } finally {
      setSaving(false)
    }
  }

  const canEdit = profile && currentUserId && profile.userId === currentUserId

  if (!profile) return null

  return (
    <main className="min-h-screen bg-wasika-cream pb-20">
      <div className="bg-wasika-dark px-5 pt-6 pb-8">
        <Link href="/tree" className="inline-flex items-center gap-1.5 text-wasika-text-muted hover:text-wasika-gold transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Kembali</span>
        </Link>
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #d4a843 0%, #f5c842 100%)" }}>
            <User className="w-7 h-7 text-wasika-brown-dark" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-serif text-2xl text-wasika-gold truncate">{profile.name}</h1>
            <p className="text-wasika-text-muted text-sm mt-0.5">
              Generasi ke-{profile.generation} &middot; {profile.bani_name || "Belum Terhubung"}
            </p>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          {canEdit && (
            <button 
              onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)}
              disabled={saving}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border text-sm font-medium transition-colors ${
                isEditing ? "border-wasika-gold bg-wasika-gold text-wasika-brown-dark hover:bg-wasika-gold-light" : "border-wasika-gold/40 text-wasika-gold hover:bg-wasika-gold/10"
              }`}
            >
              <Edit2 className="w-4 h-4" />
              {saving ? "Menyimpan..." : isEditing ? "Simpan" : "Edit profil"}
            </button>
          )}
          <Link href="/tree" className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border border-wasika-gold/40 text-wasika-gold text-sm font-medium hover:bg-wasika-gold/10 transition-colors ${canEdit ? 'flex-1' : 'w-full'}`}>
            <GitBranch className="w-4 h-4" />
            Lihat di pohon
          </Link>
        </div>
      </div>

      <div className="px-5 py-6 -mt-2 space-y-5">
        <section className="bg-white rounded-2xl border border-wasika-text-muted/20 overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-wasika-text-muted/15">
            <h2 className="text-wasika-brown-dark font-bold text-sm tracking-wide">DATA PRIBADI</h2>
          </div>
          <div className="divide-y divide-wasika-text-muted/10">
            <div className="px-4 py-3.5 flex items-start gap-3">
              <User className="w-5 h-5 text-wasika-text-muted flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-wasika-text-muted text-xs mb-0.5">Nama Lengkap</p>
                {isEditing ? (
                  <input value={editForm.name} onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))} className="w-full text-wasika-brown-dark font-medium bg-wasika-cream/50 border border-wasika-text-muted/30 rounded-lg px-2 py-1.5 focus:outline-none focus:border-wasika-gold text-base" />
                ) : (
                  <p className="text-wasika-brown-dark font-medium">{profile.name}</p>
                )}
              </div>
            </div>
            <div className="px-4 py-3.5 flex items-start gap-3">
              <Calendar className="w-5 h-5 text-wasika-text-muted flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-wasika-text-muted text-xs mb-0.5">Tanggal Lahir</p>
                {isEditing ? (
                  <input type="date" value={editForm.birthDate} onChange={(e) => setEditForm(prev => ({ ...prev, birthDate: e.target.value }))} className="w-full text-wasika-brown-dark font-medium bg-wasika-cream/50 border border-wasika-text-muted/30 rounded-lg px-2 py-1.5 focus:outline-none focus:border-wasika-gold text-base" />
                ) : (
                  <p className="text-wasika-brown-dark font-medium">{profile.birthDate || "-"}</p>
                )}
              </div>
            </div>
            <div className="px-4 py-3.5 flex items-start gap-3">
              <MapPin className="w-5 h-5 text-wasika-text-muted flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-wasika-text-muted text-xs mb-0.5">Alamat Lengkap</p>
                {isEditing ? (
                  <div className="space-y-3">
                    <textarea 
                      value={selectedProvinceId ? jalan : editForm.address} 
                      onChange={(e) => {
                        if (selectedProvinceId) setJalan(e.target.value)
                        else setEditForm(prev => ({ ...prev, address: e.target.value }))
                      }} 
                      placeholder="Alamat Lengkap (Jalan, Kota, Provinsi)..." 
                      rows={2} 
                      className="w-full text-wasika-brown-dark font-medium bg-wasika-cream/50 border border-wasika-text-muted/30 rounded-lg px-2 py-1.5 focus:outline-none focus:border-wasika-gold resize-none text-sm" 
                    />
                    
                    {!selectedProvinceId && (
                      <button 
                        type="button"
                        onClick={() => setSelectedProvinceId("show")} 
                        className="text-wasika-copper text-xs mt-1 block hover:underline"
                      >
                         + Gunakan sistem wilayah untuk akurasi peta
                      </button>
                    )}

                    {selectedProvinceId && (
                      <div className="pt-2 border-t border-wasika-gold/20 space-y-3 mt-3">
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-xs text-wasika-text-muted">Pilih wilayah (Otomatis ditambahkan ke alamat)</p>
                          <button type="button" onClick={() => setSelectedProvinceId("")} className="text-red-500 text-xs hover:underline">Batal</button>
                        </div>
                        <select value={selectedProvinceId === "show" ? "" : selectedProvinceId} onChange={(e) => { setSelectedProvinceId(e.target.value); setSelectedRegencyId(""); setSelectedDistrictId(""); }} className="w-full text-wasika-brown-dark font-medium bg-wasika-cream/50 border border-wasika-text-muted/30 rounded-lg px-2 py-1.5 focus:outline-none focus:border-wasika-gold text-sm">
                          <option value="">Pilih Provinsi</option>
                          {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <select value={selectedRegencyId} onChange={(e) => { setSelectedRegencyId(e.target.value); setSelectedDistrictId(""); }} disabled={!selectedProvinceId || selectedProvinceId === "show"} className="w-full text-wasika-brown-dark font-medium bg-wasika-cream/50 border border-wasika-text-muted/30 rounded-lg px-2 py-1.5 focus:outline-none focus:border-wasika-gold text-sm disabled:opacity-50">
                          <option value="">Pilih Kota/Kabupaten</option>
                          {regencies.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                        <select value={selectedDistrictId} onChange={(e) => setSelectedDistrictId(e.target.value)} disabled={!selectedRegencyId} className="w-full text-wasika-brown-dark font-medium bg-wasika-cream/50 border border-wasika-text-muted/30 rounded-lg px-2 py-1.5 focus:outline-none focus:border-wasika-gold text-sm disabled:opacity-50">
                          <option value="">Pilih Kecamatan</option>
                          {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                        
                        {selectedDistrictId && (
                           <div className="pt-2 flex flex-col items-start gap-1">
                             <button type="button" onClick={() => setShowMapPicker(true)} className="text-wasika-copper bg-wasika-cream hover:bg-wasika-gold/10 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-wasika-copper/20">
                               <MapPin className="w-3.5 h-3.5" /> Pilih letak rumah akurat di Peta
                             </button>
                             {customPosition && <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1"><Check className="w-3 h-3" /> Koordinat peta telah disimpan ({customPosition.lat.toFixed(4)}, {customPosition.lng.toFixed(4)})</span>}
                           </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-wasika-brown-dark font-medium leading-relaxed">{profile.address || "-"}</p>
                )}
              </div>
            </div>
            <div className="px-4 py-3.5 flex items-start gap-3">
              <Phone className="w-5 h-5 text-wasika-copper flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-wasika-text-muted text-xs mb-0.5">No. Telepon</p>
                {isEditing ? (
                  <input type="tel" value={editForm.phone} onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))} className="w-full text-wasika-brown-dark font-medium bg-wasika-cream/50 border border-wasika-text-muted/30 rounded-lg px-2 py-1.5 focus:outline-none focus:border-wasika-gold text-base" />
                ) : (
                  <a href={`tel:${profile.phone}`} className="text-wasika-copper font-medium">{profile.phone || "-"}</a>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-wasika-text-muted/20 overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-wasika-text-muted/15">
            <h2 className="text-wasika-brown-dark font-bold text-sm tracking-wide">SILSILAH</h2>
            <p className="text-wasika-text-muted text-xs mt-0.5">Terdeteksi otomatis</p>
          </div>
          <div className="divide-y divide-wasika-text-muted/10">
            {profile.father && (
              <Link href={`/profile/${profile.father.id}`} className="px-4 py-3.5 flex items-center gap-3 hover:bg-wasika-cream/50 transition-colors">
                <div className="w-9 h-9 rounded-full bg-wasika-cream flex items-center justify-center"><User className="w-4 h-4 text-wasika-copper" /></div>
                <div className="flex-1 min-w-0"><p className="text-wasika-text-muted text-xs mb-0.5">Ayah</p><p className="text-wasika-brown-dark font-medium truncate">{profile.father.name}</p></div>
                <ChevronRight className="w-5 h-5 text-wasika-text-muted" />
              </Link>
            )}
            {profile.mother && (
              <Link href={`/profile/${profile.mother.id}`} className="px-4 py-3.5 flex items-center gap-3 hover:bg-wasika-cream/50 transition-colors">
                <div className="w-9 h-9 rounded-full bg-wasika-cream flex items-center justify-center"><User className="w-4 h-4 text-wasika-copper" /></div>
                <div className="flex-1 min-w-0"><p className="text-wasika-text-muted text-xs mb-0.5">Ibu</p><p className="text-wasika-brown-dark font-medium truncate">{profile.mother.name}</p></div>
                <ChevronRight className="w-5 h-5 text-wasika-text-muted" />
              </Link>
            )}
            {profile.siblings.length > 0 && (
              <div className="px-4 py-3.5">
                <div className="flex items-center gap-3 mb-2"><div className="w-9 h-9 rounded-full bg-wasika-cream flex items-center justify-center"><Users className="w-4 h-4 text-wasika-copper" /></div><p className="text-wasika-text-muted text-xs">Saudara ({profile.siblings.length})</p></div>
                <div className="ml-12 space-y-1.5">{profile.siblings.map(sib => <Link key={sib.id} href={`/profile/${sib.id}`} className="flex items-center justify-between py-1.5 hover:text-wasika-copper transition-colors"><span className="text-wasika-brown-dark font-medium">{sib.name}</span><ChevronRight className="w-4 h-4 text-wasika-text-muted" /></Link>)}</div>
              </div>
            )}
            {profile.spouse && (
              <Link href={`/profile/${profile.spouse.id}`} className="px-4 py-3.5 flex items-center gap-3 hover:bg-wasika-cream/50 transition-colors">
                <div className="w-9 h-9 rounded-full bg-wasika-gold/15 flex items-center justify-center"><Heart className="w-4 h-4 text-wasika-gold" /></div>
                <div className="flex-1 min-w-0"><p className="text-wasika-text-muted text-xs mb-0.5">Pasangan</p><p className="text-wasika-brown-dark font-medium truncate">{profile.spouse.name}</p></div>
                <ChevronRight className="w-5 h-5 text-wasika-text-muted" />
              </Link>
            )}
            {profile.children.length > 0 && (
              <div className="px-4 py-3.5">
                <div className="flex items-center gap-3 mb-2"><div className="w-9 h-9 rounded-full bg-wasika-cream flex items-center justify-center"><Users className="w-4 h-4 text-wasika-copper" /></div><p className="text-wasika-text-muted text-xs">Anak ({profile.children.length})</p></div>
                <div className="ml-12 space-y-1.5">{profile.children.map(child => <Link key={child.id} href={`/profile/${child.id}`} className="flex items-center justify-between py-1.5 hover:text-wasika-copper transition-colors"><span className="text-wasika-brown-dark font-medium">{child.name}</span><ChevronRight className="w-4 h-4 text-wasika-text-muted" /></Link>)}</div>
              </div>
            )}
          </div>
        </section>

        {profile.attendanceHistory.length > 0 && (
          <section className="bg-green-50 border border-green-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-green-200"><h2 className="text-green-800 font-bold text-sm tracking-wide">RIWAYAT KEHADIRAN</h2></div>
            <div className="divide-y divide-green-100">
              {profile.attendanceHistory.map((record, idx) => (
                <div key={idx} className="px-4 py-3 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${record.attended ? "bg-green-500" : "bg-gray-300"}`}>{record.attended ? <Check className="w-4 h-4 text-white" /> : <span className="text-white text-xs">-</span>}</div>
                  <div className="flex-1"><p className="text-green-900 font-medium text-sm">{record.event}</p><p className="text-green-700 text-xs">{record.year}</p></div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${record.attended ? "bg-green-200 text-green-800" : "bg-gray-200 text-gray-600"}`}>{record.attended ? "Hadir" : "Tidak hadir"}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {currentUserId === profile.userId && (
          <div className="space-y-3">
            <button
              onClick={async () => {
                if (confirm("Anda yakin ingin keluar dari Bani ini? Data pribadi Anda akan dilepas dari silsilah keluarga " + profile.bani_name + ".")) {
                  const supabase = createClient()
                  // 1. Unlink person from user
                  await supabase.from("persons").update({ user_id: null }).eq("user_id", currentUserId)
                  // 2. Unlink profile from bani
                  await (supabase.from("profiles").update({ bani_id: null, role: 'anggota' }).eq("id", currentUserId) as any)
                  
                  router.replace("/join")
                }
              }}
              className="w-full py-4 rounded-2xl bg-white border border-wasika-gold/40 text-wasika-gold font-bold text-sm flex items-center justify-center gap-2 hover:bg-wasika-gold/5 transition-colors shadow-sm"
            >
              <Users className="w-4 h-4" />
              Keluar dari Bani
            </button>

            <button
              onClick={async () => {
                const supabase = createClient()
                await supabase.auth.signOut()
                router.replace("/login")
              }}
              className="w-full py-4 rounded-2xl bg-white border border-red-200 text-red-600 font-bold text-sm flex items-center justify-center gap-2 hover:bg-red-50 transition-colors shadow-sm"
            >
              <LogOut className="w-4 h-4" />
              Keluar dari Akun
            </button>
          </div>
        )}
      </div>

      <BottomNav />
      {showMapPicker && (
        <LocationPickerWrapper 
          onClose={() => setShowMapPicker(false)}
          onSave={(plat: number, plng: number) => {
            setCustomPosition({ lat: plat, lng: plng })
            setShowMapPicker(false)
          }}
          initialQuery={`${jalan ? jalan + ', ' : ''}${districts.find(d => d.id === selectedDistrictId)?.name || ''}, ${regencies.find(r => r.id === selectedRegencyId)?.name || ''}, ${provinces.find(p => p.id === selectedProvinceId)?.name || ''}`}
        />
      )}
    </main>
  )
}
