"use client"
import { 
  useEffect, 
  useCallback, 
  useState 
} from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Users, Clock, UserCheck, CreditCard, Check, X, Building2, Shield } from "lucide-react"

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
}

export default function SuperAdminPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [approvals, setApprovals] = useState<BaniRequest[]>([])
  const [baniList, setBaniList] = useState<BaniItem[]>([])
  const [stats, setStats] = useState({ totalBani: 0, pending: 0, totalMembers: 0 })

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
          status: b.status
        }
      })
      setBaniList(items)

      const totalMembers = items.reduce((sum, b) => sum + b.members_count, 0)
      setStats({
        totalBani: items.length,
        pending: pending?.length || 0,
        totalMembers: totalMembers
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
          <div className="px-4 py-3 border-b border-wasika-text-muted/15">
            <h2 className="text-wasika-brown-dark font-bold text-sm">KELOLA BANI</h2>
            <p className="text-wasika-text-muted text-xs mt-0.5">Semua keluarga terdaftar</p>
          </div>
          <div className="divide-y divide-wasika-text-muted/10">
            {baniList.map((bani) => (
              <div key={bani.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-wasika-brown-dark font-medium text-sm">{bani.name}</p>
                  <p className="text-wasika-text-muted text-xs">{bani.members_count} anggota</p>
                </div>
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    bani.status === "active"
                      ? "bg-green-100 text-green-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {bani.status === "active" ? "Aktif" : "Pending"}
                </span>
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
