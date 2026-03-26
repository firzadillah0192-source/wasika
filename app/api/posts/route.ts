import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const cursor = searchParams.get('cursor')
  const limit = parseInt(searchParams.get('limit') || '20', 10)

  const supabase = await createClient()

  let query = supabase
    .from('posts')
    .select(`
      *,
      person:persons(id, name, user_id),
      bani:banis(id, name, parent_bani_id),
      reactions(id, emoji, person_id),
      comments(count),
      quoted_post:posts!quoted_post_id(
        id, content, media_urls, media_types,
        person:persons(id, name)
      )
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (cursor) {
    query = query.lt('created_at', cursor)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const body = await request.json()
  const { baniId, personId, content, mediaUrls, mediaTypes, postType, quotedPostId } = body

  if (!baniId || !personId) return NextResponse.json({ error: 'baniId and personId required' }, { status: 400 })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('posts')
    .insert({
      bani_id: baniId,
      person_id: personId,
      content: content || null,
      media_urls: mediaUrls || [],
      media_types: mediaTypes || [],
      post_type: postType || 'post',
      quoted_post_id: quotedPostId || null,
    })
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
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
