'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { QrCode, ScanLine, Zap, Search, Clock, User, X, Info } from 'lucide-react'
import SingleScanner from './SingleScanner'
import BatchScanner from './BatchScanner'

// --- 🎨 ฟังก์ชันแยกสี SKU สำหรับหน้า History ---
const SKUColored = ({ sku, prefix }: { sku: string; prefix: string }) => {
  if (!sku) return null;
  const preLen = prefix?.length || 2;
  const paddingMatch = sku.match(/x+$/);
  const paddingLen = paddingMatch ? paddingMatch[0].length : 0;
  const p1 = sku.substring(0, preLen);
  const p4 = sku.substring(sku.length - paddingLen);
  const p3 = sku.substring(sku.length - paddingLen - 6, sku.length - paddingLen);
  const p2 = sku.substring(preLen, sku.length - paddingLen - 6);
  return (
    <span className="font-mono font-black tracking-widest uppercase italic leading-none text-[11px]">
      <span className="text-blue-600">{p1}</span><span className="text-green-600">{p2}</span><span className="text-orange-500">{p3}</span><span className="text-cyan-400">{p4}</span>
    </span>
  );
};

export default function ScanPage() {
  const router = useRouter()
  const [view, setView] = useState<'menu' | 'single' | 'batch'>('menu')
  const [scanMode, setScanMode] = useState<'receive' | 'issue'>('receive')
  const [activeUser, setActiveName] = useState('')
  const [appVersion, setAppVersion] = useState('1.1.2')
  const [scanDelay, setScanDelay] = useState(1000)
  const [personalLogs, setPersonalLogs] = useState<any[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [scanInput, setScanInput] = useState('')

  const fetchData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return; }
    
    // ดึงชื่อโปรไฟล์
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', session.user.id).single()
    const userName = profile?.full_name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0]
    setActiveName(userName)
    
    // ดึงประวัติรายการสแกนส่วนตัว (ดึงรายละเอียดสินค้ามาด้วย)
    const { data: logs } = await supabase.from('transactions')
      .select('*, products(*)')
      .eq('created_by', userName)
      .order('created_at', { ascending: false })
      .limit(30)
    
    setPersonalLogs(logs || [])

    // ดึง App Config
    const { data: conf } = await supabase.from('settings_app_config').select('*').single()
    if (conf) { setAppVersion(conf.version); setScanDelay(conf.scan_delay || 1000); }
  }, [router])

  useEffect(() => { fetchData() }, [fetchData])

  if (view === 'single') return <SingleScanner scanMode={scanMode} activeUser={activeUser} onRefresh={fetchData} onClose={() => setView('menu')} />
  if (view === 'batch') return <BatchScanner scanMode={scanMode} activeUser={activeUser} scanDelay={scanDelay} onRefresh={fetchData} onClose={() => setView('menu')} />

  return (
    <div className="flex flex-col h-[100dvh] bg-[#0a0f18] text-white overflow-hidden font-sans">
      <header className="px-6 py-5 flex justify-between items-center bg-[#1e293b] border-b border-white/5 z-50">
        <div>
          <h1 className="text-xs font-black uppercase italic text-blue-400 leading-none">Scan Center</h1>
          <p className="text-[8px] font-black text-slate-500 uppercase mt-1">Version {appVersion}</p>
        </div>
        <button 
          onClick={() => { fetchData(); setShowHistory(true); }} 
          className="bg-blue-600 px-5 py-2.5 rounded-full text-[11px] font-black uppercase shadow-lg active:scale-95 transition-all"
        >
          ประวัติรายการ
        </button>
      </header>

      <main className="flex-1 p-6 flex flex-col gap-8 justify-center max-w-sm mx-auto w-full animate-in fade-in">
        <div className="grid grid-cols-2 gap-4">
           <button onClick={() => { setScanMode('receive'); setView('single'); }} className="aspect-square bg-slate-800 rounded-[2rem] flex flex-col items-center justify-center gap-3 border-b-4 border-slate-950 active:scale-95 transition-all shadow-xl">
              <ScanLine size={40} className="text-green-400"/><span className="text-[11px] font-black uppercase text-center leading-tight">นำเข้า<br/>(ทีละชิ้น)</span>
           </button>
           <button onClick={() => { setScanMode('receive'); setView('batch'); }} className="aspect-square bg-green-600 rounded-[2rem] flex flex-col items-center justify-center gap-3 border-b-4 border-green-800 shadow-xl active:scale-95 transition-all">
              <Zap size={40} className="text-white animate-pulse"/><span className="text-[11px] font-black uppercase text-center text-white leading-tight">นำเข้า<br/>(ต่อเนื่อง)</span>
           </button>
           <button onClick={() => { setScanMode('issue'); setView('single'); }} className="aspect-square bg-slate-800 rounded-[2rem] flex flex-col items-center justify-center gap-3 border-b-4 border-slate-950 active:scale-95 transition-all shadow-xl">
              <ScanLine size={40} className="text-red-400"/><span className="text-[11px] font-black uppercase text-center leading-tight">นำออก<br/>(ทีละชิ้น)</span>
           </button>
           <button onClick={() => { setScanMode('issue'); setView('batch'); }} className="aspect-square bg-red-600 rounded-[2rem] flex flex-col items-center justify-center gap-3 border-b-4 border-red-800 shadow-xl active:scale-95 transition-all">
              <Zap size={40} className="text-white animate-pulse"/><span className="text-[11px] font-black uppercase text-center text-white leading-tight">นำออก<br/>(ต่อเนื่อง)</span>
           </button>
        </div>
        
        <div className="relative">
          <input 
            type="text" 
            placeholder="พิมพ์รหัส 15 หลัก..." 
            className="w-full bg-slate-900 border border-white/10 p-5 rounded-2xl outline-none text-center font-black uppercase text-sm shadow-inner" 
            value={scanInput} 
            onChange={(e) => setScanInput(e.target.value)} 
          />
          <button className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 p-2"><Search size={24}/></button>
        </div>
      </main>
      
      {/* 🌟 🌟 หน้า History Overlay (แบบเต็มยศ) 🌟 🌟 */}
      {showHistory && (
          <div className="absolute inset-0 bg-[#0a0f18] z-[120] flex flex-col animate-in slide-in-from-right duration-300">
              <header className="px-6 py-6 flex justify-between items-center bg-[#1e293b] border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <Clock className="text-blue-500" size={20}/>
                    <h3 className="text-2xl font-black uppercase text-white italic tracking-tighter">History</h3>
                  </div>
                  
                  {/* 🌟 แสดงชื่อ User Login ที่มุมขวาบน 🌟 */}
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1.5 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
                      <User size={12} className="text-blue-400"/>
                      <span className="text-[10px] font-black text-blue-100 uppercase tracking-tight">{activeUser}</span>
                    </div>
                  </div>
              </header>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-10">
                  {personalLogs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50">
                        <Info size={48} strokeWidth={1} className="mb-2"/>
                        <p className="font-black uppercase text-xs">ไม่พบประวัติรายการของคุณ</p>
                    </div>
                  ) : (
                    personalLogs.map(log => (
                      <div key={log.id} className="bg-white rounded-[1.8rem] p-5 text-slate-900 border-l-[10px] shadow-xl border-blue-500 animate-in fade-in slide-in-from-bottom-2">
                          <div className="flex justify-between items-start mb-3">
                              <div className="flex-1">
                                  <p className="font-black text-sm uppercase leading-none mb-1.5">{log.products?.name}</p>
                                  {/* 🌟 แสดง SKU แบบแยกสี 🌟 */}
                                  <SKUColored sku={log.products?.sku_15_digits} prefix={log.products?.prefix} />
                                  
                                  {/* 🌟 แสดง ขนาด และ Lot Date บรรทัดเดียวกัน 🌟 */}
                                  <div className="flex items-center gap-2 mt-2 text-[9px] font-bold text-slate-400 uppercase italic">
                                     <span>{log.products?.height}x{log.products?.width}x{log.products?.length} มม.</span>
                                     <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-slate-500">LOT: {log.products?.received_date}</span>
                                  </div>

                                  {/* 🌟 แสดงสต๊อกก่อน-หลัง 🌟 */}
                                  <p className="text-[10px] font-bold text-blue-600 mt-2 italic leading-none">
                                     STOCK: {log.old_stock} → {log.new_stock}
                                  </p>
                              </div>

                              <div className="text-right shrink-0">
                                  <span className={`text-2xl font-black leading-none ${log.type === 'receive' ? 'text-green-600' : 'text-red-600'}`}>
                                    {log.type === 'receive' ? '+' : '-'}{log.amount}
                                  </span>
                                  <p className="text-[9px] font-black uppercase text-slate-300 mt-1">{log.products?.unit}</p>
                              </div>
                          </div>
                          
                          <div className="pt-3 border-t border-slate-50 flex justify-between items-center text-[9px] font-black text-slate-300 uppercase italic">
                              <div className="flex items-center gap-1">
                                <Clock size={10}/>
                                {new Date(log.created_at).toLocaleTimeString('th-TH')} | {new Date(log.created_at).toLocaleDateString('th-TH')}
                              </div>
                              <span className={log.type === 'receive' ? 'text-green-400' : 'text-red-400'}>
                                {log.type === 'receive' ? 'INVENTORY IN' : 'INVENTORY OUT'}
                              </span>
                          </div>
                      </div>
                    ))
                  )}
              </div>

              <button 
                onClick={() => setShowHistory(false)} 
                className="m-6 bg-slate-800 py-5 rounded-3xl font-black uppercase text-xs tracking-[0.2em] border-b-4 border-slate-950 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <X size={16}/> Close History
              </button>
          </div>
      )}
    </div>
  )
}
