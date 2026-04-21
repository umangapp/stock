'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx' // ตัวนี้จะทำงานได้เพราะเราแก้ package.json ใน Step 1

export default function AddProductPage() {
  const router = useRouter()
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
  const [isImporting, setIsImporting] = useState(false)

  // ฟังก์ชันคำนวณ SKU 15 หลัก
  const generateSKU = (pre: string, w: any, l: any, h: any, date: string) => {
    const formatDim = (val: any) => {
      const clean = val.toString().replace('.', '') 
      return clean.substring(0, 2).padStart(2, '0')
    }
    const base = `${pre.toUpperCase()}${formatDim(w)}${formatDim(l)}${formatDim(h)}${date}`
    return base.padEnd(15, 'x')
  }

  useEffect(() => {
    if (prefix.length >= 2 && width && length && height && receiveDate.length === 6) {
      setSkuPreview(generateSKU(prefix, width, length, height, receiveDate))
    }
  }, [prefix, width, length, height, receiveDate])

  // ระบบ Import ไฟล์ Excel
  const handleFileUpload = (e: any) => {
    const file = e.target.files[0]
    if (!file) return
    setIsImporting(true)

    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result
        const wb = XLSX.read(bstr, { type: 'binary' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const jsonData: any[] = XLSX.utils.sheet_to_json(ws)

        const productsToInsert = jsonData.map(row => ({
          name: row["ชื่อสินค้า"],
          prefix: row["ตัวย่อ (2-3 หลัก)"].toString().toUpperCase(),
          sku_15_digits: generateSKU(row["ตัวย่อ (2-3 หลัก)"], row["กว้าง (cm)"], row["ยาว (cm)"], row["สูง (cm)"], row["วันที่รับ (YYMMDD)"].toString()),
          width: parseFloat(row["กว้าง (cm)"]),
          length: parseFloat(row["ยาว (cm)"]),
          height: parseFloat(row["สูง (cm)"]),
          weight: parseFloat(row["น้ำหนัก (kg)"]) || 0,
          current_stock: parseInt(row["สต๊อกเริ่มต้น"]) || 0,
          receive_date_text: row["วันที่รับ (YYMMDD)"].toString(),
          unit: row["หน่วยนับ"]
        }))

        const { error } = await supabase.from('products').insert(productsToInsert)
        if (error) throw error
        alert(`นำเข้าสำเร็จ ${productsToInsert.length} รายการ!`)
        router.push('/dashboard')
      } catch (err: any) {
        alert("เกิดข้อผิดพลาดในการ Import: " + err.message)
      } finally {
        setIsImporting(false)
      }
    }
    reader.readAsBinaryString(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.from('products').insert([{
      name, prefix: prefix.toUpperCase(), sku_15_digits: skuPreview,
      width: parseFloat(width), length: parseFloat(length), height: parseFloat(height),
      weight: parseFloat(weight) || 0, receive_date_text: receiveDate, unit,
      current_stock: parseInt(currentStock) || 0
    }])
    if (!error) { router.push('/dashboard') } else { alert(error.message) }
  }

  return (
    <div className="p-4 max-w-md mx-auto bg-gray-50 min-h-screen pb-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">เพิ่มสินค้า</h1>
        <label className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-bold cursor-pointer shadow-md">
          {isImporting ? 'กำลังประมวลผล...' : 'Import Excel'}
          <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
        </label>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-5 bg-blue-800 rounded-2xl shadow-lg text-white font-mono">
          <label className="text-xs opacity-70 uppercase">Preview SKU</label>
          <div className="text-2xl font-bold tracking-widest">{skuPreview || '---'}</div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm space-y-4 border border-gray-100">
          <input type="text" placeholder="ชื่อสินค้า" required className="w-full border p-3 rounded-lg" value={name} onChange={(e) => setName(e.target.value)} />
          <input type="text" placeholder="ตัวย่อ (2-3 หลัก)" maxLength={3} required className="w-full border p-3 rounded-lg font-bold" value={prefix} onChange={(e) => setPrefix(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <input type="number" placeholder="กว้าง" step="any" className="border p-3 rounded-lg" value={width} onChange={(e) => setWidth(e.target.value)} />
            <input type="number" placeholder="ยาว" step="any" className="border p-3 rounded-lg" value={length} onChange={(e) => setLength(e.target.value)} />
            <input type="number" placeholder="สูง" step="any" className="border p-3 rounded-lg" value={height} onChange={(e) => setHeight(e.target.value)} />
            <input type="number" placeholder="น้ำหนัก" step="any" className="border p-3 rounded-lg" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="number" placeholder="สต๊อกเริ่มต้น" className="border-2 border-green-200 p-3 rounded-lg bg-green-50" value={currentStock} onChange={(e) => setCurrentStock(e.target.value)} />
            <select className="border p-3 rounded-lg bg-white" value={unit} onChange={(e) => setUnit(e.target.value)}>
              <option value="Kg">Kg</option>
              <option value="แพ็ค">แพ็ค</option>
              <option value="เส้น">เส้น</option>
              <option value="แผ่น">แผ่น</option>
              <option value="กล่อง">กล่อง</option>
            </select>
          </div>
          <input type="text" placeholder="วันที่ (YYMMDD)" maxLength={6} className="w-full border p-3 rounded-lg font-mono" value={receiveDate} onChange={(e) => setReceiveDate(e.target.value.replace(/\D/g, ''))} />
        </div>
        <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold">บันทึกข้อมูล</button>
      </form>
    </div>
  )
}
