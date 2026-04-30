'use client'
import { useState, useRef, useEffect } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { supabase } from '@/lib/supabaseClient'
import { X, Minus, Plus, AlertCircle, CheckCircle2 } from 'lucide-react'

// --- 🔊 เสียงและ UI ส่วนกลาง ---
const playScanSound = () => { /* ...โค้ดเสียงตี๊ด... */ };
const playErrorSound = () => { /* ...โค้ดเสียง Error... */ };

export default function SingleScanner({ scanMode, activeUser, onClose, onRefresh }: any) {
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [singleAmount, setSingleAmount] = useState(1)
  const [showActionModal, setShowActionModal] = useState(false)
  const [showSummaryModal, setShowSummaryModal] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const isScanLocked = useRef(false)

  useEffect(() => {
    const start = async () => {
      const scanner = new Html5Qrcode("single-reader")
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
    const { data: p } = await supabase.from('products').select('*').ilike('sku_15_digits', sku.trim()).single();
    if (!p) return;
    if (scanMode === 'issue' && p.current_stock <= 0) { playErrorSound(); alert("สต๊อกเป็น 0!"); return; }
    
    isScanLocked.current = true;
    playScanSound();
    setSelectedProduct(p); setSingleAmount(1); setShowActionModal(true);
    await scannerRef.current?.pause();
  }

  const handleSave = async () => {
    const isIssue = scanMode === 'issue';
    const oldStock = selectedProduct.current_stock;
    const newStock = isIssue ? oldStock - singleAmount : oldStock + singleAmount;
    await supabase.from('products').update({ current_stock: newStock }).eq('id', selectedProduct.id);
    await supabase.from('transactions').insert([{ product_id: selectedProduct.id, type: scanMode, amount: singleAmount, old_stock: oldStock, new_stock: newStock, created_by: activeUser }]);
    onRefresh(); setShowSummaryModal(false); isScanLocked.current = false;
    await scannerRef.current?.resume();
  }

  return (
    <div className="flex-1 flex flex-col relative bg-black overflow-hidden">
      <div className="h-[300px] w-full relative shrink-0">
        <div id="single-reader" className="w-full h-full"></div>
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
           <div className="w-[180px] h-[180px] border-2 border-white/50 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"></div>
        </div>
        <button onClick={onClose} className="absolute top-4 right-4 bg-red-600 p-2 rounded-full z-50"><X/></button>
      </div>
      
      <div className="flex-1 bg-slate-900 flex items-center justify-center p-6">
         <p className="text-slate-500 font-black uppercase italic animate-pulse">เล็ง QR Code ในกรอบเพื่อสแกนทีละชิ้น...</p>
      </div>

      {/* Action & Summary Modals (โค้ด UI แบบเดิมที่พี่ต้องการ) */}
      {showActionModal && (
          <div className="fixed inset-0 bg-black/80 z-[300] flex items-center justify-center p-6 text-slate-900">
             <div className="bg-white w-full max-w-sm rounded-[3rem] p-8 text-center animate-in zoom-in">
                <h2 className="text-xl font-black uppercase mb-4">{selectedProduct.name}</h2>
                <div className="grid grid-cols-3 gap-3 mb-6">
                    {[5, 10, 50].map(n => (
                        <button key={n} onClick={() => setSingleAmount(prev => prev + n)} className={`${scanMode === 'receive' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'} py-4 rounded-2xl font-black text-lg border-b-4`}>
                            {scanMode === 'receive' ? '+' : '-'}{n}
                        </button>
                    ))}
                </div>
                <div className="flex items-center justify-between bg-slate-100 p-2 rounded-[2.5rem] mb-6">
                    <button onClick={() => setSingleAmount(prev => Math.max(1, prev - 1))} className="w-16 h-16 bg-white rounded-[1.5rem] shadow-sm"><Minus/></button>
                    <span className="text-5xl font-black italic">{singleAmount}</span>
                    <button onClick={() => setSingleAmount(prev => prev + 1)} className="w-16 h-16 bg-white rounded-[1.5rem] shadow-sm"><Plus/></button>
                </div>
                <button onClick={() => { 
                    if(scanMode === 'issue' && singleAmount > selectedProduct.current_stock) { alert("สต๊อกไม่พอ!"); return; }
                    setShowActionModal(false); setShowSummaryModal(true); 
                }} className={`w-full py-6 rounded-[2rem] font-black text-xl text-white ${scanMode === 'receive' ? 'bg-green-600' : 'bg-red-600'}`}>ตรวจสอบรายการ</button>
                <button onClick={() => { setShowActionModal(false); isScanLocked.current = false; scannerRef.current?.resume(); }} className="mt-4 text-slate-300 font-black uppercase text-xs">ยกเลิก</button>
             </div>
          </div>
      )}

      {showSummaryModal && (
          <div className="fixed inset-0 bg-slate-900/98 z-[400] flex items-center justify-center p-4 text-slate-900">
             <div className="bg-white w-full max-w-sm rounded-[3rem] p-8 text-center animate-in zoom-in">
                <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${scanMode === 'receive' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}><AlertCircle size={40}/></div>
                <h3 className="text-xl font-black uppercase mb-2">{selectedProduct.name}</h3>
                <p className="text-[11px] font-bold text-slate-400 mb-6 uppercase">ขนาด: {selectedProduct.height}x{selectedProduct.width}x{selectedProduct.length} | LOT: {selectedProduct.received_date}</p>
                <div className="bg-slate-50 p-5 rounded-[2rem] mb-8 text-left">
                    <div className="flex justify-between text-xs font-bold text-slate-500"><span>สต๊อกเดิม:</span><span>{selectedProduct.current_stock}</span></div>
                    <div className="flex justify-between text-lg font-black mt-2 pt-2 border-t"><span>สต๊อกใหม่:</span><span className={scanMode === 'receive' ? 'text-green-600' : 'text-red-600'}>{scanMode === 'receive' ? selectedProduct.current_stock + singleAmount : selectedProduct.current_stock - singleAmount}</span></div>
                </div>
                <div className="flex gap-4">
                    <button onClick={() => { setShowSummaryModal(false); setShowActionModal(true); }} className="flex-1 py-5 rounded-3xl font-black text-slate-400 bg-slate-100 uppercase text-xs">แก้ไข</button>
                    <button onClick={handleSave} className={`flex-[2] py-5 rounded-3xl font-black text-white ${scanMode === 'receive' ? 'bg-green-600' : 'bg-red-600'}`}>ยืนยันบันทึก</button>
                </div>
             </div>
          </div>
      )}
    </div>
  )
}
