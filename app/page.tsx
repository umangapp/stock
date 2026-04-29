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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    // 1. ดึงชื่อจาก Profile เพื่อนำไป Query หาประวัติ
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()
    
    const currentName = profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0];

    // 2. ดึงประวัติสแกนของคนนี้ทั้งหมด (ไม่จำกัดแค่ 10 รายการ)
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
  }, [fetchUserData])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // --- ฟังก์ชันจัดกลุ่มข้อมูลตามวัน ---
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
      
      {/* --- TOP HEADER: เปลี่ยนเป็นปุ่ม "ประวัติรายการ" --- */}
      <header className="px-6 py-5 flex justify-between items-center bg-[#111827] border-b border-white/10 z-[110] shadow-2xl">
        <div className="flex items-center gap-3">
          <Camera size={20} className="text-blue-500" />
          <h1 className="text-[10px] font-black uppercase tracking-[0.3em] italic text-blue-100/50">Stock Scan</h1>
        </div>

        {/* ปุ่มประวัติรายการ (Fix ข้อความตามสั่ง) */}
        <button 
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-5 py-2.5 rounded-full transition-all active:scale-95 shadow-lg shadow-blue-900/40"
        >
          <History size={18} />
          <span className="text-sm font-black uppercase tracking-widest">ประวัติรายการ</span>
          {showHistory ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </header>

      <div className="flex-1 relative flex flex-col">
        
        {/* --- DRILL-DOWN HISTORY: แยกตามวัน -> รายการที่บันทึก --- */}
        {showHistory && (
          <div className="absolute inset-0 bg-[#0a0f18]/98 backdrop-blur-3xl z-[100] p-6 overflow-y-auto animate-in fade-in slide-in-from-top duration-300">
             <div className="max-w-md mx-auto space-y-8">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                   <h3 className="text-2xl font-black italic uppercase tracking-tighter text-blue-500">My History</h3>
                   <button onClick={() => setShowHistory(false)} className="text-slate-500 hover:text-white"><X size={28}/></button>
                </div>
                
                {/* วนลูปตามกลุ่มวันที่ */}
                {Object.keys(groupedByDate).length === 0 ? (
                  <div className="py-20 text-center opacity-20 font-black uppercase tracking-widest italic text-sm">ไม่พบประวัติการบันทึก</div>
                ) : (
                  Object.entries(groupedByDate).map(([date, logs]: [string, any]) => (
                    <div key={date} className="space-y-4">
                      {/* หัวข้อวันที่ */}
                      <div className="flex items-center gap-2 text-blue-400">
                        <Calendar size={16} />
                        <span className="text-sm font-black uppercase tracking-widest">{date}</span>
                      </div>

                      {/* รายการในวันนั้น */}
                      <div className="space-y-3 pl-2 border-l-2 border-white/5">
                        {logs.map((log: any) => (
                          <div key={log.id} className="bg-white rounded-[2rem] p-6 flex flex-col gap-4 text-slate-900 shadow-xl">
                            <div className="flex justify-between items-start">
                              <p className="text-xl font-black uppercase leading-none">{log.products?.name}</p>
                              <span className={`text-3xl font-black ${log.type === 'receive' ? 'text-green-600' : 'text-red-600'}`}>
                                {log.type === 'receive' ? '+' : '-'} {log.amount}
                              </span>
                            </div>

                            {/* SKU ตัวใหญ่หนา ชัดเจน */}
                            <div className="bg-slate-100 p-4 rounded-2xl border border-slate-200">
                              <p className="text-2xl font-mono font-black text-blue-700 tracking-widest uppercase">
                                {log.products?.sku_15_digits}
                              </p>
                            </div>

                            <div className="flex justify-end items-center text-slate-400 font-black text-xs uppercase italic">
                              <span className="flex items-center gap-1 bg-slate-900 text-white px-4 py-1.5 rounded-full text-[12px] tracking-widest">
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

        {/* --- SCAN AREA --- */}
        <main className="flex-1 flex flex-col items-center justify-center p-8 gap-12">
          <div className="relative group">
            <div className="absolute -inset-20 bg-blue-500/10 blur-[120px] rounded-full"></div>
            <div className="relative w-64 h-64 border-2 border-dashed border-white/20 rounded-[5rem] flex flex-col items-center justify-center gap-6 bg-white/5 backdrop-blur-sm">
               <QrCode size={64} className="text-blue-500" />
               <button className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-4 rounded-[1.8rem] font-black text-lg uppercase italic tracking-tighter shadow-2xl shadow-blue-900/50">
                  สแกนสินค้า
               </button>
            </div>
          </div>

          <div className="w-full max-w-sm relative">
            <input 
              type="text" 
              placeholder="กรอกรหัส 15 หลัก..." 
              className="w-full bg-[#111827] border border-white/10 p-6 rounded-[2.5rem] outline-none focus:border-blue-500 text-white font-black text-center tracking-widest text-xl"
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
            />
          </div>
        </main>
      </div>

      {/* --- FOOTER --- */}
      <footer className="p-6 flex justify-between items-center bg-black/40 border-t border-white/5">
          <button onClick={() => router.push('/dashboard')} className="text-[10px] font-black uppercase text-blue-400/50 hover:text-blue-400 transition-colors">
             Go to Admin Dashboard
          </button>
          <button onClick={handleLogout} className="text-[10px] font-black uppercase text-red-500/50 hover:text-red-500 transition-colors">
             Sign Out
          </button>
      </footer>
    </div>
  )
}
