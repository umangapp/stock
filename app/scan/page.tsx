'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { Html5Qrcode } from 'html5-qrcode'
import { APP_VERSION_FALLBACK } from '@/lib/version'
import { 
  QrCode, Clock, X, Camera, Search, ArrowDownCircle, ArrowUpCircle, 
  Plus, Minus, FileText, AlertCircle, TrendingUp, User 
} from 'lucide-react'

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
    <span className="font-mono font-black tracking-widest uppercase italic leading-none">
      <span className="text-blue-600">{p1}</span><span className="text-green-600">{p2}</span><span className="text-orange-500">{p3}</span><span className="text-cyan-400">{p4}</span>
    </span>
  );
};

export default function ScanPage() {
  const router = useRouter()
  const [personalLogs, setPersonalLogs] = useState<any[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [loading, setLoading] = useState(true)
  const [appVersion, setAppVersion] = useState(APP_VERSION_FALLBACK)
  const [scanInput, setScanInput] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [scanMode, setScanMode] = useState<'receive' | 'issue' | null>(null)
  const [showActionModal, setShowActionModal] = useState(false)
  const [showSummaryModal, setShowSummaryModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [amount, setAmount] = useState(1)
  const [note, setNote] = useState('')
  const [activeUser, setActiveName] = useState('')
  const scannerRef = useRef<Html5Qrcode | null>(null)

  const fetchData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return; }
    
    // ดึงโปรไฟล์
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', session.user.id).single()
    const currentName = profile?.full_name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0];
    setActiveName(currentName)
    
    // ดึงประวัติ
    const { data: logs } = await supabase.from('transactions').select('*, products(*)').eq('created_by', currentName).order('created_at', { ascending: false })
    if (logs) setPersonalLogs(logs)
    
    // 🌟 ดึงเลขเวอร์ชั่น
    const { data: ver } = await supabase.from('settings_app_config').select('version').single()
    if (ver) setAppVersion(ver.version)

    setLoading(false)
  }, [router])

  useEffect(() => { fetchData() }, [fetchData])

  const startScanner = async (mode: 'receive' | 'issue') => {
    setScanMode(mode); setIsScanning(true);
    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode("reader")
        scannerRef.current = scanner
        await scanner.start({ facingMode: "environment" }, { fps: 15, qrbox: 250 }, (txt) => { handleLookupProduct(txt, mode); stopScanner(); }, () => {})
      } catch (err) { setIsScanning(false) }
    }, 500)
  }

  const stopScanner = async () => {
    if (scannerRef.current) { await scannerRef.current.stop().catch(() => {}); scannerRef.current = null; setIsScanning(false); }
  }

  const handleLookupProduct = async (sku: string, mode: 'receive' | 'issue') => {
    const { data: p } = await supabase.from('products').select('*').ilike('sku_15_digits', sku.trim()).single()
    if (!p) { alert(`❌ ไม่พบสินค้ารหัส: ${sku.trim()}`); return; }
    setSelectedProduct(p); setScanMode(mode); setAmount(1); setNote(''); setShowActionModal(true);
  }

  const handleSaveTransaction = async () => {
    if (!selectedProduct || amount <= 0) return
    const oldStock = selectedProduct.current_stock
    const isIssue = scanMode === 'issue'
    if (isIssue && amount > oldStock) { alert(`❌ สต๊อกไม่พอ!`); return; }
    const newStock = isIssue ? oldStock - amount : oldStock + amount
    const { error: updateErr } = await supabase.from('products').update({ current_stock: newStock }).eq('id', selectedProduct.id)
    const { error: logErr } = await supabase.from('transactions').insert([{ product_id: selectedProduct.id, type: scanMode, amount, old_stock: oldStock, new_stock: newStock, note, created_by: activeUser }])
    if (!updateErr && !logErr) { setShowSummaryModal(false); setShowActionModal(false); fetchData(); setScanInput(''); }
  }

  if (loading) return <div className="h-screen bg-[#0a0f18] flex items-center justify-center text-blue-500 font-black italic">LOADING...</div>

  return (
    <div className="flex flex-col h-[100dvh] bg-[#0a0f18] text-white overflow-hidden">
      <header className="px-6 py-5 flex justify-between items-center bg-[#1e293b] border-b border-white/5 z-[110]">
        <div className="flex flex-col">
            <div className="flex items-center gap-2">
                <QrCode className="text-blue-500" size={18} />
                <h1 className="text-xs font-black uppercase italic text-blue-400 leading-none">Scan Center</h1>
            </div>
            {/* 🌟 แสดงเลขเวอร์ชั่นในหน้า Scan Header */}
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1 ml-6">Ver {appVersion}</p>
        </div>
        <button onClick={() => setShowHistory(true)} className="bg-blue-600 px-5 py-2.5 rounded-full text-[11px] font-black uppercase active:scale-95 transition-all">ประวัติรายการ</button>
      </header>

      <div className="flex-1 relative flex flex-col">
        {showHistory && (
          <div className="absolute inset-0 bg-[#0a0f18] z-[120] p-6 overflow-y-auto animate-in slide-in-from-right duration-300 text-slate-900">
             <div className="max-w-md mx-auto space-y-6 pb-20">
                <div className="flex justify-between items-center text-white mb-8"><h3 className="text-2xl font-black italic uppercase text-blue-500">History</h3><button onClick={() => setShowHistory(false)} className="bg-white/10 p-2 rounded-full text-white"><X/></button></div>
                {personalLogs.map((log: any) => (
                  <div key={log.id} className="bg-white rounded-[1.5rem] p-5 flex flex-col gap-2 shadow-xl">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-black text-lg leading-none">{log.products?.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 italic mt-1">ขนาด: {log.products?.height}x{log.products?.width}x{log.products?.length} มม.</p>
                        <p className="text-[9px] font-black text-slate-500 uppercase italic">Lot Date: {log.products?.received_date}</p>
                      </div>
                      <span className={`font-black text-2xl ${log.type === 'receive' ? 'text-green-600' : 'text-red-600'}`}>{log.type === 'receive' ? '+' : '-'} {log.amount}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
                       <TrendingUp size={12} className="text-blue-500" />
                       <p className="text-[11px] font-black text-slate-600">สต๊อก: {log.old_stock || 0} {log.type === 'receive' ? '+' : '-'} {log.amount} = {log.new_stock || 0}</p>
                    </div>
                    <div className="mt-1"><SKUColored sku={log.products?.sku_15_digits} prefix={log.products?.prefix} /></div>
                    <div className="flex justify-between items-center mt-1 border-t pt-2">
                       <div className="flex items-center gap-1.5"><User size={10} className="text-blue-500" /><span className="text-[9px] font-black uppercase text-slate-500">{log.created_by}</span></div>
                       <div className="flex items-center gap-1 text-[9px] font-bold text-slate-300 italic"><Clock size={10} /> {new Date(log.created_at).toLocaleTimeString('th-TH')}</div>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        <main className="flex-1 flex flex-col p-8 gap-6 justify-center max-w-sm mx-auto w-full">
          <button onClick={() => startScanner('receive')} className="flex-1 bg-green-600 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 active:scale-95 border-b-8 border-green-800"><ArrowDownCircle size={60} /><span className="text-2xl font-black uppercase italic">นำเข้าสินค้า</span></button>
          <button onClick={() => startScanner('issue')} className="flex-1 bg-red-600 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 active:scale-95 border-b-8 border-red-800"><ArrowUpCircle size={60} /><span className="text-2xl font-black uppercase italic">นำออกสินค้า</span></button>
          <div className="mt-4 relative"><input type="text" placeholder="พิมพ์รหัส 15 หลัก..." className="w-full bg-slate-900 border border-white/10 p-5 rounded-2xl outline-none text-center font-black uppercase" value={scanInput} onChange={(e) => setScanInput(e.target.value)} /><button onClick={() => handleLookupProduct(scanInput, 'receive')} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 p-2"><Search size={24}/></button></div>
        </main>
      </div>

      {showActionModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[300] flex items-end sm:items-center justify-center text-slate-900">
          <div className="bg-white w-full max-w-md rounded-t-[3rem] sm:rounded-[3rem] p-8 shadow-2xl">
            <div className="flex justify-between items-start mb-6">
              <div className="flex-1">
                <h2 className="text-2xl font-black uppercase italic leading-none mb-3">{selectedProduct.name}</h2>
                <div className="mb-1"><SKUColored sku={selectedProduct.sku_15_digits} prefix={selectedProduct.prefix} /></div>
                <p className="text-[14px] font-black text-slate-800 uppercase leading-none">ขนาด: {selectedProduct.height} x {selectedProduct.width} x {selectedProduct.length} มม.</p>
                <p className="text-[11px] font-black text-slate-400 mt-2 uppercase italic">Lot Date: {selectedProduct.received_date}</p>
              </div>
              <button onClick={() => setShowActionModal(false)} className="bg-slate-100 p-2 rounded-full text-slate-400"><X/></button>
            </div>
            <div className="space-y-6">
              <div className="bg-slate-900 text-white p-4 rounded-2xl flex justify-between items-center"><span className="text-[10px] font-black uppercase text-slate-400">คงเหลือปัจจุบัน</span><span className="text-xl font-black">{selectedProduct.current_stock} {selectedProduct.unit}</span></div>
              <div className="grid grid-cols-3 gap-3">
                {[5, 10, 50].map(n => (
                  <button key={n} onClick={() => setAmount(prev => prev + n)} className={`${scanMode === 'receive' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'} py-4 rounded-2xl font-black text-xl border-b-4 active:translate-y-1 transition-all`}>{scanMode === 'receive' ? '+' : '-'}{n}</button>
                ))}
              </div>
              <div className="flex items-center justify-between bg-slate-100 p-2 rounded-3xl border text-slate-900">
                <button onClick={() => setAmount(prev => Math.max(1, prev - 1))} className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-red-500 shadow-sm"><Minus size={30} strokeWidth={3}/></button>
                <div className="flex-1 text-center bg-white rounded-2xl p-2"><input type="number" value={amount} onChange={(e) => setAmount(Math.max(1, parseInt(e.target.value) || 0))} className="w-full text-5xl font-black text-center outline-none bg-transparent" /></div>
                <button onClick={() => setAmount(prev => prev + 1)} className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-green-500 shadow-sm"><Plus size={30} strokeWidth={3}/></button>
              </div>
              <button onClick={() => setShowSummaryModal(true)} className={`w-full py-6 rounded-[2rem] font-black text-xl uppercase italic text-white shadow-xl ${scanMode === 'receive' ? 'bg-green-600' : 'bg-red-600'}`}>ยืนยันรายการ</button>
            </div>
          </div>
        </div>
      )}

      {showSummaryModal && selectedProduct && (
        <div className="fixed inset-0 bg-slate-900/98 backdrop-blur-xl z-[400] flex items-center justify-center p-4 text-slate-900">
           <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl animate-in zoom-in duration-200">
              <div className="flex flex-col items-center text-center mb-4">
                 <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-2 ${scanMode === 'receive' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}><AlertCircle size={32} /></div>
                 <h3 className="text-xl font-black uppercase italic leading-none text-slate-900">สรุปรายการ</h3>
              </div>
              <div className="space-y-3 mb-6">
                 <div className="flex flex-col border-b pb-2">
                    <div className="flex justify-between items-center"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">สินค้า</span><span className="font-black text-sm text-slate-900">{selectedProduct.name}</span></div>
                    <div className="text-right mt-1">
                       <div className="text-[11px] mt-1"><SKUColored sku={selectedProduct.sku_15_digits} prefix={selectedProduct.prefix} /></div>
                       <p className="text-[10px] font-bold text-slate-500 italic mt-0.5">{selectedProduct.height} x {selectedProduct.width} x {selectedProduct.length} มม.</p>
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">LOT: {selectedProduct.received_date}</p>
                    </div>
                 </div>
                 <div className="flex justify-between border-b pb-1.5"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ประเภท</span><span className={`font-black text-[12px] uppercase ${scanMode === 'receive' ? 'text-green-600' : 'text-red-600'}`}>{scanMode === 'receive' ? 'นำเข้า (+)' : 'นำออก (-)'}</span></div>
                 <div className="flex justify-between border-b pb-1.5"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">จำนวน</span><span className="font-black text-lg text-slate-900">{amount} {selectedProduct.unit}</span></div>
                 <div className="bg-slate-50 p-3 rounded-xl">
                    <div className="flex justify-between text-[11px] font-bold text-slate-500"><span>สต๊อกเดิม:</span><span>{selectedProduct.current_stock}</span></div>
                    <div className="flex justify-between text-[14px] font-black mt-1 pt-1 border-t italic"><span>สต๊อกใหม่:</span><span className={scanMode === 'receive' ? 'text-green-600' : 'text-red-600'}>{selectedProduct.current_stock} {scanMode === 'receive' ? '+' : '-'} {amount} = {scanMode === 'receive' ? selectedProduct.current_stock + amount : selectedProduct.current_stock - amount}</span></div>
                 </div>
              </div>
              <div className="flex gap-3">
                 <button onClick={() => setShowSummaryModal(false)} className="flex-1 bg-slate-100 py-4 rounded-xl font-black text-slate-400 uppercase text-[10px]">แก้ไข</button>
                 <button onClick={handleSaveTransaction} className={`flex-[2] py-4 rounded-xl font-black text-white shadow-lg ${scanMode === 'receive' ? 'bg-green-600' : 'bg-red-600'}`}>ยืนยันบันทึก</button>
              </div>
           </div>
        </div>
      )}

      {isScanning && (
        <div className="fixed inset-0 bg-black z-[200] flex flex-col"><div className="flex justify-between items-center p-6 bg-slate-900 border-b border-white/5"><p className="font-black uppercase italic text-blue-400 leading-none">Mode: {scanMode?.toUpperCase()}</p><button onClick={stopScanner} className="bg-red-50 text-white p-2 rounded-full shadow-lg"><X/></button></div><div id="reader" className="flex-1 bg-black"></div></div>
      )}
    </div>
  )
}
