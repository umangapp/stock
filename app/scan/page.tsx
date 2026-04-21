'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function ScanPage() {
  const [product, setProduct] = useState<any>(null)
  const [amount, setAmount] = useState(0)
  const [note, setNote] = useState('')

  // ฟังก์ชันจำลองการสแกน (ในระบบจริงจะเชื่อมกับกล้อง)
  const handleScan = async (sku: string) => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('sku_15_digits', sku)
      .single()
    
    if (data) setProduct(data)
    else alert('ไม่พบสินค้าชิ้นนี้ในระบบ')
  }

  const handleUpdateStock = async (type: 'เพิ่ม' | 'นำออก') => {
    if (!product) return
    
    // คำนวณสต็อกใหม่
    const change = type === 'เพิ่ม' ? amount : -amount
    const newStock = product.current_stock + change

    // ข้อ 3.2: ป้องกันสต๊อกติดลบหรือต่ำกว่า 1 (ถ้าเป็นกรณีนำออก)
    if (type === 'นำออก' && newStock < 1) {
      alert('ข้อผิดพลาด: สต๊อกห้ามต่ำกว่า 1 ตามนโยบาย Safety Stock') [cite: 32]
      return
    }

    // บันทึกรายการ (Transaction) และอัปเดตสต็อก
    const { error } = await supabase.from('transactions').insert([{
      product_id: product.id,
      action_type: type,
      quantity: amount,
      stock_before: product.current_stock,
      stock_after: newStock,
      note: note
    }]) [cite: 30, 33, 35, 38, 39]

    if (!error) {
      await supabase.from('products').update({ current_stock: newStock }).eq('id', product.id)
      alert(`บันทึกการ ${type} สำเร็จ! ยอดใหม่คือ: ${newStock}`) [cite: 40]
      setProduct({...product, current_stock: newStock})
      setAmount(0)
    }
  }

  return (
    <div className="p-4 max-w-md mx-auto bg-gray-50 min-h-screen">
      <h1 className="text-xl font-bold mb-4">สแกนสินค้า</h1>
      
      {!product ? (
        <div className="border-2 border-dashed border-gray-400 p-10 text-center rounded-lg">
          <p>กดเพื่อเปิดกล้องสแกน QR Code</p>
          <input 
            type="text" 
            placeholder="หรือกรอกรหัส 15 หลัก" 
            className="mt-4 p-2 border w-full"
            onKeyDown={(e) => e.key === 'Enter' && handleScan(e.currentTarget.value)}
          /> [cite: 21, 43]
        </div>
      ) : (
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="font-bold text-lg">{product.name}</h2>
          <p className="text-sm text-gray-500">รหัส: {product.sku_15_digits}</p>
          <div className="my-2 p-2 bg-blue-50 rounded text-sm">
            สต็อกปัจจุบัน: <span className="font-bold text-blue-700">{product.current_stock} {product.unit}</span>
          </div> [cite: 23, 27]

          {/* ปุ่มปรับจำนวน 5, 10, 50 ตามข้อ 4.5/4.6 */}
          <div className="grid grid-cols-3 gap-2 my-4">
            {[5, 10, 50].map(val => (
              <button 
                key={val} 
                onClick={() => setAmount(prev => prev + val)}
                className="bg-gray-200 py-2 rounded font-bold"
              >+{val}</button>
            ))} [cite: 45, 46]
          </div>

          <div className="flex items-center justify-between bg-gray-100 p-2 rounded mb-4">
            <span className="text-sm">จำนวนที่จะปรับ:</span>
            <span className="text-xl font-bold text-orange-600">{amount}</span>
          </div>

          <textarea 
            placeholder="ระบุหมายเหตุ (ถ้ามี)" 
            className="w-full border p-2 text-sm mb-4"
            onChange={(e) => setNote(e.target.value)}
          /> [cite: 35]

          <div className="flex gap-2">
            <button 
              onClick={() => handleUpdateStock('เพิ่ม')}
              className="flex-1 bg-green-200 text-green-800 py-3 rounded-lg font-bold"
            >เพิ่ม</button>
            <button 
              onClick={() => handleUpdateStock('นำออก')}
              className="flex-1 bg-red-200 text-red-800 py-3 rounded-lg font-bold"
            >นำออก</button>
          </div> [cite: 34, 44]
          
          <button onClick={() => setProduct(null)} className="w-full mt-4 text-gray-400 text-sm">ยกเลิก/สแกนใหม่</button>
        </div>
      )}
    </div>
  )
}
