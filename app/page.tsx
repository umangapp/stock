'use client'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { PackagePlus, PackageMinus, LayoutDashboard, LogOut } from 'lucide-react'

export default function MainMenuPage() {
  const router = useRouter()

  const handleLogout = async () => {
    if(confirm("ยืนยันการออกจากระบบ?")) { 
      await supabase.auth.signOut()
      router.push('/login')
    }
  }

  return (
    <div className="min-h-screen bg-[#141b2d] flex flex-col items-center justify-center p-6 text-white font-sans">
      <div className="w-full max-w-md space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-6">
          <div>
            <h1 className="text-4xl font-black italic text-blue-400 uppercase tracking-tighter">UMANG WMS</h1>
            <p className="text-xs font-bold text-slate-400 mt-1 tracking-wider">ยินดีต้อนรับ, TUM</p>
          </div>
          <button onClick={handleLogout} className="p-4 bg-white/5 hover:bg-white/10 rounded-full transition-all border border-white/5">
            <LogOut className="text-rose-400" size={24} />
          </button>
        </div>

        {/* Menu Buttons */}
        <div className="space-y-5">
          {/* 🌟 ส่ง ?mode=receive ไปที่หน้าสแกน */}
          <button 
            onClick={() => router.push('/scan?mode=receive')}
            className="w-full bg-[#112324] border border-emerald-500/20 hover:bg-[#162f2f] p-10 rounded-[3rem] flex flex-col items-center justify-center gap-4 transition-all"
          >
            <div className="bg-emerald-500/20 p-5 rounded-full"><PackagePlus className="text-emerald-400" size={40} /></div>
            <div className="text-center">
              <h2 className="text-2xl font-black text-emerald-400 tracking-tight italic">นำเข้า (RECEIVE)</h2>
              <p className="text-xs font-bold text-slate-400 mt-2 tracking-widest">สแกนรับสินค้าเข้าสต๊อก</p>
            </div>
          </button>

          {/* 🌟 ส่ง ?mode=issue ไปที่หน้าสแกน */}
          <button 
            onClick={() => router.push('/scan?mode=issue')}
            className="w-full bg-[#2a161e] border border-rose-500/20 hover:bg-[#381c27] p-10 rounded-[3rem] flex flex-col items-center justify-center gap-4 transition-all"
          >
            <div className="bg-rose-500/20 p-5 rounded-full"><PackageMinus className="text-rose-400" size={40} /></div>
            <div className="text-center">
              <h2 className="text-2xl font-black text-rose-400 tracking-tight italic">เบิกจ่าย (ISSUE)</h2>
              <p className="text-xs font-bold text-slate-400 mt-2 tracking-widest">สแกนจ่ายสินค้าออกจากสต๊อก</p>
            </div>
          </button>

          <button 
            onClick={() => router.push('/dashboard')}
            className="w-full bg-blue-600 hover:bg-blue-500 p-6 rounded-[2rem] flex items-center justify-center gap-3 transition-all mt-8 shadow-xl shadow-blue-900/20"
          >
            <LayoutDashboard className="text-white" size={24} />
            <h2 className="text-xl font-black text-white tracking-tight italic">ระบบผู้ดูแล (ADMIN)</h2>
          </button>
        </div>

      </div>
    </div>
  )
}
