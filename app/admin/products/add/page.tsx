'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function AddProductPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [width, setWidth] = useState('')
  const [length, setLength] = useState('')
  const [height, setHeight] = useState('')
  const [receiveDate, setReceiveDate] = useState('')
  const [unit, setUnit] = useState('ชิ้น')
  const [skuPreview, setSkuPreview] = useState('')

  // ฟังก์ชันคำนวณรหัส SKU: ST + (กว้างยาวสูง 6 หลัก) + (YYMMDD 6 หลัก) + x ให้ครบ 15 หลัก
  useEffect(() => {
    if (width && length && height && receiveDate) {
      const prefix = 'ST'

      // 1. จัดการขนาด (อย่างละ 2 หลัก) - ตัดจุดทศนิยมออก
      const formatDim = (val: string) => {
        // ลบจุดออก (เช่น 3.2 -> 32) แล้วเอา 2 หลักแรก ถ้าไม่ถึงเติม 0 ข้างหน้า
        const clean = val.replace('.', '') 
        return clean.substring(0, 2).padStart(2, '0')
      }

      const wPart = formatDim(width)
      const lPart = formatDim(length)
      const hPart = formatDim(height)

      // 2. จัดการวันที่แบบ YYMMDD (6 หลัก)
      const dateParts = receiveDate.split('-') // จาก 2024-06-06 -> ['2024', '06', '06']
      const yy = dateParts[0].substring(2, 4)  // '24'
      const mm = dateParts[1]                 // '06'
      const dd = dateParts[2]                 // '06'
      const datePart = `${yy}${mm}${dd}`      // '240606'

      // 3. รวมร่าง (ได้ 14 หลัก) และเติม x ให้ครบ 15 หลักพอดี
      const baseSku = `${prefix}${wPart}${lPart}${hPart}${datePart}`
      const finalSku = baseSku.padEnd(15, 'x')
      
      setSkuPreview(finalSku)
    } else {
      setSkuPreview('รอข้อมูลครบ...')
    }
  }, [width, length, height, receiveDate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // บันทึกลงฐานข้อมูล
    const { error } = await supabase.from('products').insert([{
      name,
      sku_15_digits: skuPreview,
      width: parseFloat(width),
      length: parseFloat(length),
      height: parseFloat(height),
      receive_date: receiveDate,
      unit,
      current_stock: 0 // เริ่มต้นที่ 0 เสมอ
    }])

    if (!error) {
      alert('เพิ่มสินค้าสำเร็จ! รหัสคือ: ' + skuPreview)
      router.push('/dashboard') // บันทึกเสร็จกลับไปหน้า Dashboard
    } else {
      alert('เกิดข้อผิดพลาด: ' + error.message)
    }
  }

  return (
    <div className="p-4 max-w-md mx-auto bg-gray-50 min-h-screen">
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => router.back()} className="text-gray-500">←</button>
        <h1 className="text-xl font-bold text-gray-800">เพิ่มสินค้าใหม่</h1>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* ส่วนแสดงผล Preview รหัส */}
        <div className="p-5 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl shadow-lg text-white">
          <label className="text-xs opacity-80 uppercase font-bold tracking-wider">รหัสสินค้าที่จะถูกสร้าง (15 หลัก)</label>
          <div className="text-2xl font-mono font-bold mt-1 tracking-widest">
            {skuPreview}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm space-y-4 border border-gray-100">
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">ชื่อสินค้า</label>
            <input type="text" required className="w-full border-gray-200 border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
              value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น ถุงเท้า Umang A1" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">กว้าง (cm)</label>
              <input type="number" step="any" required className="w-full border-gray-200 border p-3 rounded-lg outline-none" 
                value={width} onChange={(e) => setWidth(e.target.value)} placeholder="3.2" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">ยาว (cm)</label>
              <input type="number" step="any" required className="w-full border-gray-200 border p-3 rounded-lg outline-none" 
                value={length} onChange={(e) => setLength(e.target.value)} placeholder="10" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">สูง (cm)</label>
              <input type="number" step="any" required className="w-full border-gray-200 border p-3 rounded-lg outline-none" 
                value={height} onChange={(e) => setHeight(e.target.value)} placeholder="2000" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">วันที่รับสินค้า</label>
            <input type="date" required className="w-full border-gray-200 border p-3 rounded-lg outline-none" 
              value={receiveDate} onChange={(e) => setReceiveDate(e.target.value)} />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">หน่วยนับ</label>
            <select className="w-full border-gray-200 border p-3 rounded-lg outline-none bg-white" 
              value={unit} onChange={(e) => setUnit(e.target.value)}>
              <option value="ชิ้น">ชิ้น</option>
              <option value="คู่">คู่</option>
              <option value="กล่อง">กล่อง</option>
              <option value="แพ็ค">แพ็ค</option>
            </select>
          </div>
        </div>

        <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-md hover:bg-blue-700 transition-all active:scale-95 mt-4">
          บันทึกข้อมูลสินค้า
        </button>
      </form>
    </div>
  )
}
