import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing!')
    return NextResponse.json({ error: 'Server misconfigured (missing key).' }, { status: 500 })
  }
  try {
    const body = await request.json()
    const { email, password, nama, role, baniCode, baniName } = body

    // 1. Validations
    if (!email || !password || !nama || !role) {
      return NextResponse.json({ error: 'Semua field wajib diisi.' }, { status: 400 })
    }

    let targetBaniId: string | null = null

    // 2. Role-specific logic
    if (role === 'anggota') {
      if (!baniCode) {
        return NextResponse.json({ error: 'Kode Bani wajib diisi untuk anggota.' }, { status: 400 })
      }
      // Check if bani exists
      const { data: baniData, error: baniError } = await supabaseAdmin
        .from('banis')
        .select('id')
        .eq('bani_code', baniCode.trim().toUpperCase())
        .eq('status', 'active')
        .single()

      if (baniError || !baniData) {
        return NextResponse.json({ error: 'Kode Bani tidak valid atau keluarga belum aktif.' }, { status: 400 })
      }
      targetBaniId = baniData.id
    } else if (role === 'panitia') {
      if (!baniName) {
        return NextResponse.json({ error: 'Nama keluarga wajib diisi untuk panitia.' }, { status: 400 })
      }
    }

    // 3. Create User via Auth Admin (auto-confirm email)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: nama,
        role: role,
        // We set bani_id in profile separately to avoid complications
      },
    })

    if (authError) {
      // Check for existing user
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    const userId = authData.user.id

    // 4. If Panitia, Create Bani
    if (role === 'panitia') {
      const generatedCode = Math.random().toString(36).substring(2, 10).toUpperCase()
      const { data: newBani, error: baniCreateError } = await supabaseAdmin
        .from('banis')
        .insert({
          name: baniName,
          bani_code: generatedCode,
          status: 'active',
          owner_id: userId,
        })
        .select()
        .single()

      if (baniCreateError) {
        return NextResponse.json({ 
          error: `Akun dibuat, tapi gagal membuat keluarga: ${baniCreateError.message}` 
        }, { status: 500 })
      }
      targetBaniId = newBani.id
    }

    // 5. Update Profile (Bani linkage)
    // We use upsert to be extra safe in case the trigger was delayed
    if (targetBaniId) {
      await supabaseAdmin
        .from('profiles')
        .upsert({ 
          id: userId,
          bani_id: targetBaniId,
          role: role,
          email: email,
          full_name: nama
        }, { onConflict: 'id' })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Pendaftaran berhasil! Silakan login.',
      userId: userId
    })

  } catch (err: any) {
    console.error('Register error:', err)
    return NextResponse.json({ error: 'Terjadi kesalahan server.' }, { status: 500 })
  }
}
