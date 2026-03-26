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
    const { name, parentBaniId } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Nama keluarga wajib diisi.' }, { status: 400 })
    }

    // Generate unique code
    const baniCode = Math.random().toString(36).substring(2, 10).toUpperCase()

    // Calculate level and parent
    let parentId = null
    let baniLevel = 0
    let rootBaniId = null
    
    if (parentBaniId) {
      parentId = parentBaniId
      try {
        const { data: pData } = await supabaseAdmin.from('banis').select('bani_level').eq('id', parentId).single()
        if (pData) {
          baniLevel = (pData.bani_level || 0) + 1
        }
        
        const { data: ancestors } = await supabaseAdmin.rpc('get_bani_ancestors', { p_bani_id: parentId })
        if (ancestors && Array.isArray(ancestors) && ancestors.length > 0) {
          rootBaniId = ancestors[ancestors.length - 1]
        } else {
          rootBaniId = parentId // Parent is the root
        }
      } catch (e) {
        // Fallback for missing SQL migrations
      }
    }

    const insertData: any = {
      name: name.trim(),
      bani_code: baniCode,
      status: 'pending',
      owner_id: user.id
    }
    
    if (parentId) {
      insertData.parent_bani_id = parentId
      insertData.bani_level = baniLevel
    }

    // Use admin client to bypass RLS
    const { data: newBani, error: baniError } = await supabaseAdmin
      .from('banis')
      .insert(insertData)
      .select()
      .single()

    if (baniError) {
      return NextResponse.json({ error: baniError.message }, { status: 500 })
    }

    if (!rootBaniId) rootBaniId = newBani.id

    // Link user profile to bani and set role to panitia
    const updateProfileData: any = { bani_id: newBani.id, role: 'panitia' }
    try {
      updateProfileData.root_bani_id = rootBaniId
    } catch (e) {}

    await supabaseAdmin
      .from('profiles')
      .update(updateProfileData)
      .eq('id', user.id)

    // Ensure they get membership in this new Bani
    try {
      await supabaseAdmin.from('bani_memberships').insert({
        user_id: user.id,
        bani_id: newBani.id,
        membership_type: 'pengelola'
      })
    } catch (e) {}

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
