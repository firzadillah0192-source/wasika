"use client"

import React, { useState } from 'react'
import Image from 'next/image'
import { Heart, MessageCircle, Repeat2, Bookmark, Download, Play, SmilePlus } from 'lucide-react'
import type { Post } from '@/types/database'
import { formatDistanceToNowStrict, isToday, format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'

interface PostCardProps {
  post: Post
  currentPersonId: string
  onReact: (postId: string, emoji: string) => void
  onComment: (post: Post) => void
  onRepost: (post: Post) => void
  onSave: (postId: string, currentStatus: boolean) => void
}

const formatTime = (dateStr: string) => {
  const date = new Date(dateStr)
  const diffMinutes = (new Date().getTime() - date.getTime()) / 60000
  if (diffMinutes < 1) return 'Baru saja'
  if (diffMinutes < 60) return `${Math.floor(diffMinutes)} menit lalu`
  if (isToday(date)) return format(date, 'HH:mm', { locale: idLocale }) + ' WIB'
  return format(date, 'd MMM', { locale: idLocale })
}

const EMOJIS = ['❤️','🥰','😂','🤲','👏','😢']

export default function PostCard({ post, currentPersonId, onReact, onComment, onRepost, onSave }: PostCardProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  
  // Local state for instant feedback
  const [localReactions, setLocalReactions] = useState(post.reactions || [])
  const [isSaved, setIsSaved] = useState(post.is_saved || false)
  const [expanded, setExpanded] = useState(false)

  const handleReact = (emoji: string) => {
    setShowEmojiPicker(false)
    
    const existingIdx = localReactions.findIndex(r => r.person_id === currentPersonId)
    
    if (existingIdx >= 0) {
      if (localReactions[existingIdx].emoji === emoji) {
        // Batal react (Un-react)
        setLocalReactions(prev => prev.filter(r => r.person_id !== currentPersonId))
      } else {
        // Ganti emoji (Change)
        setLocalReactions(prev => prev.map(r => r.person_id === currentPersonId ? { ...r, emoji } : r))
      }
    } else {
      // React baru
      setLocalReactions(prev => [...prev, { id: 'tmp', post_id: post.id, person_id: currentPersonId, emoji, created_at: new Date().toISOString() }])
    }
    onReact(post.id, emoji)
  }

  const handleSave = () => {
    setIsSaved(!isSaved)
    onSave(post.id, isSaved)
  }

  const groupedReactions = localReactions.reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const topEmojis = Object.entries(groupedReactions)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  const hasMyReaction = localReactions.some(r => r.person_id === currentPersonId)

  // Subcomponents for media
  const renderMedia = (urls: string[], types: string[]) => {
    if (!urls || urls.length === 0) return null

    // Video handling (max 1)
    if (types[0] === 'video') {
      return (
        <div className="relative w-full rounded-xl overflow-hidden bg-black mt-3">
          <video src={urls[0]} controls className="w-full max-h-[300px] object-contain" />
          <a href={urls[0]} download target="_blank" rel="noreferrer" className="absolute bottom-3 left-3 bg-black/50 p-2 rounded-full text-white hover:bg-black/70 transition">
            <Download className="w-4 h-4" />
          </a>
        </div>
      )
    }

    // Photo Grids
    if (urls.length === 1) {
      return (
        <div className="relative w-full mt-3 group cursor-pointer">
          <img src={urls[0]} alt="Post media" className="w-full h-auto max-h-[500px] object-contain rounded-xl bg-wasika-cream/30 border border-wasika-text-muted/10" />
          <a href={urls[0]} download target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="absolute bottom-2 left-2 bg-black/50 p-1.5 rounded-full text-white opacity-0 group-hover:opacity-100 transition">
            <Download className="w-3.5 h-3.5" />
          </a>
        </div>
      )
    }

    if (urls.length === 2) {
      return (
        <div className="grid grid-cols-2 gap-1.5 mt-3">
          {urls.map((u, i) => (
             <div key={i} className="relative w-full h-[120px] rounded-xl overflow-hidden group">
               <Image src={u} alt={`Media ${i}`} fill className="object-cover" />
             </div>
          ))}
        </div>
      )
    }

    if (urls.length === 3) {
      return (
        <div className="grid grid-cols-2 gap-1.5 mt-3 h-[200px]">
          <div className="relative w-full h-full rounded-l-xl overflow-hidden group">
            <Image src={urls[0]} alt="Media 0" fill className="object-cover" />
          </div>
          <div className="grid grid-rows-2 gap-1.5 h-full">
            <div className="relative w-full h-full rounded-tr-xl overflow-hidden group">
              <Image src={urls[1]} alt="Media 1" fill className="object-cover" />
            </div>
            <div className="relative w-full h-full rounded-br-xl overflow-hidden group">
              <Image src={urls[2]} alt="Media 2" fill className="object-cover" />
            </div>
          </div>
        </div>
      )
    }

    // 4 photos
    return (
      <div className="grid grid-cols-2 gap-1.5 mt-3">
        {urls.slice(0, 4).map((u, i) => (
           <div key={i} className={`relative w-full h-[120px] overflow-hidden group ${i===0?'rounded-tl-xl':i===1?'rounded-tr-xl':i===2?'rounded-bl-xl':'rounded-br-xl'}`}>
             <Image src={u} alt={`Media ${i}`} fill className="object-cover" />
           </div>
        ))}
      </div>
    )
  }

  // Quote Post Preview
  const renderQuoted = () => {
    const qp = post.quoted_post
    if (!qp) return null
    return (
      <div className="mt-3 border border-wasika-gold/30 rounded-xl p-3 bg-wasika-cream/30 cursor-pointer hover:bg-wasika-cream/50 transition" onClick={() => onComment(qp)}>
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-5 h-5 rounded-full bg-wasika-gold/20 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-wasika-brown-dark">
            {qp.person?.name?.charAt(0) || '?'}
          </div>
          <span className="text-sm font-semibold text-wasika-brown-dark">{qp.person?.name}</span>
          <span className="text-xs text-wasika-text-muted/60">&middot; {formatTime(qp.created_at)}</span>
        </div>
        {qp.content && <p className="text-xs text-wasika-text-muted line-clamp-2">{qp.content}</p>}
        {qp.media_urls?.length > 0 && <span className="text-xs text-wasika-gold mt-1 block">📸 Menyertakan media</span>}
      </div>
    )
  }

  // Content truncation
  const contentStr = post.content || ''
  const isLong = contentStr.length > 150 || contentStr.split('\n').length > 3

  return (
    <div className="bg-white border-b border-wasika-text-muted/10 p-4">
      {post.post_type === 'repost' && (
        <div className="flex items-center gap-2 text-xs text-wasika-text-muted mb-2 ml-10">
          <Repeat2 className="w-3.5 h-3.5" />
          <span>{post.person?.name} membagikan ulang</span>
        </div>
      )}

      <div className="flex gap-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold text-wasika-brown-dark shadow-sm" style={{ background: "linear-gradient(135deg, #d4a843 0%, #f5c842 100%)" }}>
          {post.post_type === 'repost' && post.quoted_post?.person?.name 
            ? post.quoted_post.person.name.charAt(0).toUpperCase()
            : post.person?.name?.charAt(0).toUpperCase() || '?'}
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex flex-col gap-0.5 mb-2">
            <div className="flex items-baseline gap-1.5">
              <span className="font-semibold text-wasika-brown-dark text-[15px] truncate">
                {post.post_type === 'repost' && post.quoted_post?.person?.name 
                  ? post.quoted_post.person.name
                  : post.person?.name || 'Anggota'}
              </span>
              <span className="text-wasika-text-muted text-xs">&middot; {formatTime(post.created_at)}</span>
            </div>
            {(post as any).bani && (
              <div className="inline-flex self-start items-center px-1.5 py-0.5 rounded-md bg-wasika-gold/10 text-wasika-gold text-[9px] font-bold uppercase tracking-wider border border-wasika-gold/20">
                Keluarga {(post as any).bani.name}
              </div>
            )}
          </div>

          {/* Main Content */}
          {(post.post_type === 'post' || post.post_type === 'quote') && post.content && (
            <div className="mt-1">
              <p className={`text-[14px] text-wasika-brown-dark leading-relaxed whitespace-pre-wrap break-words ${!expanded && isLong ? 'line-clamp-3' : ''}`}>
                {post.content}
              </p>
              {!expanded && isLong && (
                <button onClick={() => setExpanded(true)} className="text-wasika-gold text-xs font-medium hover:underline mt-0.5">
                  Lihat selengkapnya
                </button>
              )}
            </div>
          )}

          {/* Media */}
          {post.post_type === 'repost' && post.quoted_post ? (
             <>
               {post.quoted_post.content && <p className="mt-1 text-[14px] text-wasika-brown-dark leading-relaxed whitespace-pre-wrap">{post.quoted_post.content}</p>}
               {renderMedia(post.quoted_post.media_urls, post.quoted_post.media_types)}
             </>
          ) : (
             renderMedia(post.media_urls, post.media_types)
          )}

          {/* Quoted Preview */}
          {post.post_type === 'quote' && renderQuoted()}

          {/* Reaction Summary Row */}
          {topEmojis.length > 0 && (
            <div className="flex items-center gap-1.5 mt-3 text-xs text-wasika-text-muted">
              <div className="flex -space-x-1">
                {topEmojis.map(([emoji]) => (
                  <div key={emoji} className="w-5 h-5 rounded-full bg-wasika-cream border border-white flex items-center justify-center text-[10px] shadow-sm z-10">{emoji}</div>
                ))}
              </div>
              <span className="ml-1">{localReactions.length} reaksi</span>
            </div>
          )}

          {/* Action Bar */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-wasika-text-muted/10 relative">
            <div className="relative">
              <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={`flex items-center gap-1.5 px-2 py-1.5 rounded-full transition ${hasMyReaction ? 'text-rose-500 bg-rose-50' : 'text-wasika-text-muted hover:text-rose-500 hover:bg-rose-50'}`}>
                <Heart className={`w-4 h-4 ${hasMyReaction ? 'fill-current' : ''}`} />
                <span className="text-xs font-medium">{localReactions.length > 0 ? localReactions.length : 'React'}</span>
              </button>

              {/* Emoji Picker Popup */}
              {showEmojiPicker && (
                <div className="absolute top-full left-0 mt-2 bg-white rounded-full shadow-lg border border-wasika-gold/20 p-1 flex gap-1 z-30">
                  {EMOJIS.map(e => (
                    <button key={e} onClick={() => handleReact(e)} className="w-8 h-8 flex items-center justify-center hover:bg-wasika-cream rounded-full text-lg transition-transform hover:scale-125 focus:outline-none">
                      {e}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={() => onComment(post)} className="flex items-center gap-1.5 text-wasika-text-muted hover:text-wasika-brown-dark px-2 py-1.5 rounded-full hover:bg-wasika-cream transition">
              <MessageCircle className="w-4 h-4" />
              <span className="text-xs font-medium">{(post.comments && Array.isArray(post.comments) ? (post.comments[0] as any)?.count : post.comment_count) || 'Komen'}</span>
            </button>

            <button onClick={() => onRepost(post)} className="flex items-center gap-1.5 text-wasika-text-muted hover:text-emerald-600 px-2 py-1.5 rounded-full hover:bg-emerald-50 transition">
              <Repeat2 className="w-4 h-4" />
              <span className="text-xs font-medium">Repost</span>
            </button>

            <button onClick={handleSave} className={`flex items-center gap-1.5 px-2 py-1.5 rounded-full transition ${isSaved ? 'text-wasika-gold bg-wasika-gold/10' : 'text-wasika-text-muted hover:text-wasika-gold hover:bg-wasika-gold/10'}`}>
              <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
