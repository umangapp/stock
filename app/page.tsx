'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { 
  QrCode, LogOut, Package, Clock, ChevronDown, ChevronUp, 
  User as UserIcon, LayoutDashboard, History, CheckCircle2 
} from 'lucide-react'

export default function ScanPage() {
  const router = useRouter()
  const [userProfile, setUserProfile] = useState<any>(null)
  const [personalLogs, setPersonalLogs] = useState<any[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [loading, setLoading] = useState(true)

  // --- ส่วนของ Scan Logic (พี่นำไปผูกกับเครื่องสแกนของพี่ได้เลย) ---
  const [scanResult, setScanResult] = useState('')

  const fetchUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    // 1. ดึงข้อมูล Profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    
    if (profile) {
      setUserProfile(profile)
      
      // 2. ดึงประวัติการสแกนเฉพาะของคนนี้
      const { data: logs } = await supabase
        .from('transactions')
        .select('*, products(name, unit, sku_15_digits)')
        .eq('created_by', profile.full_name) // กรองเฉพาะของตัวเอง
        .order('created_at', { ascending: false })
        .limit(20)
      
      if (logs) setPersonalLogs(logs)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchUserData()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return (
    <div className="h-screen bg-slate-950 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  )

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-white font-sans">
      
      {/* --- HEADER: USER PROFILE & TOGGLE (ตามรูป image_e135b2) --- */}
      <div className="p-4 bg-slate-900 shadow-2xl border-b border-white/5">
        <div 
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center justify-between bg-slate-800/50 p-4 rounded-[1.8rem] border border-white/10 cursor-pointer active:scale-95 transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center font-black text-xl italic shadow-lg shadow-blue-900/40">
              {userProfile?.full_name?.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-xl font-black uppercase tracking-tight leading-none">{userProfile?.full_name}</p>
              <p className="text-[10px] font-bold text-blue-400 uppercase mt-1 tracking-widest italic">
                {userProfile?.role} | Online
              </p>
            </div>
          </div>
          {showHistory ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
        </div>

        {/* --- PERSONAL ACTIVITY DRILL-DOWN --- */}
        {showHistory && (
          <div className="mt-4 space-y-3 animate-in slide-in-from-top duration-300 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {personalLogs.length === 0 ? (
              <p className="text-center py-10 text-slate-500 font-bold uppercase text-xs italic">ยังไม่มีประวัติการสแกนวันนี้</p>
            ) : (
              personalLogs.map((log) => (
                <div key={log.id} className="bg-white rounded-[1.5rem] p-5 shadow-sm flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <p className="text-xl font-black text-slate-900 uppercase leading-none">{log.products?.name}</p>
                    <span className={`text-2xl font-black ${log.type === 'receive' ? 'text-green-600' : 'text-red-600'}`}>
                      {log.type === 'receive' ? '+' : '-'} {log.amount}
                    </span>
                  </div>
                  
                  {/* SKU ตัวใหญ่ในกล่องฟ้าอ่อน */}
                  <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                    <p className="text-xl font-mono font-black text-blue-700 tracking-wider uppercase">
                      {log.products?.sku_15_digits}
                    </p>
                  </div>

                  <div className="flex justify-between items-center text-slate-500 font-black text-sm uppercase">
                    <span>{new Date(log.created_at).toLocaleDateString('th-TH')}</span>
                    <div className="flex items-center gap-1">
                      <Clock size={14} className="text-blue-500" />
                      {new Date(log.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* --- MAIN SCAN AREA --- */}
      <main className="flex-1 flex flex-col items-center justify-center p-8 gap-8">
        <div className="relative">
          <div className="absolute -inset-4 bg-blue-600/20 blur-3xl rounded-full"></div>
          <div className="relative w-48 h-48 border-4 border-dashed border-blue-500/50 rounded-[3rem] flex items-center justify-center animate-pulse">
            <QrCode size={80} className="text-blue-500" />
          </div>
        </div>

        <div className="text-center space-y-2">
          <h2 className="text-2xl font-black uppercase italic tracking-tighter">Ready to Scan</h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.2em]">วางบาร์โค้ดในพื้นที่เพื่อเริ่มการทำงาน</p>
        </div>

        {/* ปุ่มจำลองการสแกน หรือใช้ Input สำหรับเครื่องสแกนบาร์โค้ด */}
        <input 
          autoFocus 
          className="bg-transparent border-b-2 border-blue-500 outline-none text-center text-2xl font-black w-full max-w-xs tracking-widest text-blue-400 placeholder:text-slate-800"
          placeholder="WAITING..."
          value={scanResult}
          onChange={(e) => setScanResult(e.target.value)}
        />
      </main>

      {/* --- FOOTER NAVIGATION --- */}
      <div className="p-6 grid grid-cols-2 gap-4 bg-slate-900 border-t border-white/5">
        {userProfile?.role === 'admin' && (
          <button 
            onClick={() => router.push('/dashboard')}
            className="flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 text-white py-4 rounded-2xl font-black uppercase text-[10px] transition-all"
          >
            <LayoutDashboard size={18} /> Admin Panel
          </button>
        )}
        <button 
          onClick={handleLogout}
          className="flex items-center justify-center gap-3 bg-red-600/10 hover:bg-red-600/20 text-red-500 py-4 rounded-2xl font-black uppercase text-[10px] transition-all col-span-1"
        >
          <LogOut size={18} /> Sign Out
        </button>
      </div>
    </div>
  )
}
