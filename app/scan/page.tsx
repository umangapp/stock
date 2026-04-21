'use client'
import { useEffect, useState } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { supabase } from '@/lib/supabaseClient'
import { Package, Minus, Plus, Camera, Search } from 'lucide-react'

export default function ScanPage() {
  const [scannedData, setScannedData] = useState<string | null>(null)
  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [manualCode, setManualCode] = useState('')

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "reader", 
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    )

    const onScanSuccess = (decodedText: string) => {
      setScannedData(decodedText)
      fetchProduct(decodedText)
      scanner.clear().catch(err => console.error("Failed to clear scanner", err))
    }

    const onScanFailure = (error: any) => {
      // ปล่อยผ่านเพื่อให้สแกนต่อไป
    }

    scanner.render(onScanSuccess, onScanFailure)

    // แก้ไขตรงนี้: เขียน Cleanup function ให้ถูกต้อง
    return () => {
      scanner.clear().catch(err => console.error("Cleanup error", err))
    }
  }, [])

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
      setScannedData(null)
    }
    setLoading(false)
  }

  const updateStock = async (amount: number) => {
    const newStock = product.current_stock + amount
    if (newStock < 0) return

    const { error } = await supabase
      .from('products')
      .update({ current_stock: newStock })
      .eq('id', product.id)

    if (!error) {
      setProduct({ ...product, current_stock: newStock })
    }
  }

  return (
    <div className="p-4 max-w-md mx-auto bg-gray-50 min-h-screen pb-20">
      <h1 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <Camera className="text-blue-600" />
        สแกน QR Code สินค้า
      </h1>

      {!scannedData && (
        <div className="space-y-4">
          <div id="reader" className="overflow-hidden rounded-2xl border-0 shadow-lg bg-black"></div>
          
          <div className="flex items-center gap-2">
            <input 
              type="text" 
              placeholder="หรือกรอกรหัส 15 หลัก..." 
              className="flex-1 p-3 rounded-xl border border-gray-200 outline-none"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
            />
            <button 
              onClick={() => { setScannedData(manualCode); fetchProduct(manualCode); }}
              className="bg-gray-800 text-white p-3 rounded-xl"
            >
              <Search size={20} />
            </button>
          </div>
        </div>
      )}

      {loading && <div className="text-center p-10 font-bold">กำลังค้นหา...</div>}

      {scannedData && product && !loading && (
        <div className="bg-white p-6 rounded-3xl shadow-xl border border-blue-100 animate-in fade-in zoom-in duration-300">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs text-blue-500 font-bold uppercase tracking-wider">พบสินค้าแล้ว</p>
              <h2 className="text-2xl font-bold text-gray-800 leading-tight">{product.name}</h2>
              <p className="text-sm font-mono text-gray-400 mt-1">{product.sku_15_digits}</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-2xl">
              <Package className="text-blue-600" size={30} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
            <div className="bg-gray-50 p-3 rounded-xl">
              <span className="text-gray-400 block">ขนาด</span>
              <span className="font-bold">{product.width}x{product.length}x{product.height}</span>
            </div>
            <div className="bg-gray-50 p-3 rounded-xl">
              <span className="text-gray-400 block">หน่วย</span>
              <span className="font-bold">{product.unit}</span>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center p-6 bg-blue-600 rounded-3xl text-white">
            <span className="text-sm opacity-80 mb-2">สต๊อกคงเหลือปัจจุบัน</span>
            <span className="text-6xl font-black">{product.current_stock}</span>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6">
            <button 
              onClick={() => updateStock(-1)}
              className="flex items-center justify-center gap-2 bg-red-100 text-red-600 py-4 rounded-2xl font-bold active:scale-95 transition-all"
            >
              <Minus size={20} /> จ่ายออก
            </button>
            <button 
              onClick={() => updateStock(1)}
              className="flex items-center justify-center gap-2 bg-green-100 text-green-600 py-4 rounded-2xl font-bold active:scale-95 transition-all"
            >
              <Plus size={20} /> รับเข้า
            </button>
          </div>

          <button 
            onClick={() => { window.location.reload(); }}
            className="w-full mt-6 text-gray-400 text-sm font-medium hover:text-gray-600 underline"
          >
            สแกนชิ้นต่อไป
          </button>
        </div>
      )}
    </div>
  )
}
