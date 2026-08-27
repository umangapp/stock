'use client'
import { useState, useRef, useEffect } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { supabase } from '@/lib/supabaseClient'
import { X, Minus, Plus, AlertCircle, Package, Loader2 } from 'lucide-react' 

const playScanSound = () => {
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  oscillator.connect(gainNode); gainNode.connect(audioCtx.destination);
  oscillator.type = 'square'; oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime);
  gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.01);
  gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.1);
  oscillator.start(); oscillator.stop(audioCtx.currentTime + 0.12);
};

const playErrorSound = () => {
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  oscillator.connect(gainNode); gainNode.connect(audioCtx.destination);
  oscillator.type = 'sawtooth'; oscillator.frequency.setValueAtTime(150, audioCtx.currentTime);
  gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.8, audioCtx.currentTime + 0.05);
  gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5);
  oscillator.start(); oscillator.stop(audioCtx.currentTime + 0.5);
};

const SKUColored = ({ sku, prefix }: { sku: string; prefix: string }) => {
  if (!sku) return null;
  const cleanSku = sku.trim();
  const preLen = prefix?.length || 2;
  const paddingMatch = cleanSku.match(/[xX]+$/);
  const paddingLen = paddingMatch ? paddingMatch[0].length : 0;
  const coreLen = cleanSku.length - paddingLen;
  
  if (coreLen < 8 + preLen) return <span className="font-mono font-black text-[12px]">{cleanSku}</span>;

  const p1 = cleanSku.substring(0, preLen);
  const p2 = cleanSku.substring(preLen, coreLen - 8); 
  const p3 = cleanSku.substring(coreLen - 8, coreLen - 2); 
  const p_num = cleanSku.substring(coreLen - 2, coreLen); 
  const p4 = cleanSku.substring(coreLen); 
  
  return (
    <span className="font-mono font-black tracking-widest uppercase italic leading-none text-[12px] sm:text-[14px]">
      <span className="text-blue-600">{p1}</span>
      <span className="text-green-600">{p2}</span>
      <span className="text-orange-500">{p3}</span>
      <span className="text-pink-600">{p_num}</span>
      <span className="text-slate-400">{p4}</span>
    </span>
  );
};

export default function SingleScanner({ scanMode, activeUser, initialSKU, scanDelay = 1000, onClose, onRefresh }: any) {
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [singleAmount, setSingleAmount] = useState(1)
  const [showActionModal, setShowActionModal] = useState(false)
  const [showSummaryModal, setShowSummaryModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
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

      if (initialSKU && initialSKU.trim() !== '') {
         handleScan(initialSKU);
      }
    }
    start();
    return () => { scannerRef.current?.stop().catch(() => {}) }
  }, [initialSKU])

  const handleScan = async (sku: string) => {
    if (isScanLocked.current && !initialSKU) return; 
    isScanLocked.current = true; 

    const { data: p } = await supabase.from('products').select('*').ilike('sku_15_digits', sku.trim()).single();
    
    if (!p) { 
      alert("❌ ไม่พบข้อมูลสินค้ารหัสนี้ในระบบ"); 
      setTimeout(() => { isScanLocked.current = false; }, scanDelay); 
      if(initialSKU) onClose(); 
      return; 
    }
    
    if (scanMode === 'issue' && p.current_stock <= 0) {
      playErrorSound(); 
      alert(`❌ สต๊อก "${p.name}" เป็น 0 ไม่สามารถนำออกได้!`); 
      setTimeout(() => { isScanLocked.current = false; }, scanDelay); 
      if(initialSKU) onClose(); 
      return;
    }
    
    playScanSound();
    setSelectedProduct(p); 
    setSingleAmount(1); 
    setShowActionModal(true);
    await scannerRef.current?.pause();
  }

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      const { data: freshProduct } = await supabase.from('products').select('current_stock').eq('id', selectedProduct.id).single();
      const liveStock = freshProduct?.current_stock ?? selectedProduct.current_stock;

      if (scanMode === 'issue' && liveStock < singleAmount) {
        playErrorSound();
        alert(`❌ สต๊อกไม่พอจ่าย! (คงเหลือในระบบ: ${liveStock})`);
        setIsSaving(false);
        return;
      }

      const isIssue = scanMode === 'issue';
      const newStock = isIssue ? liveStock - singleAmount : liveStock + singleAmount;
      
      await supabase.from('products').update({ current_stock: newStock }).eq('id', selectedProduct.id);
      await supabase.from('transactions').insert([{ 
        product_id: selectedProduct.id, 
        type: scanMode, 
        amount: singleAmount, 
        old_stock: liveStock, 
        new_stock: newStock, 
        created_by: activeUser 
      }]);

      onRefresh(); 
      setShowSummaryModal(false); 
      isScanLocked.current = false;
      onClose(); 
    } catch (e) {
      alert("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col relative bg-black overflow-hidden font-sans">
      <div className="h-[300px] w-full relative bg-black shrink-0 border-b border-white/10">
        <div id="single-reader" className="w-full h-full"></div>
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-[180px] h-[180px] border-2 border-white/50 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"></div>
        </div>
        <button onClick={onClose} className="absolute top-4 right-4 bg-red-600 p-2 rounded-full z-50 shadow-xl active:scale-90 transition-all"><X size={24}/></button>
      </div>
      
      <div className="flex-1 bg-[#0a0f18] flex items-center justify-center p-6 text-center">
         <p className="text-slate-500 font-black uppercase italic animate-pulse tracking-widest text-sm">ค้นหาข้อมูลสำเร็จเรียบร้อย...</p>
      </div>

      {showActionModal && (
          <div className="fixed inset-0 bg-black/90 z-[300] flex items-center justify-center p-6 text-slate-900">
             <div className="bg-white w-full max-w-sm rounded-[3rem] p-8 text-center animate-in zoom-in duration-300">
                <h2 className="text-xl font-black uppercase italic mb-2 leading-tight">{selectedProduct.name}</h2>
                <div className="mb-2"><SKUColored sku={selectedProduct.sku_15_digits} prefix={selectedProduct.prefix} /></div>
                <div className="flex items-center justify-center gap-2 mb-4 text-[10px] font-bold text-slate-400 italic uppercase">
                    <span>{selectedProduct.height}x{selectedProduct.width}x{selectedProduct.length} มม.</span>
                    <span className="bg-slate-100 px-2 py-0.5 rounded border">LOT: {selectedProduct.received_date}</span>
                </div>

                {selectedProduct.weight && (
                  <div className="bg-amber-50/60 border border-amber-200/60 p-3 rounded-2xl mb-2 flex justify-between items-center px-5">
                    <div className="flex items-center gap-1.5 text-amber-700">
                      <span className="text-xs">⚖️</span>
                      <span className="text-[10px] font-black uppercase tracking-widest">น้ำหนัก</span>
                    </div>
                    <span className="font-black text-xl text-slate-800">
                      {Number(selectedProduct.weight).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-bold text-amber-700 uppercase">กก.</span>
                    </span>
                  </div>
                )}

                <div className="bg-blue-50/60 border border-blue-100/40 p-3 rounded-2xl mb-5 flex justify-between items-center px-5">
                  <div className="flex items-center gap-1.5 text-blue-600">
                    <Package size={14} className="shrink-0" />
                    <span className="text-[10px] font-black uppercase tracking-widest">สต๊อกปัจจุบัน</span>
                  </div>
                  <span className="font-black text-xl text-slate-800">
                    {selectedProduct.current_stock} {!selectedProduct.weight && <span className="text-xs font-bold text-slate-400 uppercase">{selectedProduct.unit}</span>}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-6">
                    {[5, 10, 50].map(n => (
                        <button 
                          key={n} 
                          onClick={() => setSingleAmount(prev => prev === 1 ? n : prev + n)} 
                          className={`${scanMode === 'receive' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'} py-4 rounded-2xl font-black text-lg border-b-4 uppercase italic active:translate-y-1`}
                        >
                            {scanMode === 'receive' ? '+' : '-'}{n}
                        </button>
                    ))}
                </div>

                <div className="flex items-center justify-between bg-slate-100 p-2 rounded-[2.5rem] mb-6 border border-slate-200">
                    <button onClick={() => setSingleAmount(prev => Math.max(1, prev - 1))} className="w-16 h-16 bg-white rounded-[1.5rem] shadow-sm flex items-center justify-center active:scale-90 shrink-0"><Minus size={24}/></button>
                    <input 
                      type="number" 
                      min="1"
                      className="flex-1 bg-transparent text-center text-4xl font-black italic text-slate-900 outline-none focus:ring-0 w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      value={singleAmount || ''} 
                      onChange={(e) => { const val = e.target.value === '' ? 0 : parseInt(e.target.value); setSingleAmount(val); }}
                      onBlur={() => { if (!singleAmount || singleAmount < 1) setSingleAmount(1); }}
                    />
                    <button onClick={() => setSingleAmount(prev => prev + 1)} className="w-16 h-16 bg-white rounded-[1.5rem] shadow-sm flex items-center justify-center active:scale-90 shrink-0"><Plus size={24}/></button>
                </div>

                <button onClick={() => { 
                    if (!singleAmount || singleAmount < 1) { alert("⚠️ กรุณากรอกจำนวนที่ถูกต้องอย่างน้อย 1 ชิ้น"); return; }
                    if(scanMode === 'issue' && singleAmount > selectedProduct.current_stock) { playErrorSound(); alert(`❌ สต๊อกไม่พอจ่าย! (คงเหลือ: ${selectedProduct.current_stock})`); return; }
                    setShowActionModal(false); setShowSummaryModal(true); 
                }} className={`w-full py-6 rounded-[2rem] font-black text-xl text-white shadow-xl ${scanMode === 'receive' ? 'bg-green-600 shadow-green-900/20' : 'bg-red-600 shadow-red-900/20'} active:scale-95 transition-all`}>ตรวจสอบรายการ</button>
                
                <button onClick={() => { 
                  setShowActionModal(false); 
                  isScanLocked.current = false; 
                  scannerRef.current?.resume();
                  onClose(); 
                }} className="mt-6 text-slate-300 font-black uppercase text-xs tracking-widest">ยกเลิก</button>
             </div>
          </div>
      )}

      {showSummaryModal && (
          <div className="fixed inset-0 bg-slate-900/98 backdrop-blur-xl z-[400] flex items-center justify-center p-4 text-slate-900">
             <div className="bg-white w-full max-w-sm rounded-[3rem] p-8 text-center animate-in zoom-in duration-300">
                <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${scanMode === 'receive' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}><AlertCircle size={40}/></div>
                <h3 className="text-xl font-black uppercase italic mb-2 leading-none">{selectedProduct.name}</h3>
                <div className="mb-2"><SKUColored sku={selectedProduct.sku_15_digits} prefix={selectedProduct.prefix} /></div>
                <div className="flex items-center justify-center gap-3 mb-8 text-[11px] font-bold text-slate-400 italic uppercase">
                    <span>ขนาด: {selectedProduct.height}x{selectedProduct.width}x{selectedProduct.length} มม.</span>
                    <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-600">LOT: {selectedProduct.received_date}</span>
                </div>

                <div className="space-y-4 mb-8 text-left">
                    <div className="flex justify-between border-b border-slate-100 pb-3"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ประเภท</span><span className={`font-black text-[14px] uppercase ${scanMode === 'receive' ? 'text-green-600' : 'text-red-600'}`}>{scanMode === 'receive' ? 'นำเข้า (+)' : 'นำออก (-)'}</span></div>
                    {selectedProduct.weight && (
                      <div className="flex justify-between border-b border-slate-100 pb-3"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">น้ำหนัก</span><span className="font-black text-lg text-slate-800">{Number(selectedProduct.weight).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} กก.</span></div>
                    )}
                    
                    <div className="flex justify-between border-b border-slate-100 pb-3">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {selectedProduct.weight ? 'จำนวน' : 'จำนวนสแกน'}
                      </span>
                      <span className="font-black text-2xl text-slate-900">
                        {singleAmount} {!selectedProduct.weight && selectedProduct.unit}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-5 rounded-[2rem] border shadow-inner">
                        <div className="flex justify-between text-xs font-bold text-slate-500"><span>สต๊อกเดิม:</span><span>{selectedProduct.current_stock}</span></div>
                        <div className="flex justify-between text-lg font-black mt-2 pt-2 border-t border-slate-200 italic"><span>สต๊อกใหม่:</span><span className={scanMode === 'receive' ? 'text-green-600' : 'text-red-600'}>{scanMode === 'receive' ? selectedProduct.current_stock + singleAmount : selectedProduct.current_stock - singleAmount}</span></div>
                    </div>
                </div>

                <div className="flex gap-4">
                    <button onClick={() => { setShowSummaryModal(false); setShowActionModal(true); }} disabled={isSaving} className="flex-1 py-5 rounded-3xl font-black text-slate-400 bg-slate-50 uppercase text-[11px] shadow-sm disabled:opacity-50">แก้ไข</button>
                    <button onClick={handleSave} disabled={isSaving} className={`flex-[2] py-5 rounded-3xl font-black text-white shadow-xl ${scanMode === 'receive' ? 'bg-green-600' : 'bg-red-600'} active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2`}>
                      {isSaving ? <Loader2 className="animate-spin" size={20}/> : null}
                      {isSaving ? 'กำลังบันทึก...' : 'ยืนยันบันทึก'}
                    </button>
                </div>
             </div>
          </div>
      )}
    </div>
  )
}
