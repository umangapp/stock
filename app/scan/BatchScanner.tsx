'use client'
import { useState, useRef, useEffect } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { supabase } from '@/lib/supabaseClient'
import { X, ShoppingCart, Minus, Plus, Trash2, CheckCircle2, Loader2, Zap } from 'lucide-react'

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
        fps: 25, qrbox: (w, h) => ({ width: Math.min(w, h) * 0.6, height: Math.min(w, h) * 0.6 }),
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
            if ((inBasket ? inBasket.amount : 0) + 1 > p.current_stock) { /* playErrorSound(); */ alert("สต๊อกไม่พอ!"); isScanLocked.current = false; return; }
        }
        /* playScanSound(); */
        setBasket(prev => {
            const idx = prev.findIndex(item => item.sku_15_digits === p.sku_15_digits);
            if (idx > -1) {
                const updated = { ...prev[idx], amount: prev[idx].amount + 1 };
                return [updated, ...prev.filter((_, i) => i !== idx)];
            }
            return [{ ...p, amount: 1 }, ...prev];
        });
        setVisualLock(true);
        setTimeout(() => { isScanLocked.current = false; setVisualLock(false); }, scanDelay);
    } else { isScanLocked.current = false; }
  }

  const handleFinalSave = async () => {
    setIsSaving(true);
    for (const item of basket) {
        const newStock = scanMode === 'receive' ? item.current_stock + item.amount : item.current_stock - item.amount;
        await supabase.from('products').update({ current_stock: newStock }).eq('id', item.id);
        await supabase.from('transactions').insert([{ product_id: item.id, type: scanMode, amount: item.amount, old_stock: item.current_stock, new_stock: newStock, created_by: activeUser }]);
    }
    onRefresh(); onClose();
  }

  return (
    <div className="flex-1 flex flex-col relative bg-black overflow-hidden">
      <div className="h-[300px] w-full relative shrink-0">
        <div id="batch-reader" className="w-full h-full"></div>
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
           <div className="w-[180px] h-[180px] border-2 border-white/50 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"></div>
        </div>
        {visualLock && <div className="absolute inset-0 bg-green-500/30 flex items-center justify-center z-50 border-[10px] border-green-500"><div className="bg-white px-8 py-3 rounded-full font-black text-green-600">SUCCESS!</div></div>}
        <button onClick={onClose} className="absolute top-4 right-4 bg-red-600 p-2 rounded-full z-50"><X/></button>
      </div>

      <div className="flex-1 flex flex-col bg-slate-50 rounded-t-[3rem] mt-[-30px] z-10 shadow-2xl overflow-hidden text-slate-900">
          <div className="p-6 flex justify-between items-center border-b bg-white shrink-0">
             <div className="flex items-center gap-2"><ShoppingCart className="text-blue-600"/><span className="font-black uppercase text-sm">ในชุด ({basket.length})</span></div>
             {basket.length > 0 && <button onClick={() => setShowBatchSummary(true)} className={`${scanMode === 'receive' ? 'bg-green-600' : 'bg-red-600'} text-white px-6 py-3 rounded-2xl font-black text-xs`}>ยืนยันบันทึก</button>}
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
             {basket.map((item, index) => (
                <div key={item.sku_15_digits} className={`bg-white p-5 rounded-[2rem] border flex justify-between items-center ${index === 0 ? 'border-blue-400 ring-2 ring-blue-500/10' : ''}`}>
                   <div className="flex-1">
                      <p className="font-black uppercase text-sm">{item.name}</p>
                      <p className="text-[10px] text-slate-400 italic">{item.height}x{item.width}x{item.length} | LOT: {item.received_date}</p>
                   </div>
                   <div className="flex items-center gap-2">
                      <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-2">
                         <button onClick={() => setBasket(prev => prev.map(i => i.id === item.id ? {...i, amount: Math.max(1, i.amount-1)} : i))} className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-400 shadow-sm"><Minus size={14}/></button>
                         <span className="font-black w-4 text-center">{item.amount}</span>
                         <button onClick={() => setBasket(prev => prev.map(i => i.id === item.id ? {...i, amount: i.amount+1} : i))} className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-blue-600 shadow-sm"><Plus size={14}/></button>
                      </div>
                      <button onClick={() => setBasket(prev => prev.filter(i => i.id !== item.id))} className="p-3 bg-red-50 text-red-500 rounded-xl"><Trash2 size={16}/></button>
                   </div>
                </div>
             ))}
          </div>
      </div>

      {/* Batch Summary Modal (Simplified for space) */}
      {showBatchSummary && (
          <div className="fixed inset-0 bg-slate-900/98 z-[500] flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-md rounded-[3rem] p-8 flex flex-col max-h-[90vh]">
                  <h3 className="text-2xl font-black uppercase text-center mb-6">สรุปรายการชุด</h3>
                  <div className="flex-1 overflow-y-auto space-y-3 mb-6">
                      {basket.map(item => (
                          <div key={item.id} className="bg-slate-50 p-4 rounded-3xl flex justify-between items-center">
                              <span className="font-black text-xs uppercase">{item.name}</span>
                              <span className={`text-xl font-black ${scanMode === 'receive' ? 'text-green-600' : 'text-red-600'}`}>{scanMode === 'receive' ? '+' : '-'}{item.amount}</span>
                          </div>
                      ))}
                  </div>
                  <div className="flex gap-4">
                      <button onClick={() => setShowBatchSummary(false)} className="flex-1 py-5 rounded-3xl font-black text-slate-500 bg-slate-100">แก้</button>
                      <button onClick={handleFinalSave} disabled={isSaving} className={`flex-[2] py-5 rounded-3xl font-black text-white ${scanMode === 'receive' ? 'bg-green-600' : 'bg-red-600'}`}>บันทึกทั้งหมด</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  )
}
