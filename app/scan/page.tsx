'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ShoppingCart, CheckCircle2, Trash2, ArrowLeft, Plus, Minus, PackagePlus, PackageMinus } from 'lucide-react'
import SKUColoredAdmin from '@/components/SKUColored'

function ScanContent() {
  const router = useRouter()
  
  // 🌟 อ่านค่า mode จาก URL ('receive' หรือ 'issue')
  const searchParams = useSearchParams()
  const mode = searchParams.get('mode') 

  // ตัวอย่าง State ข้อมูลตะกร้าที่ได้จากการสแกน
  const [scannedItems, setScannedItems] = useState<any[]>([
    {
      id: 1,
      name: 'กระดาษไดมอนดอท',
      sku_15_digits: 'DP025105026082001',
      prefix: 'DP',
      height: 0.25,
      width: 1000,
      length: 5000,
      received_date: '260820',
      weight: 15.50, // ตัวอย่างสินค้านี้มีน้ำหนัก
      current_stock: 2,
      scan_qty: 4
    }
  ])

  const handleConfirm = () => {
    alert('บันทึกข้อมูลเรียบร้อย!')
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-24">
      {/* Header */}
      <div className="bg-white p-6 rounded-b-[3rem] shadow-sm flex items-center justify-between sticky top-0 z-50">
        <button onClick={() => router.push('/')} className="p-3 bg-slate-100 rounded-full text-slate-600 hover:bg-slate-200">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-black italic text-slate-800 uppercase">
          {mode === 'receive' ? 'นำเข้าสินค้า (RECEIVE)' : mode === 'issue' ? 'เบิกจ่ายสินค้า (ISSUE)' : 'สแกนสินค้า'}
        </h1>
        <div className="w-12"></div>
      </div>

      <div className="p-6 max-w-lg mx-auto space-y-6">
        
        {/* 🌟 ปุ่มสแกนจะถูกซ่อน/แสดง ตามหน้าเมนูที่กดเข้ามา */}
        <div className="flex gap-4">
          {(!mode || mode === 'receive') && (
            <button className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white p-6 rounded-[2rem] font-black text-xl flex flex-col items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all">
              <PackagePlus size={36} />
              สแกนรับเข้า
            </button>
          )}

          {(!mode || mode === 'issue') && (
            <button className="flex-1 bg-rose-600 hover:bg-rose-500 text-white p-6 rounded-[2rem] font-black text-xl flex flex-col items-center justify-center gap-2 shadow-lg shadow-rose-600/20 active:scale-95 transition-all">
              <PackageMinus size={36} />
              สแกนจ่ายออก
            </button>
          )}
        </div>

        {/* หัวข้อตะกร้า */}
        <div className="flex justify-between items-center bg-white p-4 rounded-3xl shadow-sm border border-slate-100 mt-8">
          <div className="flex items-center gap-3 font-black text-lg">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-full"><ShoppingCart size={24}/></div>
            รายการที่สแกน ({scannedItems.length})
          </div>
          <button onClick={handleConfirm} className="bg-emerald-500 hover:bg-emerald-400 text-white px-5 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 shadow-md">
            <CheckCircle2 size={18}/> ยืนยันบันทึก
          </button>
        </div>

        {/* รายการสินค้าที่สแกนเจอ */}
        <div className="space-y-4">
          {scannedItems.map((item, idx) => (
            <div key={idx} className="bg-white p-6 rounded-[2rem] shadow-sm border border-blue-100 relative">
              
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className="bg-blue-500 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">Latest</span>
                  <h3 className="font-black text-lg text-slate-800">{item.name}</h3>
                </div>
                <button className="p-3 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-100 transition-all">
                  <Trash2 size={20}/>
                </button>
              </div>

              <div className="mb-3">
                <SKUColoredAdmin sku={item.sku_15_digits} prefix={item.prefix} />
              </div>

              <div className="flex flex-wrap items-center gap-2 mb-6">
                <span className="text-[11px] font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded">
                  {item.height}x{item.width}x{item.length} มม.
                </span>
                <span className="text-[11px] font-black text-slate-600 bg-slate-100 border border-slate-200 px-2 py-1 rounded">
                  LOT: {item.received_date}
                </span>
                
                {/* 🌟 แสดงน้ำหนักที่นี่ (โดดเด่นสีเหลืองทอง) */}
                {item.weight && (
                  <span className="text-[11px] font-black text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded shadow-sm">
                    ⚖️ น้ำหนัก: {item.weight} กก.
                  </span>
                )}
              </div>

              <div className="flex justify-between items-center border-t border-slate-100 pt-4">
                <span className="flex items-center gap-1.5 text-xs font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl uppercase tracking-wider">
                  <PackageMinus size={14}/> Stock: {item.current_stock}
                </span>

                <div className="flex items-center gap-4 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
                  <button className="p-2 bg-white rounded-xl shadow-sm text-slate-400 hover:text-slate-700"><Minus size={20}/></button>
                  <span className="font-black text-2xl w-10 text-center">{item.scan_qty}</span>
                  <button className="p-2 bg-blue-600 rounded-xl shadow-sm text-white hover:bg-blue-500"><Plus size={20}/></button>
                </div>
              </div>

            </div>
          ))}
        </div>

      </div>
    </div>
  )
}

// 🌟 จำเป็นต้องครอบด้วย Suspense เพราะใช้ useSearchParams() เพื่อไม่ให้ Next.js บิ้วท์ Error
export default function ScanPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-black text-blue-600">LOADING...</div>}>
      <ScanContent />
    </Suspense>
  )
}
