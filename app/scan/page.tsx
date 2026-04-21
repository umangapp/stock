'use client'
import { useEffect, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { supabase } from '@/lib/supabaseClient'
import { Package, Minus, Plus, Camera, Search, RefreshCw } from 'lucide-react'

export default function ScanPage() {
  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [isScanning, setIsScanning] = useState(false)

  const startScanner = async () => {
    const html5QrCode = new Html5Qrcode("reader");
    setIsScanning(true);
    
    const qrConfig = { fps: 10, qrbox: { width: 250, height: 250 } };

    try {
      // ใช้กล้องหลังเสมอ (environment)
      await html5QrCode.start(
        { facingMode: "environment" }, 
        qrConfig,
        (decodedText) => {
          // เมื่อสแกนสำเร็จ
          fetchProduct(decodedText);
          html5QrCode.stop().then(() => setIsScanning(false));
        },
        (errorMessage) => { /* ปล่อยผ่านขณะกำลังสแกน */ }
      );
    } catch (err) {
      console.error("Camera error:", err);
      alert("ไม่สามารถเข้าถึงกล้องได้: โปรดตรวจสอบว่าได้อนุญาตให้เข้าถึงกล้องในเบราว์เซอร์แล้ว");
      setIsScanning(false);
    }
  };

  const fetchProduct = async (sku: string) => {
    setLoading(true)
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('sku_15_digits', sku)
      .single()
    
    if (data) {
      setProduct(data)
    } else {
      alert('ไม่พบรหัสสินค้า: ' + sku)
    }
    setLoading(false)
  }

  const updateStock = async (amount: number) => {
    const newStock = product.current_stock + amount
    if (newStock < 0) return
    const { error } = await supabase.from('products').update({ current_stock: newStock }).eq('id', product.id)
    if (!error) setProduct({ ...product, current_stock: newStock })
  }

  return (
    <div className="p-4 max-w-md mx-auto bg-gray-50 min-h-screen pb-20">
      <h1 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <Camera className="text-blue-600" />
        สแกน QR Code
      </h1>

      {/* ส่วนแสดงผลกล้อง */}
      {!product && (
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-3xl bg-black shadow-2xl border-4 border-white aspect-square">
             <div id="reader" className="w-full h-full"></div>
             {!isScanning && (
               <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center">
                 <Camera size={48} className="mb-4 opacity-50" />
                 <button 
                   onClick={startScanner}
                   className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-bold shadow-lg transition-all active:scale-95"
                 >
                   เปิดกล้องสแกน
                 </button>
                 <p className="text-xs mt-4 opacity-60">กดปุ่มเพื่อเริ่มใช้งานกล้อง</p>
               </div>
             )}
          </div>
          
          <div className="flex items-center gap-2">
            <input 
              type="text" 
              placeholder="กรอกรหัส 15 หลัก..." 
              className="flex-1 p-4 rounded-2xl border border-gray-200 outline-none shadow-sm"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
            />
            <button 
              onClick={() => fetchProduct(manualCode)}
              className="bg-gray-800 text-white p-4 rounded-2xl shadow-md"
            >
              <Search size={24} />
            </button>
          </div>
        </div>
      )}

      {/* แสดงข้อมูลสินค้าเมื่อพบ */}
      {loading && <div className="text-center p-10 font-bold flex flex-col items-center gap-2">
        <RefreshCw className="animate-spin text-blue-600" /> กำลังค้นหา...
      </div>}

      {product && !loading && (
        <div className="bg-white p-6 rounded-3xl shadow-xl border border-blue-100 animate-in fade-in zoom-in">
          <div className="mb-4">
             <p className="text-xs text-blue-500 font-bold uppercase">ข้อมูลสินค้า</p>
             <h2 className="text-2xl font-bold text-gray-800">{product.name}</h2>
             <p className="text-sm font-mono text-gray-400">{product.sku_15_digits}</p>
          </div>

          <div className="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-3xl text-white mb-6">
            <span className="text-sm opacity-80 mb-1">สต๊อกปัจจุบัน</span>
            <span className="text-7xl font-black">{product.current_stock}</span>
            <span className="text-lg font-bold mt-1">{product.unit}</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => updateStock(-1)} className="bg-red-50 text-red-600 p-5 rounded-2xl font-bold flex flex-col items-center gap-1 active:bg-red-100">
              <Minus size={24} /> จ่ายออก
            </button>
            <button onClick={() => updateStock(1)} className="bg-green-50 text-green-600 p-5 rounded-2xl font-bold flex flex-col items-center gap-1 active:bg-green-100">
              <Plus size={24} /> รับเข้า
            </button>
          </div>

          <button 
            onClick={() => { setProduct(null); setIsScanning(false); }}
            className="w-full mt-8 py-3 text-gray-400 font-medium border-2 border-dashed border-gray-200 rounded-2xl"
          >
            + สแกนชิ้นต่อไป
          </button>
        </div>
      )}
    </div>
  )
}
