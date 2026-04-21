'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'

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

  // ฟังก์ชันเจนรหัส SKU ตามกฎใหม่ (กว้าง/ยาว หลักหน่วยใช้ตัวเดียว)
  const generateSKU = (pre: string, w: string, l: string, h: string, dateStr: string) => {
    if (!pre || !w || !l || !h || !dateStr) return 'รอข้อมูลครบ...'

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

    // วันที่: รองรับ 2025-08-05 -> 250805
    let datePart = dateStr.replace(/-/g, '')
    if (datePart.length === 8) datePart = datePart.substring(2)
    if (datePart.length > 6) datePart = datePart.substring(0, 6)

    const baseSku = `${pre.toUpperCase()}${formatWL(w)}${formatWL(l)}${formatH(h)}${datePart}`
    return baseSku.padEnd(15, 'x')
  }

  useEffect(() => {
    const sku = generateSKU(prefix, width, length, height, receiveDate)
    setSkuPreview(sku)
  }, [prefix, width, length, height, receiveDate])

  // ระบบ Import จาก Excel
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

        const productsToInsert = jsonData.map(row => {
          const rawDate = row["วันที่รับ (YYMMDD)"].toString()
          return {
            name: row["ชื่อสินค้า"],
            prefix: row["ตัวย่อ (2-3 หลัก)"].toString().toUpperCase(),
            sku_15_digits: generateSKU(row["ตัวย่อ (2-3 หลัก)"].toString(), row["กว้าง (cm)"].toString(), row["ยาว (cm)"].toString(), row["สูง (cm)"].toString(), rawDate),
            width: parseFloat(row["กว้าง (cm)"]),
            length: parseFloat(row["ยาว (cm)"]),
            height: parseFloat(row["สูง (cm)"]),
            weight: parseFloat(row["น้ำหนัก (kg)"]) || 0,
            current_stock: parseInt(row["สต๊อกเริ่มต้น"]) || 0,
            receive_date_text: rawDate,
            unit: row["หน่วยนับ"]
          }
        })

        const { error } = await supabase.from('products').insert(productsToInsert)
        if (error) throw error
        alert("Import สำเร็จ!")
        router.push('/dashboard')
      } catch (err: any) {
        alert("Error: " + err.message)
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
    if (!error) router.push('/dashboard')
    else alert(error.message)
  }

  return (
    <div className="p-4 max-w-md mx-auto bg-gray-50 min-h-screen pb-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">เพิ่มสินค้าใหม่</h1>
        <label className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-bold cursor-pointer shadow-md">
          {isImporting ? 'กำลังนำเข้า...' : 'Import Excel'}
          <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
        </label>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-5 bg-blue-700 rounded-2xl shadow-lg text-white font-mono text-center">
          <label className="text-xs opacity-70 uppercase block mb-1">รหัส SKU (15 หลัก)</label>
          <div className="text-2xl font-bold tracking-widest">{skuPreview}</div>
        </div>

        <div className="bg-white p-5 rounded-3xl shadow-sm space-y-4 border border-gray-100">
          <input type="text" placeholder="ชื่อสินค้า" required className="w-full border p-4 rounded-2xl" value={name} onChange={(e) => setName(e.target.value)} />
          <input type="text" placeholder="ตัวย่อ (เช่น ST)" maxLength={3} required className="w-full border p-4 rounded-2xl font-bold uppercase" value={prefix} onChange={(e) => setPrefix(e.target.value)} />
          
          <div className="grid grid-cols-2 gap-4">
            <input type="number" placeholder="กว้าง (cm)" step="any" required className="border p-4 rounded-2xl" value={width} onChange={(e) => setWidth(e.target.value)} />
            <input type="number" placeholder="ยาว (cm)" step="any" required className="border p-4 rounded-2xl" value={length} onChange={(e) => setLength(e.target.value)} />
            <input type="number" placeholder="สูง (cm)" step="any" required className="border p-4 rounded-2xl" value={height} onChange={(e) => setHeight(e.target.value)} />
            <input type="number" placeholder="น้ำหนัก (Kg)" step="any" className="border p-4 rounded-2xl" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4 border-t pt-4">
            <div>
              <label className="text-xs font-bold text-gray-400 ml-2">สต๊อกเริ่มต้น</label>
              <input type="number" className="w-full border-2 border-green-100 p-4 rounded-2xl bg-green-50 font-bold" value={currentStock} onChange={(e) => setCurrentStock(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 ml-2">หน่วยนับ</label>
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
            <label className="text-xs font-bold text-gray-400 ml-2">วันที่รับสินค้า</label>
            <input type="date" required className="w-full border p-4 rounded-2xl font-mono" value={receiveDate} onChange={(e) => setReceiveDate(e.target.value)} />
          </div>
        </div>

        <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-3xl font-bold shadow-xl active:scale-95 transition-all">
          บันทึกเข้าสต๊อก
        </button>
      </form>
    </div>
  )
}
