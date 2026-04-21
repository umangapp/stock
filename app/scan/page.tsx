'use client'
import { useEffect, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { supabase } from '@/lib/supabaseClient'
import { Package, Minus, Plus, Camera, Search, RefreshCw, Save, X } from 'lucide-react'

export default function ScanPage() {
  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  
  // States สำหรับระบบสต๊อก
  const [mode, setMode] = useState<'none' | 'receive' | 'issue'>('none')
  const [adjustment, setAdjustment] = useState(0)
  const [note, setNote] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [userName] = useState('Admin User') 

  const startScanner = async () => {
    const html5QrCode = new Html5Qrcode("reader");
    setIsScanning(true);
    try {
      await html5QrCode.start(
        { facingMode: "environment" }, 
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          fetchProduct(decodedText);
          html5QrCode.stop().then(() => setIsScanning(false));
        },
        () => {}
      );
    } catch (err) {
      alert("ไม่สามารถเปิดกล้องได้");
      setIsScanning(false);
    }
  };

  const fetchProduct = async (sku: string) => {
    setLoading(true)
    const { data } = await supabase.from('products').select('*').eq('sku_15_digits', sku).single()
    if (data) {
      setProduct(data)
      setMode('none')
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

      alert(`บันทึกสำเร็จ! สต๊อกใหม่คือ ${newStock} ${product.unit}`);
      setProduct(null);
      setShowConfirm(false);
      setMode('none');
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto bg-gray-50 min-h-screen pb-20 font-sans">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Camera className="text-blue-600" /> สแกน QR Code
        </h1>
        {product && (
          <button onClick={() => setProduct(null)} className="text-gray-400"><X /></button>
        )}
      </div>

      {!product && (
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-3xl bg-black aspect-square shadow-xl border-4 border-white">
             <div id="reader" className="w-full h-full"></div>
             {!isScanning && (
               <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center">
                 <Camera size={48} className="mb-4 opacity-20" />
                 <button onClick={startScanner} className="bg-blue-600 px-8 py-3 rounded-full font-bold shadow-lg active:scale-95">เปิดกล้องสแกน</button>
               </div>
             )}
          </div>
          <div className="flex gap-2">
            <input type="text" placeholder="กรอกรหัส 15 หลัก..." className="flex-1 p-4 rounded-2xl border outline-none shadow-sm" value={manualCode} onChange={(e) => setManualCode(e.target.value)} />
            <button onClick={() => fetchProduct(manualCode)} className="bg-gray-800 text-white p-4 rounded-2xl"><Search size={24} /></button>
          </div>
        </div>
      )}

      {loading && <div className="text-center p-10 font-bold flex flex-col items-center gap-2"><RefreshCw className="animate-spin text-blue-600" /> กำลังค้นหา...</div>}

      {product && !showConfirm && (
        <div className="bg-white p-6 rounded-3xl shadow-xl border border-blue-100 animate-in zoom-in duration-300">
          <div className="mb-4">
             <h2 className="text-2xl font-bold text-gray-800 leading-tight">{product.name}</h2>
             <p className="text-sm font-mono text-gray-400">{product.sku_15_digits}</p>
          </div>

          <div className="p-6 bg-blue-600 rounded-3xl text-white text-center mb-6 shadow-inner">
            <span className="text-xs opacity-80 uppercase block mb-1">สต๊อกปัจจุบัน</span>
            <span className="text-6xl font-black">{product.current_stock}</span>
            <span className="ml-2 text-lg opacity-80">{product.unit}</span>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <button onClick={() => {setMode('receive'); setAdjustment(0);}} className={`p-4 rounded-2xl font-bold flex flex-col items-center gap-1 transition-all ${mode === 'receive' ? 'bg-green-600 text-white shadow-lg ring-4 ring-green-100' : 'bg-green-50 text-green-600'}`}>
              <Plus size={24} /> รับเข้า
            </button>
            <button onClick={() => {setMode('issue'); setAdjustment(0);}} className={`p-4 rounded-2xl font-bold flex flex-col items-center gap-1 transition-all ${mode === 'issue' ? 'bg-red-600 text-white shadow-lg ring-4 ring-red-100' : 'bg-red-50 text-red-600'}`}>
              <Minus size={24} /> จ่ายออก
            </button>
          </div>

          {mode !== 'none' && (
            <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
              <div className="bg-gray-50 p-4 rounded-2xl border-2 border-gray-100">
                <label className="text-xs font-bold text-gray-400 block mb-2 uppercase">ระบุจำนวนที่ต้องการปรับ</label>
                <div className="flex gap-2">
                  <input type="number" className="flex-1 text-3xl font-black p-4 rounded-xl bg-white border-2 border-gray-100 outline-none text-center" value={adjustment || ''} onChange={(e) => setAdjustment(Math.max(0, parseInt(e.target.value) || 0))} placeholder="0" />
                  <button onClick={() => setAdjustment(prev => Math.max(0, prev - 1))} className="bg-white border w-14 rounded-xl flex items-center justify-center text-gray-400"><Minus size={20}/></button>
                </div>
                <div className="grid grid-cols-4 gap-2 mt-3">
                  {[1, 5, 10, 50].map(num => (
                    <button key={num} onClick={() => setAdjustment(prev => prev + num)} className={`p-3 rounded-xl font-bold ${mode === 'receive' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{mode === 'receive' ? '+' : '-'}{num}</button>
                  ))}
                </div>
              </div>

              <div className={`p-4 rounded-2xl border-2 border-dashed ${mode === 'receive' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="text-sm font-bold text-gray-700">ปรับใหม่: {product.current_stock} {mode === 'receive' ? '+' : '-'} {adjustment} = <span className={`ml-2 text-2xl font-black ${mode === 'receive' ? 'text-green-600' : 'text-red-600'}`}>{mode === 'receive' ? product.current_stock + adjustment : product.current_stock - adjustment}</span></div>
              </div>

              <textarea className="w-full border p-4 rounded-2xl outline-none" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="หมายเหตุ (ถ้ามี)..." />
              
              <div className="flex gap-3">
                 <button onClick={() => setMode('none')} className="flex-1 bg-gray-100 text-gray-500 py-5 rounded-2xl font-bold">ยกเลิก</button>
                 <button onClick={() => setShowConfirm(true)} disabled={adjustment === 0} className={`flex-[2] py-5 rounded-2xl font-bold shadow-xl ${adjustment === 0 ? 'bg-gray-300' : 'bg-blue-600 text-white'}`}>บันทึกรายการ</button>
              </div>
            </div>
          )}
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white w-full rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in duration-200">
            <div className={`p-6 text-white text-center ${mode === 'receive' ? 'bg-green-600' : 'bg-red-600'}`}>
               <h3 className="text-xl font-bold">ยืนยันรายการ</h3>
               <p className="opacity-80 text-xs">{new Date().toLocaleString('th-TH')}</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between border-b pb-2"><span className="text-gray-400">สินค้า</span><span className="font-bold">{product.name}</span></div>
              <div className="flex justify-between border-b pb-2 text-xl font-black">
                <span>สต๊อกใหม่</span>
                <span className={mode === 'receive' ? 'text-green-600' : 'text-red-600'}>{mode === 'receive' ? product.current_stock + adjustment : product.current_stock - adjustment}</span>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl text-sm italic text-gray-500">Note: {note || '-'}</div>
              <div className="flex gap-4 pt-4">
                <button onClick={() => setShowConfirm(false)} className="flex-1 py-4 bg-gray-100 rounded-2xl font-bold text-gray-400">แก้ไข</button>
                <button onClick={confirmUpdate} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg">ยืนยัน</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
