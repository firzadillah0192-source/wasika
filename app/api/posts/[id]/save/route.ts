import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  const { id } = await params
  const body = await request.json()
  const { personId } = body

  if (!id || !personId) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('saved_posts')
    .select('id')
    .eq('post_id', id)
    .eq('person_id', personId)
    .single()

  if (existing) {
    const { error } = await supabase.from('saved_posts').delete().eq('id', existing.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ saved: false })
  } else {
    const { error } = await supabase.from('saved_posts').insert({
      post_id: id,
      person_id: personId
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ saved: true })
  }
}
