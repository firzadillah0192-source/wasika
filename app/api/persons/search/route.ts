import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')
  const baniId = searchParams.get('baniId')

  if (!q || !baniId) {
    return NextResponse.json([])
  }

  const supabase = await createClient()
  const { data, error } = await (supabase
    .from('persons')
    .select('id, name, gender, birth_date, photo_url')
    .eq('bani_id', baniId)
    .ilike('name', `%${q}%`)
    .limit(10) as any) // suppress TS error for ilike if needed

  if (error) {
    console.error('Search error:', error)
    return NextResponse.json([])
  }

  return NextResponse.json(data)
}
