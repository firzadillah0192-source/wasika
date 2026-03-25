"use client"
import React, { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"

export default function LocationPickerWrapper({ 
  onClose, 
  onSave, 
  initialQuery 
}: { 
  onClose: () => void, 
  onSave: (lat: number, lng: number) => void, 
  initialQuery: string 
}) {
  const [Component, setComponent] = useState<any>(null)

  useEffect(() => {
    import('./leaflet-picker').then(mod => setComponent(() => mod.default))
  }, [])

  if (!Component) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <Loader2 className="w-8 h-8 text-wasika-gold animate-spin" />
      </div>
    )
  }

  return <Component onClose={onClose} onSave={onSave} initialQuery={initialQuery} />
}
