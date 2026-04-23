'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { 
  QrCode, LogOut, Package, Clock, ChevronDown, ChevronUp, 
  User as UserIcon, LayoutDashboard, History, CheckCircle2, Camera, Search
} from 'lucide-react'

export default function ScanPage() {
  const router = useRouter()
  const [userProfile, setUserProfile] = useState<any>(null)
  const [personalLogs, setPersonalLogs] = useState<any[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [loading, setLoading] = useState(true)
  const [scanInput, setScanInput] = useState('')

  // 1. ดึงข้อมูล User และ Profile
  const fetchUserData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    
    if (profile) {
      setUserProfile(profile)
      // ดึงประวัติการสแกนส่วนตัวของคนนี้
      const { data: logs } = await supabase
        .from('transactions')
        .select('*, products(name, unit, sku_15_digits)')
        .eq('created_by', profile.full_name)
        .order('created_at', { ascending: false })
        .limit(20)
      
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

  // คำนวณชื่อย่อ (TO จาก TONE)
  const getInitials = (name: string) => {
    if (!name) return '??';
    return name.substring(0, 2).toUpperCase();
  }

  if (loading) return (
    <div className="h-screen bg-[#0a0f18] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  )

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0f18] text-white font-sans overflow-hidden">
      
      {/* --- TOP HEADER: เหมือนรูป image_e14061 --- */}
      <header className="p-6 flex justify-between items-center bg-[#0a0f18] border-b border-white/5 z-50">
        <div className="flex items-center gap-3">
          <Camera size={20} className="text-blue-500" />
          <h1 className="text-sm font-black uppercase tracking-[0.2em] italic">Stock System</h1>
        </div>

        {/* ชื่อ Fullname มุมขวาบน (กดแล้วกางประวัติ) */}
        <button 
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-3 bg-white/5 hover:bg-white/10 p-2 pr-4 rounded-full border border-white/10 transition-all active:scale-95"
        >
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center font-black text-xs italic">
            {getInitials(userProfile?.full_name)}
          </div>
          <span className="text-xs font-black uppercase tracking-widest">{userProfile?.full_name}</span>
          {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </header>

      {/* --- DRILL-DOWN HISTORY: เหมือนรูป image_e135b2 --- */}
      {showHistory && (
        <div className="absolute top-[80px] left-0 right-0 bottom-0 bg-[#0a0f18]/95 backdrop-blur-md z-[100] p-6 overflow-y-auto animate-in slide-in-from-top duration-300">
           <div className="max-w-md mx-auto space-y-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">My Recent Scans</p>
                <button onClick={() => setShowHistory(false)} className="text-xs font-bold text-blue-500 underline">Close</button>
              </div>
              
              {personalLogs.length === 0 ? (
                <p className="text-center py-20 text-slate-700 font-black uppercase text-xs italic tracking-widest">No Data Found</p>
              ) : (
                personalLogs.map((log) => (
                  <div key={log.id} className="bg-white rounded-[2rem] p-6 shadow-2xl flex flex-col gap-4 text-slate-900 border border-slate-200">
                    <div className="flex justify-between items-start">
                      <p className="text-xl font-black uppercase leading-none">{log.products?.name}</p>
                      <span className={`text-2xl font-black ${log.type === 'receive' ? 'text-green-600' : 'text-red-600'}`}>
                        {log.type === 'receive' ? '-' : '-'} {log.amount} 
                        <span className="text-[10px] opacity-40 ml-1 italic">{log.products?.unit}</span>
                      </span>
                    </div>
                    
                    {/* SKU ตัวใหญ่ หนา อยู่ในกล่อง (เหมือนรูป e135b2) */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <p className="text-2xl font-mono font-black text-blue-700 tracking-widest uppercase">
                        {log.products?.sku_15_digits}
                      </p>
                    </div>

                    <div className="flex justify-between items-center text-slate-400 font-black text-xs uppercase tracking-tighter">
                      <div className="flex items-center gap-1">
                         <span>{new Date(log.created_at).toLocaleDateString('th-TH')}</span>
                      </div>
                      <div className="flex items-center gap-1 bg-slate-900 text-white px-3 py-1 rounded-full">
                        <Clock size={12} className="text-blue-500" />
                        <span>{new Date(log.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
           </div>
        </div>
      )}

      {/* --- MAIN SCAN CONTENT --- */}
      <main className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-lg aspect-square rounded-[4rem] bg-white/5 border border-white/10 flex flex-col items-center justify-center gap-6 relative shadow-[0_0_100px_-20px_rgba(59,130,246,0.3)]">
           <div className="absolute inset-0 border-2 border-blue-500/20 rounded-[4rem] animate-pulse"></div>
           <button className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-5 rounded-3xl font-black text-xl uppercase italic tracking-tighter shadow-xl shadow-blue-900/50 transition-all active:scale-95">
              เปิดกล้องสแกน
           </button>
        </div>
      </main>

      {/* --- BOTTOM SEARCH BAR: เหมือนรูป image_e14061 --- */}
      <div className="p-6 pt-0">
        <div className="max-w-2xl mx-auto relative group">
          <input 
            type="text" 
            placeholder="พิมพ์รหัส 15 หลัก..." 
            className="w-full bg-[#111827] border border-white/10 p-5 pl-8 pr-16 rounded-[2rem] outline-none focus:border-blue-500 text-white font-bold transition-all placeholder:text-slate-700 shadow-2xl"
            value={scanInput}
            onChange={(e) => setScanInput(e.target.value)}
          />
          <button className="absolute right-4 top-1/2 -translate-y-1/2 bg-blue-600 p-3 rounded-2xl text-white shadow-lg hover:bg-blue-500 transition-all">
             <Search size={20} />
          </button>
        </div>
      </div>

      {/* FOOTER NAV */}
      <div className="px-8 py-4 flex justify-between items-center opacity-30 hover:opacity-100 transition-opacity">
          {userProfile?.role === 'admin' && (
            <button onClick={() => router.push('/dashboard')} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
              <LayoutDashboard size={14}/> Go to Dashboard
            </button>
          )}
          <button onClick={handleLogout} className="text-[10px] font-black uppercase tracking-widest text-red-500">
             Log Out
          </button>
      </div>

    </div>
  )
}
