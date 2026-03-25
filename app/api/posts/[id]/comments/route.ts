import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  const { id } = await params
  if (!id) return NextResponse.json({ error: 'Missing post ID' }, { status: 400 })

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('comments')
    .select(`
      *,
      person:persons(id, name, user_id)
    `)
    .eq('post_id', id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  const { id } = await params
  const body = await request.json()
  const { personId, content } = body

  if (!id || !personId || !content) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('comments')
    .insert({
      post_id: id,
      person_id: personId,
      content: content
    })
    .select(`
      *,
      person:persons(id, name, user_id)
    `)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
