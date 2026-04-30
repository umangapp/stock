'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { QrCode, LayoutDashboard, Package, ShieldCheck } from 'lucide-react'

export default function LandingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
      } else {
        setLoading(false)
      }
    }
    checkUser()
  }, [router])

  if (loading) return (
    <div className="h-screen bg-[#0a0f18] flex flex-col items-center justify-center text-blue-500 font-black italic uppercase tracking-tighter">
      <div className="animate-spin mb-4"><Package size={40}/></div>
      LOADING SYSTEM...
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0a0f18] text-white flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md space-y-8 text-center animate-in fade-in zoom-in duration-500">
        
        {/* LOGO SECTION */}
        <div className="space-y-3">
          <div className="bg-blue-600 w-24 h-24 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl shadow-blue-500/40 border-b-8 border-blue-800 active:scale-95 transition-all">
            <Package size={48} className="text-white" />
          </div>
          <div className="pt-2">
            <h1 className="text-5xl font-black italic uppercase tracking-tighter text-white leading-none">Umang</h1>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter text-blue-500 leading-none mt-1">Stock Pro</h1>
          </div>
          <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px] italic">Inventory Management System</p>
        </div>

        {/* NAVIGATION BUTTONS */}
        <div className="grid grid-cols-1 gap-4">
          
          {/* ปุ่มไปหน้า Scan */}
          <button
            onClick={() => router.push('/scan')}
            className="group bg-blue-600 hover:bg-blue-500 p-6 rounded-[2.5rem] flex items-center justify-between transition-all active:scale-95 shadow-xl border-b-8 border-blue-800"
          >
            <div className="flex items-center gap-5 text-left">
              <div className="bg-white/20 p-4 rounded-3xl group-hover:rotate-12 transition-transform">
                <QrCode size={32} />
              </div>
              <div>
                <p className="text-2xl font-black uppercase italic leading-none">Scan Center</p>
                <p className="text-[10px] font-black text-blue-200 mt-2 uppercase tracking-widest leading-none">สแกนรับ-จ่ายสินค้า</p>
              </div>
            </div>
          </button>

          {/* ปุ่มไปหน้า Dashboard */}
          <button
            onClick={() => router.push('/dashboard')}
            className="group bg-slate-800 hover:bg-slate-700 p-6 rounded-[2.5rem] flex items-center justify-between transition-all active:scale-95 border-b-8 border-slate-950"
          >
            <div className="flex items-center gap-5 text-left">
              <div className="bg-white/5 p-4 rounded-3xl group-hover:scale-110 transition-transform">
                <LayoutDashboard size={32} className="text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-black uppercase italic leading-none">Admin Panel</p>
                <p className="text-[10px] font-black text-slate-500 mt-2 uppercase tracking-widest leading-none">จัดการสต๊อกและข้อมูล</p>
              </div>
            </div>
          </button>

        </div>

        {/* FOOTER INFO */}
        <div className="pt-8 flex flex-col items-center gap-2">
           <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/5">
              <ShieldCheck size={14} className="text-green-500"/>
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-tighter">Secured by Supabase Cloud</span>
           </div>
           <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest italic">© 2026 Umang Stock System</p>
        </div>

      </div>
    </div>
  )
}
