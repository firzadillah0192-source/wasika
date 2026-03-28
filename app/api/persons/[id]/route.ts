import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const personId = params.id
    
    // Auth client
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Admin client to bypass RLS for deletion
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get the target person to find their bani_id
    const { data: targetPerson, error: personErr } = await supabaseAdmin
      .from('persons')
      .select('bani_id, created_by, user_id')
      .eq('id', personId)
      .single()

    if (personErr || !targetPerson) {
      return NextResponse.json({ error: 'Person not found' }, { status: 404 })
    }

    // Check permissions: either created by user, OR user is pengelola/panitia/superadmin
    let hasPermission = false
    if (targetPerson.created_by === user.id || targetPerson.user_id === user.id) {
      hasPermission = true
    } else {
      // Check roles/memberships
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role === 'panitia' || profile?.role === 'superadmin') {
        hasPermission = true
      } else {
        // Check memberships
        const { data: memberships } = await supabaseAdmin
          .from('bani_memberships')
          .select('membership_type')
          .eq('user_id', user.id)
          .eq('bani_id', targetPerson.bani_id)
        
        if (memberships && memberships.some(m => m.membership_type === 'pengelola')) {
          hasPermission = true
        }
      }
    }

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Perform deletion
    const { error: deleteErr } = await supabaseAdmin
      .from('persons')
      .delete()
      .eq('id', personId)

    if (deleteErr) {
      console.error("Delete Error:", deleteErr)
      return NextResponse.json({ error: 'Failed to delete person' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error("API Route Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
