'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function AddProductPage() {
  const [formData, setFormData] = useState({
    name: '',
    short_name: '', // เช่น ST
    width: '', length: '', height: '',
    weight_kg: '',
    category: '',
    subcategory: '',
    lot_date: '',
    current_stock: 0,
    min_stock: 1,
    unit: 'เส้น'
  })

  // Logic สร้างรหัส 15 หลักตามข้อ 4.3 ของเอกสาร
  const generateSKU = () => {
    const { short_name, width, length, height, lot_date } = formData
    if (!short_name || !lot_date) return 'รอข้อมูล...'

    // 1. ตัวย่อสินค้า (2 หลักแรก)
    const part1 = short_name.substring(0, 2).toUpperCase()
    
    // 2. ขนาดสินค้า (รวมกันแบบไม่มีทศนิยม)
    const part2 = `${width}${length}${height}`.replace(/\./g, '')
    
    // 3. วันที่รับสินค้า (YYMMDD)
    const dateObj = new Date(lot_date)
    const yy = dateObj.getFullYear().toString().slice(-2)
    const mm = (dateObj.getMonth() + 1).toString().padStart(2, '0')
    const dd = dateObj.getDate().toString().padStart(2, '0')
    const part3 = `${yy}${mm}${dd}`

    // รวมและเติม x ให้ครบ 15 หลัก
    let sku = part1 + part2 + part3
    sku = sku.padEnd(15, 'x').substring(0, 15)
    return sku
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const sku = generateSKU()

    const { error } = await supabase.from('products').insert([{
      name: formData.name,
      sku_15_digits: sku,
      short_name: formData.short_name,
      category: formData.category,
      subcategory: formData.subcategory,
      width: Number(formData.width),
      length: Number(formData.length),
      height: Number(formData.height),
      weight_kg: Number(formData.weight_kg),
      current_stock: formData.current_stock,
      min_stock: formData.min_stock,
      unit: formData.unit,
      lot_date: formData.lot_date
    }])

    if (error) alert('Error: ' + error.message)
    else {
      alert('เพิ่มสินค้าและสร้างรหัส ' + sku + ' สำเร็จ!')
      window.location.href = '/scan' // เพิ่มเสร็จไปหน้าสแกนต่อเลย
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto bg-white shadow-lg rounded-xl">
      <h1 className="text-2xl font-bold mb-6 text-blue-800">เพิ่มสินค้าใหม่ (Admin)</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">ชื่อสินค้า</label>
          <input type="text" required className="w-full border p-2 rounded" 
            onChange={e => setFormData({...formData, name: e.target.value})} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">ตัวย่อ (เช่น ST)</label>
            <input type="text" maxLength={2} required className="w-full border p-2 rounded" 
              onChange={e => setFormData({...formData, short_name: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium">วันที่รับสินค้า</label>
            <input type="date" required className="w-full border p-2 rounded" 
              onChange={e => setFormData({...formData, lot_date: e.target.value})} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <input type="number" placeholder="กว้าง" className="border p-2 rounded" onChange={e => setFormData({...formData, width: e.target.value})} />
          <input type="number" placeholder="ยาว" className="border p-2 rounded" onChange={e => setFormData({...formData, length: e.target.value})} />
          <input type="number" placeholder="สูง" className="border p-2 rounded" onChange={e => setFormData({...formData, height: e.target.value})} />
        </div>

        <div className="p-4 bg-gray-100 rounded-lg border-2 border-dashed border-blue-300 text-center">
          <p className="text-xs text-gray-500 uppercase">Preview รหัส 15 หลักอัตโนมัติ</p>
          <p className="text-xl font-mono font-bold text-blue-600">{generateSKU()}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">จำนวนตั้งต้น</label>
            <input type="number" className="w-full border p-2 rounded" onChange={e => setFormData({...formData, current_stock: Number(e.target.value)})} />
          </div>
          <div>
            <label className="block text-sm font-medium">หน่วย (แพ็ค/เส้น/แผ่น)</label>
            <select className="w-full border p-2 rounded" onChange={e => setFormData({...formData, unit: e.target.value})}>
              <option>เส้น</option><option>แพ็ค</option><option>แผ่น</option><option>พาเลท</option>
            </select>
          </div>
        </div>

        <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700">
          บันทึกและสร้าง QR Code
        </button>
      </form>
    </div>
  )
}
