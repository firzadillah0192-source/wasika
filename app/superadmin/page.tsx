"use client"
import { 
  useEffect, 
  useCallback, 
  useState 
} from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Users, Clock, UserCheck, CreditCard, Check, X, Building2, Shield, ChevronRight } from "lucide-react"

interface BaniRequest {
  id: string
  name: string
  owner_name: string
  owner_email: string
  requested_at: string
}

interface BaniItem {
  id: string
  name: string
  members_count: number
  status: string
  parent_bani_id: string | null
  bani_level: number
  sub_banis?: BaniItem[]
}

export default function SuperAdminPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [approvals, setApprovals] = useState<BaniRequest[]>([])
  const [baniList, setBaniList] = useState<BaniItem[]>([])
  const [stats, setStats] = useState({ totalBani: 0, pending: 0, totalMembers: 0 })
  const [selectedBani, setSelectedBani] = useState<BaniItem | null>(null)
  const [selectedBaniMembers, setSelectedBaniMembers] = useState<any[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)

  const fetchData = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push("/login")
      return
    }

    // Role check
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
    if (profile?.role !== 'superadmin') {
      router.replace("/tree")
      return
    }
    
    // Fetch pending banis
    const { data: pending } = await supabase
      .from("banis")
      .select("*, profiles!inner(full_name, email)")
      .eq("status", "pending")
    
    if (pending) {
      setApprovals(pending.map((p: any) => ({
        id: p.id,
        name: p.name,
        owner_name: p.profiles?.full_name || "Unknown",
        owner_email: p.profiles?.email || "Unknown",
        requested_at: new Date(p.created_at).toLocaleDateString()
      })))
    }

    // Fetch all banis with REGISTERED member counts
    const { data: allBanis } = await supabase
      .from("banis")
      .select("*, persons(count)")
      .not("persons.user_id", "is", null) // This might not work as expected in some Supabase versions for nested count
    
    // Better way: Fetch all persons with user_id is not null and group them manually or use another query
    const { data: registeredMembers } = await supabase
      .from("persons")
      .select("bani_id")
      .not("user_id", "is", null)

    if (allBanis) {
      const items: BaniItem[] = allBanis.map((b: any) => {
        const count = registeredMembers?.filter(m => m.bani_id === b.id).length || 0
        return {
          id: b.id,
          name: b.name,
          members_count: count,
          status: b.status,
          parent_bani_id: b.parent_bani_id || null,
          bani_level: b.bani_level || 0,
        }
      })

      // Build tree: attach sub_banis to parents
      const rootBanis = items.filter(b => !b.parent_bani_id)
      rootBanis.forEach(root => {
        root.sub_banis = items.filter(b => b.parent_bani_id === root.id)
      })

      setBaniList(rootBanis)

      const totalMembers = items.reduce((sum, b) => sum + b.members_count, 0)
      setStats({
        totalBani: items.length,
        pending: pending?.length || 0,
        totalMembers
      })
    }
    setLoading(false)
  }, [router])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleApprove = async (id: string) => {
    const supabase = createClient()
    await supabase.from("banis").update({ status: "active" }).eq("id", id)
    fetchData()
  }

  const handleReject = async (id: string) => {
    const supabase = createClient()
    await supabase.from("banis").update({ status: "suspended" }).eq("id", id)
    fetchData()
  }

  const fetchBaniMembers = async (bani: BaniItem) => {
    setSelectedBani(bani)
    setLoadingMembers(true)
    const supabase = createClient()
    const { data: members } = await supabase
      .from("profiles")
      .select("*, persons!inner(id, name)")
      .eq("bani_id", bani.id)
    
    setSelectedBaniMembers(members || [])
    setLoadingMembers(false)
  }

  const handleDeleteBani = async (id: string) => {
    if (!confirm("Hapus Bani ini secara permanen? Semua data silsilah dan forum akan hilang.")) return
    const supabase = createClient()
    await supabase.from("banis").delete().eq("id", id)
    setSelectedBani(null)
    fetchData()
  }

  const handleDeleteMember = async (profileId: string) => {
    if (!confirm("Hapus anggota ini dari Bani?")) return
    const supabase = createClient()
    // Unlink person from user
    await supabase.from("persons").update({ user_id: null }).eq("user_id", profileId)
    // Unlink profile from bani
    await (supabase.from("profiles").update({ bani_id: null, role: 'anggota' }).eq("id", profileId) as any)
    
    if (selectedBani) fetchBaniMembers(selectedBani)
    fetchData()
  }

  const handleToggleRole = async (profileId: string, currentRole: string) => {
    const newRole = currentRole === 'panitia' ? 'anggota' : 'panitia'
    const supabase = createClient()
    await (supabase.from("profiles").update({ role: newRole }).eq("id", profileId) as any)
    
    if (selectedBani) fetchBaniMembers(selectedBani)
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-wasika-cream flex items-center justify-center">
        <div className="text-wasika-gold">Loading admin panel...</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-wasika-cream pb-8">
      {/* Dark Header */}
      <div className="bg-wasika-dark px-5 py-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-wasika-gold" />
          <h1 className="font-serif text-xl text-wasika-gold">
            Super Admin
          </h1>
        </div>
        <p className="text-wasika-text-muted text-sm mt-0.5">
          WaSiKa Platform
        </p>
      </div>

      {/* Content */}
      <div className="px-5 py-5 space-y-5">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl border border-wasika-text-muted/20 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-5 h-5 text-wasika-gold" />
              <span className="text-wasika-text-muted text-xs">Total Bani</span>
            </div>
            <p className="text-wasika-brown-dark text-2xl font-bold">{stats.totalBani}</p>
          </div>

          <div className="bg-white rounded-2xl border border-wasika-copper/40 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-wasika-copper" />
              <span className="text-wasika-copper text-xs font-medium">Menunggu approval</span>
            </div>
            <p className="text-wasika-copper text-2xl font-bold">{stats.pending}</p>
          </div>

          <div className="bg-white rounded-2xl border border-wasika-text-muted/20 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-wasika-gold" />
              <span className="text-wasika-text-muted text-xs">Total anggota</span>
            </div>
            <p className="text-wasika-brown-dark text-2xl font-bold">{stats.totalMembers}</p>
          </div>

          <div className="bg-white rounded-2xl border border-wasika-text-muted/20 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-5 h-5 text-wasika-gold" />
              <span className="text-wasika-text-muted text-xs">Pendapatan</span>
            </div>
            <p className="text-wasika-brown-dark text-2xl font-bold">Rp 0</p>
          </div>
        </div>

        {/* Pending Approvals */}
        <section className="bg-white rounded-2xl border border-wasika-text-muted/20 overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-wasika-text-muted/15 flex items-center justify-between">
            <div>
              <h2 className="text-wasika-brown-dark font-bold text-sm">PERMINTAAN PENGELOLA</h2>
              <p className="text-wasika-text-muted text-xs mt-0.5">{approvals.length} menunggu</p>
            </div>
            <UserCheck className="w-5 h-5 text-wasika-text-muted" />
          </div>
          {approvals.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-wasika-text-muted text-sm">Tidak ada permintaan baru</p>
            </div>
          ) : (
            <div className="divide-y divide-wasika-text-muted/10">
              {approvals.map((req) => (
                <div key={req.id} className="px-4 py-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-wasika-brown-dark font-medium">{req.owner_name}</p>
                      <p className="text-wasika-text-muted text-xs">{req.owner_email}</p>
                      <p className="text-wasika-gold text-xs mt-1">{req.name}</p>
                    </div>
                    <span className="text-wasika-text-muted text-xs">{req.requested_at}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(req.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(req.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-red-300 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Tolak
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Room Management */}
        <section className="bg-white rounded-2xl border border-wasika-text-muted/20 overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-wasika-text-muted/15 flex items-center justify-between">
            <div>
              <h2 className="text-wasika-brown-dark font-bold text-sm">KELOLA BANI</h2>
              <p className="text-wasika-text-muted text-xs mt-0.5">Hierarki keluarga terdaftar</p>
            </div>
          </div>
          <div className="divide-y divide-wasika-text-muted/10">
            {baniList.map((bani) => (
              <div key={bani.id}>
                {/* Root Bani */}
                <div 
                  onClick={() => selectedBani?.id === bani.id ? setSelectedBani(null) : fetchBaniMembers(bani)}
                  className="px-4 py-4 flex items-center justify-between cursor-pointer hover:bg-wasika-cream/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-wasika-gold/20 flex items-center justify-center border-2 border-wasika-gold/30">
                      <Building2 className="w-5 h-5 text-wasika-gold" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-wasika-brown-dark font-bold text-sm">{bani.name}</p>
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-wasika-gold/10 text-wasika-gold border border-wasika-gold/20">ROOT</span>
                      </div>
                      <p className="text-wasika-text-muted text-xs">
                        {bani.members_count} anggota
                        {(bani.sub_banis?.length ?? 0) > 0 && ` · ${bani.sub_banis!.length} sub-bani`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      bani.status === "active" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                    }`}>
                      {bani.status === "active" ? "Aktif" : "Pending"}
                    </span>
                    <ChevronRight className={`w-5 h-5 text-wasika-text-muted transition-transform ${selectedBani?.id === bani.id ? "rotate-90" : ""}`} />
                  </div>
                </div>

                {/* Sub-banis */}
                {(bani.sub_banis?.length ?? 0) > 0 && (
                  <div className="bg-wasika-cream/20">
                    {bani.sub_banis!.map(sub => (
                      <div key={sub.id}
                        onClick={() => selectedBani?.id === sub.id ? setSelectedBani(null) : fetchBaniMembers(sub)}
                        className="pl-8 pr-4 py-3 flex items-center justify-between cursor-pointer hover:bg-wasika-cream/50 transition-colors border-t border-wasika-text-muted/5"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-1 h-8 bg-wasika-gold/30 rounded-full" />
                          <div className="w-8 h-8 rounded-full bg-wasika-copper/10 flex items-center justify-center">
                            <Building2 className="w-4 h-4 text-wasika-copper" />
                          </div>
                          <div>
                            <p className="text-wasika-brown-dark font-medium text-sm">{sub.name}</p>
                            <p className="text-wasika-text-muted text-[10px]">{sub.members_count} anggota</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                            sub.status === "active" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                          }`}>
                            {sub.status === "active" ? "Aktif" : "Pending"}
                          </span>
                          <ChevronRight className={`w-4 h-4 text-wasika-text-muted transition-transform ${selectedBani?.id === sub.id ? "rotate-90" : ""}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Expanded Member List */}
                {selectedBani?.id === bani.id && (
                  <div className="bg-wasika-cream/20 px-4 py-4 border-t border-wasika-text-muted/10 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-wasika-brown-dark font-bold text-xs">DAFTAR ANGGOTA</h3>
                      <button 
                        onClick={() => handleDeleteBani(bani.id)}
                        className="text-red-600 text-[10px] font-bold hover:underline"
                      >
                        HAPUS BANI
                      </button>
                    </div>

                    {loadingMembers ? (
                      <p className="text-wasika-text-muted text-xs animate-pulse text-center py-4">Memuat anggota...</p>
                    ) : selectedBaniMembers.length === 0 ? (
                      <p className="text-wasika-text-muted text-xs text-center py-4">Belum ada anggota terdaftar</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedBaniMembers.map((m) => (
                          <div key={m.id} className="bg-white rounded-xl p-3 border border-wasika-text-muted/10 flex items-center justify-between shadow-sm">
                            <div>
                               <p className="text-wasika-brown-dark font-bold text-sm">{m.full_name}</p>
                               <div className="flex items-center gap-2 mt-0.5">
                                 <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${m.role === 'panitia' ? 'bg-wasika-gold/20 text-wasika-brown-dark' : 'bg-wasika-text-muted/10 text-wasika-text-muted'}`}>
                                   {m.role === 'panitia' ? 'Pengelola' : 'Anggota'}
                                 </span>
                                 <span className="text-[10px] text-wasika-text-muted">{m.email}</span>
                               </div>
                            </div>
                            <div className="flex items-center gap-1">
                               <button 
                                 onClick={() => handleToggleRole(m.id, m.role)}
                                 className="p-2 text-wasika-gold hover:bg-wasika-gold/5 rounded-lg transition-colors"
                                 title={m.role === 'panitia' ? "Jadikan Anggota Biasa" : "Jadikan Pengelola"}
                               >
                                 <UserCheck className="w-4 h-4" />
                               </button>
                               <button 
                                 onClick={() => handleDeleteMember(m.id)}
                                 className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                 title="Hapus dari Bani"
                               >
                                 <X className="w-4 h-4" />
                               </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Payment Section */}
        <section className="bg-white rounded-2xl border border-wasika-text-muted/20 overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-wasika-text-muted/15">
            <h2 className="text-wasika-brown-dark font-bold text-sm">PAKET LAYANAN</h2>
          </div>
          <div className="p-4 space-y-3">
            {/* Free Plan */}
            <div className="p-4 rounded-xl border-2 border-green-500 bg-green-50">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-green-800 font-bold">Free Plan</h3>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-500 text-white">
                  AKTIF
                </span>
              </div>
              <ul className="text-green-700 text-sm space-y-1">
                <li>- Hingga 500 anggota per bani</li>
                <li>- Pohon keluarga interaktif</li>
                <li>- Forum diskusi</li>
                <li>- Peta sebaran</li>
              </ul>
            </div>

            {/* Pro Plan (Coming Soon) */}
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 opacity-60">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-gray-500 font-bold">Pro Plan</h3>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-300 text-gray-600">
                  SEGERA
                </span>
              </div>
              <ul className="text-gray-500 text-sm space-y-1">
                <li>- Anggota tak terbatas</li>
                <li>- Export PDF silsilah</li>
                <li>- Statistik advanced</li>
                <li>- Prioritas support</li>
              </ul>
              <p className="text-gray-400 text-xs mt-3 italic">Coming soon...</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
