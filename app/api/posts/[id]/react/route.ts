import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  const { id } = await params
  const body = await request.json()
  const { personId, emoji } = body

  if (!id || !personId || !emoji) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  }

  const supabase = await createClient()

  // Find existing reaction
  const { data: existingRecords } = await supabase
    .from('reactions')
    .select('id, emoji')
    .eq('post_id', id)
    .eq('person_id', personId)

  if (existingRecords && existingRecords.length > 0) {
    const existing = existingRecords[0]
    
    // Wipe all previous reactions for this post by this user (cleans up any dirt logic)
    await supabase.from('reactions').delete().eq('post_id', id).eq('person_id', personId)
    
    // Re-insert only if user was actually changing their emoji
    if (!(existingRecords.length === 1 && existing.emoji === emoji)) {
      const { error } = await supabase.from('reactions').insert({ post_id: id, person_id: personId, emoji })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }
  } else {
    // Insert new reaction
    const { error } = await supabase.from('reactions').insert({
      post_id: id,
      person_id: personId,
      emoji: emoji
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Fetch updated reactions
  const { data: reactions, error } = await supabase
    .from('reactions')
    .select('id, emoji, person_id')
    .eq('post_id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ reactions })
}
