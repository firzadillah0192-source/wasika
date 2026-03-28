"use client"

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Bell, Sparkles, Loader2, User, Plus, Users } from 'lucide-react'
import { BottomNav } from '@/components/wasika/bottom-nav'
import PostCard from '@/components/wasika/post-card'
import ComposeModal from '@/components/wasika/compose-modal'
import CommentSheet from '@/components/wasika/comment-sheet'
import { BatikKawung } from '@/components/wasika/batik-kawung'
import type { Post } from '@/types/database'
import { useUser } from '@/context/user-context'

export default function AktivitasPage() {
  const router = useRouter()
  const { memberships, rootBani, allBaniIds, user: ctxUser } = useUser()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [person, setPerson] = useState<any>(null)
  const [posts, setPosts] = useState<Post[]>([])
  
  const [showCompose, setShowCompose] = useState(false)
  const [quotedPost, setQuotedPost] = useState<Post | null>(null)
  const [activeCommentPost, setActiveCommentPost] = useState<Post | null>(null)

  const [hasNewPosts, setHasNewPosts] = useState(false)
  
  const supabase = createClient()

  const fetchPosts = useCallback(async () => {
    try {
      // Posts are fetched without baniId filter — RLS handles the cross-bani access
      const res = await fetch(`/api/posts`)
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
      try {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return router.replace("/login")

        // 1. Load Profile - specify relationship to avoid ambiguity
        const { data: prof, error: profErr } = await supabase.from('profiles')
          .select('*, banis!profiles_bani_id_fkey(name)')
          .eq('id', user.id)
          .maybeSingle()
        if (profErr) console.error("Profile Load Error:", profErr)
        
        // Feed Rollup: Determine the main Bani ID to use
        const rootId = (prof as any)?.root_bani_id || (rootBani as any)?.id
        let activeBaniId = prof?.bani_id
        
        if (!activeBaniId && memberships.length > 0) {
          const primaryMem = memberships.find(m => m.membership_type === 'primary' || m.membership_type === 'pengelola')
          activeBaniId = primaryMem?.bani_id || memberships[0].bani_id
        }

        if (!activeBaniId) {
           console.warn("No activeBaniId found for user")
           setLoading(false)
           return
        }
        
        // Auto-sync profile to bani_id if it's currently missing
        if (prof && !prof.bani_id) {
           await supabase.from("profiles").update({ 
               bani_id: activeBaniId,
               root_bani_id: rootId
           }).eq("id", user.id)
        }

        // 2. Load Person (Family Identity)
        const { data: pers, error: persErr } = await supabase.from('persons').select('*').eq("user_id", user.id).maybeSingle()
        if (persErr) console.error("Person Load Error:", persErr)
        
        setProfile(prof)
        setPerson(pers)

        if (!pers) {
           console.warn("User has no person record linked to their auth id")
           setLoading(false)
           return
        }

        // 3. Load Posts
        const { data: postsData, error: postsErr } = await (supabase.from('posts')
          .select('*, person:persons(id, name), reactions(*)')
          .in('bani_id', allBaniIds.length > 0 ? allBaniIds : [activeBaniId])
          .order('created_at', { ascending: false })
          .limit(25) as any)
        
        if (postsErr) console.error("Posts Load Error:", postsErr)
        setPosts(postsData || [])

      } catch (err) {
        console.error("Initiating activity page failed:", err)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [router, supabase, memberships, rootBani, allBaniIds])

  // Realtime subscription across ALL family banis
  useEffect(() => {
    if (!profile?.bani_id) return

    // Subscribe to all bani channels from memberships
    const baniIdsToWatch = allBaniIds.length > 0 ? allBaniIds : [profile.bani_id]
    const channels = baniIdsToWatch.map(bid =>
      supabase
        .channel(`bani_posts_${bid}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts', filter: `bani_id=eq.${bid}` }, (payload) => {
          if (payload.new.person_id !== person?.id) {
            setHasNewPosts(true)
          } else {
            fetchPosts()
          }
        })
        .subscribe()
    )

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch))
    }
  }, [profile?.bani_id, person?.id, fetchPosts, supabase, allBaniIds])

  const handleRefreshNew = () => {
    setHasNewPosts(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    fetchPosts()
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
  
  if (loading) return (
    <div className="min-h-screen bg-wasika-cream flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-wasika-gold animate-spin" />
    </div>
  )

  // Robust check for profile/person
  if (!profile || !person) {
    return (
      <main className="min-h-screen bg-wasika-cream pb-20">
         <div className="p-10 pt-20 text-center">
            <div className="w-16 h-16 bg-wasika-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
               <Sparkles className="w-8 h-8 text-wasika-gold" />
            </div>
            <h3 className="font-serif text-xl text-wasika-brown-dark mb-1">Menyiapkan Linimasa</h3>
            <p className="text-wasika-text-muted text-sm max-w-xs mx-auto mb-6">
               Akun Anda sedang disiapkan. Jika halaman ini tidak berubah, silakan lengkapi profil silsilah Anda.
            </p>
            <button 
               onClick={() => fetchPosts()}
               className="bg-wasika-gold text-wasika-brown-dark font-bold px-6 py-2 rounded-full shadow-md hover:scale-105 transition-transform"
            >
               Muat Ulang
            </button>
         </div>
         <BottomNav />
      </main>
    )
  }

  const baniName = profile.banis?.name || 'Keluarga'
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

      <div className="px-5 pt-6 pb-20">
        <div 
          onClick={() => setShowCompose(true)}
          className="mb-8 bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-xl shadow-wasika-gold/5 border border-wasika-gold/10 flex items-center gap-4 cursor-pointer group hover:border-wasika-gold/30 transition-all"
        >
          <div className="w-12 h-12 rounded-full overflow-hidden bg-wasika-cream flex-shrink-0 border-2 border-wasika-gold/20 shadow-inner flex items-center justify-center">
            {person.photo_url ? (
              <img src={person.photo_url} alt={person.name} className="w-full h-full object-cover" />
            ) : (
               <User className="w-6 h-6 text-wasika-copper" />
            )}
          </div>
          <div className="flex-1 text-wasika-text-muted text-sm font-medium">
            Apa yang ingin kamu bagikan, {person.name.split(' ')[0]}?
          </div>
          <div className="w-10 h-10 rounded-full bg-wasika-gold flex items-center justify-center shadow-lg shadow-wasika-gold/20 group-hover:scale-110 transition-transform">
             <Plus className="w-5 h-5 text-wasika-brown-dark" />
          </div>
        </div>

        {hasNewPosts && (
          <div className="sticky top-[100px] z-20 flex justify-center mb-6 animate-in slide-in-from-top-4 fade-in duration-300">
            <button 
              onClick={handleRefreshNew}
              className="bg-wasika-gold text-wasika-brown-dark px-4 py-2 rounded-full text-xs font-bold shadow-xl shadow-wasika-gold/20 border border-wasika-brown-dark/10 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              POSTINGAN BARU
            </button>
          </div>
        )}

        {posts.length === 0 ? (
          <div className="py-20 px-10 text-center">
             <div className="w-20 h-20 bg-wasika-gold/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-wasika-gold/20">
               <Sparkles className="w-10 h-10 text-wasika-gold opacity-50" />
             </div>
             <h3 className="font-serif text-2xl text-wasika-brown-dark mb-2">Suasana Sepi...</h3>
             <p className="text-wasika-text-muted text-sm max-w-[240px] mx-auto">
                Keluarga besar {baniName} menunggumu berbagi momen hari ini.
             </p>
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map(post => (
              <PostCard 
                key={post.id} 
                post={post} 
                currentPersonId={person.id} 
                onReact={handleReact}
                onComment={setActiveCommentPost}
                onRepost={handleRepost}
                onSave={handleSave}
              />
            ))}
          </div>
        )}
      </div>

      <BottomNav />

      {showCompose && person && (
        <ComposeModal
          personName={person.name}
          personId={person.id}
          baniId={profile.bani_id || ''}
          onClose={() => { setShowCompose(false); setQuotedPost(null); }}
          onSuccess={() => { setShowCompose(false); fetchPosts(); }}
          quotedPost={quotedPost}
        />
      )}

      {activeCommentPost && person && (
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
