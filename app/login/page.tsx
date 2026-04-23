'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { LogIn, Lock, User } from 'lucide-react' // เปลี่ยน Mail เป็น User

export default function LoginPage() {
  const [fullName, setFullName] = useState('') // ใช้ชื่อ-นามสกุลแทน Email
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // 1. ค้นหา Email จาก Fullname ในตาราง profiles ก่อน
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .eq('full_name', fullName.trim()) // ตัดช่องว่างหน้า-หลังออก
        .single()

      if (profileError || !profileData) {
        alert("❌ ไม่พบชื่อผู้ใช้งานนี้ในระบบ")
        setLoading(false)
        return
      }

      // 2. เมื่อได้ Email มาแล้ว ก็นำไป Login ตามปกติ
      const { data, error: authError } = await supabase.auth.signInWithPassword({ 
        email: profileData.email, 
        password 
      })
      
      if (authError) {
        alert("❌ รหัสผ่านไม่ถูกต้อง")
      } else if (data.user) {
        // 3. เช็ก Role เพื่อส่งไปหน้างานที่ถูกต้อง
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single()

        if (profile?.role === 'admin') {
          window.location.href = '/dashboard' // Admin ไปหลังบ้าน
        } else {
          window.location.href = '/scan' // Staff ไปหน้าสแกน
        }
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[100dvh] items-center justify-center bg-gray-950 p-6 font-sans">
      <div className="w-full max-w-sm space-y-8 animate-in fade-in zoom-in duration-500">
        
        {/* Header */}
        <div className="text-center">
          <div className="inline-block p-4 bg-blue-600 rounded-[2rem] shadow-xl shadow-blue-900/40 mb-4">
            <LogIn size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter">UMANGBKK STOCK</h1>
          <p className="text-gray-500 text-[10px] mt-2 uppercase font-bold tracking-[0.2em]">Login with your Full Name</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            
            {/* ช่องกรอกชื่อ (Full Name) */}
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input 
                type="text" 
                placeholder="ชื่อ-นามสกุล ของคุณ" 
                className="w-full bg-white/5 border border-white/10 p-4 pl-12 rounded-2xl outline-none focus:border-blue-500 text-white transition-all font-bold placeholder:font-normal"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            {/* ช่องกรอกรหัสผ่าน */}
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input 
                type="password" 
                placeholder="Password" 
                className="w-full bg-white/5 border border-white/10 p-4 pl-12 rounded-2xl outline-none focus:border-blue-500 text-white transition-all font-bold placeholder:font-normal"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-black shadow-lg shadow-blue-900/20 active:scale-95 transition-all mt-4"
          >
            {loading ? 'กำลังตรวจสอบชื่อ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>

        <p className="text-center text-gray-600 text-[10px] font-bold uppercase tracking-widest">
          Authorized Personnel Only
        </p>
      </div>
    </div>
  )
}
