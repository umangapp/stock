'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { Html5Qrcode } from 'html5-qrcode'
import { generateSKU } from '@/lib/skuHelper'
import { 
  QrCode, Clock, History, Calendar, X, Camera, Search, 
  ArrowDownCircle, ArrowUpCircle, Plus, Minus, FileText, AlertCircle, TrendingUp
} from 'lucide-react'

export default function ScanPage() {
  const router = useRouter()
  const [personalLogs, setPersonalLogs] = useState<any[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [loading, setLoading] = useState(true)
  const [scanInput, setScanInput] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [scanMode, setScanMode] = useState<'receive' | 'issue' | null>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [activeUser, setActiveName] = useState('')
  const [showActionModal, setShowActionModal] = useState(false)
  const [showSummaryModal, setShowSummaryModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [amount, setAmount] = useState(1)
  const [note, setNote] = useState('')

  const fetchUserData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return; }
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', session.user.id).single()
    const currentName = profile?.full_name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0];
    setActiveName(currentName)
    const { data: logs } = await supabase.from('transactions')
      .select('*, products(name, unit, sku_15_digits, width, height, length)')
      .eq('created_by', currentName)
      .order('created_at', { ascending: false })
    if (logs) setPersonalLogs(logs)
    setLoading(false)
  }, [router])

  useEffect(() => { fetchUserData() }, [fetchUserData])

  const startScanner = async (mode: 'receive' | 'issue') => {
    setScanMode(mode); setIsScanning(true);
    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode("reader")
        scannerRef.current = scanner
        await scanner.start({ facingMode: "environment" }, { fps: 15, qrbox: 250 }, (txt) => { handleLookupProduct(txt, mode); stopScanner(); }, () => {})
      } catch (err) { setIsScanning(false) }
    }, 300)
  }

  const stopScanner = async () => {
    if (scannerRef.current) { await scannerRef.current.stop().catch(() => {}); scannerRef.current = null; setIsScanning(false); }
  }

  const handleLookupProduct = async (sku: string, mode: 'receive' | 'issue') => {
    const { data: p } = await supabase.from('products').select('*').eq('sku_15_digits', sku).single()
    if (!p) { alert("ไม่พบสินค้า"); return; }
    setSelectedProduct(p); setScanMode(mode); setAmount(1); setNote(''); setShowActionModal(true);
  }

  const handleSaveTransaction = async () => {
    const oldStock = selectedProduct.current_stock
    const newStock = scanMode === 'receive' ? oldStock + amount : oldStock - amount
    
    // บันทึกทั้งยอดเก่าและใหม่ลง Transaction
    const { error: updateErr } = await supabase.from('products').update({ current_stock: newStock }).eq('id', selectedProduct.id)
    const { error: logErr } = await supabase.from('transactions').insert([{
      product_id: selectedProduct.id,
      type: scanMode,
      amount,
      old_stock: oldStock,
      new_stock: newStock,
      note,
      created_by: activeUser
    }])

    if (!updateErr && !logErr) {
      setShowSummaryModal(false); setShowActionModal(false);
      fetchUserData(); setScanInput('');
    }
  }

  const groupedByDate = personalLogs.reduce((acc: any, log: any) => {
    const date = new Date(log.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
    if (!acc[date]) acc[date] = []; acc[date].push(log); return acc;
  }, {});

  if (loading) return <div className="h-screen bg-[#0a0f18] flex items-center justify-center text-blue-500 font-black italic">LOADING...</div>

  return (
    <div className="flex flex-col h-[100dvh] bg-[#0a0f18] text-white overflow-hidden">
      <header className="px-6 py-5 flex justify-between items-center bg-[#1e293b] border-b border-white/5 z-[110]">
        <div className="flex items-center gap-3"><QrCode className="text-blue-500" /><h1 className="text-xs font-black uppercase italic text-blue-400">Scan Center</h1></div>
        <button onClick={() => setShowHistory(true)} className="bg-blue-600 px-5 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">ประวัติรายการ</button>
      </header>

      <div className="flex-1 relative flex flex-col">
        {/* HISTORY OVERLAY - ปรับเพิ่มการแสดงคำนวณเลข */}
        {showHistory && (
          <div className="absolute inset-0 bg-[#0a0f18] z-[120] p-6 overflow-y-auto animate-in slide-in-from-right duration-300">
             <div className="max-w-md mx-auto space-y-6 pb-20 text-slate-900">
                <div className="flex items-center justify-between mb-8"><h3 className="text-2xl font-black italic uppercase text-blue-500">My Activity</h3><button onClick={() => setShowHistory(false)} className="bg-white/10 p-2 rounded-full text-white"><X/></button></div>
                {Object.entries(groupedByDate).map(([date, logs]: [string, any]) => (
                  <div key={date} className="space-y-4">
                    <div className="text-[11px] font-black uppercase text-slate-500 tracking-widest border-l-2 border-blue-500 pl-3">{date}</div>
                    {logs.map((log: any) => (
                      <div key={log.id} className="bg-white rounded-[1.5rem] p-5 flex flex-col gap-2 shadow-xl">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-black text-lg leading-none">{log.products?.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 italic mt-1">{log.products?.width}x{log.products?.height}x{log.products?.length} มม.</p>
                          </div>
                          <span className={`font-black text-2xl ${log.type === 'receive' ? 'text-green-600' : 'text-red-600'}`}>
                            {log.type === 'receive' ? '+' : '-'} {log.amount}
                          </span>
                        </div>
                        {/* 🌟 แสดงการคำนวณสต๊อกในประวัติ */}
                        <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
                           <TrendingUp size={14} className="text-slate-400" />
                           <p className="text-[11px] font-black text-slate-600 uppercase">
                              สต๊อก: {log.old_stock || 0} {log.type === 'receive' ? '+' : '-'} {log.amount} = <span className="text-blue-600">{log.new_stock || 0}</span>
                           </p>
                        </div>
                        <p className="font-mono text-[10px] font-bold text-blue-400">{log.products?.sku_15_digits}</p>
                        <div className="flex justify-end text-[10px] font-bold text-slate-300 italic"><Clock size={12} className="mr-1"/> {new Date(log.created_at).toLocaleTimeString('th-TH')}</div>
                      </div>
                    ))}
                  </div>
                ))}
             </div>
          </div>
        )}

        <main className="flex-1 flex flex-col p-8 gap-6 justify-center max-w-sm mx-auto w-full">
          <button onClick={() => startScanner('receive')} className="flex-1 bg-green-600 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 transition-all active:scale-95 shadow-2xl border-b-8 border-green-800"><ArrowDownCircle size={60} /><span className="text-2xl font-black uppercase italic tracking-tighter">นำเข้าสินค้า</span></button>
          <button onClick={() => startScanner('issue')} className="flex-1 bg-red-600 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 transition-all active:scale-95 shadow-2xl border-b-8 border-red-800"><ArrowUpCircle size={60} /><span className="text-2xl font-black uppercase italic tracking-tighter">นำออกสินค้า</span></button>
          <div className="mt-4 relative"><input type="text" placeholder="พิมพ์รหัส 15 หลัก..." className="w-full bg-slate-900 border border-white/10 p-5 rounded-2xl outline-none focus:border-blue-500 text-center font-black tracking-widest uppercase" value={scanInput} onChange={(e) => setScanInput(e.target.value)} /><button onClick={() => handleLookupProduct(scanInput, 'receive')} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 p-2"><Search size={24}/></button></div>
        </main>
      </div>

      {/* MODAL 1: จัดการจำนวน */}
      {showActionModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[300] flex items-end sm:items-center justify-center">
          <div className="bg-white w-full max-w-md rounded-t-[3rem] sm:rounded-[3rem] p-8 text-slate-900 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-start mb-6">
              <div><h2 className="text-2xl font-black uppercase italic tracking-tighter leading-none">{selectedProduct.name}</h2><p className="text-[12px] font-black text-slate-400 mt-2 uppercase">ขนาด: {selectedProduct.width} x {selectedProduct.height} x {selectedProduct.length} มม.</p></div>
              <button onClick={() => setShowActionModal(false)} className="bg-slate-100 p-2 rounded-full text-slate-400"><X/></button>
            </div>
            <div className="space-y-6">
              <div className="bg-slate-900 text-white p-4 rounded-2xl flex justify-between items-center"><span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">คงเหลือในระบบ</span><span className="text-xl font-black">{selectedProduct.current_stock} <span className="text-[10px] opacity-50">{selectedProduct.unit}</span></span></div>
              <div className="grid grid-cols-3 gap-3">
                {[5, 10, 50].map(num => (
                  <button key={num} onClick={() => setAmount(prev => prev + num)} className={`${scanMode === 'receive' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'} py-4 rounded-2xl font-black text-xl border-b-4 active:translate-y-1 active:border-b-0 transition-all`}>{scanMode === 'receive' ? '+' : '-'}{num}</button>
                ))}
              </div>
              <div className="flex items-center justify-between bg-slate-100 p-2 rounded-3xl gap-2 border border-slate-200"><button onClick={() => setAmount(prev => Math.max(1, prev - 1))} className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-red-500 shadow-sm"><Minus size={30} strokeWidth={3}/></button><div className="flex-1 text-center bg-white rounded-2xl p-2"><input type="number" value={amount} onChange={(e) => setAmount(Math.max(1, parseInt(e.target.value) || 0))} className="w-full text-5xl font-black text-center outline-none bg-transparent" /><p className="text-[10px] font-black text-slate-400">{selectedProduct.unit}</p></div><button onClick={() => setAmount(prev => prev + 1)} className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-green-500 shadow-sm"><Plus size={30} strokeWidth={3}/></button></div>
              <div className="relative"><FileText className="absolute left-4 top-4 text-slate-300" size={20}/><textarea placeholder="หมายเหตุ..." className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 pl-12 text-sm font-bold outline-none h-20" value={note} onChange={(e) => setNote(e.target.value)}/></div>
              <button onClick={() => setShowSummaryModal(true)} className={`w-full py-6 rounded-[2rem] font-black text-xl uppercase italic tracking-tighter text-white shadow-xl transition-all active:scale-95 ${scanMode === 'receive' ? 'bg-green-600 shadow-green-200' : 'bg-red-600 shadow-red-200'}`}>ยืนยัน{scanMode === 'receive' ? 'นำเข้า' : 'นำออก'}</button>
            </div>
          </div>
        </div>
      )}

      {/* --- 🌟 MODAL 2: สรุปรายการ (COMPACT + SIZE + MATH) --- */}
      {showSummaryModal && selectedProduct && (
        <div className="fixed inset-0 bg-slate-900/98 backdrop-blur-xl z-[400] flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 text-slate-900 shadow-2xl animate-in zoom-in duration-200">
              <div className="flex flex-col items-center text-center mb-4">
                 <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-2 ${scanMode === 'receive' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}><AlertCircle size={32} /></div>
                 <h3 className="text-xl font-black uppercase italic tracking-tighter leading-none">สรุปรายการ</h3>
                 <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">ตรวจสอบก่อนยืนยัน</p>
              </div>

              <div className="space-y-3 mb-6">
                 <div className="flex flex-col border-b border-slate-100 pb-2">
                    <div className="flex justify-between items-center"><span className="text-[10px] font-black text-slate-400 uppercase">สินค้า</span><span className="font-black text-sm">{selectedProduct.name}</span></div>
                    {/* 🌟 แสดงขนาดใต้สินค้าในหน้าสรุป */}
                    <div className="text-right mt-1"><span className="text-[10px] font-bold text-blue-500 italic">ขนาด: {selectedProduct.width} x {selectedProduct.height} x {selectedProduct.length} มม.</span></div>
                 </div>
                 <div className="flex justify-between border-b border-slate-100 pb-1.5"><span className="text-[10px] font-black text-slate-400 uppercase">ประเภท</span><span className={`font-black text-[12px] uppercase ${scanMode === 'receive' ? 'text-green-600' : 'text-red-600'}`}>{scanMode === 'receive' ? 'นำเข้า (+)' : 'นำออก (-)'}</span></div>
                 <div className="flex justify-between border-b border-slate-100 pb-1.5"><span className="text-[10px] font-black text-slate-400 uppercase">จำนวน</span><span className="font-black text-lg">{amount} {selectedProduct.unit}</span></div>

                 <div className="bg-slate-50 p-3 rounded-xl">
                    <div className="flex justify-between text-[11px] font-bold text-slate-500"><span>สต๊อกเดิม:</span><span>{selectedProduct.current_stock}</span></div>
                    {/* 🌟 แสดงการคำนวณสต๊อกให้ดู */}
                    <div className="flex justify-between text-[14px] font-black mt-1 pt-1 border-t border-slate-200">
                       <span>สต๊อกใหม่:</span>
                       <span className={scanMode === 'receive' ? 'text-green-600' : 'text-red-600'}>
                          {selectedProduct.current_stock} {scanMode === 'receive' ? '+' : '-'} {amount} = {scanMode === 'receive' ? selectedProduct.current_stock + amount : selectedProduct.current_stock - amount}
                       </span>
                    </div>
                 </div>
              </div>

              <div className="flex gap-3">
                 <button onClick={() => setShowSummaryModal(false)} className="flex-1 bg-slate-100 py-3.5 rounded-xl font-black text-slate-400 uppercase text-[10px]">แก้ไข</button>
                 <button onClick={handleSaveTransaction} className={`flex-[2] py-3.5 rounded-xl font-black text-white shadow-lg ${scanMode === 'receive' ? 'bg-green-600' : 'bg-red-600'}`}>ยืนยันทำรายการ</button>
              </div>
           </div>
        </div>
      )}

      {isScanning && (
        <div className="fixed inset-0 bg-black z-[200] flex flex-col"><div className="flex justify-between items-center p-6 bg-slate-900 border-b border-white/5"><p className="font-black uppercase italic text-blue-400">Mode: {scanMode?.toUpperCase()}</p><button onClick={stopScanner} className="bg-red-50 text-white p-2 rounded-full"><X/></button></div><div id="reader" className="flex-1 bg-black"></div></div>
      )}
    </div>
  )
}
