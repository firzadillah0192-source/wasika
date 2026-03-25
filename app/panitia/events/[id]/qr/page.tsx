"use client"
import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft, Loader2, Download, Printer, QrCode } from "lucide-react"
import Link from "next/link"

export default function EventQRPage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [event, setEvent] = useState<any>(null)

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/login")
        return
      }

      const { data: eventData } = await supabase.from("events").select("*, banis(*)").eq("id", params.id).single()
      if (!eventData) {
         router.push("/panitia")
         return
      }
      setEvent(eventData)
      setLoading(false)
    }
    init()
  }, [params.id, router])

  const handlePrint = () => {
    window.print()
  }

  if (loading) return <div className="min-h-screen bg-wasika-cream flex items-center justify-center"><Loader2 className="w-8 h-8 text-wasika-gold animate-spin" /></div>

  return (
    <main className="min-h-screen bg-wasika-cream pb-10 print:bg-white print:pb-0">
      <div className="bg-wasika-dark px-5 pt-6 pb-20 print:hidden">
        <Link href="/panitia" className="inline-flex items-center gap-1.5 text-wasika-text-muted hover:text-wasika-gold transition-colors mb-4 focus:outline-none">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Kembali ke Dashboard</span>
        </Link>
        <h1 className="font-serif text-2xl text-wasika-gold">Scan QR Kehadiran</h1>
        <p className="text-wasika-text-muted text-sm mt-1">Tunjukkan QR ini di lokasi acara untuk check-in anggota.</p>
      </div>

      <div className="px-5 -mt-12 max-w-lg mx-auto print:mt-0 print:px-0 print:max-w-none">
        <div className="bg-white rounded-3xl border-2 border-wasika-gold/20 p-8 shadow-xl text-center print:border-none print:shadow-none print:p-0">
          <div className="mb-6">
            <h2 className="text-wasika-brown-dark font-serif text-2xl font-bold uppercase tracking-widest">{event.banis?.name || "Keluarga"}</h2>
            <div className="w-20 h-1 bg-wasika-gold mx-auto mt-2 rounded-full" />
          </div>

          <p className="text-wasika-brown-dark text-lg font-bold mb-1">{event.name}</p>
          <p className="text-wasika-text-muted text-sm mb-8">{new Date(event.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>

          <div className="w-full aspect-square bg-white border border-wasika-gold/10 p-4 rounded-2xl shadow-inner mb-8 flex items-center justify-center">
            {/* Generate QR using the event ID for checkin logic */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={`/api/qr/generate?text=${encodeURIComponent(event.id)}`} 
              alt="Event QR" 
              className="w-full h-full object-contain"
            />
          </div>

          <div className="space-y-4 print:hidden">
            <div className="flex items-center justify-center gap-2 text-wasika-gold bg-wasika-gold/10 py-3 px-4 rounded-xl border border-wasika-gold/20">
               <QrCode className="w-5 h-5" />
               <span className="text-xs font-bold uppercase tracking-widest">Silakan Scan Untuk Check-in</span>
            </div>
            
            <div className="flex gap-2">
               <button 
                 onClick={handlePrint}
                 className="flex-1 bg-wasika-brown-dark text-white p-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-colors"
               >
                 <Printer className="w-4 h-4" /> CETAK QR
               </button>
               <a 
                 href={`/api/qr/generate?text=${encodeURIComponent(event.id)}`}
                 download={`QR_Acara_${event.name}.png`}
                 className="flex-1 border-2 border-wasika-brown-dark text-wasika-brown-dark p-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-wasika-brown-dark/5 transition-colors"
               >
                 <Download className="w-4 h-4" /> UNDUH GAMBAR
               </a>
            </div>
          </div>
          
          <div className="mt-8 hidden print:block text-wasika-text-muted text-[10px] text-center italic">
            Dihasilkan secara otomatis oleh sistem WaSiKa (Warisan Silsilah Keluarga)
          </div>
        </div>
      </div>
    </main>
  )
}
