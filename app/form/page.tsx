"use client"

import { useState, useRef, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Check, X, Plus, Info } from "lucide-react"

interface FamilyMember {
  id: string
  name: string
  photo_url?: string
}

interface ChildInput {
  id: string
  name: string
  matchedMember: FamilyMember | null
}

export default function FormSilsilahPage() {
  const router = useRouter()
  const [currentStep] = useState(2)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [userPerson, setUserPerson] = useState<any>(null)
  
  // Father field
  const [fatherName, setFatherName] = useState("")
  const [fatherMatchedMember, setFatherMatchedMember] = useState<FamilyMember | null>(null)
  const [showFatherDropdown, setShowFatherDropdown] = useState(false)
  const [fatherResults, setFatherResults] = useState<FamilyMember[]>([])
  const fatherRef = useRef<HTMLDivElement>(null)
  
  // Mother field
  const [motherName, setMotherName] = useState("")
  const [motherMatchedMember, setMotherMatchedMember] = useState<FamilyMember | null>(null)
  const [showMotherDropdown, setShowMotherDropdown] = useState(false)
  const [motherResults, setMotherResults] = useState<FamilyMember[]>([])
  const motherRef = useRef<HTMLDivElement>(null)
  
  // Spouse field
  const [spouseName, setSpouseName] = useState("")
  const [spouseMatchedMember, setSpouseMatchedMember] = useState<FamilyMember | null>(null)
  const [showSpouseDropdown, setShowSpouseDropdown] = useState(false)
  const [spouseResults, setSpouseResults] = useState<FamilyMember[]>([])
  const spouseRef = useRef<HTMLDivElement>(null)
  
  // Children fields
  const [children, setChildren] = useState<ChildInput[]>([
    { id: "child-1", name: "", matchedMember: null }
  ])
  const [activeChildDropdown, setActiveChildDropdown] = useState<string | null>(null)
  const [childResults, setChildResults] = useState<Record<string, FamilyMember[]>>({})

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace("/login")
        return
      }

      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
      setUserProfile(profile)

      const { data: person } = await supabase.from("persons").select("*").eq("user_id", user.id).single()
      setUserPerson(person)

      setLoading(false)
    }
    init()
  }, [router])

  // Search logic
  const searchPersons = async (query: string, setter: (results: FamilyMember[]) => void) => {
    if (!query || query.length < 2 || !userProfile?.bani_id) {
      setter([])
      return
    }
    const res = await fetch(`/api/persons/search?q=${encodeURIComponent(query)}&baniId=${userProfile.bani_id}`)
    const data = await res.json()
    setter(data)
  }

  // Debounced search for Father
  useEffect(() => {
    const timer = setTimeout(() => {
      if (fatherName && !fatherMatchedMember) {
        searchPersons(fatherName, setFatherResults)
        setShowFatherDropdown(true)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [fatherName, fatherMatchedMember])

  // Debounced search for Mother
  useEffect(() => {
    const timer = setTimeout(() => {
      if (motherName && !motherMatchedMember) {
        searchPersons(motherName, setMotherResults)
        setShowMotherDropdown(true)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [motherName, motherMatchedMember])

  // Debounced search for Spouse
  useEffect(() => {
    const timer = setTimeout(() => {
      if (spouseName && !spouseMatchedMember) {
        searchPersons(spouseName, setSpouseResults)
        setShowSpouseDropdown(true)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [spouseName, spouseMatchedMember])

  // Click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (fatherRef.current && !fatherRef.current.contains(event.target as Node)) {
        setShowFatherDropdown(false)
      }
      if (motherRef.current && !motherRef.current.contains(event.target as Node)) {
        setShowMotherDropdown(false)
      }
      if (spouseRef.current && !spouseRef.current.contains(event.target as Node)) {
        setShowSpouseDropdown(false)
      }
      setActiveChildDropdown(null)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSelectFather = (member: FamilyMember) => {
    setFatherName(member.name)
    setFatherMatchedMember(member)
    setShowFatherDropdown(false)
  }

  const handleSelectMother = (member: FamilyMember) => {
    setMotherName(member.name)
    setMotherMatchedMember(member)
    setShowMotherDropdown(false)
  }

  const handleSelectSpouse = (member: FamilyMember) => {
    setSpouseName(member.name)
    setSpouseMatchedMember(member)
    setShowSpouseDropdown(false)
  }

  const handleChildNameChange = (childId: string, name: string) => {
    setChildren((prev) =>
      prev.map((child) => {
        if (child.id === childId) {
          return { ...child, name, matchedMember: null }
        }
        return child
      })
    )
    if (name.length >= 2) {
      searchPersons(name, (results) => {
        setChildResults(prev => ({ ...prev, [childId]: results }))
        setActiveChildDropdown(childId)
      })
    }
  }

  const handleSelectChildMember = (childId: string, member: FamilyMember) => {
    setChildren((prev) =>
      prev.map((child) => {
        if (child.id === childId) {
          return { ...child, name: member.name, matchedMember: member }
        }
        return child
      })
    )
    setActiveChildDropdown(null)
  }

  const addChild = () => {
    const newId = `child-${Date.now()}`
    setChildren((prev) => [...prev, { id: newId, name: "", matchedMember: null }])
  }

  const removeChild = (childId: string) => {
    if (children.length > 1) {
      setChildren((prev) => prev.filter((child) => child.id !== childId))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userProfile?.bani_id) return
    setSubmitting(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let currentPersonId = userPerson?.id

      // 1. Ensure user has a person record
      if (!currentPersonId) {
        // Try to auto-match with an existing unconnected entity created by relatives!
        const { data: existingPersons } = await supabase
          .from("persons")
          .select("id")
          .eq("bani_id", userProfile.bani_id)
          .ilike("name", userProfile.full_name)
          .is("user_id", null)
          .limit(1)

        if (existingPersons && existingPersons.length > 0) {
          currentPersonId = existingPersons[0].id
          
          // Claim the identity!
          await supabase
            .from("persons")
            .update({ user_id: user.id })
            .eq("id", currentPersonId)
        } else {
          // Create new root identity
          const { data: newPerson, error: pError } = await supabase
            .from("persons")
            .insert({
              name: userProfile.full_name,
              user_id: user.id,
              bani_id: userProfile.bani_id,
              created_by: user.id
            })
            .select()
            .single()
          
          if (pError) throw pError
          currentPersonId = newPerson.id
        }
      }

      // 2. Handle Father
      let fatherId = fatherMatchedMember?.id
      if (!fatherId && fatherName.trim()) {
        const { data: newFather, error: fErr } = await supabase
          .from("persons")
          .insert({
            name: fatherName,
            gender: "male",
            bani_id: userProfile.bani_id,
            created_by: user.id
          })
          .select()
          .single()
        if (fErr) throw fErr
        fatherId = newFather?.id
      }
      if (fatherId) {
        await supabase.from("relationships").upsert({
          person_id: currentPersonId,
          related_person_id: fatherId,
          type: "parent",
          bani_id: userProfile.bani_id
        }, { onConflict: "person_id, related_person_id, type" })
      }

      // 3. Handle Mother
      let motherId = motherMatchedMember?.id
      if (!motherId && motherName.trim()) {
        const { data: newMother, error: mErr } = await supabase
          .from("persons")
          .insert({
            name: motherName,
            gender: "female",
            bani_id: userProfile.bani_id,
            created_by: user.id
          })
          .select()
          .single()
        if (mErr) throw mErr
        motherId = newMother?.id
      }
      if (motherId) {
        await supabase.from("relationships").upsert({
          person_id: currentPersonId,
          related_person_id: motherId,
          type: "parent",
          bani_id: userProfile.bani_id
        }, { onConflict: "person_id, related_person_id, type" })
      }

      // 4. Handle Spouse
      let spouseId = spouseMatchedMember?.id
      if (!spouseId && spouseName.trim()) {
        const { data: newSpouse, error: sErr } = await supabase
          .from("persons")
          .insert({
            name: spouseName,
            bani_id: userProfile.bani_id,
            created_by: user.id
          })
          .select()
          .single()
        if (sErr) throw sErr
        spouseId = newSpouse?.id
      }
      if (spouseId) {
        await supabase.from("relationships").upsert({
          person_id: currentPersonId,
          related_person_id: spouseId,
          type: "spouse",
          bani_id: userProfile.bani_id
        }, { onConflict: "person_id, related_person_id, type" })
        
        // Symmetrical: Ensure spouse also points back
        await supabase.from("relationships").upsert({
          person_id: spouseId,
          related_person_id: currentPersonId,
          type: "spouse",
          bani_id: userProfile.bani_id
        }, { onConflict: "person_id, related_person_id, type" })
      }

      // 5. Handle Children
      for (const child of children) {
        if (!child.name.trim()) continue
        let childId = child.matchedMember?.id
        if (!childId) {
          const { data: newChild, error: cErr } = await supabase
            .from("persons")
            .insert({
              name: child.name,
              bani_id: userProfile.bani_id,
              created_by: user.id
            })
            .select()
            .single()
          if (cErr) throw cErr
          childId = newChild?.id
        }
        if (childId) {
          await supabase.from("relationships").upsert({
            person_id: currentPersonId,
            related_person_id: childId,
            type: "child",
            bani_id: userProfile.bani_id
          }, { onConflict: "person_id, related_person_id, type" })
        }
      }

      router.replace("/checkin")
    } catch (err: any) {
      console.error("Form error:", err)
      setError(err?.message || "Gagal menyimpan silsilah. Silakan coba lagi.")
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-wasika-cream flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-14 h-14 mx-auto mb-4">
            <div className="absolute inset-0 border-4 border-wasika-gold/20 rounded-full animate-pulse" />
            <div className="absolute inset-0 border-4 border-t-wasika-gold rounded-full animate-spin" />
          </div>
          <p className="text-wasika-gold font-serif animate-pulse">Memuat formulir...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-wasika-cream">
      {/* Dark Gradient Header */}
      <div className="bg-wasika-dark px-5 pt-8 pb-10">
        <h1 className="font-serif text-2xl text-wasika-gold text-center mb-6">
          Silsilahmu
        </h1>

        {/* 3-Step Progress Bar */}
        <div className="flex items-center justify-center gap-2 max-w-xs mx-auto">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  step < currentStep
                    ? "bg-wasika-gold text-wasika-brown-dark"
                    : step === currentStep
                    ? "bg-wasika-gold text-wasika-brown-dark ring-4 ring-wasika-gold/30"
                    : "bg-wasika-brown-dark/60 text-wasika-text-muted border border-wasika-gold/30"
                }`}
              >
                {step < currentStep ? <Check className="w-4 h-4" /> : step}
              </div>
              {step < 3 && (
                <div
                  className={`w-12 h-0.5 mx-1 ${
                    step < currentStep ? "bg-wasika-gold" : "bg-wasika-gold/30"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <div className="px-5 py-6 -mt-4">
        <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-5">
          {/* Nama Ayah */}
          <div ref={fatherRef} className="relative">
            <label className="block text-wasika-brown-dark text-sm font-medium mb-2">
              Nama Ayah
            </label>
            <div className="relative">
              <input
                type="text"
                value={fatherName}
                onChange={(e) => setFatherName(e.target.value)}
                onFocus={() => fatherName.length > 0 && setShowFatherDropdown(true)}
                placeholder="Ketik nama ayah..."
                className={`w-full bg-white py-3.5 px-4 pr-24 rounded-[11px] text-wasika-brown-dark placeholder:text-wasika-text-muted/60 focus:outline-none focus:ring-2 transition-all ${
                  fatherMatchedMember
                    ? "border-2 border-wasika-copper focus:ring-wasika-copper/30"
                    : "border border-wasika-text-muted/30 focus:ring-wasika-gold/30 focus:border-wasika-gold"
                }`}
              />
              {fatherMatchedMember && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-wasika-copper/15 text-wasika-copper text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Terdaftar
                </span>
              )}
            </div>
            {/* Autocomplete Dropdown */}
            {showFatherDropdown && fatherResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-wasika-text-muted/30 rounded-[11px] overflow-hidden shadow-lg z-20">
                {fatherResults.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => handleSelectFather(member)}
                    className="w-full px-4 py-3 text-left hover:bg-wasika-cream transition-colors border-b border-wasika-text-muted/10 last:border-b-0 flex items-center justify-between"
                  >
                    <span className="text-wasika-brown-dark">{member.name}</span>
                    <span className="text-wasika-copper text-xs flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Terdaftar
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Nama Ibu */}
          <div ref={motherRef} className="relative">
            <label className="block text-wasika-brown-dark text-sm font-medium mb-2">
              Nama Ibu
            </label>
            <div className="relative">
              <input
                type="text"
                value={motherName}
                onChange={(e) => setMotherName(e.target.value)}
                onFocus={() => motherName.length > 0 && setShowMotherDropdown(true)}
                placeholder="Ketik nama ibu..."
                className={`w-full bg-white py-3.5 px-4 pr-24 rounded-[11px] text-wasika-brown-dark placeholder:text-wasika-text-muted/60 focus:outline-none focus:ring-2 transition-all ${
                  motherMatchedMember
                    ? "border-2 border-wasika-copper focus:ring-wasika-copper/30"
                    : "border border-wasika-text-muted/30 focus:ring-wasika-gold/30 focus:border-wasika-gold"
                }`}
              />
              {motherMatchedMember && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-wasika-copper/15 text-wasika-copper text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Terdaftar
                </span>
              )}
            </div>
            {/* Autocomplete Dropdown */}
            {showMotherDropdown && motherResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-wasika-text-muted/30 rounded-[11px] overflow-hidden shadow-lg z-20">
                {motherResults.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => handleSelectMother(member)}
                    className="w-full px-4 py-3 text-left hover:bg-wasika-cream transition-colors border-b border-wasika-text-muted/10 last:border-b-0 flex items-center justify-between"
                  >
                    <span className="text-wasika-brown-dark">{member.name}</span>
                    <span className="text-wasika-copper text-xs flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Terdaftar
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Nama Pasangan */}
          <div ref={spouseRef} className="relative">
            <label className="block text-wasika-brown-dark text-sm font-medium mb-2">
              Nama Pasangan
            </label>
            <div className="relative">
              <input
                type="text"
                value={spouseName}
                onChange={(e) => setSpouseName(e.target.value)}
                onFocus={() => spouseName.length > 0 && setShowSpouseDropdown(true)}
                placeholder="Ketik nama suami/istri..."
                className={`w-full bg-white py-3.5 px-4 pr-24 rounded-[11px] text-wasika-brown-dark placeholder:text-wasika-text-muted/60 focus:outline-none focus:ring-2 transition-all ${
                  spouseMatchedMember
                    ? "border-2 border-wasika-copper focus:ring-wasika-copper/30"
                    : "border border-wasika-text-muted/30 focus:ring-wasika-gold/30 focus:border-wasika-gold"
                }`}
              />
              {spouseMatchedMember && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-wasika-copper/15 text-wasika-copper text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Terdaftar
                </span>
              )}
            </div>
            {/* Autocomplete Dropdown */}
            {showSpouseDropdown && spouseResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-wasika-text-muted/30 rounded-[11px] overflow-hidden shadow-lg z-20">
                {spouseResults.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => handleSelectSpouse(member)}
                    className="w-full px-4 py-3 text-left hover:bg-wasika-cream transition-colors border-b border-wasika-text-muted/10 last:border-b-0 flex items-center justify-between"
                  >
                    <span className="text-wasika-brown-dark">{member.name}</span>
                    <span className="text-wasika-copper text-xs flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Terdaftar
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Nama Anak (Dynamic) */}
          <div>
            <label className="block text-wasika-brown-dark text-sm font-medium mb-2">
              Nama Anak
            </label>
            <div className="space-y-3">
              {children.map((child, index) => (
                <div key={child.id} className="relative">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={child.name}
                        onChange={(e) => handleChildNameChange(child.id, e.target.value)}
                        onFocus={() => child.name.length > 0 && setActiveChildDropdown(child.id)}
                        placeholder={index === 0 ? "Ketik nama anak pertama..." : "Ketik nama anak..."}
                        className={`w-full bg-white py-3.5 px-4 pr-24 rounded-[11px] text-wasika-brown-dark placeholder:text-wasika-text-muted/60 focus:outline-none focus:ring-2 transition-all ${
                          child.matchedMember
                            ? "border-2 border-wasika-copper focus:ring-wasika-copper/30"
                            : "border border-wasika-text-muted/30 focus:ring-wasika-gold/30 focus:border-wasika-gold"
                        }`}
                      />
                      {child.matchedMember && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-wasika-copper/15 text-wasika-copper text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Terdaftar
                        </span>
                      )}
                      {/* Autocomplete Dropdown */}
                      {activeChildDropdown === child.id && childResults[child.id]?.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-wasika-text-muted/30 rounded-[11px] overflow-hidden shadow-lg z-20">
                          {childResults[child.id].map((member) => (
                            <button
                              key={member.id}
                              type="button"
                              onClick={() => handleSelectChildMember(child.id, member)}
                              className="w-full px-4 py-3 text-left hover:bg-wasika-cream transition-colors border-b border-wasika-text-muted/10 last:border-b-0 flex items-center justify-between"
                            >
                              <span className="text-wasika-brown-dark">{member.name}</span>
                              <span className="text-wasika-copper text-xs flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                Terdaftar
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Remove button (only show if more than 1 child) */}
                    {children.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeChild(child.id)}
                        className="w-12 h-12 flex items-center justify-center rounded-[11px] border border-red-300 text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Add Child Button */}
            <button
              type="button"
              onClick={addChild}
              className="mt-3 w-12 h-12 flex items-center justify-center rounded-full bg-wasika-copper text-white hover:bg-wasika-copper/90 transition-colors shadow-md"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>

          {/* Info Box */}
          <div className="bg-wasika-gold/10 border border-wasika-gold/30 rounded-[11px] p-4 flex gap-3">
            <Info className="w-5 h-5 text-wasika-gold flex-shrink-0 mt-0.5" />
            <p className="text-wasika-brown-dark text-sm leading-relaxed">
              Nama yang cocok otomatis terhubung ke pohon keluarga. Anda dapat menambahkan anggota baru yang belum terdaftar.
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-300 rounded-[11px] px-4 py-3 text-red-700 text-sm text-center">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 px-6 rounded-[11px] font-bold text-white transition-all shadow-lg mt-6 flex items-center justify-center gap-2"
            style={{
              background: submitting 
                ? "#9ca3af" 
                : "linear-gradient(135deg, #cd7f32 0%, #d4a843 100%)",
            }}
          >
            {submitting ? "Menyimpan..." : "Simpan Silsilah"}
          </button>
        </form>
      </div>
    </main>
  )
}
