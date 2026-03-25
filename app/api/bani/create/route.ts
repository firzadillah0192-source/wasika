import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing!')
    return NextResponse.json({ error: 'Server misconfigured. Check environment variables.' }, { status: 500 })
  }
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Anda harus login terlebih dahulu.' }, { status: 401 })
    }

    const body = await request.json()
    const { name } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Nama keluarga wajib diisi.' }, { status: 400 })
    }

    // Generate unique code
    const baniCode = Math.random().toString(36).substring(2, 10).toUpperCase()

    // Use admin client to bypass RLS
    const { data: newBani, error: baniError } = await supabaseAdmin
      .from('banis')
      .insert({
        name: name.trim(),
        bani_code: baniCode,
        status: 'pending',
        owner_id: user.id,
      })
      .select()
      .single()

    if (baniError) {
      return NextResponse.json({ error: baniError.message }, { status: 500 })
    }

    // Link user profile to bani and set role to panitia
    await supabaseAdmin
      .from('profiles')
      .update({ bani_id: newBani.id, role: 'panitia' })
      .eq('id', user.id)

    return NextResponse.json({
      success: true,
      baniId: newBani.id,
      baniCode: baniCode,
      message: 'Keluarga berhasil dibuat!',
    })

  } catch (err: any) {
    console.error('Create bani error:', err)
    return NextResponse.json({ error: 'Terjadi kesalahan server.' }, { status: 500 })
  }
}
