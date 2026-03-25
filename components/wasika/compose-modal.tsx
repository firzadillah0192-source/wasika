"use client"

import React, { useState, useRef } from 'react'
import { X, Image as ImageIcon, Video, Quote, Loader2 } from 'lucide-react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import type { Post } from '@/types/database'

interface ComposeModalProps {
  personName: string
  baniId: string
  personId: string
  onClose: () => void
  onSuccess: () => void
  quotedPost?: Post | null
}

export default function ComposeModal({ personName, baniId, personId, onClose, onSuccess, quotedPost }: ComposeModalProps) {
  const [content, setContent] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const selectedFiles = Array.from(e.target.files)
    
    // Check type constraints
    const isVideo = selectedFiles.some(f => f.type.startsWith('video/'))
    
    if (isVideo) {
      if (files.length > 0 && mediaType === 'image') {
        setErrorMsg("Tidak bisa menggabungkan foto dan video.")
        return
      }
      if (selectedFiles.length > 1 || files.length > 0) {
        setErrorMsg("Hanya bisa mengunggah 1 video per postingan.")
        return
      }
      setMediaType('video')
      setFiles(selectedFiles)
    } else {
      if (mediaType === 'video') {
         setErrorMsg("Tidak bisa menggabungkan foto dan video.")
         return
      }
      if (files.length + selectedFiles.length > 4) {
        setErrorMsg("Maksimal 4 foto per postingan.")
        return
      }
      setMediaType('image')
      setFiles(prev => [...prev, ...selectedFiles])
    }
    setErrorMsg("")
  }

  const removeFile = (index: number) => {
    setFiles(prev => {
      const newFiles = prev.filter((_, i) => i !== index)
      if (newFiles.length === 0) setMediaType(null)
      return newFiles
    })
  }

  const handleSubmit = async () => {
    if (!content.trim() && files.length === 0 && !quotedPost) return
    
    setIsSubmitting(true)
    setErrorMsg("")

    try {
      // 1. Upload media array concurrently
      const uploadedMediaUrls: string[] = []
      const uploadedMediaTypes: string[] = []

      if (files.length > 0 && mediaType) {
        const uploadPromises = files.map(async (file) => {
          const supabase = createClient()
          const ext = file.name.split('.').pop()
          const fileName = `${baniId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

          const { error: uploadError } = await supabase.storage
            .from('wasika-media')
            .upload(fileName, file, {
              contentType: file.type,
              upsert: false,
            })

          if (uploadError) throw new Error(uploadError.message || 'Upload gagal')

          const { data: { publicUrl } } = supabase.storage
            .from('wasika-media')
            .getPublicUrl(fileName)

          return { url: publicUrl, type: mediaType }
        })

        const results = await Promise.all(uploadPromises)
        results.forEach(r => {
          uploadedMediaUrls.push(r.url)
          uploadedMediaTypes.push(r.type)
        })
      }

      // 2. Insert Post
      const postType = quotedPost ? (content.trim() ? 'quote' : 'repost') : 'post'

      const postRes = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baniId,
          personId,
          content: content.trim(),
          mediaUrls: uploadedMediaUrls,
          mediaTypes: uploadedMediaTypes,
          postType,
          quotedPostId: quotedPost?.id || null
        })
      })

      if (!postRes.ok) {
        const errData = await postRes.json()
        throw new Error(errData.error || "Gagal membuat postingan")
      }

      onSuccess()
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan.')
      setIsSubmitting(false)
    }
  }

  const charsLeft = 500 - content.length

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4">
      <div className="w-full h-[90vh] sm:h-auto sm:max-h-[85vh] sm:max-w-xl bg-white sm:rounded-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-wasika-gold/20" style={{ background: "linear-gradient(135deg, #2b1f1a 0%, #3d2b24 100%)" }}>
          <button onClick={onClose} className="p-1 text-wasika-cream/70 hover:text-wasika-gold transition-colors focus:outline-none">
            <X className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-3">
             <button disabled={isSubmitting || (!content.trim() && files.length === 0 && !quotedPost)} onClick={handleSubmit} className="bg-wasika-gold text-wasika-brown-dark font-medium text-sm py-1.5 px-4 rounded-full disabled:opacity-50 flex items-center gap-1.5">
               {isSubmitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Mengirim...</> : 'Post'}
             </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 CustomScrollbar">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold text-wasika-brown-dark shadow-sm" style={{ background: "linear-gradient(135deg, #d4a843 0%, #f5c842 100%)" }}>
              {personName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
               <textarea
                 autoFocus
                 className="w-full bg-transparent border-none focus:ring-0 text-base md:text-lg text-wasika-brown-dark placeholder:text-wasika-text-muted/60 resize-none min-h-[120px] pb-12"
                 placeholder={quotedPost ? "Tambahkan pendapatmu..." : "Apa yang ingin kamu bagikan hari ini?"}
                 value={content}
                 onChange={e => {
                   if (e.target.value.length <= 500) setContent(e.target.value)
                 }}
               />
            </div>
          </div>

          {/* Media Previews */}
          {files.length > 0 && mediaType === 'image' && (
            <div className="mt-2 ml-12 grid grid-cols-2 gap-2 pr-2">
              {files.map((f, i) => (
                <div key={i} className="relative h-32 rounded-xl overflow-hidden border border-wasika-text-muted/20">
                  <Image src={URL.createObjectURL(f)} alt={`Preview ${i}`} fill className="object-cover" />
                  <button onClick={() => removeFile(i)} className="absolute top-1 right-1 bg-black/60 p-1 rounded-full text-white"><X className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
          )}
          {files.length > 0 && mediaType === 'video' && (
            <div className="mt-2 ml-12 relative h-40 rounded-xl overflow-hidden bg-black border border-wasika-text-muted/20 pr-2">
              <video src={URL.createObjectURL(files[0])} controls className="w-full h-full object-contain" />
              <button onClick={() => removeFile(0)} className="absolute top-1 right-1 bg-black/60 p-1 rounded-full text-white z-10"><X className="w-3 h-3" /></button>
            </div>
          )}

          {/* Quoted Preview */}
          {quotedPost && (
            <div className="mt-4 ml-12 border border-wasika-gold/30 rounded-xl p-3 bg-wasika-cream/30 opacity-70">
              <div className="text-xs font-semibold text-wasika-brown-dark mb-1">{quotedPost.person?.name}</div>
              {quotedPost.content && <p className="text-xs text-wasika-text-muted line-clamp-2">{quotedPost.content}</p>}
              {quotedPost.media_urls?.length > 0 && <span className="text-xs text-wasika-gold mt-1 block">📸 Menyertakan media</span>}
            </div>
          )}

          {errorMsg && (
            <div className="mt-4 ml-12 p-3 bg-red-50 text-red-600 border border-red-100 rounded-lg text-sm mr-2">
              {errorMsg}
            </div>
          )}
        </div>

        {/* Action Toolbar */}
        <div className="border-t border-wasika-gold/20 p-3 bg-wasika-cream/50 flex items-center justify-between mt-auto">
          <div className="flex items-center gap-1">
             <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*,video/mp4,video/quicktime" onChange={handleFileSelect} />
             <button onClick={() => fileInputRef.current?.click()} className="p-2 text-wasika-gold hover:bg-wasika-gold/10 rounded-full transition-colors flex items-center justify-center">
               <ImageIcon className="w-5 h-5" />
             </button>
             <button onClick={() => fileInputRef.current?.click()} className="p-2 text-wasika-gold hover:bg-wasika-gold/10 rounded-full transition-colors flex items-center justify-center">
               <Video className="w-5 h-5" />
             </button>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
             <span className="text-wasika-text-muted/70 flex items-center gap-1">
               <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
               Kompresi Aktif
             </span>
             <span className={charsLeft < 50 ? 'text-red-500' : 'text-wasika-text-muted'}>{charsLeft}</span>
          </div>
        </div>

      </div>
    </div>
  )
}
