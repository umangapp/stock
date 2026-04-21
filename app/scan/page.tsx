'use client'
import { useEffect, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { supabase } from '@/lib/supabaseClient'
import { Package, Minus, Plus, Camera, Search, RefreshCw, Save, X, User, Clock, ArrowRight } from 'lucide-react'

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

      alert(`✅ บันทึกสำเร็จ! สต๊อกใหม่คือ ${newStock} ${product.unit}`);
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
          <button onClick={() => setProduct(null)} className="p-2 text-gray-400"><X /></button>
        )}
      </div>

      {!product && (
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-3xl bg-black aspect-square shadow-xl border-4 border-white">
             <div id="reader" className="w-full h-full"></div>
             {!isScanning && (
               <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center">
                 <Camera size={48} className="mb-4 opacity-20" />
                 <button onClick={startScanner} className="bg-blue-600 px-8 py-3 rounded-full font-bold shadow-lg active:scale-95 transition-all">เปิดกล้องสแกน</button>
               </div>
             )}
          </div>
          <div className="flex gap-2">
            <input type="text" placeholder="กรอกรหัส 15 หลัก..." className="flex-1 p-4 rounded-2xl border border-gray-200 outline-none shadow-sm" value={manualCode} onChange={(e) => setManualCode(e.target.value)} />
            <button onClick={() => fetchProduct(manualCode)} className="bg-gray-800 text-white p-4 rounded-2xl shadow-md active:scale-95"><Search size={24} /></button>
          </div>
        </div>
      )}

      {loading && <div className="text-center p-10 font-bold flex flex-col items-center gap-2 text-blue-600"><RefreshCw className="animate-spin" /> กำลังค้นหาข้อมูล...</div>}

      {product && !showConfirm && (
        <div className="bg-white p-6 rounded-3xl shadow-xl border border-blue-50 animate-in zoom-in duration-300">
          <div className="mb-4 border-b pb-4">
             <p className="text-xs text-blue-500 font-bold uppercase tracking-wider mb-1">พบข้อมูลสินค้า</p>
             <h2 className="text-2xl font-bold text-gray-800 leading-tight">{product.name}</h2>
             <p className="text-sm font-mono text-gray-400">{product.sku_15_digits}</p>
          </div>

          <div className="p-6 bg-blue-600 rounded-3xl text-white text-center mb-6 shadow-lg">
            <span className="text-xs opacity-80 uppercase block mb-1 font-semibold">สต๊อกคงเหลือปัจจุบัน</span>
            <span className="text-6xl font-black">{product.current_stock}</span>
            <span className="ml-2 text-lg font-bold">{product.unit}</span>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <button onClick={() => {setMode('receive'); setAdjustment(0);}} className={`p-4 rounded-2xl font-bold flex flex-col items-center gap-1 transition-all ${mode === 'receive' ? 'bg-green-600 text-white shadow-lg ring-4 ring-green-100' : 'bg-green-50 text-green-600 opacity-60'}`}>
              <Plus size={24} /> รับเข้า
            </button>
            <button onClick={() => {setMode('issue'); setAdjustment(0);}} className={`p-4 rounded-2xl font-bold flex flex-col items-center gap-1 transition-all ${mode === 'issue' ? 'bg-red-600 text-white shadow-lg ring-4 ring-red-100' : 'bg-red-50 text-red-600 opacity-60'}`}>
              <Minus size={24} /> จ่ายออก
            </button>
          </div>

          {mode !== 'none' && (
            <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
              <div className="bg-gray-50 p-4 rounded-2xl border-2 border-gray-100">
                <label className="text-xs font-bold text-gray-400 block mb-2 uppercase">ระบุจำนวนสินค้า</label>
                <div className="flex gap-2">
                  <input type="number" className="flex-1 text-3xl font-black p-4 rounded-xl bg-white border-2 border-gray-100 outline-none text-center focus:border-blue-500" value={adjustment || ''} onChange={(e) => setAdjustment(Math.max(0, parseInt(e.target.value) || 0))} placeholder="0" />
                  <button onClick={() => setAdjustment(prev => Math.max(0, prev - 1))} className="bg-white border w-14 rounded-xl flex items-center justify-center text-gray-400 active:bg-gray-100"><Minus size={20}/></button>
                </div>
                <div className="grid grid-cols-4 gap-2 mt-3">
                  {[1, 5, 10, 50].map(num => (
                    <button key={num} onClick={() => setAdjustment(prev => prev + num)} className={`p-3 rounded-xl font-bold active:scale-90 transition-all ${mode === 'receive' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{mode === 'receive' ? '+' : '-'}{num}</button>
                  ))}
                </div>
              </div>

              <div className={`p-4 rounded-2xl border-2 border-dashed ${mode === 'receive' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="text-sm font-bold text-gray-700 flex items-center justify-between">
                   <span>คำนวณ: {product.current_stock} {mode === 'receive' ? '+' : '-'} {adjustment}</span>
                   <span className={`text-2xl font-black ${mode === 'receive' ? 'text-green-600' : 'text-red-600'}`}>= {mode === 'receive' ? product.current_stock + adjustment : product.current_stock - adjustment}</span>
                </div>
              </div>

              <textarea className="w-full border p-4 rounded-2xl outline-none focus:ring-4 focus:ring-blue-50 border-gray-200 transition-all" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="หมายเหตุ (ถ้ามี)..." />
              
              <div className="flex gap-3">
                 <button onClick={() => setMode('none')} className="flex-1 bg-gray-100 text-gray-500 py-5 rounded-2xl font-bold">ยกเลิก</button>
                 <button onClick={() => setShowConfirm(true)} disabled={adjustment === 0} className={`flex-[2] py-5 rounded-2xl font-bold shadow-xl transition-all ${adjustment === 0 ? 'bg-gray-300' : 'bg-blue-600 text-white shadow-blue-200 active:scale-95'}`}>บันทึกรายการ</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* หน้าสรุปที่สวยงามแบบเดิมที่คุณชอบ */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white w-full rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in duration-200 border border-white">
            
            {/* Header แยกสีตามประเภท */}
            <div className={`p-8 text-white text-center ${mode === 'receive' ? 'bg-green-600' : 'bg-red-600'}`}>
               <h3 className="text-2xl font-black mb-1">ยืนยันรายการ</h3>
               <div className="flex items-center justify-center gap-1 text-xs opacity-80">
                 <Clock size={14} />
                 <span>{new Date().toLocaleString('th-TH')}</span>
               </div>
            </div>

            <div className="p-8 space-y-5">
              {/* รายละเอียดสินค้า */}
              <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                <div className="flex items-center gap-2 text-gray-400"><Package size={18} /> สินค้า</div>
                <span className="font-bold text-gray-800">{product.name}</span>
              </div>

              {/* ชื่อผู้บันทึก */}
              <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                <div className="flex items-center gap-2 text-gray-400"><User size={18} /> ผู้บันทึก</div>
                <span className="font-bold text-gray-800">{userName}</span>
              </div>

              {/* สต๊อก ก่อน -> หลัง */}
              <div className="bg-gray-50 p-6 rounded-3xl flex justify-between items-center">
                <div className="text-center">
                   <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">สต๊อกเดิม</p>
                   <p className="text-2xl font-bold text-gray-500">{product.current_stock}</p>
                </div>
                <ArrowRight className="text-gray-300" />
                <div className="text-center">
                   <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">สต๊อกใหม่</p>
                   <p className={`text-4xl font-black ${mode === 'receive' ? 'text-green-600' : 'text-red-600'}`}>
                     {mode === 'receive' ? product.current_stock + adjustment : product.current_stock - adjustment}
                   </p>
                </div>
              </div>

              {/* หมายเหตุ */}
              <div className="bg-gray-100/50 p-4 rounded-2xl text-sm italic text-gray-500 flex flex-col gap-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase not-italic">หมายเหตุ</span>
                {note || 'ไม่มีข้อมูลหมายเหตุ'}
              </div>

              {/* ปุ่มกดยืนยัน/แก้ไข */}
              <div className="flex gap-4 pt-4">
                <button onClick={() => setShowConfirm(false)} className="flex-1 py-4 bg-gray-100 rounded-2xl font-bold text-gray-400 hover:bg-gray-200 transition-colors">แก้ไข</button>
                <button onClick={confirmUpdate} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition-all">ยืนยันบันทึก</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
