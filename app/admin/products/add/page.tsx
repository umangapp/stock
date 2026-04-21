'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Link from 'next/navigation'

export default function AddProductPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [width, setWidth] = useState('')
  const [length, setLength] = useState('')
  const [height, setHeight] = useState('')
  const [receiveDate, setReceiveDate] = useState('')
  const [unit, setUnit] = useState('ชิ้น')
  const [skuPreview, setSkuPreview] = useState('')

  // ฟังก์ชันคำนวณรหัส 15 หลัก ตามเงื่อนไขของ Umang BKK
  useEffect(() => {
    if (width && length && height && receiveDate) {
      const prefix = 'ST'

      // 1. จัดการขนาด (อย่างละ 2 หลัก)
      const formatDim = (val: string) => {
        const clean = val.replace('.', '') // ลบจุดทศนิยม (เช่น 3.2 -> 32)
        return clean.substring(0, 2).padStart(2, '0') // เอา 2 หลักแรก ถ้าไม่ถึงเติม 0
      }

      const wPart = formatDim(width)
      const lPart = formatDim(length)
      const hPart = formatDim(height)

      // 2. จัดการวันที่ (YYMMDD)
      // receiveDate format ปกติคือ YYYY-MM-DD
      const dateParts = receiveDate.split('-')
      const yy = dateParts[0].substring(2, 4) // เอา 2 หลักท้ายของปี
      const mm = dateParts[1]
      const dd = dateParts[2]
      const datePart = `${yy}${mm}${dd}`

      // 3. รวมร่างและเติม x
      const baseSku = `${prefix}${wPart}${lPart}${hPart}${datePart}`
      setSkuPreview(baseSku.padEnd(15, 'x'))
    } else {
      setSkuPreview('กรุณากรอกข้อมูลให้ครบ...')
    }
  }, [width, length, height, receiveDate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.from('products').insert([{
      name,
      sku_15_digits: skuPreview,
      width: parseFloat(width),
      length: parseFloat(length),
      height: parseFloat(height),
      receive_date: receiveDate,
      unit,
      current_stock: 0
    }])

    if (!error) {
      alert('เพิ่มสินค้าและเจนรหัสสำเร็จ!')
      router.push('/dashboard')
    } else {
      alert('เกิดข้อผิดพลาด: ' + error.message)
    }
  }

  return (
    <div className="p-4 max-w-md mx-auto bg-white min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-blue-800">เพิ่มสินค้าใหม่</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
          <label className="text-xs font-bold text-blue-600 uppercase">Preview รหัสที่จะได้ (15 หลัก)</label>
          <div className="text-xl font-mono font-bold text-blue-900 break-all">{skuPreview}</div>
        </div>

        <div>
          <label className="block text-sm font-medium">ชื่อสินค้า</label>
          <input type="text" required className="w-full border p-2 rounded" 
            value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น ถุงเท้าสีดำ" />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-sm font-medium">กว้าง (cm)</label>
            <input type="number" step="any" required className="w-full border p-2 rounded" 
              value={width} onChange={(e) => setWidth(e.target.value)} placeholder="3.2" />
          </div>
          <div>
            <label className="block text-sm font-medium">ยาว (cm)</label>
            <input type="number" step="any" required className="w-full border p-2 rounded" 
              value={length} onChange={(e) => setLength(e.target.value)} placeholder="10" />
          </div>
          <div>
            <label className="block text-sm font-medium">สูง (cm)</label>
            <input type="number" step="any" required className="w-full border p-2 rounded" 
              value={height} onChange={(e) => setHeight(e.target.value)} placeholder="2000" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium">วันที่รับสินค้า</label>
          <input type="date" required className="w-full border p-2 rounded" 
            value={receiveDate} onChange={(e) => setReceiveDate(e.target.value)} />
        </div>

        <div>
          <label className="block text-sm font-medium">หน่วยเรียก</label>
          <select className="w-full border p-2 rounded" value={unit} onChange={(e) => setUnit(e.target.value)}>
            <option value="ชิ้น">ชิ้น</option>
            <option value="คู่">คู่</option>
            <option value="กล่อง">กล่อง</option>
            <option value="แพ็ค">แพ็ค</option>
          </select>
        </div>

        <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg mt-4">
          บันทึกสินค้า
        </button>
      </form>
    </div>
  )
}
