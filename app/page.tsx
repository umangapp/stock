'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { 
  QrCode, LogOut, Package, Clock, ChevronDown, ChevronUp, 
  User as UserIcon, LayoutDashboard, Camera, Search
} from 'lucide-react'

export default function ScanPage() {
  const router = useRouter()
  const [userProfile, setUserProfile] = useState<any>(null)
  const [personalLogs, setPersonalLogs] = useState<any[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [loading, setLoading] = useState(true)
  const [scanInput, setScanInput] = useState('')

  // 1. ดึงข้อมูล User และประวัติ (ปรับให้ดึงชัวร์ขึ้น)
  const fetchUserData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    // ดึง Profile จากตาราง profiles โดยใช้ id
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    
    if (profile) {
      setUserProfile(profile)
      // ดึงประวัติสแกนเฉพาะของตัวเอง
      const { data: logs } = await supabase
        .from('transactions')
        .select('*, products(name, unit, sku_15_digits)')
        .eq('created_by', profile.full_name)
        .order('created_at', { ascending: false })
        .limit(10)
      
      if (logs) setPersonalLogs(logs)
    }
    setLoading(false)
  }, [router])

  useEffect(() => {
    fetchUserData()
  }, [fetchUserData])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // ตัวย่อชื่อ (เช่น TONE -> TO)
  const getInitials = (name: string) => {
    if (!name) return '??'
    return name.substring(0, 2).toUpperCase()
  }

  if (loading) return (
    <div className="h-screen bg-[#0a0f18] flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-blue-500"></div>
    </div>
  )

  return (
    <div className="flex flex-col h-[100dvh] bg-[#0a0f18] text-white font-sans overflow-hidden">
      
      {/* --- 1. TOP HEADER: แสดงชื่อ Fullname มุมขวาบน (ปรับให้ชัดเจน) --- */}
      <header className="px-6 py-6 flex justify-between items-center bg-[#0a0f18] border-b border-white/5 shrink-0 z-[110]">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600/20 rounded-lg text-blue-500"><Camera size={18} /></div>
          <h1 className="text-xs font-black uppercase tracking-[0.3em] italic text-white">Stock System</h1>
        </div>

        {/* ปุ่มชื่อพนักงาน (กดแล้วกางประวัติลงมา) */}
        <button 
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-3 bg-white/5 hover:bg-white/10 p-2 pr-5 rounded-full border border-white/10 transition-all active:scale-95 shadow-xl"
        >
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center font-black text-sm italic shadow-lg shadow-blue-500/20">
            {getInitials(userProfile?.full_name)}
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">User Account</p>
            <p className="text-sm font-black uppercase tracking-widest text-white leading-none">
              {userProfile?.full_name || 'Anonymous'}
            </p>
          </div>
          {showHistory ? <ChevronUp size={18} className="text-blue-500" /> : <ChevronDown size={18} className="text-slate-500" />}
        </button>
      </header>

      <div className="flex-1 relative flex flex-col">
        
        {/* --- 2. DRILL-DOWN HISTORY (เลื่อนลงมาเมื่อกดที่ชื่อ) --- */}
        {showHistory && (
          <div className="absolute inset-0 bg-[#0a0f18]/95 backdrop-blur-2xl z-[100] p-6 overflow-y-auto animate-in fade-in slide-in-from-top duration-300">
             <div className="max-w-md mx-auto space-y-4">
                {/* แถบ Header ประวัติ (ตามรูป e135b2) */}
                <div className="flex items-center justify-between bg-slate-900 p-5 rounded-t-[2.5rem] border-x border-t border-white/10">
                   <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center font-black text-lg italic shadow-lg shadow-blue-500/30">
                         {getInitials(userProfile?.full_name)}
                      </div>
                      <span className="font-black uppercase tracking-tight text-2xl italic">{userProfile?.full_name}</span>
                   </div>
                   <button onClick={() => setShowHistory(false)} className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors"><ChevronUp size={24}/></button>
                </div>
                
                {/* รายการที่สแกนล่าสุด */}
                <div className="bg-slate-50 rounded-b-[2.5rem] p-4 space-y-4 shadow-2xl">
                  {personalLogs.length === 0 ? (
                    <p className="text-center py-24 text-slate-400 font-black uppercase text-[10px] tracking-widest italic">ยังไม่มีรายการวันนี้</p>
                  ) : (
                    personalLogs.map((log) => (
                      <div key={log.id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 flex flex-col gap-4 text-slate-900">
                        <div className="flex justify-between items-start">
                          <p className="text-xl font-black uppercase leading-none italic">{log.products?.name}</p>
                          <span className={`text-3xl font-black ${log.type === 'receive' ? 'text-green-600' : 'text-red-600'}`}>
                            {log.type === 'receive' ? '+' : '-'} {log.amount}
                          </span>
                        </div>
                        
                        {/* SKU ตัวใหญ่หนา ชัดเจน (เหมือนรูป e135b2) */}
                        <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                          <p className="text-2xl font-mono font-black text-blue-700 tracking-widest uppercase">
                            {log.products?.sku_15_digits}
                          </p>
                        </div>

                        <div className="flex justify-between items-center text-slate-400 font-black text-xs uppercase tracking-tighter italic">
                          <span>{new Date(log.created_at).toLocaleDateString('th-TH')}</span>
                          <span className="flex items-center gap-1 bg-slate-900 text-white px-3 py-1 rounded-full text-[10px]">
                            <Clock size={12} className="text-blue-500" />
                            {new Date(log.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
             </div>
          </div>
        )}

        {/* --- 3. MAIN SCAN AREA: (ตามรูป e14061) --- */}
        <main className="flex-1 flex flex-col items-center justify-center p-8 gap-12">
          <div className="relative group">
            <div className="absolute -inset-16 bg-blue-600/10 blur-[100px] rounded-full group-hover:bg-blue-600/20 transition-all duration-1000"></div>
            <div className="relative w-72 h-72 border-2 border-dashed border-white/10 rounded-[5rem] flex flex-col items-center justify-center gap-6 bg-white/5 backdrop-blur-sm shadow-2xl">
               <div className="w-24 h-24 bg-blue-600 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-blue-900/50 animate-bounce duration-3000">
                 <QrCode size={48} className="text-white" />
               </div>
               <button className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-5 rounded-[2rem] font-black text-xl uppercase italic tracking-tighter transition-all active:scale-95 shadow-xl shadow-blue-900/40">
                  เปิดกล้องสแกน
               </button>
            </div>
          </div>

          {/* ช่องกรอกรหัส Manual (ด้านล่าง) */}
          <div className="w-full max-w-md relative group">
            <input 
              type="text" 
              placeholder="พิมพ์รหัส 15 หลัก..." 
              className="w-full bg-[#111827] border border-white/10 p-7 pl-10 pr-24 rounded-[3rem] outline-none focus:border-blue-500 text-white font-black transition-all placeholder:text-slate-800 shadow-2xl text-xl tracking-widest"
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 bg-blue-600 p-5 rounded-full text-white shadow-lg hover:bg-blue-500 transition-all active:scale-90">
               <Search size={28} />
            </button>
          </div>
        </main>
      </div>

      {/* --- 4. FOOTER: สำหรับ Admin กลับหลังบ้าน --- */}
      <footer className="px-10 py-6 flex justify-between items-center bg-slate-900/30 border-t border-white/5">
          <div className="flex gap-6">
            {userProfile?.role === 'admin' && (
              <button onClick={() => router.push('/dashboard')} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 italic hover:text-white transition-colors">
                <LayoutDashboard size={14}/> Dashboard
              </button>
            )}
          </div>
          <button onClick={handleLogout} className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500/50 hover:text-red-500 transition-colors italic">
             Sign Out
          </button>
      </footer>
    </div>
  )
}
