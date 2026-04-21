'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Save, Package } from 'lucide-react'

export default function EditProductPage() {
  const router = useRouter()
  const { id } = useParams()
  
  const [name, setName] = useState('')
  const [prefix, setPrefix] = useState('')
  const [width, setWidth] = useState('')
  const [length, setLength] = useState('')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [currentStock, setCurrentStock] = useState('0')
  const [receiveDate, setReceiveDate] = useState('')
  const [unit, setUnit] = useState('Kg')
  const [skuPreview, setSkuPreview] = useState('')
  const [loading, setLoading] = useState(true)

  // 1. ดึงข้อมูลเดิมจาก Database
  useEffect(() => {
    const fetchProduct = async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single()

      if (data) {
        setName(data.name)
        setPrefix(data.prefix || '')
        setWidth(data.width?.toString() || '')
        setLength(data.length?.toString() || '')
        setHeight(data.height?.toString() || '')
        setWeight(data.weight?.toString() || '0')
        setCurrentStock(data.current_stock?.toString() || '0')
        setReceiveDate(data.receive_date_text || '')
        setUnit(data.unit)
        setSkuPreview(data.sku_15_digits)
      }
      setLoading(false)
    }
    fetchProduct()
  }, [id])

  // 2. ฟังก์ชันคำนวณรหัส SKU ใหม่ (กว้าง/ยาว หลักหน่วยใช้ตัวเดียว)
  useEffect(() => {
    if (prefix && width && length && height && receiveDate) {
      // กว้าง และ ยาว: < 10 ใช้ 1 หลัก, >= 10 ใช้ 2 หลักแรก
      const formatWL = (val: string) => {
        const num = Math.floor(parseFloat(val)) || 0
        const str = num.toString()
        return num >= 10 ? str.substring(0, 2) : str
      }

      // สูง: ใช้ 2 หลักแรก (เช่น 1800 -> 18)
      const formatH = (val: string) => {
        const clean = val.replace('.', '')
        return clean.substring(0, 2).padStart(2, '0')
      }

      // วันที่: แปลง 2025-08-05 เป็น 250805
      let datePart = receiveDate.replace(/-/g, '')
      if (datePart.length === 8) datePart = datePart.substring(2)
      if (datePart.length > 6) datePart = datePart.substring(0, 6)

      const baseSku = `${prefix.toUpperCase()}${formatWL(width)}${formatWL(length)}${formatH(height)}${datePart}`
      setSkuPreview(baseSku.padEnd(15, 'x'))
    }
  }, [prefix, width, length, height, receiveDate])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase
      .from('products')
      .update({
        name,
        prefix: prefix.toUpperCase(),
        sku_15_digits: skuPreview,
        width: parseFloat(width),
        length: parseFloat(length),
        height: parseFloat(height),
        weight: parseFloat(weight) || 0,
        receive_date_text: receiveDate,
        unit,
        current_stock: parseInt(currentStock) || 0
      })
      .eq('id', id)

    if (!error) {
      alert('อัปเดตข้อมูลสำเร็จ!')
      router.push('/dashboard')
    } else {
      alert('Error: ' + error.message)
    }
  }

  if (loading) return <div className="p-10 text-center font-bold">กำลังโหลด...</div>

  return (
    <div className="p-4 max-w-md mx-auto bg-gray-50 min-h-screen pb-10">
      <div className="flex items-center gap-2 mb-6">
        <button type="button" onClick={() => router.back()} className="text-gray-500">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-gray-800">แก้ไขข้อมูลสินค้า</h1>
      </div>
      
      <form onSubmit={handleUpdate} className="space-y-4">
        {/* แถบรหัส SKU ใหม่ */}
        <div className="p-5 bg-blue-700 rounded-2xl shadow-lg text-white font-mono text-center">
          <label className="text-xs opacity-70 uppercase block mb-1">รหัส SKU ใหม่ที่จะบันทึก</label>
          <div className="text-2xl font-bold tracking-widest">{skuPreview}</div>
        </div>

        <div className="bg-white p-5 rounded-3xl shadow-sm space-y-4 border border-gray-100">
          <div>
            <label className="text-xs font-bold text-gray-400 ml-1">ชื่อสินค้า</label>
            <input type="text" required className="w-full border p-4 rounded-2xl outline-none" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-400 ml-1">ตัวย่อสินค้า</label>
            <input type="text" maxLength={3} required className="w-full border p-4 rounded-2xl font-bold uppercase text-blue-600" value={prefix} onChange={(e) => setPrefix(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-400 ml-1">กว้าง (cm)</label>
              <input type="number" step="any" required className="w-full border p-4 rounded-2xl" value={width} onChange={(e) => setWidth(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 ml-1">ยาว (cm)</label>
              <input type="number" step="any" required className="w-full border p-4 rounded-2xl" value={length} onChange={(e) => setLength(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 ml-1">สูง (cm)</label>
              <input type="number" step="any" required className="w-full border p-4 rounded-2xl" value={height} onChange={(e) => setHeight(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 ml-1">น้ำหนัก (Kg)</label>
              <input type="number" step="any" className="w-full border p-4 rounded-2xl" value={weight} onChange={(e) => setWeight(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t pt-4">
            <div>
              <label className="text-xs font-bold text-blue-600 ml-1">จำนวนสต๊อก</label>
              <input type="number" required className="w-full border-2 border-blue-100 p-4 rounded-2xl bg-blue-50 font-bold text-blue-800" value={currentStock} onChange={(e) => setCurrentStock(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 ml-1">หน่วยนับ</label>
              <select className="w-full border p-4 rounded-2xl bg-white" value={unit} onChange={(e) => setUnit(e.target.value)}>
                <option value="Kg">Kg</option>
                <option value="แพ็ค">แพ็ค</option>
                <option value="เส้น">เส้น</option>
                <option value="แผ่น">แผ่น</option>
                <option value="กล่อง">กล่อง</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-400 ml-1">วันที่รับสินค้า</label>
            <input type="date" required className="w-full border p-4 rounded-2xl font-mono" value={receiveDate} onChange={(e) => setReceiveDate(e.target.value)} />
          </div>
        </div>

        <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-3xl font-bold shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all">
          <Save size={20} />
          บันทึกการแก้ไข
        </button>
      </form>
    </div>
  )
}
