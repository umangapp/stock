'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { 
  QrCode, LogOut, Clock, ChevronDown, ChevronUp, 
  LayoutDashboard, Camera, Search, History, Calendar, X
} from 'lucide-react'

export default function ScanPage() {
  const router = useRouter()
  const [personalLogs, setPersonalLogs] = useState<any[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [loading, setLoading] = useState(true)
  const [scanInput, setScanInput] = useState('')

  // ฟังก์ชันดึงข้อมูลพนักงานและประวัติ
  const fetchUserData = useCallback(async () => {
    // ดึง session ปัจจุบัน
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }

    // 1. ดึงชื่อจาก Profile เพื่อนำไป Query หาประวัติ
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', session.user.id)
      .single()
    
    // กำหนดชื่อคนสแกน (ใช้จาก Profile หรือ Metadata หรือ Email)
    const currentName = profile?.full_name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0];

    // 2. ดึงประวัติสแกนของคนนี้ทั้งหมด
    const { data: logs } = await supabase
      .from('transactions')
      .select('*, products(name, unit, sku_15_digits)')
      .eq('created_by', currentName)
      .order('created_at', { ascending: false })
    
    if (logs) setPersonalLogs(logs)
    setLoading(false)
  }, [router])

  useEffect(() => {
    fetchUserData()
    // ตั้งเวลา Refresh ข้อมูลทุก 5 นาที (ไม่ต้อง Logout)
    const interval = setInterval(fetchUserData, 300000);
    return () => clearInterval(interval);
  }, [fetchUserData])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // --- จัดกลุ่มข้อมูลตามวัน ---
  const groupedByDate = personalLogs.reduce((acc: any, log: any) => {
    const date = new Date(log.created_at).toLocaleDateString('th-TH', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(log);
    return acc;
  }, {});

  if (loading) return (
    <div className="h-screen bg-[#0a0f18] flex items-center justify-center">
      <div className="text-blue-500 font-black animate-pulse uppercase tracking-[0.3em]">Loading System...</div>
    </div>
  )

  return (
    <div className="flex flex-col h-[100dvh] bg-[#0a0f18] text-white font-sans overflow-hidden">
      
      {/* --- TOP HEADER: ปุ่ม "ประวัติรายการ" สีฟ้าสว่าง --- */}
      <header className="px-6 py-5 flex justify-between items-center bg-[#1e293b] border-b border-blue-500/20 z-[110] shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg"><Camera size={18} className="text-white" /></div>
          <h1 className="text-[12px] font-black uppercase tracking-[0.2em] italic text-blue-400">Scan Center</h1>
        </div>

        {/* ปุ่มประวัติรายการ (เพิ่มสีสว่างและเงาเพื่อให้เห็นชัด) */}
        <button 
          onClick={() => setShowHistory(true)}
          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white px-6 py-3 rounded-full transition-all active:scale-95 shadow-[0_0_20px_rgba(59,130,246,0.5)] border border-blue-300"
        >
          <History size={20} />
          <span className="text-sm font-black uppercase tracking-widest">ประวัติรายการ</span>
        </button>
      </header>

      <div className="flex-1 relative flex flex-col">
        
        {/* --- DRILL-DOWN HISTORY: ทับเต็มจอเมื่อกดปุ่ม --- */}
        {showHistory && (
          <div className="absolute inset-0 bg-[#0a0f18] z-[120] p-6 overflow-y-auto animate-in fade-in zoom-in duration-300">
             <div className="max-w-md mx-auto space-y-8">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                   <div className="flex items-center gap-3 text-blue-500">
                      <History size={28} />
                      <h3 className="text-2xl font-black italic uppercase tracking-tighter">My History</h3>
                   </div>
                   <button 
                     onClick={() => setShowHistory(false)} 
                     className="bg-white/10 p-3 rounded-full text-white hover:bg-red-500/20 transition-all"
                   >
                     <X size={28}/>
                   </button>
                </div>
                
                {Object.keys(groupedByDate).length === 0 ? (
                  <div className="py-20 text-center opacity-20 font-black uppercase tracking-widest italic text-sm">ไม่พบประวัติการบันทึก</div>
                ) : (
                  Object.entries(groupedByDate).map(([date, logs]: [string, any]) => (
                    <div key={date} className="space-y-4">
                      <div className="flex items-center gap-2 text-blue-400 bg-blue-500/10 p-3 rounded-xl border border-blue-500/20">
                        <Calendar size={18} />
                        <span className="text-sm font-black uppercase tracking-widest">{date}</span>
                      </div>

                      <div className="space-y-3 pl-2 border-l-2 border-blue-500/20">
                        {logs.map((log: any) => (
                          <div key={log.id} className="bg-white rounded-[2rem] p-6 flex flex-col gap-4 text-slate-900 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-2 h-full bg-blue-500"></div>
                            <div className="flex justify-between items-start">
                              <p className="text-xl font-black uppercase leading-none">{log.products?.name}</p>
                              <span className={`text-3xl font-black ${log.type === 'receive' ? 'text-green-600' : 'text-red-600'}`}>
                                {log.type === 'receive' ? '+' : '-'} {log.amount}
                              </span>
                            </div>

                            <div className="bg-slate-100 p-4 rounded-2xl">
                              <p className="text-2xl font-mono font-black text-blue-700 tracking-widest uppercase">
                                {log.products?.sku_15_digits}
                              </p>
                            </div>

                            <div className="flex justify-end items-center text-slate-400 font-black text-xs uppercase italic">
                              <span className="flex items-center gap-1 bg-[#0a0f18] text-white px-4 py-1.5 rounded-full text-[12px] tracking-widest">
                                <Clock size={14} className="text-blue-500" />
                                {new Date(log.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
             </div>
          </div>
        )}

        {/* --- MAIN SCAN AREA --- */}
        <main className="flex-1 flex flex-col items-center justify-center p-8 gap-12">
          <div className="relative group">
            <div className="absolute -inset-20 bg-blue-500/10 blur-[120px] rounded-full animate-pulse"></div>
            <div className="relative w-72 h-72 border-2 border-dashed border-white/20 rounded-[5rem] flex flex-col items-center justify-center gap-6 bg-white/5 backdrop-blur-sm border-blue-500/30">
               <QrCode size={80} className="text-blue-500" />
               <button className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-5 rounded-[2rem] font-black text-xl uppercase italic tracking-tighter shadow-[0_10px_40px_rgba(37,99,235,0.4)] transition-all active:scale-95">
                  สแกนสินค้า
               </button>
            </div>
          </div>

          <div className="w-full max-w-sm relative">
            <input 
              type="text" 
              placeholder="กรอกรหัส 15 หลัก..." 
              className="w-full bg-[#111827] border border-white/10 p-7 rounded-[2.5rem] outline-none focus:border-blue-500 text-white font-black text-center tracking-[0.2em] text-2xl shadow-2xl"
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
            />
          </div>
        </main>
      </div>

      {/* --- FOOTER --- */}
      <footer className="p-6 flex justify-between items-center bg-[#111827] border-t border-white/5 shrink-0">
          <button onClick={() => router.push('/dashboard')} className="text-[10px] font-black uppercase text-blue-400 hover:text-white transition-colors tracking-widest">
             Admin Dashboard
          </button>
          <button onClick={handleLogout} className="text-[10px] font-black uppercase text-red-500 hover:text-white transition-colors tracking-widest">
             Sign Out
          </button>
      </footer>
    </div>
  )
}
