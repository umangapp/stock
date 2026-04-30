'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { Html5Qrcode } from 'html5-qrcode'
import { APP_VERSION_FALLBACK } from '@/lib/version'
import { addToBasket, updateBasketQty, BasketItem } from '@/lib/scanActions'
import { 
  QrCode, X, Search, ArrowDownCircle, ArrowUpCircle, 
  Plus, Minus, Trash2, CheckCircle2, ShoppingCart, Loader2, Zap, Clock, User, AlertCircle, ScanLine
} from 'lucide-react'

// --- 🔊 ฟังก์ชันเสียงตี๊ดแบบ Industrial ---
const playScanSound = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode); gainNode.connect(audioCtx.destination);
    oscillator.type = 'square'; oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.01);
    gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.1);
    oscillator.start(); oscillator.stop(audioCtx.currentTime + 0.12);
  } catch (e) { console.error("Sound error", e); }
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
    <span className="font-mono font-black tracking-widest uppercase italic leading-none text-[12px]">
      <span className="text-blue-600">{p1}</span><span className="text-green-600">{p2}</span><span className="text-orange-500">{p3}</span><span className="text-cyan-400">{p4}</span>
    </span>
  );
};

export default function ScanPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [appVersion, setAppVersion] = useState(APP_VERSION_FALLBACK)
  const [scanDelay, setScanDelay] = useState(1000) 
  const [activeUser, setActiveName] = useState('')
  const [personalLogs, setPersonalLogs] = useState<any[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [scanMode, setScanMode] = useState<'receive' | 'issue' | null>(null)
  const [scanMethod, setScanMethod] = useState<'single' | 'batch' | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [visualLock, setVisualLock] = useState(false)
  const [scanInput, setScanInput] = useState('')
  const [basket, setBasket] = useState<BasketItem[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [singleAmount, setSingleAmount] = useState(1)
  const [showActionModal, setShowActionModal] = useState(false)
  const [showSummaryModal, setShowSummaryModal] = useState(false)
  const [showBatchSummaryModal, setShowBatchSummaryModal] = useState(false)

  const scannerRef = useRef<Html5Qrcode | null>(null)
  const isScanLocked = useRef(false)

  const fetchData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return; }
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', session.user.id).single()
    setActiveName(profile?.full_name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0])
    const { data: logs } = await supabase.from('transactions').select('*, products(*)').eq('created_by', profile?.full_name || session.user.email?.split('@')[0]).order('created_at', { ascending: false }).limit(20)
    if (logs) setPersonalLogs(logs)
    const { data: conf } = await supabase.from('settings_app_config').select('*').single()
    if (conf) { setAppVersion(conf.version); setScanDelay(conf.scan_delay || 1000); }
    setLoading(false)
  }, [router])

  useEffect(() => { fetchData() }, [fetchData])

  const startScanner = async (mode: 'receive' | 'issue', method: 'single' | 'batch') => {
    setScanMode(mode); setScanMethod(method); setIsScanning(true); setBasket([]);
    isScanLocked.current = false;
    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode("reader")
        scannerRef.current = scanner
        // 🌟 แก้ปัญหาที่ 1 & 2: ล็อกความแม่นยำและกรอบสี่เหลี่ยม 🌟
        await scanner.start(
          { facingMode: "environment" }, 
          { 
            fps: 25, 
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
              const edgeSize = Math.floor(minEdge * 0.6); // ใช้ 60% ของด้านที่แคบที่สุดเพื่อให้เป็นสี่เหลี่ยมเสมอ
              return { width: edgeSize, height: edgeSize };
            },
            aspectRatio: 1.0 
          }, 
          (txt) => method === 'batch' ? handleBatchScan(txt) : handleSingleScan(txt), 
          () => {}
        )
      } catch (err) { setIsScanning(false) }
    }, 500)
  }

  const stopScanner = async () => {
    if (scannerRef.current) { await scannerRef.current.stop().catch(() => {}); scannerRef.current = null; }
    setIsScanning(false); setScanMode(null); setScanMethod(null);
  }

  const handleBatchScan = async (sku: string) => {
    if (isScanLocked.current) return;
    isScanLocked.current = true;
    const { data: p } = await supabase.from('products').select('*').ilike('sku_15_digits', sku.trim()).single();
    if (p) {
        playScanSound(); setBasket(prev => addToBasket(prev, p)); setVisualLock(true);
        setTimeout(() => { isScanLocked.current = false; setVisualLock(false); }, scanDelay);
    } else { isScanLocked.current = false; }
  }

  const handleSingleScan = async (sku: string) => {
    if (isScanLocked.current) return;
    const { data: p } = await supabase.from('products').select('*').ilike('sku_15_digits', sku.trim()).single();
    if (!p) return;
    isScanLocked.current = true; playScanSound();
    setSelectedProduct(p); setSingleAmount(1); setShowActionModal(true);
    if (scannerRef.current) await scannerRef.current.pause();
  }

  const handleConfirmSingle = () => {
    if (scanMode === 'issue' && singleAmount > selectedProduct.current_stock) {
        alert(`❌ สต๊อกไม่พอจ่าย!\nมีอยู่: ${selectedProduct.current_stock} แต่จะเอาออก: ${singleAmount}`);
        return;
    }
    setShowActionModal(false); setShowSummaryModal(true);
  }

  const handleSaveSingle = async () => {
    const isIssue = scanMode === 'issue';
    const oldStock = selectedProduct.current_stock;
    const newStock = isIssue ? oldStock - singleAmount : oldStock + singleAmount;
    await supabase.from('products').update({ current_stock: newStock }).eq('id', selectedProduct.id);
    await supabase.from('transactions').insert([{ product_id: selectedProduct.id, type: scanMode, amount: singleAmount, old_stock: oldStock, new_stock: newStock, created_by: activeUser }]);
    fetchData(); setShowSummaryModal(false); isScanLocked.current = false; if (scannerRef.current) scannerRef.current.resume();
  }

  const handleOpenBatchSummary = () => {
    if (scanMode === 'issue') {
        const overStockItem = basket.find(item => item.amount > item.current_stock);
        if (overStockItem) { alert(`❌ "${overStockItem.name}" สต๊อกไม่พอจ่าย!`); return; }
    }
    setShowBatchSummaryModal(true);
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
      setShowBatchSummaryModal(false); fetchData(); stopScanner();
    } catch (err) { alert("Error"); } finally { setIsSaving(false); }
  }

  if (loading) return <div className="h-screen bg-[#0a0f18] flex items-center justify-center text-blue-500 font-black italic uppercase tracking-tighter">Loading...</div>

  return (
    <div className="flex flex-col h-[100dvh] bg-[#0a0f18] text-white overflow-hidden font-sans">
      <header className="px-6 py-5 flex justify-between items-center bg-[#1e293b] border-b border-white/5 z-[110] shrink-0">
        <div className="flex flex-col">
            <div className="flex items-center gap-2">
                <QrCode className="text-blue-500" size={18} />
                <h1 className="text-xs font-black uppercase italic text-blue-400">Scan Center</h1>
            </div>
            <p className="text-[8px] font-black text-slate-500 mt-1 ml-6 uppercase">Ver {appVersion}</p>
        </div>
        <button onClick={() => setShowHistory(true)} className="bg-blue-600 px-5 py-2.5 rounded-full text-[11px] font-black uppercase">ประวัติ</button>
      </header>

      <div className="flex-1 relative flex flex-col overflow-hidden">
        {showHistory && (
          <div className="absolute inset-0 bg-[#0a0f18] z-[120] p-6 overflow-y-auto text-slate-900 animate-in slide-in-from-right">
             <div className="max-w-md mx-auto space-y-4 pb-20">
                <div className="flex justify-between items-center text-white mb-6"><h3 className="text-2xl font-black italic uppercase text-blue-500">History</h3><button onClick={() => setShowHistory(false)} className="bg-white/10 p-2 rounded-full text-white"><X/></button></div>
                {personalLogs.map((log: any) => (
                  <div key={log.id} className="bg-white rounded-[1.5rem] p-5 flex flex-col gap-2 shadow-xl border-l-8 border-blue-500">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-black text-lg leading-none uppercase">{log.products?.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold text-slate-400 italic">{log.products?.height}x{log.products?.width}x{log.products?.length}</span>
                            <span className="text-[9px] font-black text-slate-500 uppercase bg-slate-100 px-1.5 py-0.5 rounded border">Lot: {log.products?.received_date}</span>
                        </div>
                        <p className="text-[10px] font-bold text-blue-600 mt-1 italic">สต๊อกเดิม: {log.old_stock} → {log.new_stock}</p>
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
          <main className="flex-1 p-6 flex flex-col gap-8 justify-center max-w-sm mx-auto w-full">
            <div className="grid grid-cols-2 gap-4">
               <button onClick={() => startScanner('receive', 'single')} className="aspect-square bg-slate-800 rounded-[2rem] flex flex-col items-center justify-center gap-3 border-b-4 border-slate-950 shadow-xl"><ScanLine size={40} className="text-green-400" /><span className="text-[11px] font-black uppercase text-center leading-none text-white">นำเข้า<br/>(ทีละชิ้น)</span></button>
               <button onClick={() => startScanner('receive', 'batch')} className="aspect-square bg-green-600 rounded-[2rem] flex flex-col items-center justify-center gap-3 border-b-4 border-green-800 shadow-xl"><Zap size={40} className="text-white animate-pulse" /><span className="text-[11px] font-black uppercase text-center leading-none text-white">นำเข้า<br/>(ต่อเนื่อง)</span></button>
               <button onClick={() => startScanner('issue', 'single')} className="aspect-square bg-slate-800 rounded-[2rem] flex flex-col items-center justify-center gap-3 border-b-4 border-slate-950 shadow-xl"><ScanLine size={40} className="text-red-400" /><span className="text-[11px] font-black uppercase text-center leading-none text-white">นำออก<br/>(ทีละชิ้น)</span></button>
               <button onClick={() => startScanner('issue', 'batch')} className="aspect-square bg-red-600 rounded-[2rem] flex flex-col items-center justify-center gap-3 border-b-4 border-red-800 shadow-xl"><Zap size={40} className="text-white animate-pulse" /><span className="text-[11px] font-black uppercase text-center leading-none text-white">นำออก<br/>(ต่อเนื่อง)</span></button>
            </div>
            <div className="relative"><input type="text" placeholder="ค้นหารหัส..." className="w-full bg-slate-900 border border-white/10 p-5 rounded-2xl outline-none text-center font-black uppercase text-sm" value={scanInput} onChange={(e) => setScanInput(e.target.value)} /><button onClick={() => handleSingleScan(scanInput)} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 p-2"><Search size={24}/></button></div>
          </main>
        ) : (
          <div className="flex-1 flex flex-col relative bg-black overflow-hidden">
            {/* 🌟 ล็อกความสูงพื้นที่กล้องที่ 300px เพื่อความเสถียร 🌟 */}
            <div className="h-[300px] w-full relative bg-black shrink-0 border-b-2 border-blue-500/20 overflow-hidden">
              <div id="reader" className="w-full h-full"></div>
              {/* Overlay ฟิล์มดำบีบกรอบ (Visual) */}
              <div className="absolute inset-0 pointer-events-none border-[60px] border-black/60 flex items-center justify-center">
                 <div className="w-[180px] h-[180px] border-2 border-white/50 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"></div>
              </div>
              {visualLock && (
                <div className="absolute inset-0 bg-green-500/30 flex items-center justify-center z-50 border-[10px] border-green-500 animate-in fade-in">
                   <div className="bg-white px-8 py-3 rounded-full shadow-2xl flex items-center gap-3"><CheckCircle2 className="text-green-600" size={24}/><span className="text-green-600 font-black uppercase italic text-sm">SUCCESS!</span></div>
                </div>
              )}
              <button onClick={stopScanner} className="absolute top-4 right-4 bg-red-600 p-2 rounded-full shadow-xl z-[60]"><X size={20}/></button>
            </div>

            {scanMethod === 'batch' && (
              <div className="flex-1 flex flex-col bg-slate-50 rounded-t-[2.5rem] mt-[-20px] z-10 shadow-2xl overflow-hidden text-slate-900">
                 <div className="p-6 flex justify-between items-center border-b border-slate-200 bg-white shrink-0">
                    <div className="flex items-center gap-3"><div className="bg-blue-100 p-2 rounded-xl text-blue-600"><ShoppingCart size={20}/></div><span className="font-black uppercase text-sm italic">ในชุด ({basket.length})</span></div>
                    {basket.length > 0 && (
                      <button onClick={handleOpenBatchSummary} className={`${scanMode === 'receive' ? 'bg-green-600' : 'bg-red-600'} text-white px-6 py-3 rounded-2xl font-black uppercase text-[11px] flex items-center gap-2 shadow-lg`}><CheckCircle2 size={16}/> บันทึกทั้งหมด</button>
                    )}
                 </div>
                 <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
                   {basket.length === 0 ? (<div className="h-full flex flex-col items-center justify-center text-slate-300"><Zap size={48} className="mb-3 opacity-20" /><p className="text-[11px] font-black uppercase italic tracking-widest text-slate-400">จ่อกล้องสแกนได้เลย...</p></div>) : (
                     basket.slice().reverse().map((item) => (
                        <div key={item.sku_15_digits} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center shrink-0">
                           <div className="flex-1 pr-4">
                              <p className="font-black uppercase text-sm mb-1 leading-none">{item.name}</p>
                              <SKUColored sku={item.sku_15_digits} prefix={item.prefix} />
                              <div className="flex items-center gap-2 mt-1.5"><span className="text-[10px] font-bold text-slate-400 italic leading-none">{item.height}x{item.width}x{item.length}</span><span className="text-[9px] font-black text-slate-500 uppercase bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">LOT: {item.received_date}</span></div>
                           </div>
                           <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl gap-3 border">
                              <button onClick={() => setBasket(prev => updateBasketQty(prev, item.sku_15_digits, -1))} className="w-9 h-9 bg-white rounded-xl flex items-center justify-center text-slate-400 shadow-sm"><Minus size={18}/></button>
                              <span className="font-black text-slate-900 text-lg w-6 text-center">{item.amount}</span>
                              <button onClick={() => setBasket(prev => updateBasketQty(prev, item.sku_15_digits, 1))} className="w-9 h-9 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm"><Plus size={18}/></button>
                           </div>
                        </div>
                     )))}
                 </div>
              </div>
            )}

            {showActionModal && selectedProduct && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[300] flex items-center justify-center p-6 text-slate-900">
                 <div className="bg-white w-full max-w-sm rounded-[3rem] p-8 shadow-2xl animate-in zoom-in">
                    <div className="mb-6 text-center">
                       <h2 className="text-xl font-black uppercase italic mb-2 leading-tight">{selectedProduct.name}</h2>
                       <SKUColored sku={selectedProduct.sku_15_digits} prefix={selectedProduct.prefix} />
                       <div className="flex items-center justify-center gap-2 mt-3"><p className="text-[10px] font-bold text-slate-400 uppercase italic">{selectedProduct.height}x{selectedProduct.width}x{selectedProduct.length}</p><p className="text-[10px] font-black text-blue-500 uppercase italic bg-blue-50 px-2 py-0.5 rounded border">Lot: {selectedProduct.received_date}</p></div>
                    </div>
                    <div className="space-y-6">
                      <div className="grid grid-cols-3 gap-3">
                        {[5, 10, 50].map(n => (<button key={n} onClick={() => setSingleAmount(prev => prev + n)} className={`${scanMode === 'receive' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'} py-4 rounded-2xl font-black text-lg border-b-4 uppercase italic`}>{scanMode === 'receive' ? '+' : '-'}{n}</button>))}
                      </div>
                      <div className="flex items-center justify-between bg-slate-100 p-2 rounded-[2.5rem] border border-slate-200">
                          <button onClick={() => setSingleAmount(prev => Math.max(1, prev - 1))} className="w-16 h-16 bg-white rounded-[1.5rem] flex items-center justify-center text-red-500 shadow-sm"><Minus size={28}/></button>
                          <span className="text-5xl font-black italic">{singleAmount}</span>
                          <button onClick={() => setSingleAmount(prev => prev + 1)} className="w-16 h-16 bg-white rounded-[1.5rem] flex items-center justify-center text-green-500 shadow-sm"><Plus size={28}/></button>
                      </div>
                      <button onClick={handleConfirmSingle} className={`w-full py-6 rounded-[2rem] font-black text-xl uppercase italic text-white shadow-xl ${scanMode === 'receive' ? 'bg-green-600' : 'bg-red-600'}`}>ตรวจสอบรายการ</button>
                      <button onClick={() => { setShowActionModal(false); isScanLocked.current = false; if (scannerRef.current) scannerRef.current.resume(); }} className="w-full py-2 text-[10px] font-black text-slate-300 uppercase text-center">ยกเลิก</button>
                    </div>
                 </div>
              </div>
            )}

            {showSummaryModal && selectedProduct && (
              <div className="fixed inset-0 bg-slate-900/98 backdrop-blur-xl z-[400] flex items-center justify-center p-4 text-slate-900">
                <div className="bg-white w-full max-w-sm rounded-[3rem] p-8 shadow-2xl animate-in zoom-in text-center">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 mx-auto ${scanMode === 'receive' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}><AlertCircle size={40} /></div>
                  <h3 className="text-xl font-black uppercase italic mb-2">{selectedProduct.name}</h3>
                  <SKUColored sku={selectedProduct.sku_15_digits} prefix={selectedProduct.prefix} />
                  <div className="flex items-center justify-center gap-3 mt-4 text-[11px] font-bold text-slate-400 italic uppercase">
                       <span>ขนาด: {selectedProduct.height}x{selectedProduct.width}x{selectedProduct.length} มม.</span>
                       <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-600 tracking-tighter">LOT: {selectedProduct.received_date}</span>
                  </div>
                  <div className="space-y-4 my-8 text-left">
                    <div className="flex justify-between border-b border-slate-100 pb-3"><span className="text-[10px] font-black text-slate-400 uppercase">ประเภท</span><span className={`font-black text-[14px] uppercase ${scanMode === 'receive' ? 'text-green-600' : 'text-red-600'}`}>{scanMode === 'receive' ? 'นำเข้า (+)' : 'นำออก (-)'}</span></div>
                    <div className="flex justify-between border-b border-slate-100 pb-3"><span className="text-[10px] font-black text-slate-400 uppercase">จำนวน</span><span className="font-black text-2xl">{singleAmount} {selectedProduct.unit}</span></div>
                    <div className="bg-slate-50 p-5 rounded-[2rem] border shadow-inner">
                      <div className="flex justify-between text-[12px] font-bold text-slate-500"><span>สต๊อกเดิม:</span><span>{selectedProduct.current_stock}</span></div>
                      <div className="flex justify-between text-[18px] font-black mt-2 pt-2 border-t italic"><span>สต๊อกใหม่:</span><span className={scanMode === 'receive' ? 'text-green-600' : 'text-red-600'}>{scanMode === 'receive' ? selectedProduct.current_stock + singleAmount : selectedProduct.current_stock - singleAmount}</span></div>
                    </div>
                  </div>
                  <div className="flex gap-4"><button onClick={() => { setShowSummaryModal(false); setShowActionModal(true); }} className="flex-1 bg-slate-100 py-5 rounded-3xl font-black text-slate-400 uppercase text-[11px]">แก้ไข</button><button onClick={handleSaveSingle} className={`flex-[2] py-5 rounded-3xl font-black text-white shadow-xl ${scanMode === 'receive' ? 'bg-green-600' : 'bg-red-600'}`}>ยืนยันบันทึก</button></div>
                </div>
              </div>
            )}

            {showBatchSummaryModal && (
              <div className="fixed inset-0 bg-slate-900/98 backdrop-blur-2xl z-[500] flex items-center justify-center p-4 text-slate-900">
                <div className="bg-white w-full max-w-md rounded-[3rem] p-8 shadow-2xl flex flex-col max-h-[90vh]">
                  <div className="flex flex-col items-center text-center mb-6 shrink-0"><div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${scanMode === 'receive' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}><CheckCircle2 size={40} /></div><h3 className="text-2xl font-black uppercase italic text-slate-900 leading-none">สรุปรายการชุด</h3><p className="text-[10px] font-bold text-slate-400 mt-2 uppercase">ทั้งหมด {basket.length} รายการ</p></div>
                  <div className="flex-1 overflow-y-auto space-y-3 mb-6 pr-2">
                    {basket.map((item) => (
                      <div key={item.sku_15_digits} className="bg-slate-50 p-4 rounded-3xl border border-slate-100 flex justify-between items-center"><div className="flex-1"><p className="font-black text-xs uppercase text-slate-800 mb-1">{item.name}</p><SKUColored sku={item.sku_15_digits} prefix={item.prefix} /><p className="text-[9px] font-bold text-slate-400 mt-1 italic uppercase">เดิม: {item.current_stock} → <span className={scanMode === 'receive' ? 'text-green-600' : 'text-red-600'}>{scanMode === 'receive' ? item.current_stock + item.amount : item.current_stock - item.amount}</span></p></div><div className="text-right ml-4 shrink-0"><span className={`text-2xl font-black ${scanMode === 'receive' ? 'text-green-600' : 'text-red-600'}`}>{scanMode === 'receive' ? '+' : '-'} {item.amount}</span></div></div>
                    ))}</div>
                  <div className="flex gap-4 shrink-0"><button onClick={() => setShowBatchSummaryModal(false)} className="flex-1 bg-slate-100 py-5 rounded-3xl font-black text-slate-500 uppercase text-xs">กลับไปแก้</button><button onClick={handleSaveBatch} disabled={isSaving} className={`flex-[2] py-5 rounded-3xl font-black text-white shadow-xl flex items-center justify-center gap-2 ${scanMode === 'receive' ? 'bg-green-600' : 'bg-red-600'}`}>{isSaving ? <Loader2 className="animate-spin" size={20}/> : <CheckCircle2 size={20}/>} ยืนยันทั้งหมด</button></div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
