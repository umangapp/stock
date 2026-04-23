import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()

  // 1. ถ้ายังไม่ Login ให้ไปหน้า Login (ยกเว้นกำลังอยู่ที่หน้า login)
  if (!session && !req.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // 2. ถ้า Login แล้ว และจะเข้าหน้า Dashboard ให้เช็ก Role
  if (session && req.nextUrl.pathname.startsWith('/dashboard')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    // ถ้าหา Role ไม่เจอ หรือไม่ใช่ admin ให้ไปหน้าสแกน
    if (!profile || profile.role !== 'admin') {
      return NextResponse.redirect(new URL('/scan', req.url))
    }
  }

  return res
}

export const config = {
  matcher: ['/scan/:path*', '/dashboard/:path*'],
}
