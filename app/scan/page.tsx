'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { Html5Qrcode } from 'html5-qrcode'
import { APP_VERSION_FALLBACK } from '@/lib/version'
import { addToBasket, updateBasketQty, BasketItem } from '@/lib/scanActions'
import { 
  QrCode, X, Search, ArrowDownCircle, ArrowUpCircle, 
  Plus, Minus, Trash2, CheckCircle2, ShoppingCart, Loader2, Zap, Clock, User
} from 'lucide-react'

// --- 🔊 ฟังก์ชันสร้างเสียงตี๊ด (Base64) ---
const playBeep = () => {
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(800, audioCtx.currentTime); // ความถี่เสียง 800Hz
  gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.01);
  gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.15);

  oscillator.start();
  oscillator.stop(audioCtx.currentTime + 0.2);
};

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
  const [loading, setLoading] = useState(true)
  const [appVersion, setAppVersion] = useState(APP_VERSION_FALLBACK)
  const [activeUser, setActiveName] = useState('')
  const [personalLogs, setPersonalLogs] = useState<any[]>([])
  const [showHistory, setShowHistory] = useState(false)
  
  const [scanMode, setScanMode] = useState<'receive' | 'issue' | null>(null)
  const [scanMethod, setScanMethod] = useState<'single' | 'batch' | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [scanInput, setScanInput] = useState('')
  
  const [basket, setBasket] = useState<BasketItem[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [lastScannedSku, setLastScannedSku] = useState('')

  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [singleAmount, setSingleAmount] = useState(1)
  const [singleNote, setSingleNote] = useState('')
  const [showActionModal, setShowActionModal] = useState(false)

  const scannerRef = useRef<Html5Qrcode | null>(null)

  const fetchData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return; }
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', session.user.id).single()
    setActiveName(profile?.full_name || session.user.email?.split('@')[0])
    const { data: logs } = await supabase.from('transactions').select('*, products(*)').eq('created_by', profile?.full_name || session.user.email?.split('@')[0]).order('created_at', { ascending: false }).limit(20)
    if (logs) setPersonalLogs(logs)
    const { data: ver } = await supabase.from('settings_app_config').select('version').single()
    if (ver) setAppVersion(ver.version)
    setLoading(false)
  }, [router])

  useEffect(() => { fetchData() }, [fetchData])

  const startScanner = async (mode: 'receive' | 'issue', method: 'single' | 'batch') => {
    setScanMode(mode); setScanMethod(method); setIsScanning(true); setBasket([]);
    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode("reader")
        scannerRef.current = scanner
        await scanner.start({ facingMode: "environment" }, { fps: 20, qrbox: 250 }, 
          (txt) => method === 'batch' ? handleBatchScan(txt) : handleSingleScan(txt), () => {}
        )
      } catch (err) { setIsScanning(false) }
    }, 500)
  }

  const stopScanner = async () => {
    if (scannerRef.current) { await scannerRef.current.stop().catch(() => {}); scannerRef.current = null; }
    setIsScanning(false); setScanMode(null); setScanMethod(null);
  }

  const handleBatchScan = async (sku: string) => {
    const cleanSku = sku.trim();
    if (cleanSku === lastScannedSku) return;
    setLastScannedSku(cleanSku);
    setTimeout(() => setLastScannedSku(''), 1500);
    const { data: p } = await supabase.from('products').select('*').ilike('sku_15_digits', cleanSku).single();
    if (p) {
        playBeep(); // 🌟 เสียงตี๊ด
        setBasket(prev => addToBasket(prev, p));
    }
  }

  const handleSingleScan = async (sku: string) => {
    const { data: p } = await supabase.from('products').select('*').ilike('sku_15_digits', sku.trim()).single();
    if (!p) { alert("ไม่พบสินค้า"); return; }
    playBeep(); // 🌟 เสียงตี๊ด
    setSelectedProduct(p); setSingleAmount(1); setSingleNote(''); setShowActionModal(true);
    if (scannerRef.current) await scannerRef.current.pause();
  }

  const handleSaveSingle = async () => {
    const isIssue = scanMode === 'issue';
    const oldStock = selectedProduct.current_stock;
    const newStock = isIssue ? oldStock - singleAmount : oldStock + singleAmount;
    await supabase.from('products').update({ current_stock: newStock }).eq('id', selectedProduct.id);
    await supabase.from('transactions').insert([{ product_id: selectedProduct.id, type: scanMode, amount: singleAmount, old_stock: oldStock, new_stock: newStock, created_by: activeUser, note: singleNote }]);
    fetchData(); setShowActionModal(false); if (scannerRef.current) scannerRef.current.resume();
  }

  const handleSaveBatch = async () => {
    setIsSaving(true);
    try {
      for (const item of basket) {
        const isIssue = scanMode === 'issue';
        const newStock = isIssue ? item.current_stock - item.amount : item.current_stock + item.amount;
        await supabase.from('products').update({ current_stock: newStock }).eq('id', item.id);
        await supabase.from('transactions').insert([{ product_id: item.id, type: scanMode, amount: item.amount, old_stock: item.current_stock, new_stock: newStock, created_by: activeUser }]);
      }
      fetchData(); stopScanner();
    } catch (err) { alert("Error"); } finally { setIsSaving(false); }
  }

  if (loading) return <div className="h-screen bg-[#0a0f18] flex items-center justify-center text-blue-500 font-black italic uppercase">Loading...</div>

  return (
    <div className="flex flex-col h-[100dvh] bg-[#0a0f18] text-white overflow-hidden font-sans">
      <header className="px-6 py-5 flex justify-between items-center bg-[#1e293b] border-b border-white/5 z-[110]">
        <div className="flex flex-col">
            <div className="flex items-center gap-2">
                <QrCode className="text-blue-500" size={18} />
                <h1 className="text-xs font-black uppercase italic text-blue-400 leading-none">Scan Center</h1>
            </div>
            <p className="text-[8px] font-black text-slate-500 mt-1 ml-6 uppercase">Ver {appVersion}</p>
        </div>
        <button onClick={() => setShowHistory(true)} className="bg-blue-600 px-5 py-2.5 rounded-full text-[11px] font-black uppercase active:scale-95">ประวัติ</button>
      </header>

      <div className="flex-1 relative flex flex-col">
        {showHistory && (
          <div className="absolute inset-0 bg-[#0a0f18] z-[120] p-6 overflow-y-auto animate-in slide-in-from-right duration-300 text-slate-900">
             <div className="max-w-md mx-auto space-y-4 pb-20">
                <div className="flex justify-between items-center text-white mb-6"><h3 className="text-2xl font-black italic uppercase text-blue-500">History</h3><button onClick={() => setShowHistory(false)} className="bg-white/10 p-2 rounded-full text-white"><X/></button></div>
                {personalLogs.map((log: any) => (
                  <div key={log.id} className="bg-white rounded-[1.5rem] p-5 flex flex-col gap-2 shadow-xl">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-black text-lg leading-none">{log.products?.name}</p>
                        {/* 🌟 แสดง ขนาด กับ Lot Date บรรทัดเดียวกัน */}
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold text-slate-400 italic leading-none">
                              {log.products?.height}x{log.products?.width}x{log.products?.length}
                            </span>
                            <span className="text-[9px] font-black text-slate-500 uppercase italic bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200">
                              Lot: {log.products?.received_date}
                            </span>
                        </div>
                      </div>
                      <span className={`font-black text-2xl ${log.type === 'receive' ? 'text-green-600' : 'text-red-600'}`}>{log.type === 'receive' ? '+' : '-'} {log.amount}</span>
                    </div>
                    <div className="mt-1"><SKUColored sku={log.products?.sku_15_digits} prefix={log.products?.prefix} /></div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {!isScanning ? (
          <main className="flex-1 p-6 flex flex-col gap-6 justify-center max-w-sm mx-auto w-full">
            <div className="flex flex-col gap-2">
               <button onClick={() => startScanner('receive', 'single')} className="bg-green-600 h-32 rounded-[2.5rem] flex flex-col items-center justify-center gap-2 active:scale-95 border-b-8 border-green-800 shadow-xl">
                  <ArrowDownCircle size={40} /><span className="text-xl font-black uppercase italic">นำเข้าสินค้า (+)</span>
               </button>
               <button onClick={() => startScanner('receive', 'batch')} className="bg-slate-800 py-3 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase italic text-green-400 border border-green-500/30">
                  <Zap size={14} className="animate-pulse"/> สแกนต่อเนื่อง (Turbo)
               </button>
            </div>
            <div className="flex flex-col gap-2">
               <button onClick={() => startScanner('issue', 'single')} className="bg-red-600 h-32 rounded-[2.5rem] flex flex-col items-center justify-center gap-2 active:scale-95 border-b-8 border-red-800 shadow-xl">
                  <ArrowUpCircle size={40} /><span className="text-xl font-black uppercase italic">นำออกสินค้า (-)</span>
               </button>
               <button onClick={() => startScanner('issue', 'batch')} className="bg-slate-800 py-3 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase italic text-red-400 border border-red-500/30">
                  <Zap size={14} className="animate-pulse"/> สแกนต่อเนื่อง (Turbo)
               </button>
            </div>
            <div className="mt-4 relative">
               <input type="text" placeholder="พิมพ์รหัส 15 หลัก..." className="w-full bg-slate-900 border border-white/10 p-5 rounded-2xl outline-none text-center font-black uppercase" value={scanInput} onChange={(e) => setScanInput(e.target.value)} />
               <button onClick={() => handleSingleScan(scanInput)} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 p-2"><Search size={24}/></button>
            </div>
          </main>
        ) : (
          <div className="flex-1 flex flex-col relative bg-black">
            <div className={`${scanMethod === 'batch' ? 'h-[40%]' : 'h-full'} relative`}>
              <div id="reader" className="w-full h-full"></div>
              <button onClick={stopScanner} className="absolute top-4 right-4 bg-red-600 p-2 rounded-full shadow-xl"><X size={20}/></button>
            </div>

            {scanMethod === 'batch' && (
              <div className="flex-1 flex flex-col bg-slate-50 rounded-t-[2.5rem] mt-[-20px] z-10 shadow-2xl overflow-hidden text-slate-900">
                 <div className="p-5 flex justify-between items-center border-b border-slate-200">
                    <span className="font-black uppercase text-xs italic">ในชุด ({basket.length})</span>
                    {basket.length > 0 && (
                      <button onClick={handleSaveBatch} disabled={isSaving} className={`${scanMode === 'receive' ? 'bg-green-600' : 'bg-red-600'} text-white px-5 py-2.5 rounded-xl font-black uppercase text-[10px] flex items-center gap-2`}>
                        {isSaving ? <Loader2 className="animate-spin" size={14}/> : <CheckCircle2 size={14}/>} บันทึกทั้งหมด
                      </button>
                    )}
                 </div>
                 <div className="flex-1 overflow-y-auto p-4 space-y-2">
                   {basket.slice().reverse().map((item) => (
                      <div key={item.sku_15_digits} className="bg-white p-4 rounded-[1.5rem] border border-slate-100 shadow-sm flex justify-between items-center">
                         <div className="flex-1">
                            <p className="font-black uppercase text-xs mb-1">{item.name}</p>
                            <SKUColored sku={item.sku_15_digits} prefix={item.prefix} />
                            {/* 🌟 ขนาด + Lot ในบรรทัดเดียวกัน */}
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[9px] font-bold text-slate-400 italic">{item.height}x{item.width}x{item.length}</span>
                                <span className="text-[8px] font-black text-slate-500 uppercase bg-slate-100 px-1 rounded-sm">LOT: {item.received_date}</span>
                            </div>
                         </div>
                         <div className="flex items-center bg-slate-50 p-1 rounded-xl gap-2">
                            <button onClick={() => setBasket(prev => updateBasketQty(prev, item.sku_15_digits, -1))} className="w-7 h-7 bg-white rounded-lg flex items-center justify-center text-slate-400 shadow-sm"><Minus size={14}/></button>
                            <span className="font-black text-sm w-5 text-center">{item.amount}</span>
                            <button onClick={() => setBasket(prev => updateBasketQty(prev, item.sku_15_digits, 1))} className="w-7 h-7 bg-white rounded-lg flex items-center justify-center text-blue-600 shadow-sm"><Plus size={14}/></button>
                         </div>
                      </div>
                   ))}
                 </div>
              </div>
            )}

            {showActionModal && selectedProduct && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[300] flex items-center justify-center p-6 text-slate-900">
                 <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in">
                    <div className="mb-4 text-center">
                       <h2 className="text-xl font-black uppercase italic leading-none mb-2">{selectedProduct.name}</h2>
                       <SKUColored sku={selectedProduct.sku_15_digits} prefix={selectedProduct.prefix} />
                       {/* 🌟 ขนาด + Lot ในบรรทัดเดียวกัน */}
                       <div className="flex items-center justify-center gap-2 mt-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase italic">ขนาด: {selectedProduct.height}x{selectedProduct.width}x{selectedProduct.length}</p>
                          <p className="text-[10px] font-black text-blue-500 uppercase italic bg-blue-50 px-2 py-0.5 rounded-md">Lot: {selectedProduct.received_date}</p>
                       </div>
                    </div>
                    <div className="space-y-5">
                      <div className="grid grid-cols-3 gap-3">
                        {[5, 10, 50].map(n => (
                          <button key={n} onClick={() => setSingleAmount(prev => prev + n)} className={`${scanMode === 'receive' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'} py-3 rounded-2xl font-black text-lg border-b-4 active:translate-y-1 transition-all shadow-sm uppercase italic`}>+{n}</button>
                        ))}
                      </div>
                      <div className="flex items-center justify-between bg-slate-100 p-2 rounded-[2rem] border">
                          <button onClick={() => setSingleAmount(prev => Math.max(1, prev - 1))} className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-red-500 shadow-sm"><Minus size={24}/></button>
                          <span className="text-5xl font-black italic">{singleAmount}</span>
                          <button onClick={() => setSingleAmount(prev => prev + 1)} className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-green-500 shadow-sm"><Plus size={24}/></button>
                      </div>
                      <button onClick={handleSaveSingle} className={`w-full py-5 rounded-3xl font-black text-xl uppercase italic text-white shadow-xl ${scanMode === 'receive' ? 'bg-green-600' : 'bg-red-600'}`}>ยืนยันบันทึก</button>
                      <button onClick={() => { setShowActionModal(false); scannerRef.current?.resume(); }} className="w-full py-2 text-[10px] font-black text-slate-300 uppercase text-center tracking-widest">ยกเลิกรายการ</button>
                    </div>
                 </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
