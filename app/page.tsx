'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { Html5Qrcode } from 'html5-qrcode'
import { APP_VERSION_FALLBACK } from '@/lib/version'
import { addToBasket, updateBasketQty, BasketItem } from '@/lib/scanActions'
import { 
  QrCode, X, Search, ArrowDownCircle, ArrowUpCircle, 
  Plus, Minus, Trash2, CheckCircle2, ShoppingCart, Loader2, Zap, ScanLine, AlertCircle, TrendingUp, FileText
} from 'lucide-react'

// ฟังก์ชันแยกสี SKU (ST-ขนาด-Lot-x)
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
  const [scanMode, setScanMode] = useState<'receive' | 'issue' | null>(null)
  const [scanMethod, setScanMethod] = useState<'single' | 'batch' | null>(null) // 🌟 เพิ่มตัวเลือกว่าจะเอาแบบเก่าหรือใหม่
  const [isScanning, setIsScanning] = useState(false)
  
  // States สำหรับแบบใหม่ (Batch)
  const [basket, setBasket] = useState<BasketItem[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [lastScannedSku, setLastScannedSku] = useState('')

  // States สำหรับแบบเดิม (Single)
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [singleAmount, setSingleAmount] = useState(1)
  const [singleNote, setSingleNote] = useState('')
  const [showActionModal, setShowActionModal] = useState(false)

  const scannerRef = useRef<Html5Qrcode | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return; }
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', session.user.id).single()
      setActiveName(profile?.full_name || session.user.email?.split('@')[0])
      const { data: ver } = await supabase.from('settings_app_config').select('version').single()
      if (ver) setAppVersion(ver.version)
      setLoading(false)
    }
    init()
  }, [router])

  // --- ฟังก์ชันควบคุมกล้อง ---
  const startScanner = async (mode: 'receive' | 'issue', method: 'single' | 'batch') => {
    setScanMode(mode);
    setScanMethod(method);
    setIsScanning(true);
    setBasket([]);
    
    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode("reader")
        scannerRef.current = scanner
        await scanner.start(
          { facingMode: "environment" }, 
          { fps: 20, qrbox: 250 }, 
          (txt) => method === 'batch' ? handleBatchScan(txt) : handleSingleScan(txt),
          () => {}
        )
      } catch (err) { setIsScanning(false) }
    }, 500)
  }

  const stopScanner = async () => {
    if (scannerRef.current) {
      await scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
    setIsScanning(false);
    setScanMode(null);
    setScanMethod(null);
    setLastScannedSku('');
  }

  // --- Logic แบบใหม่ (Batch) ---
  const handleBatchScan = async (sku: string) => {
    const cleanSku = sku.trim();
    if (cleanSku === lastScannedSku) return;
    setLastScannedSku(cleanSku);
    setTimeout(() => setLastScannedSku(''), 1500);

    const { data: p } = await supabase.from('products').select('*').ilike('sku_15_digits', cleanSku).single();
    if (p) setBasket(prev => addToBasket(prev, p));
  }

  const handleSaveBatch = async () => {
    if (basket.length === 0 || isSaving) return;
    setIsSaving(true);
    try {
      for (const item of basket) {
        const isIssue = scanMode === 'issue';
        const newStock = isIssue ? item.current_stock - item.amount : item.current_stock + item.amount;
        await supabase.from('products').update({ current_stock: newStock }).eq('id', item.id);
        await supabase.from('transactions').insert([{
          product_id: item.id, type: scanMode, amount: item.amount, 
          old_stock: item.current_stock, new_stock: newStock, created_by: activeUser
        }]);
      }
      alert(`✅ บันทึกสำเร็จ ${basket.length} รายการ`);
      stopScanner();
    } catch (err) { alert("❌ เกิดข้อผิดพลาด"); } finally { setIsSaving(false); }
  }

  // --- Logic แบบเดิม (Single) ---
  const handleSingleScan = async (sku: string) => {
    const { data: p } = await supabase.from('products').select('*').ilike('sku_15_digits', sku.trim()).single();
    if (!p) { alert("ไม่พบสินค้า"); return; }
    setSelectedProduct(p);
    setSingleAmount(1);
    setSingleNote('');
    setShowActionModal(true);
    // พอยิงติดแบบเดิม ให้หยุดกล้องชั่วคราวเพื่อให้คนกรอกจำนวน
    if (scannerRef.current) await scannerRef.current.pause();
  }

  const handleSaveSingle = async () => {
    const isIssue = scanMode === 'issue';
    const oldStock = selectedProduct.current_stock;
    if (isIssue && singleAmount > oldStock) { alert("สต๊อกไม่พอ"); return; }
    
    const newStock = isIssue ? oldStock - singleAmount : oldStock + singleAmount;
    await supabase.from('products').update({ current_stock: newStock }).eq('id', selectedProduct.id);
    await supabase.from('transactions').insert([{
      product_id: selectedProduct.id, type: scanMode, amount: singleAmount,
      old_stock: oldStock, new_stock: newStock, created_by: activeUser, note: singleNote
    }]);
    
    alert("บันทึกสำเร็จ");
    setShowActionModal(false);
    // พอกดบันทึกแบบเดิม ให้คนสแกนต่อได้เลย หรือจะปิดกล้องก็ได้ (ที่นี่เลือกให้สแกนต่อ)
    if (scannerRef.current) scannerRef.current.resume();
  }

  if (loading) return <div className="h-screen bg-[#0a0f18] flex items-center justify-center text-blue-500 font-black italic">LOADING 1.1.0...</div>

  return (
    <div className="flex flex-col h-[100dvh] bg-[#0a0f18] text-white overflow-hidden font-sans">
      <header className="px-6 py-4 flex justify-between items-center bg-[#1e293b] border-b border-white/5 z-[110]">
        <div className="flex flex-col">
            <div className="flex items-center gap-2">
                <QrCode className="text-blue-500" size={18} />
                <h1 className="text-xs font-black uppercase italic text-blue-400 leading-none">Scan Center</h1>
            </div>
            <p className="text-[8px] font-black text-slate-500 tracking-widest mt-1 ml-6 uppercase">Ver {appVersion}</p>
        </div>
        <button onClick={() => router.push('/dashboard')} className="bg-white/5 px-4 py-2 rounded-full text-[10px] font-black uppercase border border-white/10">Admin</button>
      </header>

      {!isScanning ? (
        <main className="flex-1 p-6 flex flex-col gap-8 justify-center max-w-lg mx-auto w-full">
          
          {/* โซนนำเข้า (+) */}
          <div className="space-y-3">
             <p className="text-[10px] font-black text-green-500 uppercase tracking-[0.3em] ml-4 italic">--- งานนำเข้าสินค้า (+) ---</p>
             <div className="grid grid-cols-2 gap-4">
                <button onClick={() => startScanner('receive', 'single')} className="bg-slate-800 p-6 rounded-[2rem] border-b-4 border-slate-900 active:scale-95 transition-all flex flex-col items-center gap-3">
                   <ScanLine className="text-green-400" size={32}/>
                   <span className="text-[11px] font-black uppercase text-white leading-none">แบบเดิม<br/><span className="text-slate-500 font-bold">(ทีละชิ้น)</span></span>
                </button>
                <button onClick={() => startScanner('receive', 'batch')} className="bg-green-600 p-6 rounded-[2rem] border-b-4 border-green-800 active:scale-95 transition-all flex flex-col items-center gap-3 shadow-lg shadow-green-900/20">
                   <Zap className="text-white animate-pulse" size={32}/>
                   <span className="text-[11px] font-black uppercase text-white leading-none">แบบใหม่<br/><span className="text-green-100 font-bold">(สแกนต่อเนื่อง)</span></span>
                </button>
             </div>
          </div>

          {/* โซนนำออก (-) */}
          <div className="space-y-3">
             <p className="text-[10px] font-black text-red-500 uppercase tracking-[0.3em] ml-4 italic">--- งานส่งออกสินค้า (-) ---</p>
             <div className="grid grid-cols-2 gap-4">
                <button onClick={() => startScanner('issue', 'single')} className="bg-slate-800 p-6 rounded-[2rem] border-b-4 border-slate-900 active:scale-95 transition-all flex flex-col items-center gap-3">
                   <ScanLine className="text-red-400" size={32}/>
                   <span className="text-[11px] font-black uppercase text-white leading-none">แบบเดิม<br/><span className="text-slate-500 font-bold">(ทีละชิ้น)</span></span>
                </button>
                <button onClick={() => startScanner('issue', 'batch')} className="bg-red-600 p-6 rounded-[2rem] border-b-4 border-red-800 active:scale-95 transition-all flex flex-col items-center gap-3 shadow-lg shadow-red-900/20">
                   <Zap className="text-white animate-pulse" size={32}/>
                   <span className="text-[11px] font-black uppercase text-white leading-none">แบบใหม่<br/><span className="text-red-100 font-bold">(สแกนต่อเนื่อง)</span></span>
                </button>
             </div>
          </div>

        </main>
      ) : (
        <div className="flex-1 flex flex-col relative bg-black">
          {/* ส่วนกล้อง - ใช้ร่วมกัน */}
          <div className={`${scanMethod === 'batch' ? 'h-[40%]' : 'h-full'} relative`}>
            <div id="reader" className="w-full h-full"></div>
            <div className="absolute top-4 left-4 bg-slate-900/80 px-4 py-2 rounded-full border border-white/10 flex items-center gap-2">
               <div className={`w-2 h-2 rounded-full ${scanMode === 'receive' ? 'bg-green-500' : 'bg-red-500'}`} />
               <span className="text-[10px] font-black uppercase italic">
                 {scanMethod === 'batch' ? 'Turbo Mode' : 'Normal Mode'}: {scanMode === 'receive' ? 'นำเข้า' : 'นำออก'}
               </span>
            </div>
            <button onClick={stopScanner} className="absolute top-4 right-4 bg-red-600 p-2 rounded-full shadow-xl"><X size={20}/></button>
          </div>

          {/* ส่วนตะกร้าสินค้า (เฉพาะ Batch Mode) */}
          {scanMethod === 'batch' && (
            <div className="flex-1 flex flex-col bg-slate-50 rounded-t-[2.5rem] mt-[-20px] z-10 shadow-2xl overflow-hidden">
               <div className="p-5 flex justify-between items-center border-b border-slate-200">
                  <div className="flex items-center gap-2 text-slate-900">
                     <ShoppingCart size={18} className="text-blue-600"/>
                     <span className="font-black uppercase text-xs italic">ในชุด ({basket.length})</span>
                  </div>
                  {basket.length > 0 && (
                    <button onClick={handleSaveBatch} disabled={isSaving} className={`${scanMode === 'receive' ? 'bg-green-600' : 'bg-red-600'} text-white px-5 py-2.5 rounded-xl font-black uppercase text-[10px] flex items-center gap-2 shadow-lg disabled:opacity-50`}>
                      {isSaving ? <Loader2 className="animate-spin" size={14}/> : <CheckCircle2 size={14}/>}
                      ยืนยันบันทึกทั้งหมด
                    </button>
                  )}
               </div>
               <div className="flex-1 overflow-y-auto p-4 space-y-2">
                 {basket.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-300 text-[10px] font-black uppercase italic">จ่อกล้องเพื่อเริ่มสแกน...</div>
                 ) : (
                    basket.slice().reverse().map((item) => (
                      <div key={item.sku_15_digits} className="bg-white p-4 rounded-[1.5rem] border border-slate-100 shadow-sm flex justify-between items-center">
                         <div className="flex-1"><p className="font-black text-slate-900 uppercase text-xs">{item.name}</p><SKUColored sku={item.sku_15_digits} prefix={item.prefix} /></div>
                         <div className="flex items-center bg-slate-50 p-1 rounded-xl gap-2">
                            <button onClick={() => setBasket(prev => updateBasketQty(prev, item.sku_15_digits, -1))} className="w-7 h-7 bg-white rounded-lg flex items-center justify-center text-slate-400 shadow-sm"><Minus size={14}/></button>
                            <span className="font-black text-slate-900 text-sm w-5 text-center">{item.amount}</span>
                            <button onClick={() => setBasket(prev => updateBasketQty(prev, item.sku_15_digits, 1))} className="w-7 h-7 bg-white rounded-lg flex items-center justify-center text-blue-600 shadow-sm"><Plus size={14}/></button>
                         </div>
                      </div>
                    ))
                 )}
               </div>
            </div>
          )}

          {/* Modal สำหรับ Single Mode (แบบเดิม) */}
          {showActionModal && selectedProduct && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[300] flex items-center justify-center p-6 text-slate-900">
               <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in fade-in zoom-in">
                  <div className="mb-6">
                     <h2 className="text-xl font-black uppercase italic leading-none mb-2">{selectedProduct.name}</h2>
                     <SKUColored sku={selectedProduct.sku_15_digits} prefix={selectedProduct.prefix} />
                     <p className="text-[10px] font-bold text-slate-400 uppercase mt-2">ขนาด: {selectedProduct.height}x{selectedProduct.width}x{selectedProduct.length}</p>
                  </div>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between bg-slate-100 p-2 rounded-3xl border">
                        <button onClick={() => setSingleAmount(prev => Math.max(1, prev - 1))} className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-red-500 shadow-sm"><Minus size={24}/></button>
                        <input type="number" value={singleAmount} onChange={(e) => setSingleAmount(Math.max(1, parseInt(e.target.value) || 0))} className="w-20 text-4xl font-black text-center outline-none bg-transparent" />
                        <button onClick={() => setSingleAmount(prev => prev + 1)} className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-green-500 shadow-sm"><Plus size={24}/></button>
                    </div>
                    <textarea placeholder="หมายเหตุ..." className="w-full bg-slate-50 border rounded-2xl p-4 text-xs font-bold h-20 outline-none" value={singleNote} onChange={(e) => setSingleNote(e.target.value)}/>
                    <button onClick={handleSaveSingle} className={`w-full py-5 rounded-2xl font-black text-lg uppercase italic text-white shadow-xl ${scanMode === 'receive' ? 'bg-green-600' : 'bg-red-600'}`}>บันทึกรายการ</button>
                    <button onClick={() => { setShowActionModal(false); scannerRef.current?.resume(); }} className="w-full py-2 text-[10px] font-black text-slate-300 uppercase">ยกเลิก</button>
                  </div>
               </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
