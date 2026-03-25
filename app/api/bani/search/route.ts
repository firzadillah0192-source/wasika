import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] })
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    // Use service role key to bypass RLS for public search
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const { data, error } = await supabase
      .from('banis')
      .select('id, name, bani_code, location')
      .or(`name.ilike.%${query}%,bani_code.ilike.%${query}%`)
      .limit(5)

    if (error) throw error

    return NextResponse.json({ results: data || [] })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: 'Failed to search banis' }, { status: 500 })
  }
}
