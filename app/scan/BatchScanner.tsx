'use client'
import { useState, useRef, useEffect } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { supabase } from '@/lib/supabaseClient'
import { X, ShoppingCart, Minus, Plus, Trash2, CheckCircle2, Loader2, Zap, AlertCircle } from 'lucide-react'

// --- 🔊 ฟังก์ชันเสียงสแกนติด (Industrial Beep) ---
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
  } catch (e) { console.error("Sound play error", e); }
};

// --- 🔊 ฟังก์ชันเสียง Error (สต๊อกไม่พอ) ---
const playErrorSound = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode); gainNode.connect(audioCtx.destination);
    oscillator.type = 'sawtooth'; oscillator.frequency.setValueAtTime(150, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.8, audioCtx.currentTime + 0.05);
    gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5);
    oscillator.start(); oscillator.stop(audioCtx.currentTime + 0.5);
  } catch (e) { console.error("Sound play error", e); }
};

// --- 🎨 แยกสี SKU ---
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

export default function BatchScanner({ scanMode, activeUser, scanDelay, onClose, onRefresh }: any) {
  const [basket, setBasket] = useState<any[]>([])
  const [visualLock, setVisualLock] = useState(false)
  const [showBatchSummary, setShowBatchSummary] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const isScanLocked = useRef(false)

  useEffect(() => {
    const start = async () => {
      const scanner = new Html5Qrcode("batch-reader")
      scannerRef.current = scanner
      await scanner.start({ facingMode: "environment" }, { 
        fps: 25, 
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const edgeSize = Math.floor(minEdge * 0.6);
          return { width: edgeSize, height: edgeSize };
        },
        aspectRatio: 1.0 
      }, handleScan, () => {})
    }
    start();
    return () => { scannerRef.current?.stop().catch(() => {}) }
  }, [])

  const handleScan = async (sku: string) => {
    if (isScanLocked.current) return;
    isScanLocked.current = true;
    const { data: p } = await supabase.from('products').select('*').ilike('sku_15_digits', sku.trim()).single();
    
    if (p) {
        if (scanMode === 'issue') {
            const inBasket = basket.find(item => item.sku_15_digits === p.sku_15_digits);
            const currentQty = inBasket ? inBasket.amount : 0;
            if (currentQty + 1 > p.current_stock) { 
                playErrorSound(); // 🌟 เสียงเตือนสต๊อกพัง
                alert(`❌ สต๊อกไม่พอจ่าย!\n"${p.name}" เหลือเพียง ${p.current_stock}`); 
                isScanLocked.current = false; return; 
            }
        }
        
        playScanSound(); // 🌟 เสียงตี๊ดปกติ
        setBasket(prev => {
            const idx = prev.findIndex(item => item.sku_15_digits === p.sku_15_digits);
            if (idx > -1) {
                const updated = { ...prev[idx], amount: prev[idx].amount + 1 };
                return [updated, ...prev.filter((_, i) => i !== idx)]; // ดันตัวล่าสุดขึ้นบน
            }
            return [{ ...p, amount: 1 }, ...prev];
        });
        setVisualLock(true);
        setTimeout(() => { isScanLocked.current = false; setVisualLock(false); }, scanDelay);
    } else { isScanLocked.current = false; }
  }

  const handleFinalSave = async () => {
    setIsSaving(true);
    try {
      for (const item of basket) {
          const newStock = scanMode === 'receive' ? item.current_stock + item.amount : item.current_stock - item.amount;
          await supabase.from('products').update({ current_stock: newStock }).eq('id', item.id);
          await supabase.from('transactions').insert([{ product_id: item.id, type: scanMode, amount: item.amount, old_stock: item.current_stock, new_stock: newStock, created_by: activeUser }]);
      }
      onRefresh(); onClose();
    } catch (e) { alert("เกิดข้อผิดพลาดในการบันทึก"); } finally { setIsSaving(false); }
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-black overflow-hidden font-sans">
      <div className="h-[300px] w-full relative bg-black shrink-0 border-b border-white/10 overflow-hidden">
        <div id="batch-reader" className="w-full h-full"></div>
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
           <div className="w-[180px] h-[180px] border-2 border-white/50 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"></div>
        </div>
        {visualLock && (
          <div className="absolute inset-0 bg-green-500/30 flex items-center justify-center z-50 border-[10px] border-green-500 animate-in fade-in">
             <div className="bg-white px-8 py-3 rounded-full font-black text-green-600 shadow-2xl flex items-center gap-2"><CheckCircle2 size={20}/> SUCCESS!</div>
          </div>
        )}
        <button onClick={onClose} className="absolute top-4 right-4 bg-red-600 p-2 rounded-full z-50 shadow-xl active:scale-90 transition-all"><X size={24}/></button>
      </div>

      <div className="flex-1 flex flex-col bg-slate-50 rounded-t-[3rem] mt-[-30px] z-10 shadow-2xl overflow-hidden text-slate-900">
          <div className="p-6 flex justify-between items-center border-b bg-white shrink-0">
             <div className="flex items-center gap-2"><div className="bg-blue-100 p-2 rounded-xl text-blue-600"><ShoppingCart size={20}/></div><span className="font-black uppercase text-sm italic tracking-tight">รายการที่สแกน ({basket.length})</span></div>
             {basket.length > 0 && <button onClick={() => setShowBatchSummary(true)} className={`${scanMode === 'receive' ? 'bg-green-600 shadow-green-900/20' : 'bg-red-600 shadow-red-900/20'} text-white px-6 py-3 rounded-2xl font-black text-xs uppercase shadow-lg active:scale-95 transition-all`}><CheckCircle2 size={16} className="inline mr-1"/> ยืนยันบันทึก</button>}
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
             {basket.map((item, index) => (
                <div key={item.sku_15_digits} className={`bg-white p-5 rounded-[2.5rem] border shadow-sm flex justify-between items-center shrink-0 transition-all duration-500 ${index === 0 ? 'border-blue-400 ring-2 ring-blue-500/10 scale-[1.02] z-20 shadow-blue-500/10' : 'border-slate-100'}`}>
                   <div className="flex-1 pr-4">
                      <div className="flex items-center gap-2 mb-1 leading-none">
                        {index === 0 && <span className="bg-blue-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded italic animate-pulse">LATEST</span>}
                        <p className="font-black uppercase text-sm leading-none">{item.name}</p>
                      </div>
                      <SKUColored sku={item.sku_15_digits} prefix={item.prefix} />
                      <div className="flex items-center gap-2 mt-1.5 leading-none text-[10px] font-bold text-slate-400 italic">
                         <span>{item.height}x{item.width}x{item.length} มม.</span>
                         <span className="bg-slate-100 px-1.5 py-0.5 rounded border font-black text-slate-500 uppercase">LOT: {item.received_date}</span>
                      </div>
                   </div>
                   <div className="flex items-center gap-2">
                      <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl gap-3 border border-slate-200">
                         <button onClick={() => setBasket(prev => prev.map(i => i.id === item.id ? {...i, amount: Math.max(1, i.amount-1)} : i))} className="w-9 h-9 bg-white rounded-xl flex items-center justify-center text-slate-400 shadow-sm active:scale-90 transition-all"><Minus size={18}/></button>
                         <span className="font-black text-slate-900 text-lg w-6 text-center leading-none">{item.amount}</span>
                         <button onClick={() => {
                             const newQty = item.amount + 1;
                             if (scanMode === 'issue' && newQty > item.current_stock) { playErrorSound(); alert("สต๊อกไม่พอจ่าย!"); return; }
                             setBasket(prev => prev.map(i => i.id === item.id ? {...i, amount: newQty} : i))
                         }} className="w-9 h-9 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm active:scale-90 transition-all"><Plus size={18}/></button>
                      </div>
                      <button onClick={() => setBasket(prev => prev.filter(i => i.id !== item.id))} className="p-3 bg-red-50 text-red-500 rounded-2xl border border-red-100 active:scale-90 transition-all shadow-sm"><Trash2 size={18}/></button>
                   </div>
                </div>
             ))}
          </div>
      </div>

      {/* --- 🌟 หน้าจอสรุปรายการชุด (Batch Summary Modal) 🌟 --- */}
      {showBatchSummary && (
          <div className="fixed inset-0 bg-slate-900/98 backdrop-blur-2xl z-[500] flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-md rounded-[3rem] p-8 flex flex-col max-h-[90vh] animate-in zoom-in duration-300">
                  <div className="flex flex-col items-center text-center mb-6 shrink-0 text-slate-900">
                     <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${scanMode === 'receive' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}><AlertCircle size={40} /></div>
                     <h3 className="text-2xl font-black uppercase italic text-slate-900 leading-none">สรุปยอดรวม</h3>
                     <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">ตรวจสอบ {basket.length} รายการในชุด</p>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3 mb-6 pr-2">
                      {basket.map(item => (
                          <div key={item.id} className="bg-slate-50 p-5 rounded-[2rem] border border-slate-100 flex justify-between items-center shadow-sm">
                              <div className="flex-1 pr-4">
                                 <p className="font-black text-xs uppercase text-slate-800 leading-none mb-1">{item.name}</p>
                                 <SKUColored sku={item.sku_15_digits} prefix={item.prefix} />
                                 <div className="flex items-center gap-2 mt-1.5 text-[9px] font-bold text-slate-400 uppercase italic">
                                    <span>{item.height}x{item.width}x{item.length}</span>
                                    <span>| LOT: {item.received_date}</span>
                                 </div>
                                 <p className="text-[9px] font-black text-blue-600 mt-1 uppercase italic leading-none">
                                    เดิม: {item.current_stock} → <span className={scanMode === 'receive' ? 'text-green-600' : 'text-red-600'}>{scanMode === 'receive' ? item.current_stock + item.amount : item.current_stock - item.amount}</span>
                                 </p>
                              </div>
                              <div className="text-right shrink-0">
                                 <span className={`text-2xl font-black leading-none ${scanMode === 'receive' ? 'text-green-600' : 'text-red-600'}`}>{scanMode === 'receive' ? '+' : '-'}{item.amount}</span>
                                 <p className="text-[10px] font-black text-slate-300 uppercase mt-1 leading-none">{item.unit}</p>
                              </div>
                          </div>
                      ))}
                  </div>

                  <div className="flex gap-4 shrink-0">
                      <button onClick={() => setShowBatchSummary(false)} className="flex-1 py-5 rounded-3xl font-black text-slate-400 bg-slate-100 uppercase text-xs">แก้ไขเพิ่ม</button>
                      <button 
                        onClick={handleFinalSave} 
                        disabled={isSaving} 
                        className={`flex-[2] py-5 rounded-3xl font-black text-white shadow-xl ${scanMode === 'receive' ? 'bg-green-600' : 'bg-red-600'} disabled:opacity-50 active:scale-95 flex items-center justify-center gap-2`}
                      >
                        {isSaving ? <Loader2 className="animate-spin" size={20}/> : <CheckCircle2 size={20}/>} ยืนยันบันทึกทั้งหมด
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  )
}
