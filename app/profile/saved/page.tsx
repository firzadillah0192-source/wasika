"use client"

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Loader2, Bookmark } from 'lucide-react'
import Link from 'next/link'
import PostCard from '@/components/wasika/post-card'
import CommentSheet from '@/components/wasika/comment-sheet'
import type { Post } from '@/types/database'

export default function SavedPostsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [person, setPerson] = useState<any>(null)
  const [savedPosts, setSavedPosts] = useState<Post[]>([])
  
  const [activeCommentPost, setActiveCommentPost] = useState<Post | null>(null)
  const supabase = createClient()

  const fetchSavedPosts = useCallback(async (personId: string) => {
    try {
      // Fetch saved_posts and manually join for simplicity if complex post joining fails
      // We will query saved_posts and then fetch the related posts.
      const { data: saves } = await supabase
        .from('saved_posts')
        .select('post_id')
        .eq('person_id', personId)
        .order('created_at', { ascending: false })

      if (!saves || saves.length === 0) {
        setSavedPosts([])
        setLoading(false)
        return
      }

      const postIds = saves.map(s => s.post_id)
      
      const { data: posts } = await supabase
        .from('posts')
        .select(`
          *,
          person:persons(id, name, user_id),
          reactions(id, emoji, person_id),
          comments(count),
          quoted_post:posts!quoted_post_id(
            id, content, media_urls, media_types,
            person:persons(id, name)
          )
        `)
        .in('id', postIds)
        .order('created_at', { ascending: false })

      // Map back is_saved = true
      const postsWithSavedFlag = (posts || []).map(p => ({
        ...p,
        is_saved: true
      }))

      setSavedPosts(postsWithSavedFlag as Post[])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.replace("/login")

      const { data: pers } = await supabase.from('persons').select('*').eq('user_id', user.id).single()
      if (!pers) return router.replace("/profile")
      
      setPerson(pers)
      fetchSavedPosts(pers.id)
    }
    init()
  }, [router, fetchSavedPosts, supabase])

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
      const res = await fetch(`/api/posts/${postId}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personId: person.id })
      })
      if (res.ok) {
         // Optimistically remove from list if unsaved
         setSavedPosts(prev => prev.filter(p => p.id !== postId))
      }
    } catch (e) { console.error(e) }
  }

  // Disable reposting from this view for simplicity
  const handleRepost = () => {}

  return (
    <main className="min-h-screen bg-wasika-cream pb-20">
      <div className="bg-wasika-dark px-5 pt-6 pb-4 sticky top-0 z-30 shadow-sm" style={{ background: "linear-gradient(135deg, #2b1f1a 0%, #3d2b24 100%)" }}>
        <Link href="/profile" className="inline-flex items-center gap-1.5 text-wasika-text-muted hover:text-wasika-gold transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Kembali</span>
        </Link>
        <h1 className="font-serif text-2xl text-wasika-gold">Post Tersimpan</h1>
      </div>

      <div className="mt-2" style={{ minHeight: '60vh' }}>
        {loading ? (
           <div className="flex justify-center py-10">
             <Loader2 className="w-8 h-8 text-wasika-gold animate-spin" />
           </div>
        ) : savedPosts.length === 0 ? (
          <div className="py-20 px-6 text-center">
             <div className="w-16 h-16 bg-wasika-gold/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-wasika-gold/30">
               <Bookmark className="w-8 h-8 text-wasika-gold/60" />
             </div>
             <p className="text-wasika-brown-dark font-medium text-sm">Belum ada post tersimpan.</p>
             <p className="text-wasika-text-muted text-xs mt-1">Tap ikon 🔖 di post manapun untuk menyimpannya.</p>
          </div>
        ) : (
          savedPosts.map(post => (
            <PostCard 
              key={post.id} 
              post={post} 
              currentPersonId={person?.id || ''} 
              onReact={handleReact}
              onComment={setActiveCommentPost}
              onRepost={handleRepost}
              onSave={handleSave}
            />
          ))
        )}
      </div>

      {activeCommentPost && (
        <CommentSheet
          post={activeCommentPost}
          currentPersonId={person?.id || ''}
          currentPersonName={person?.name || ''}
          onClose={() => setActiveCommentPost(null)}
        />
      )}
    </main>
  )
}
