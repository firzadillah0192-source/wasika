import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  // Public routes — no auth needed
  const publicRoutes = ['/', '/login', '/api/auth']
  const isPublic = publicRoutes.some(r => pathname === r || pathname.startsWith(r))

  if (!user && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // If user is logged in, check for bani_id
  if (user) {
    const { data: profile } = await supabase
      .from('profiles').select('bani_id, role').eq('id', user.id).single()

    // Redirect to /join if no bani_id, unless already on /join or /api/auth
    if (!profile?.bani_id && !pathname.startsWith('/join') && !pathname.startsWith('/api/auth') && !isPublic) {
      return NextResponse.redirect(new URL('/join', request.url))
    }

    // Role-based protection
    if (pathname.startsWith('/superadmin')) {
      if (profile?.role !== 'superadmin') {
        return NextResponse.redirect(new URL('/tree', request.url))
      }
    }

    if (pathname.startsWith('/panitia')) {
      if (profile?.role !== 'panitia' && profile?.role !== 'superadmin') {
        return NextResponse.redirect(new URL('/tree', request.url))
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
