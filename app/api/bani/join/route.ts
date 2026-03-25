import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing!')
    return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 })
  }
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Anda harus login terlebih dahulu.' }, { status: 401 })
    }

    const body = await request.json()
    const { baniCode } = body

    if (!baniCode || !baniCode.trim()) {
      return NextResponse.json({ error: 'Kode Bani wajib diisi.' }, { status: 400 })
    }

    // Find bani by code using admin client
    const { data: baniData, error: baniError } = await supabaseAdmin
      .from('banis')
      .select('id, name')
      .eq('bani_code', baniCode.trim().toUpperCase())
      .eq('status', 'active')
      .single()

    if (baniError || !baniData) {
      return NextResponse.json({ error: 'Kode Bani tidak valid atau keluarga belum aktif.' }, { status: 400 })
    }

    // Link user profile to bani (keep role as anggota)
    await supabaseAdmin
      .from('profiles')
      .update({ bani_id: baniData.id, role: 'anggota' })
      .eq('id', user.id)

    return NextResponse.json({
      success: true,
      baniId: baniData.id,
      baniName: baniData.name,
      message: `Berhasil bergabung ke ${baniData.name}!`,
    })

  } catch (err: any) {
    console.error('Join bani error:', err)
    return NextResponse.json({ error: 'Terjadi kesalahan server.' }, { status: 500 })
  }
}
