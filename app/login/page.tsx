'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { LogIn, Lock, Mail } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault()
  setLoading(true)

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    
    if (error) {
      alert("Error: " + error.message)
    } else if (data.user) {
      // เช็ก Role ทันทีหลังล็อกอิน
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
    alert("เกิดข้อผิดพลาด")
  } finally {
    setLoading(false)
  }
}

  return (
    <div className="flex flex-col h-[100dvh] items-center justify-center bg-gray-950 p-6">
      <div className="w-full max-w-sm space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="text-center">
          <div className="inline-block p-4 bg-blue-600 rounded-[2rem] shadow-xl shadow-blue-900/40 mb-4">
            <LogIn size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter">UMANGBKK Stock Management</h1>
          <p className="text-gray-500 text-xs mt-2 uppercase font-bold tracking-widest">Login to Access System</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input 
                type="email" 
                placeholder="Email Address" 
                className="w-full bg-white/5 border border-white/10 p-4 pl-12 rounded-2xl outline-none focus:border-blue-500 text-white transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input 
                type="password" 
                placeholder="Password" 
                className="w-full bg-white/5 border border-white/10 p-4 pl-12 rounded-2xl outline-none focus:border-blue-500 text-white transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-black shadow-lg shadow-blue-900/20 active:scale-95 transition-all"
          >
            {loading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>
      </div>
    </div>
  )
}
