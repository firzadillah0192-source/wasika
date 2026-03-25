"use client"

import React, { useState, useEffect } from 'react'
import { X, Send, Loader2, MessageCircle } from 'lucide-react'
import type { Post, Comment } from '@/types/database'
import { formatDistanceToNowStrict, isToday, format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'

interface CommentSheetProps {
  post: Post
  currentPersonId: string
  currentPersonName: string
  onClose: () => void
}

const formatTime = (dateStr: string) => {
  const date = new Date(dateStr)
  const diffMinutes = (new Date().getTime() - date.getTime()) / 60000
  if (diffMinutes < 1) return 'Baru saja'
  if (diffMinutes < 60) return `${Math.floor(diffMinutes)} menit lalu`
  if (isToday(date)) return format(date, 'HH:mm', { locale: idLocale }) + ' WIB'
  return format(date, 'd MMM', { locale: idLocale })
}

export default function CommentSheet({ post, currentPersonId, currentPersonName, onClose }: CommentSheetProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    // Fetch initial comments
    fetch(`/api/posts/${post.id}/comments`)
      .then(res => res.json())
      .then(data => {
        setComments(data || [])
        setLoading(false)
      })
      .catch(err => {
        console.error("Gagal memuat komentar:", err)
        setLoading(false)
      })
  }, [post.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/posts/${post.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personId: currentPersonId,
          content: content.trim()
        })
      })

      if (!res.ok) throw new Error("Gagal mengirim")
      const newComment = await res.json()
      setComments(prev => [...prev, newComment])
      setContent("")
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:p-4">
      <div className="w-full h-[75vh] sm:h-auto sm:max-h-[85vh] sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-full duration-300 shadow-2xl">
        
        {/* Handle Bar */}
        <div className="w-full flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-12 h-1.5 bg-wasika-text-muted/30 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-wasika-text-muted/10">
          <div>
            <h3 className="font-serif text-lg text-wasika-brown-dark font-bold">Komentar</h3>
            <p className="text-xs text-wasika-text-muted truncate max-w-[250px]">
              Post oleh {post.person?.name}
            </p>
          </div>
          <button onClick={onClose} className="p-2 -mr-2 text-wasika-text-muted hover:text-wasika-brown-dark transition-colors bg-wasika-cream/50 hover:bg-wasika-cream rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-5 CustomScrollbar bg-wasika-cream/20">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 text-wasika-gold animate-spin" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-12 px-4">
              <MessageCircle className="w-12 h-12 text-wasika-gold/30 mx-auto mb-3" />
              <p className="text-wasika-brown-dark font-medium text-sm">Belum ada komentar.</p>
              <p className="text-wasika-text-muted text-xs mt-1">Jadilah yang pertama berbagi pendapat! ✨</p>
            </div>
          ) : (
            <div className="space-y-5">
              {comments.map(c => (
                <div key={c.id} className="flex gap-3 animate-in fade-in zoom-in-95 duration-200">
                  <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-wasika-brown-dark" style={{ background: "linear-gradient(135deg, #eaddc0 0%, #d4bc8f 100%)" }}>
                    {c.person?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0 bg-white p-3 rounded-2xl rounded-tl-sm shadow-sm border border-wasika-text-muted/5">
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <span className="font-semibold text-wasika-brown-dark text-[13px] truncate">{c.person?.name}</span>
                      <span className="text-wasika-text-muted/70 text-[10px] flex-shrink-0">{formatTime(c.created_at)}</span>
                    </div>
                    <p className="text-wasika-brown-dark text-[14px] leading-relaxed whitespace-pre-wrap break-words">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-wasika-text-muted/10 bg-white pb-safe">
          <form onSubmit={handleSubmit} className="flex items-end gap-3 max-w-full">
            <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white shadow-sm mb-1" style={{ background: "linear-gradient(135deg, #d4a843 0%, #f5c842 100%)" }}>
              {currentPersonName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 relative">
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Tulis komentar..."
                className="w-full bg-wasika-cream/50 border border-wasika-text-muted/20 rounded-2xl py-3 px-4 pr-12 text-sm text-wasika-brown-dark placeholder:text-wasika-text-muted focus:outline-none focus:ring-1 focus:ring-wasika-gold focus:border-wasika-gold resize-none min-h-[44px] max-h-[120px]"
                rows={1}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement
                  target.style.height = 'auto'
                  target.style.height = `${Math.min(target.scrollHeight, 120)}px`
                }}
              />
              <button 
                type="submit" 
                disabled={!content.trim() || isSubmitting}
                className="absolute right-2 bottom-2 w-8 h-8 flex items-center justify-center rounded-full bg-wasika-gold text-wasika-brown-dark disabled:opacity-50 disabled:bg-wasika-text-muted/20 disabled:text-wasika-text-muted transition-colors"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" style={{ transform: 'translateX(-1px) translateY(1px)' }} />}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  )
}
