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
    const updateData: any = { bani_id: baniData.id, role: 'anggota' }
    
    // Attempt to resolve root_bani_id if the hierarchy function exists
    try {
      const { data: ancestors } = await supabaseAdmin.rpc('get_bani_ancestors', { p_bani_id: baniData.id })
      let rootBaniId = baniData.id
      if (ancestors && Array.isArray(ancestors) && ancestors.length > 0) {
        rootBaniId = ancestors[ancestors.length - 1]
      }
      updateData.root_bani_id = rootBaniId
    } catch (e) {
      // Graceful fallback if SQL migration hasn't run yet
    }

    await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)

    // Attempt to insert primary membership (trigger will handle inherited)
    try {
      await supabaseAdmin.from('bani_memberships').insert({
        user_id: user.id,
        bani_id: baniData.id,
        membership_type: 'primary'
      })
    } catch (e) {
      // Graceful fallback if SQL migration hasn't run yet
    }

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
