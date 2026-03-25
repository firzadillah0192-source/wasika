"use client"
import { useState, useEffect } from "react"
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet"
import { MapPin, X, Check, Loader2, Navigation } from "lucide-react"
import 'leaflet/dist/leaflet.css'

import L from 'leaflet'
// Fix weird Next.js icon issue with Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
})

function LocationMarker({ position, setPosition }: any) {
  const map = useMapEvents({
    click(e) {
      setPosition(e.latlng)
      map.flyTo(e.latlng, map.getZoom())
    },
  })
  return position === null ? null : <Marker position={position} />
}

export default function LeafletPicker({ onClose, onSave, initialQuery }: any) {
  const [position, setPosition] = useState<any>(null)
  const [mapCenter, setMapCenter] = useState<[number, number]>([-6.200000, 106.816666]) // Jakarta default
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    if (initialQuery && initialQuery.length > 5 && !initialQuery.startsWith(',')) {
       fetch("/api/geo", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ address: initialQuery })
       }).then(res => res.json()).then(data => {
         if (active && data && data.lat) {
           setMapCenter([data.lat, data.lng])
           setPosition({ lat: data.lat, lng: data.lng })
         }
         if (active) setLoading(false)
       }).catch(() => { if (active) setLoading(false) })
    } else {
       if (navigator.geolocation && active) {
         navigator.geolocation.getCurrentPosition(
           (pos) => {
             if (!active) return
             setMapCenter([pos.coords.latitude, pos.coords.longitude])
             setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude })
             setLoading(false)
           },
           () => { if (active) setLoading(false) },
           { enableHighAccuracy: true }
         )
       } else {
         if (active) setLoading(false)
       }
    }
    return () => { active = false }
  }, [initialQuery])

  if (loading) return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"><Loader2 className="w-8 h-8 text-wasika-gold animate-spin" /></div>

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl h-[80vh] bg-white rounded-2xl flex flex-col overflow-hidden relative shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="bg-wasika-dark px-4 py-3 flex items-center justify-between" style={{ background: "linear-gradient(135deg, #2b1f1a 0%, #3d2b24 100%)" }}>
          <h2 className="text-wasika-gold font-bold flex items-center gap-2 text-sm"><MapPin className="w-4 h-4" /> Tandai Letak Akurat</h2>
          <button onClick={onClose} className="p-1 rounded-full text-wasika-cream/70 hover:bg-white/10 hover:text-white transition-colors focus:outline-none"><X className="w-5 h-5"/></button>
        </div>
        
        <div className="p-3 bg-wasika-cream/50 border-b border-wasika-text-muted/20 text-[13px] text-wasika-brown-dark font-medium shadow-sm relative z-10 flex gap-2 items-start">
          <Navigation className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
          <p>
            Peta mengarah ke <strong>{initialQuery || "lokasi standar"}</strong>. 
            Silakan <strong>klik/sentuh</strong> persis pada titik wilayah tempat tinggal Anda di peta ini!
          </p>
        </div>
        
        <div className="flex-1 relative z-0 w-full h-full bg-gray-100">
          <MapContainer center={mapCenter} zoom={14} style={{ height: '100%', width: '100%', zIndex: 0 }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <LocationMarker position={position} setPosition={setPosition} />
          </MapContainer>
        </div>
        
        <div className="p-4 bg-white border-t border-wasika-text-muted/20 z-10">
          <button 
            disabled={!position}
            onClick={() => onSave(position.lat, position.lng)} 
            className="w-full bg-wasika-gold text-wasika-brown-dark font-bold text-sm py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:bg-wasika-gold-light transition-colors shadow-sm"
          >
             {position ? <><Check className="w-4 h-4" /> Terapkan Titik Peta</> : 'Pilih Titik di Atas Peta'}
          </button>
        </div>
      </div>
    </div>
  )
}
