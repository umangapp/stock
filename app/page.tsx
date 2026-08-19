'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { PackagePlus, PackageMinus, LayoutDashboard, LogOut } from 'lucide-react'

export default function MainMenu() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }
      const { data: userProfile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      setProfile(userProfile)
      setLoading(false)
    }
    checkSession()
  }, [router])

  const handleLogout = async () => {
    if(confirm("ยืนยันการออกจากระบบ?")) {
      await supabase.auth.signOut()
      router.push('/login')
    }
  }

  if (loading) return <div className="h-screen bg-slate-900 flex items-center justify-center text-blue-500 font-black italic">VERIFYING...</div>

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col font-sans text-slate-100">
      
      {/* ส่วนหัว (Header) */}
      <header className="p-6 flex justify-between items-center border-b border-white/10 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div>
          <h1 className="text-3xl font-black italic uppercase text-blue-400 tracking-tighter leading-none">UMANG WMS</h1>
          <p className="text-xs font-bold text-slate-400 uppercase mt-1 tracking-widest">ยินดีต้อนรับ, {profile?.full_name || 'Staff'}</p>
        </div>
        <button onClick={handleLogout} className="p-4 bg-red-500/10 text-red-400 rounded-full active:scale-90 transition-all hover:bg-red-500/20">
          <LogOut size={24} />
        </button>
      </header>

      {/* เมนูหลัก (Main Content) */}
      <main className="flex-1 p-6 flex flex-col justify-center gap-6 max-w-md mx-auto w-full">
        
        <button onClick={() => router.push('/scan?mode=receive')} className="w-full bg-emerald-500/10 border border-emerald-500/20 p-8 rounded-[3rem] flex flex-col items-center justify-center gap-4 active:scale-95 transition-all group hover:bg-emerald-500/20">
          <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
            <PackagePlus size={40} />
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-black uppercase italic text-emerald-400">นำเข้า (RECEIVE)</h2>
            <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-widest">สแกนรับสินค้าเข้าสต๊อก</p>
          </div>
        </button>

        <button onClick={() => router.push('/scan?mode=issue')} className="w-full bg-rose-500/10 border border-rose-500/20 p-8 rounded-[3rem] flex flex-col items-center justify-center gap-4 active:scale-95 transition-all group hover:bg-rose-500/20">
          <div className="w-20 h-20 bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
            <PackageMinus size={40} />
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-black uppercase italic text-rose-400">เบิกจ่าย (ISSUE)</h2>
            <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-widest">สแกนจ่ายสินค้าออกจากสต๊อก</p>
          </div>
        </button>

        {/* ปุ่มนี้จะโชว์เฉพาะแอดมินเท่านั้น */}
        {profile?.role === 'admin' && (
          <button onClick={() => router.push('/dashboard')} className="w-full mt-4 bg-blue-600 text-white p-6 rounded-3xl flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-blue-900/20 hover:bg-blue-500">
            <LayoutDashboard size={24} />
            <span className="text-lg font-black uppercase italic">ระบบผู้ดูแล (Admin)</span>
          </button>
        )}

      </main>
    </div>
  )
}
