'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function AddProductPage() {
  const router = useRouter()
  const [name, setName] = useState('') 
  const [prefix, setPrefix] = useState('') 
  const [width, setWidth] = useState('')
  const [length, setLength] = useState('')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('') // เพิ่มน้ำหนัก
  const [receiveDate, setReceiveDate] = useState('') 
  const [unit, setUnit] = useState('Kg')
  const [skuPreview, setSkuPreview] = useState('')

  useEffect(() => {
    if (prefix.length >= 2 && width && length && height && receiveDate.length === 6) {
      const formatDim = (val: string) => {
        const clean = val.replace('.', '') 
        return clean.substring(0, 2).padStart(2, '0')
      }
      const wPart = formatDim(width)
      const lPart = formatDim(length)
      const hPart = formatDim(height)
      const datePart = receiveDate 

      const baseSku = `${prefix.toUpperCase()}${wPart}${lPart}${hPart}${datePart}`
      const finalSku = baseSku.padEnd(15, 'x')
      setSkuPreview(finalSku)
    } else {
      setSkuPreview('รอข้อมูลครบ...')
    }
  }, [prefix, width, length, height, receiveDate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (receiveDate.length !== 6) {
      alert('กรุณากรอกวันที่ให้ครบ 6 หลัก (YYMMDD)')
      return
    }

    const { error } = await supabase.from('products').insert([{
      name,
      prefix: prefix.toUpperCase(),
      sku_15_digits: skuPreview,
      width: parseFloat(width),
      length: parseFloat(length),
      height: parseFloat(height),
      weight: parseFloat(weight) || 0, // ส่งค่าน้ำหนักไปยัง Supabase
      receive_date_text: receiveDate,
      unit,
      current_stock: 0
    }])

    if (!error) {
      alert('เพิ่มสินค้าสำเร็จ! รหัสคือ: ' + skuPreview)
      router.push('/dashboard')
    } else {
      alert('Error: ' + error.message)
    }
  }

  return (
    <div className="p-4 max-w-md mx-auto bg-gray-50 min-h-screen pb-10">
      <div className="flex items-center gap-2 mb-6">
        <button type="button" onClick={() => router.back()} className="text-gray-500 text-xl">←</button>
        <h1 className="text-xl font-bold text-gray-800">เพิ่มสินค้าใหม่</h1>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* กล่อง Preview รหัส 15 หลัก */}
        <div className="p-5 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl shadow-lg text-white">
          <label className="text-xs opacity-80 uppercase font-bold tracking-wider">รหัสสินค้าที่จะถูกสร้าง (15 หลัก)</label>
          <div className="text-2xl font-mono font-bold mt-1 tracking-widest">{skuPreview}</div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm space-y-4 border border-gray-100">
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">ชื่อสินค้า</label>
            <input type="text" required className="w-full border-gray-200 border p-3 rounded-lg outline-none" 
              value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น เหล็กแผ่นหนาพิเศษ" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">ตัวย่อสินค้า (2-3 หลัก)</label>
            <input type="text" maxLength={3} required className="w-full border-gray-200 border p-3 rounded-lg outline-none font-bold uppercase" 
              value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="STB" />
          </div>

          {/* ขนาดและน้ำหนัก (2 แถว) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">กว้าง (cm)</label>
              <input type="number" step="any" required className="w-full border-gray-200 border p-3 rounded-lg" 
                value={width} onChange={(e) => setWidth(e.target.value)} placeholder="3.2" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">ยาว (cm)</label>
              <input type="number" step="any" required className="w-full border-gray-200 border p-3 rounded-lg" 
                value={length} onChange={(e) => setLength(e.target.value)} placeholder="10" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">สูง (cm)</label>
              <input type="number" step="any" required className="w-full border-gray-200 border p-3 rounded-lg" 
                value={height} onChange={(e) => setHeight(e.target.value)} placeholder="2000" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">น้ำหนัก (Kg)</label>
              <input type="number" step="any" required className="w-full border-gray-200 border p-3 rounded-lg bg-yellow-50" 
                value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="50.5" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">วันที่รับสินค้า (YYMMDD)</label>
            <input type="text" maxLength={6} required className="w-full border-gray-200 border p-3 rounded-lg outline-none font-mono" 
              value={receiveDate} onChange={(e) => setReceiveDate(e.target.value.replace(/\D/g, ''))} placeholder="240606" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">หน่วยนับ</label>
            <select className="w-full border-gray-200 border p-3 rounded-lg outline-none bg-white font-medium" 
              value={unit} onChange={(e) => setUnit(e.target.value)}>
              <option value="Kg">Kg</option>
              <option value="แพ็ค">แพ็ค</option>
              <option value="เส้น">เส้น</option>
              <option value="แผ่น">แผ่น</option>
              <option value="กล่อง">กล่อง</option>
            </select>
          </div>
        </div>

        <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-md hover:bg-blue-700 transition-all active:scale-95">
          บันทึกข้อมูลสินค้า
        </button>
      </form>
    </div>
  )
}
