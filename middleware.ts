import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()

  // 1. ถ้ายังไม่ได้ล็อคอิน และไม่ใช่หน้า Login ให้ดีดไปหน้า Login
  if (!session && !req.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // 2. ตรวจสอบสิทธิ์เฉพาะเวลาจะเข้าหน้า Dashboard (หลังบ้าน)
  if (session && req.nextUrl.pathname.startsWith('/dashboard')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    // ถ้าไม่ใช่ admin ห้ามเข้าหน้าจัดการระบบ (ให้ไปหน้าสแกนแทน)
    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/scan', req.url))
    }
  }

  return res
}

export const config = {
  matcher: ['/scan/:path*', '/dashboard/:path*'],
}
