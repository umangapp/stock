'use client'
import { useEffect, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { supabase } from '@/lib/supabaseClient'
import { Package, Minus, Plus, Camera, Search, RefreshCw, CheckCircle2, XCircle } from 'lucide-react'

export default function ScanPage() {
  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  
  // States สำหรับระบบปรับสต๊อกใหม่
  const [mode, setMode] = useState<'none' | 'receive' | 'issue'>('none')
  const [adjustment, setAdjustment] = useState(0)
  const [note, setNote] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [userName, setUserName] = useState('Admin User') // สามารถเปลี่ยนเป็นระบบ Login ได้ในอนาคต

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
      alert("เปิดกล้องไม่ได้: โปรดเช็ค Permissions");
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

  const handleSaveRequest = (e: React.FormEvent) => {
    e.preventDefault()
    if (adjustment === 0) return alert("กรุณาระบุจำนวนสินค้า")
    setShowConfirm(true)
  }

  const confirmUpdate = async () => {
    const finalAmount = mode === 'receive' ? adjustment : -adjustment
    const newStock = product.current_stock + finalAmount

    // 1. อัปเดตสต๊อกสินค้า
    const { error: updateError } = await supabase
      .from('products')
      .update({ current_stock: newStock })
      .eq('id', product.id)

    if (!updateError) {
      // 2. บันทึกประวัติ (Transaction)
      await supabase.from('transactions').insert([{
        product_id: product.id,
        type: mode,
        amount: adjustment,
        stock_before: product.current_stock,
        stock_after: newStock,
        note: note,
        created_by: userName
      }])

      // 3. แสดง Toast Success (ใช้ alert ชั่วคราว)
      alert(`✅ บันทึกสำเร็จ! ${mode === 'receive' ? 'เพิ่ม' : 'ลด'}สินค้าจำนวน ${adjustment} ${product.unit}`);
      
      // Reset หน้าจอ
      setProduct(null)
      setShowConfirm(false)
      setMode('none')
    }
  }

  return (
    <div className="p-4 max-w-md mx-auto bg-gray-50 min-h-screen pb-20">
      <h1 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <Camera className="text-blue-600" /> สแกน QR Code
      </h1>

      {!product && (
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-3xl bg-black aspect-square shadow-xl">
             <div id="reader" className="w-full h-full"></div>
             {!isScanning && (
               <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
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

      {product && !showConfirm && (
        <div className="bg-white p-6 rounded-3xl shadow-xl border border-blue-100 animate-in zoom-in duration-300">
          <div className="mb-4">
             <h2 className="text-2xl font-bold text-gray-800">{product.name}</h2>
             <p className="text-sm font-mono text-gray-400">{product.sku_15_digits}</p>
          </div>

          <div className="p-6 bg-blue-600 rounded-2xl text-white text-center mb-6">
            <span className="text-xs opacity-80 uppercase block">สต๊อกปัจจุบัน</span>
            <span className="text-5xl font-black">{product.current_stock} <small className="text-lg font-normal">{product.unit}</small></span>
          </div>

          {/* 1. เลือกโหมด รับเข้า/จ่ายออก */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {mode !== 'issue' && (
              <button onClick={() => setMode('receive')} className={`p-4 rounded-2xl font-bold flex flex-col items-center gap-1 transition-all ${mode === 'receive' ? 'bg-green-600 text-white ring-4 ring-green-100' : 'bg-green-50 text-green-600'}`}>
                <Plus size={24} /> รับเข้า
              </button>
            )}
            {mode !== 'receive' && (
              <button onClick={() => setMode('issue')} className={`p-4 rounded-2xl font-bold flex flex-col items-center gap-1 transition-all ${mode === 'issue' ? 'bg-red-600 text-white ring-4 ring-red-100' : 'bg-red-50 text-red-600'}`}>
                <Minus size={24} /> จ่ายออก
              </button>
            )}
          </div>

          {/* 2. ปุ่มเพิ่ม/ลดจำนวน (แสดงเฉพาะเมื่อเลือกโหมด) */}
          {mode !== 'none' && (
            <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
              <div className="grid grid-cols-4 gap-2">
                {[1, 5, 10, 50].map(num => (
                  <button key={num} onClick={() => setAdjustment(prev => prev + num)} className="bg-gray-100 p-3 rounded-xl font-bold hover:bg-gray-200 active:scale-90 transition-all">+{num}</button>
                ))}
              </div>

              <div className="bg-gray-50 p-4 rounded-2xl border-2 border-dashed border-gray-200">
                <div className="flex justify-between text-sm text-gray-500 mb-1">
                  <span>จำนวนที่เลือก: {adjustment}</span>
                  <button onClick={() => setAdjustment(0)} className="text-blue-600 underline">ล้าง</button>
                </div>
                <div className="text-lg font-bold text-gray-700">
                  ปรับสต๊อก = {product.current_stock} {mode === 'receive' ? '+' : '-'} {adjustment} = 
                  <span className={mode === 'receive' ? 'text-green-600 ml-1' : 'text-red-600 ml-1'}>
                    {mode === 'receive' ? product.current_stock + adjustment : product.current_stock - adjustment}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 ml-1 uppercase">หมายเหตุ (ถ้ามี)</label>
                <textarea className="w-full border p-3 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-blue-100" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="ระบุเหตุผลการปรับปรุง..." />
              </div>

              <div className="flex gap-3">
                 <button onClick={() => setMode('none')} className="flex-1 bg-gray-200 text-gray-600 py-4 rounded-2xl font-bold">ยกเลิก</button>
                 <button onClick={handleSaveRequest} className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-200">บันทึกรายการ</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Modal ยืนยันข้อมูล */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white w-full rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className={`p-6 text-white text-center ${mode === 'receive' ? 'bg-green-600' : 'bg-red-600'}`}>
               <h3 className="text-xl font-bold">ยืนยันทำรายการ</h3>
               <p className="opacity-80 text-sm italic">{new Date().toLocaleString('th-TH')}</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">ผู้ทำรายการ</span>
                <span className="font-bold">{userName}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">ประเภท</span>
                <span className={`font-bold ${mode === 'receive' ? 'text-green-600' : 'text-red-600'}`}>
                  {mode === 'receive' ? 'รับเข้าสินค้า (+)' : 'จ่ายสินค้าออก (-)'}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2 text-lg">
                <span className="text-gray-500">สต๊อกเดิม</span>
                <span className="font-bold">{product.current_stock}</span>
              </div>
              <div className="flex justify-between border-b pb-2 text-xl">
                <span className="text-gray-500 font-bold">สต๊อกใหม่</span>
                <span className={`font-black ${mode === 'receive' ? 'text-green-600' : 'text-red-600'}`}>
                  {mode === 'receive' ? product.current_stock + adjustment : product.current_stock - adjustment}
                </span>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl text-sm">
                <span className="text-gray-400 block mb-1">หมายเหตุ:</span>
                {note || '-'}
              </div>
              <div className="flex gap-4 pt-4">
                <button onClick={() => setShowConfirm(false)} className="flex-1 py-4 bg-gray-100 rounded-2xl font-bold text-gray-400">ยกเลิก</button>
                <button onClick={confirmUpdate} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200">ยืนยันบันทึก</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
