'use client'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      // 1. เช็กว่ามีการ Logged in อยู่ไหม
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        // ถ้าไม่มี Session ให้ไปหน้า Login
        router.replace('/login')
        return
      }

      // 2. ถ้ามี Session ให้เช็ก Role ใน Profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (profile?.role === 'admin') {
        // เป็น Admin ส่งไปหลังบ้าน
        router.replace('/dashboard')
      } else {
        // เป็นพนักงานทั่วไป ส่งไปหน้าสแกน
        router.replace('/scan')
      }
    }

    checkUser()
  }, [router])

  // หน้าจอระหว่างรอเช็กสิทธิ์ (Loading)
  return (
    <div className="h-screen bg-[#0a0f18] flex flex-col items-center justify-center">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
        </div>
      </div>
      <p className="mt-6 text-blue-500 font-black uppercase tracking-[0.4em] text-[10px] animate-pulse">
        Checking System...
      </p>
    </div>
  )
}
