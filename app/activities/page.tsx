"use client"

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Bell, Sparkles, Loader2 } from 'lucide-react'
import { BottomNav } from '@/components/wasika/bottom-nav'
import PostCard from '@/components/wasika/post-card'
import ComposeModal from '@/components/wasika/compose-modal'
import CommentSheet from '@/components/wasika/comment-sheet'
import type { Post } from '@/types/database'

export default function AktivitasPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [person, setPerson] = useState<any>(null)
  const [posts, setPosts] = useState<Post[]>([])
  
  const [showCompose, setShowCompose] = useState(false)
  const [quotedPost, setQuotedPost] = useState<Post | null>(null)
  const [activeCommentPost, setActiveCommentPost] = useState<Post | null>(null)

  const [hasNewPosts, setHasNewPosts] = useState(false)
  
  const supabase = createClient()

  const fetchPosts = useCallback(async (baniId: string) => {
    try {
      const res = await fetch(`/api/posts?baniId=${baniId}`)
      if (res.ok) {
        const data = await res.json()
        setPosts(data || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.replace("/login")

      const { data: prof } = await supabase.from('profiles').select('*, banis(name, events(name))').eq('id', user.id).single()
      if (!prof?.bani_id) return router.replace("/join")

      const { data: pers } = await supabase.from('persons').select('*').eq('user_id', user.id).single()
      
      setProfile(prof)
      setPerson(pers)
      fetchPosts(prof.bani_id)
    }
    init()
  }, [router, fetchPosts, supabase])

  // Realtime Subscription
  useEffect(() => {
    if (!profile?.bani_id) return

    const channel = supabase
      .channel(`bani_posts_${profile.bani_id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts', filter: `bani_id=eq.${profile.bani_id}` }, (payload) => {
        // Only trigger 'new posts' bubble if the post wasn't made by current user
        if (payload.new.person_id !== person?.id) {
          setHasNewPosts(true)
        } else {
          // If we made the post, fetch immediately silently
          fetchPosts(profile.bani_id)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile?.bani_id, person?.id, fetchPosts, supabase])

  const handleRefreshNew = () => {
    setHasNewPosts(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    if (profile?.bani_id) fetchPosts(profile.bani_id)
  }

  const handleReact = async (postId: string, emoji: string) => {
    try {
      await fetch(`/api/posts/${postId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personId: person.id, emoji })
      })
    } catch (e) { console.error(e) }
  }

  const handleSave = async (postId: string, currentStatus: boolean) => {
    try {
      await fetch(`/api/posts/${postId}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personId: person.id })
      })
    } catch (e) { console.error(e) }
  }

  const handleRepost = (post: Post) => {
    setQuotedPost(post)
    setShowCompose(true)
  }

  if (loading || !profile || !person) return (
    <div className="min-h-screen bg-wasika-cream flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-wasika-gold animate-spin" />
    </div>
  )

  const baniName = profile.banis?.name || ''
  const eventName = profile.banis?.events?.[0]?.name || ''

  return (
    <main className="min-h-screen bg-wasika-cream pb-24 relative">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-wasika-dark/95 backdrop-blur-md px-5 pt-5 pb-4 shadow-sm border-b border-wasika-gold/20" style={{ background: "linear-gradient(135deg, #2b1f1a 0%, #3d2b24 100%)" }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl text-wasika-gold">Ekspresikan Harimu</h1>
            <p className="text-wasika-text-muted text-xs mt-0.5">
              Bani {baniName} {eventName && `· ${eventName}`}
            </p>
          </div>
          <button className="relative p-2 text-wasika-gold hover:bg-wasika-gold/10 rounded-full transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1.5 w-2 h-2 rounded-full bg-rose-500"></span>
          </button>
        </div>
      </div>

      {/* Compose Bar */}
      <div className="bg-white px-5 py-4 border-b border-wasika-text-muted/10 flex items-center gap-3 cursor-text shadow-sm" onClick={() => { setQuotedPost(null); setShowCompose(true); }}>
        <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold text-wasika-brown-dark shadow-inner" style={{ background: "linear-gradient(135deg, #d4a843 0%, #f5c842 100%)" }}>
          {person.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 bg-wasika-cream/50 rounded-full py-3 px-4 text-sm text-wasika-text-muted/70 hover:bg-wasika-cream border border-wasika-text-muted/10 transition-colors">
          Apa yang ingin kamu bagikan?
        </div>
        <button className="bg-wasika-gold text-wasika-brown-dark font-medium text-sm py-2 px-4 rounded-full shadow-sm">
          Post
        </button>
      </div>

      {/* New Post Pill Indicator */}
      {hasNewPosts && (
        <div className="sticky top-[88px] z-20 flex justify-center mt-3 animate-in slide-in-from-top-4 fade-in duration-300">
          <button 
            onClick={handleRefreshNew}
            className="bg-wasika-gold text-wasika-brown-dark px-4 py-1.5 rounded-full text-sm font-semibold shadow-lg shadow-wasika-gold/20 border border-wasika-brown-dark/10 flex items-center gap-1.5 hover:scale-105 transition-transform"
          >
            <Sparkles className="w-4 h-4" />
            Postingan baru
          </button>
        </div>
      )}

      {/* Feed List */}
      <div className="mt-2" style={{ minHeight: '50vh' }}>
        {posts.length === 0 ? (
          <div className="py-20 px-6 text-center">
             <div className="w-16 h-16 bg-wasika-gold/20 rounded-full flex items-center justify-center mx-auto mb-4">
               <Sparkles className="w-8 h-8 text-wasika-gold" />
             </div>
             <h3 className="font-serif text-xl text-wasika-brown-dark mb-1">Berbagi Momen</h3>
             <p className="text-wasika-text-muted text-sm max-w-xs mx-auto">
               Jadilah yang pertama berbagi hari ini di keluarga Bani {baniName}! ✨
             </p>
          </div>
        ) : (
          posts.map(post => (
            <PostCard 
              key={post.id} 
              post={post} 
              currentPersonId={person.id} 
              onReact={handleReact}
              onComment={setActiveCommentPost}
              onRepost={handleRepost}
              onSave={handleSave}
            />
          ))
        )}
      </div>

      {/* Modals & Bottom Nav */}
      <BottomNav />

      {showCompose && (
        <ComposeModal
          personName={person.name}
          personId={person.id}
          baniId={profile.bani_id}
          onClose={() => { setShowCompose(false); setQuotedPost(null); }}
          onSuccess={() => { setShowCompose(false); fetchPosts(profile.bani_id); }}
          quotedPost={quotedPost}
        />
      )}

      {activeCommentPost && (
        <CommentSheet
          post={activeCommentPost}
          currentPersonId={person.id}
          currentPersonName={person.name}
          onClose={() => setActiveCommentPost(null)}
        />
      )}
    </main>
  )
}
