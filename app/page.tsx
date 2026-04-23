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
  const [displayName, setDisplayName] = useState('Loading...') // ชื่อที่จะโชว์
  const [userProfile, setUserProfile] = useState<any>(null)
  const [personalLogs, setPersonalLogs] = useState<any[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [loading, setLoading] = useState(true)
  const [scanInput, setScanInput] = useState('')

  const fetchUserData = useCallback(async () => {
    // 1. ดึงข้อมูล User จากระบบ Login
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      return
    }

    // 2. พยายามดึงชื่อจาก 2 ทาง (ตาราง profiles หรือ user_metadata)
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    
    // ถ้าในตาราง profiles มีชื่อ ให้ใช้ชื่อนั้น
    if (profile && profile.full_name) {
      setDisplayName(profile.full_name)
      setUserProfile(profile)
    } 
    // ถ้าไม่มี ให้ดึงจาก metadata ตอนที่สมัครสมาชิก (เผื่อตาราง profile มีปัญหา)
    else if (user.user_metadata && user.user_metadata.full_name) {
      setDisplayName(user.user_metadata.full_name)
    }
    // ถ้าไม่มีจริงๆ ให้ใช้อีเมลก่อนหน้า @
    else {
      setDisplayName(user.email?.split('@')[0] || 'Unknown User')
    }

    // 3. ดึงประวัติสแกน
    const currentName = profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0]
    const { data: logs } = await supabase
      .from('transactions')
      .select('*, products(name, unit, sku_15_digits)')
      .eq('created_by', currentName)
      .order('created_at', { ascending: false })
      .limit(10)
    
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

  if (loading) return (
    <div className="h-screen bg-[#0a0f18] flex items-center justify-center">
      <div className="text-blue-500 font-black animate-pulse uppercase tracking-widest">System Loading...</div>
    </div>
  )

  return (
    <div className="flex flex-col h-[100dvh] bg-[#0a0f18] text-white font-sans overflow-hidden">
      
      {/* --- TOP HEADER: ปรับให้ชื่อโชว์เด่นที่สุด --- */}
      <header className="px-6 py-4 flex justify-between items-center bg-[#111827] border-b border-white/10 z-[110] shadow-2xl">
        <div className="flex items-center gap-3">
          <Camera size={20} className="text-blue-500" />
          <h1 className="text-[10px] font-black uppercase tracking-[0.3em] italic text-blue-100/50">Stock System</h1>
        </div>

        {/* ส่วนที่พี่ตั้มหาไม่เจอ: ชื่อ Fullname มุมขวาบน */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-3 bg-blue-600/10 hover:bg-blue-600/20 p-1.5 pr-4 rounded-full border border-blue-500/30 transition-all active:scale-95"
          >
            <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center font-black text-xs italic text-white shadow-lg">
              {displayName.substring(0, 2).toUpperCase()}
            </div>
            <div className="text-right">
              <p className="text-[14px] font-black uppercase tracking-widest text-white leading-none">
                {displayName}
              </p>
              <p className="text-[8px] font-bold text-blue-400 uppercase mt-1 tracking-tighter">Connected Account</p>
            </div>
            {showHistory ? <ChevronUp size={16} className="text-blue-500" /> : <ChevronDown size={16} className="text-white/50" />}
          </button>
        </div>
      </header>

      <div className="flex-1 relative flex flex-col">
        
        {/* --- DRILL-DOWN HISTORY: กางประวัติจากชื่อ --- */}
        {showHistory && (
          <div className="absolute inset-0 bg-[#0a0f18]/98 backdrop-blur-3xl z-[100] p-6 overflow-y-auto animate-in fade-in slide-in-from-top duration-300">
             <div className="max-w-md mx-auto space-y-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-6">
                   <h3 className="text-2xl font-black italic uppercase tracking-tighter text-blue-500">My Activity Logs</h3>
                   <button onClick={() => setShowHistory(false)} className="bg-white/10 p-2 rounded-full"><X size={20}/></button>
                </div>
                
                <div className="space-y-4">
                  {personalLogs.length === 0 ? (
                    <div className="py-20 text-center opacity-20 font-black uppercase tracking-widest italic">No scan records</div>
                  ) : (
                    personalLogs.map((log) => (
                      <div key={log.id} className="bg-white rounded-[2rem] p-6 flex flex-col gap-4 text-slate-900 border-l-8 border-blue-600 shadow-xl">
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
                        <div className="flex justify-between items-center text-slate-400 font-black text-[10px] uppercase italic">
                          <span>{new Date(log.created_at).toLocaleDateString('th-TH')}</span>
                          <span className="flex items-center gap-1 bg-slate-900 text-white px-3 py-1 rounded-full">
                            <Clock size={10} className="text-blue-500" />
                            {new Date(log.created_at).toLocaleTimeString('th-TH')}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
             </div>
          </div>
        )}

        {/* --- SCAN AREA --- */}
        <main className="flex-1 flex flex-col items-center justify-center p-8 gap-12">
          <div className="relative group">
            <div className="absolute -inset-20 bg-blue-500/10 blur-[120px] rounded-full"></div>
            <div className="relative w-64 h-64 border-2 border-dashed border-white/20 rounded-[5rem] flex flex-col items-center justify-center gap-6 bg-white/5 backdrop-blur-sm shadow-inner">
               <QrCode size={64} className="text-blue-500 animate-pulse" />
               <button className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-4 rounded-[1.8rem] font-black text-lg uppercase italic tracking-tighter transition-all active:scale-95 shadow-2xl shadow-blue-900/50">
                  สแกนสินค้า
               </button>
            </div>
          </div>

          {/* ช่องกรอก Manual */}
          <div className="w-full max-w-sm relative">
            <input 
              type="text" 
              placeholder="กรอกรหัส 15 หลัก..." 
              className="w-full bg-[#111827] border border-white/10 p-6 rounded-[2.5rem] outline-none focus:border-blue-500 text-white font-black text-center tracking-widest text-xl shadow-2xl"
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
            />
          </div>
        </main>
      </div>

      {/* --- FOOTER --- */}
      <footer className="p-6 flex justify-between items-center bg-black/40 border-t border-white/5">
          <button onClick={() => router.push('/dashboard')} className="text-[10px] font-black uppercase text-blue-400/50 hover:text-blue-400 transition-colors">
             Back to Admin
          </button>
          <button onClick={handleLogout} className="text-[10px] font-black uppercase text-red-500/50 hover:text-red-500 transition-colors">
             Sign Out System
          </button>
      </footer>
    </div>
  )
}

// ไอคอน X สำหรับปิด Drill-down
function X({size}: {size: number}) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
}
