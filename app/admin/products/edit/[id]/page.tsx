'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter, useParams } from 'next/navigation'

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

  useEffect(() => {
    if (prefix.length >= 2 && width && length && height && receiveDate.length === 6) {
      const formatDim = (val: string) => {
        const clean = val.replace('.', '') 
        return clean.substring(0, 2).padStart(2, '0')
      }
      const baseSku = `${prefix.toUpperCase()}${formatDim(width)}${formatDim(length)}${formatDim(height)}${receiveDate}`
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

  if (loading) return <div className="p-10 text-center font-bold">กำลังดึงข้อมูล...</div>

  return (
    <div className="p-4 max-w-md mx-auto bg-gray-50 min-h-screen pb-10">
      <div className="flex items-center gap-2 mb-6">
        <button type="button" onClick={() => router.back()} className="text-gray-500 text-xl">←</button>
        <h1 className="text-xl font-bold text-gray-800">แก้ไขข้อมูลสินค้า</h1>
      </div>
      
      <form onSubmit={handleUpdate} className="space-y-4">
        <div className="p-5 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl shadow-lg text-white font-mono">
          <label className="text-xs opacity-80 uppercase font-bold tracking-wider">รหัส SKU ใหม่</label>
          <div className="text-2xl font-bold mt-1 tracking-widest">{skuPreview}</div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm space-y-4 border border-gray-100">
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">ชื่อสินค้า</label>
            <input type="text" required className="w-full border p-3 rounded-lg" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">ตัวย่อสินค้า (2-3 หลัก)</label>
            <input type="text" maxLength={3} required className="w-full border p-3 rounded-lg font-bold uppercase text-blue-600" value={prefix} onChange={(e) => setPrefix(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-semibold text-gray-500 italic">กว้าง (cm)</label>
            <input type="number" step="any" required className="w-full border p-3 rounded-lg" value={width} onChange={(e) => setWidth(e.target.value)} /></div>
            <div><label className="text-xs font-semibold text-gray-500 italic">ยาว (cm)</label>
            <input type="number" step="any" required className="w-full border p-3 rounded-lg" value={length} onChange={(e) => setLength(e.target.value)} /></div>
            <div><label className="text-xs font-semibold text-gray-500 italic">สูง (cm)</label>
            <input type="number" step="any" required className="w-full border p-3 rounded-lg" value={height} onChange={(e) => setHeight(e.target.value)} /></div>
            <div><label className="text-xs font-semibold text-gray-500 italic">น้ำหนัก (Kg)</label>
            <input type="number" step="any" required className="w-full border p-3 rounded-lg" value={weight} onChange={(e) => setWeight(e.target.value)} /></div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-sm font-bold text-blue-700 mb-1">จำนวนสต๊อก</label>
              <input type="number" required className="w-full border-blue-200 border-2 p-3 rounded-lg bg-blue-50 font-bold" value={currentStock} onChange={(e) => setCurrentStock(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">หน่วยนับ</label>
              <select className="w-full border p-3 rounded-lg bg-white" value={unit} onChange={(e) => setUnit(e.target.value)}>
                <option value="Kg">Kg</option>
                <option value="แพ็ค">แพ็ค</option>
                <option value="เส้น">เส้น</option>
                <option value="แผ่น">แผ่น</option>
                <option value="กล่อง">กล่อง</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">วันที่รับสินค้า (YYMMDD)</label>
            <input type="text" maxLength={6} required className="w-full border p-3 rounded-lg font-mono" value={receiveDate} onChange={(e) => setReceiveDate(e.target.value.replace(/\D/g, ''))} />
          </div>
        </div>

        <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-md hover:bg-blue-700 transition-all active:scale-95">
          บันทึกการแก้ไข
        </button>
      </form>
    </div>
  )
}
