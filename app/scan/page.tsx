'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { QrCode, ScanLine, Zap, Search, Clock, User, X } from 'lucide-react'
import SingleScanner from './SingleScanner'
import BatchScanner from './BatchScanner'

export default function ScanPage() {
  const router = useRouter()
  const [view, setView] = useState<'menu' | 'single' | 'batch'>('menu')
  const [scanMode, setScanMode] = useState<'receive' | 'issue'>('receive')
  const [activeUser, setActiveName] = useState('')
  const [appVersion, setAppVersion] = useState('1.1.2')
  const [scanDelay, setScanDelay] = useState(1000)
  const [personalLogs, setPersonalLogs] = useState<any[]>([])
  const [showHistory, setShowHistory] = useState(false)

  const fetchData = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return; }
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', session.user.id).single()
    setActiveName(profile?.full_name || session.user.email?.split('@')[0])
    
    const { data: logs } = await supabase.from('transactions').select('*, products(*)').eq('created_by', profile?.full_name || session.user.email?.split('@')[0]).order('created_at', { ascending: false }).limit(20)
    setPersonalLogs(logs || [])

    const { data: conf } = await supabase.from('settings_app_config').select('*').single()
    if (conf) { setAppVersion(conf.version); setScanDelay(conf.scan_delay || 1000); }
  }

  useEffect(() => { fetchData() }, [])

  if (view === 'single') return <SingleScanner scanMode={scanMode} activeUser={activeUser} onRefresh={fetchData} onClose={() => setView('menu')} />
  if (view === 'batch') return <BatchScanner scanMode={scanMode} activeUser={activeUser} scanDelay={scanDelay} onRefresh={fetchData} onClose={() => setView('menu')} />

  return (
    <div className="flex flex-col h-[100dvh] bg-[#0a0f18] text-white overflow-hidden font-sans">
      <header className="px-6 py-5 flex justify-between items-center bg-[#1e293b] border-b border-white/5">
        <div><h1 className="text-xs font-black uppercase italic text-blue-400">Scan Center</h1><p className="text-[8px] font-black text-slate-500 uppercase">Ver {appVersion}</p></div>
        <button onClick={() => setShowHistory(true)} className="bg-blue-600 px-5 py-2.5 rounded-full text-[11px] font-black uppercase">ประวัติ</button>
      </header>

      <main className="flex-1 p-6 flex flex-col gap-8 justify-center max-w-sm mx-auto w-full animate-in fade-in">
        <div className="grid grid-cols-2 gap-4">
           <button onClick={() => { setScanMode('receive'); setView('single'); }} className="aspect-square bg-slate-800 rounded-[2rem] flex flex-col items-center justify-center gap-3 border-b-4 border-slate-950"><ScanLine size={40} className="text-green-400"/><span className="text-[11px] font-black uppercase text-center">นำเข้า<br/>(ทีละชิ้น)</span></button>
           <button onClick={() => { setScanMode('receive'); setView('batch'); }} className="aspect-square bg-green-600 rounded-[2rem] flex flex-col items-center justify-center gap-3 border-b-4 border-green-800 shadow-xl shadow-green-900/20"><Zap size={40} className="text-white animate-pulse"/><span className="text-[11px] font-black uppercase text-center text-white">นำเข้า<br/>(ต่อเนื่อง)</span></button>
           <button onClick={() => { setScanMode('issue'); setView('single'); }} className="aspect-square bg-slate-800 rounded-[2rem] flex flex-col items-center justify-center gap-3 border-b-4 border-slate-950"><ScanLine size={40} className="text-red-400"/><span className="text-[11px] font-black uppercase text-center">นำออก<br/>(ทีละชิ้น)</span></button>
           <button onClick={() => { setScanMode('issue'); setView('batch'); }} className="aspect-square bg-red-600 rounded-[2rem] flex flex-col items-center justify-center gap-3 border-b-4 border-red-800 shadow-xl shadow-red-900/20"><Zap size={40} className="text-white animate-pulse"/><span className="text-[11px] font-black uppercase text-center text-white">นำออก<br/>(ต่อเนื่อง)</span></button>
        </div>
      </main>
      
      {/* 🌟 หน้า History Overlay (ย่อ) 🌟 */}
      {showHistory && (
          <div className="absolute inset-0 bg-[#0a0f18] z-[120] p-6 overflow-y-auto">
              <div className="flex justify-between items-center mb-8"><h3 className="text-2xl font-black uppercase text-blue-500 italic">History</h3><button onClick={() => setShowHistory(false)}><X/></button></div>
              {personalLogs.map(log => (
                  <div key={log.id} className="bg-white rounded-[1.5rem] p-5 mb-4 text-slate-900 border-l-8 border-blue-500 shadow-lg">
                      <div className="flex justify-between"><div><p className="font-black text-sm uppercase">{log.products?.name}</p><p className="text-[10px] font-bold text-slate-400 italic">เดิม: {log.old_stock} → {log.new_stock}</p></div><span className={`text-xl font-black ${log.type === 'receive' ? 'text-green-600' : 'text-red-600'}`}>{log.type === 'receive' ? '+' : '-'}{log.amount}</span></div>
                  </div>
              ))}
          </div>
      )}
    </div>
  )
}
