import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  const supabase = createClient(supabaseUrl, serviceRoleKey)
  const { data: banis } = await supabase.from('banis').select('*')
  const { data: persons } = await supabase.from('persons').select('*')
  const { data: profiles } = await supabase.from('profiles').select('*')
  
  return NextResponse.json({ 
    banis, 
    persons, 
    profiles 
  })
}
