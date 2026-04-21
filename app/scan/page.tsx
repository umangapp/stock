'use client'
import { useEffect, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { supabase } from '@/lib/supabaseClient'
import { Minus, Plus, Camera, Search, RefreshCw, X, User, Clock, ArrowRight, AlertCircle, MessageSquare } from 'lucide-react'

export default function ScanPage() {
  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  
  const [mode, setMode] = useState<'receive' | 'issue'>('receive')
  const [adjustment, setAdjustment] = useState(0)
  const [note, setNote] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [userName] = useState('Admin') 

  const isStockShort = mode === 'issue' && adjustment > (product?.current_stock || 0);

  const startScanner = async () => {
    const html5QrCode = new Html5Qrcode("reader");
    setIsScanning(true);
    try {
      await html5QrCode.start(
        { facingMode: "environment" }, 
        { fps: 15, qrbox: { width: 200, height: 200 } },
        (decodedText) => {
          fetchProduct(decodedText);
          html5QrCode.stop().then(() => setIsScanning(false));
        },
        () => {}
      );
    } catch (err) {
      alert("เปิดกล้องไม่ได้");
      setIsScanning(false);
    }
  };

  const fetchProduct = async (sku: string) => {
    setLoading(true)
    const { data } = await supabase.from('products').select('*').eq('sku_15_digits', sku).single()
    if (data) {
      setProduct(data)
      setAdjustment(0)
      setNote('')
    } else {
      alert('ไม่พบรหัสสินค้า: ' + sku)
    }
    setLoading(false)
  }

  const confirmUpdate = async () => {
    const finalAmount = mode === 'receive' ? adjustment : -adjustment;
    const newStock = product.current_stock + finalAmount;

    const { error: updateError } = await supabase
      .from('products')
      .update({ current_stock: newStock })
      .eq('id', product.id);

    if (!updateError) {
      await supabase.from('transactions').insert([{
        product_id: product.id,
        type: mode,
        amount: adjustment,
        stock_before: product.current_stock,
        stock_after: newStock,
        note: note,
        created_by: userName
      }]);
      setProduct(null);
      setShowConfirm(false);
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-gray-900 text-slate-100 overflow-hidden font-sans">
      
      {/* 1. Header - ย่อให้เล็กที่สุด */}
      <header className="p-3 flex justify-between items-center bg-gray-900/50 backdrop-blur-md border-b border-white/10">
        <h1 className="text-sm font-bold flex items-center gap-2">
          <Camera size={18} className="text-blue-400" /> STOCK SCANNER
        </h1>
        {product && (
          <button onClick={() => setProduct(null)} className="p-1 bg-white/10 rounded-full">
            <X size={18} />
          </button>
        )}
      </header>

      <main className="flex-1 flex flex-col p-3 gap-3 overflow-hidden">
        
        {/* 2. Scanner / Search Area (แสดงเฉพาะตอนยังไม่เลือกสินค้า) */}
        {!product && (
          <div className="flex-1 flex flex-col gap-3">
            <div className="flex-1 relative rounded-3xl bg-black overflow-hidden border border-white/10 shadow-2xl">
              <div id="reader" className="w-full h-full"></div>
              {!isScanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800">
                  <button onClick={startScanner} className="bg-blue-600 px-10 py-4 rounded-2xl font-black text-lg shadow-xl shadow-blue-900/40">เปิดกล้องสแกน</button>
                </div>
              )}
            </div>
            <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/10">
              <input type="text" placeholder="พิมพ์รหัสสินค้า..." className="flex-1 bg-transparent p-3 outline-none text-sm" value={manualCode} onChange={(e) => setManualCode(e.target.value)} />
              <button onClick={() => fetchProduct(manualCode)} className="bg-blue-600 p-3 rounded-xl"><Search size={20} /></button>
            </div>
          </div>
        )}

        {/* 3. Product Info & Control Panel (แสดงเมื่อเลือกสินค้าแล้ว) */}
        {product && !showConfirm && (
          <div className="flex-1 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300">
            
            {/* Info Card - แบนและประหยัดพื้นที่ */}
            <div className="bg-blue-600 p-4 rounded-[2rem] shadow-xl flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-black truncate leading-tight uppercase">{product.name}</h2>
                <p className="text-[10px] font-mono opacity-60 tracking-tighter">{product.sku_15_digits}</p>
              </div>
              <div className="text-right ml-4">
                <p className="text-[10px] opacity-70 font-bold uppercase">คงเหลือ</p>
                <p className="text-3xl font-black">{product.current_stock}</p>
              </div>
            </div>

            {/* Adjustment Control - ออกแบบใหม่ให้อยู่ในหน้าเดียว */}
            <div className="flex-1 bg-white text-gray-900 rounded-[2rem] p-4 flex flex-col gap-3 shadow-2xl">
              
              {/* Mode Switcher */}
              <div className="flex p-1 bg-gray-100 rounded-xl">
                <button onClick={() => setMode('receive')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-sm transition-all ${mode === 'receive' ? 'bg-white shadow-md text-green-600' : 'text-gray-400'}`}>
                  <Plus size={16}/> รับเข้า
                </button>
                <button onClick={() => setMode('issue')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-sm transition-all ${mode === 'issue' ? 'bg-white shadow-md text-red-600' : 'text-gray-400'}`}>
                  <Minus size={16}/> จ่ายออก
                </button>
              </div>

              {/* Number Input Group */}
              <div className="flex gap-2 h-16">
                <input 
                  type="number" 
                  className={`flex-1 text-3xl font-black rounded-2xl bg-gray-50 border-2 text-center outline-none ${isStockShort ? 'border-red-500 text-red-600' : 'border-transparent focus:border-blue-500'}`} 
                  value={adjustment || ''} 
                  onChange={(e) => setAdjustment(Math.max(0, parseInt(e.target.value) || 0))}
                  placeholder="0"
                />
                <button onClick={() => setAdjustment(prev => Math.max(0, prev - 1))} className="w-16 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400 active:bg-gray-200">
                  <Minus size={24} />
                </button>
              </div>

              {/* Quick Buttons */}
              <div className="grid grid-cols-4 gap-2">
                {[1, 5, 10, 50].map(num => (
                  <button key={num} onClick={() => setAdjustment(prev => prev + num)} className={`py-3 rounded-xl font-black text-sm active:scale-95 transition-all ${mode === 'receive' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {mode === 'receive' ? '+' : '-'}{num}
                  </button>
                ))}
              </div>

              {/* Calculation Summary */}
              <div className={`p-3 rounded-2xl border-2 border-dashed flex justify-between items-center ${mode === 'receive' ? 'bg-green-50/50 border-green-200' : isStockShort ? 'bg-red-50 border-red-500' : 'bg-red-50/50 border-red-200'}`}>
                <span className="text-[10px] font-bold text-gray-400 uppercase">สต๊อกใหม่</span>
                <span className={`text-xl font-black ${mode === 'receive' ? 'text-green-600' : 'text-red-600'}`}>
                  {product.current_stock} {mode === 'receive' ? '+' : '-'} {adjustment} = {mode === 'receive' ? product.current_stock + adjustment : product.current_stock - adjustment}
                </span>
              </div>

              {/* Compact Note */}
              <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-100">
                <MessageSquare size={16} className="text-gray-400 ml-1" />
                <input type="text" placeholder="หมายเหตุ..." className="bg-transparent flex-1 text-sm outline-none" value={note} onChange={(e) => setNote(e.target.value)} />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 mt-auto">
                <button onClick={() => setProduct(null)} className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-bold text-sm">ยกเลิก</button>
                <button 
                  onClick={() => setShowConfirm(true)} 
                  disabled={adjustment === 0 || isStockShort}
                  className={`flex-[2] py-4 rounded-2xl font-black text-sm shadow-lg transition-all ${adjustment === 0 || isStockShort ? 'bg-gray-200 text-gray-400' : 'bg-blue-600 text-white shadow-blue-200 active:scale-95'}`}
                >
                  {isStockShort ? 'สต๊อกไม่พอ' : 'ยืนยันบันทึก'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 4. Confirmation Overlay - ใช้พื้นที่ตรงกลาง */}
      {showConfirm && (
        <div className="fixed inset-0 bg-gray-900/90 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden text-gray-900 animate-in zoom-in duration-200 shadow-2xl">
            <div className={`p-6 text-center text-white ${mode === 'receive' ? 'bg-green-600' : 'bg-red-600'}`}>
              <h3 className="text-xl font-black">ยืนยันรายการ</h3>
              <p className="text-[10px] opacity-80 uppercase tracking-widest mt-1 italic font-bold">{userName} • {new Date().toLocaleTimeString()}</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-xs font-bold uppercase">สต๊อกเดิม</span>
                <span className="text-xl font-bold">{product.current_stock}</span>
              </div>
              <div className="bg-gray-50 p-4 rounded-2xl flex items-center justify-between border-2 border-gray-100">
                <span className="text-gray-400 text-xs font-bold uppercase">ยอดใหม่</span>
                <span className={`text-4xl font-black ${mode === 'receive' ? 'text-green-600' : 'text-red-600'}`}>
                  {mode === 'receive' ? product.current_stock + adjustment : product.current_stock - adjustment}
                </span>
              </div>
              <div className="text-sm text-gray-500 italic bg-gray-50 p-3 rounded-xl border border-gray-100">
                <span className="not-italic font-bold text-xs block text-gray-400 uppercase">หมายเหตุ:</span>
                {note || '-'}
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowConfirm(false)} className="flex-1 py-4 font-bold text-gray-400">แก้ไข</button>
                <button onClick={confirmUpdate} className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-200 active:scale-95">ยืนยัน</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
