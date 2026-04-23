import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()

  // 1. ถ้าไม่ได้ล็อคอิน ให้เด้งไปหน้า Login เสมอ
  if (!session && !req.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // 2. ตรวจสอบสิทธิ์ (RBAC)
  if (session) {
    // ดึงข้อมูล Role จากตาราง profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    // ถ้าไม่ใช่ admin แต่พยายามเข้าหน้า Dashboard
    if (profile?.role !== 'admin' && req.nextUrl.pathname.startsWith('/dashboard')) {
      return NextResponse.redirect(new URL('/scan', req.url)) // ไล่ให้ไปหน้าสแกนแทน
    }
  }

  return res
}

export const config = {
  matcher: ['/scan/:path*', '/dashboard/:path*', '/admin/:path*'],
}
