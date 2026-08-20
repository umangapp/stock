'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Home, LogOut, Search, Scan, Zap, ShoppingCart, CheckCircle2, Trash2, Plus, Minus, ArrowLeft } from 'lucide-react'
import SKUColoredAdmin from '@/components/SKUColored'

function ScanPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // 🌟 อ่านค่าโหมดจาก URL (?mode=receive หรือ ?mode=issue)
  const mode = searchParams.get('mode') 

  const [scanInput, setScanInput] = useState('')
  const [scannedItems, setScannedItems] = useState<any[]>([])
  const [currentMode, setCurrentMode] = useState<'receive' | 'issue'>(mode === 'issue' ? 'issue' : 'receive')

  useEffect(() => {
    if (mode === 'issue') setCurrentMode('issue')
    else if (mode === 'receive') setCurrentMode('receive')
  }, [mode])

  // ฟังก์ชันค้นหา/สแกนสินค้า
  const handleManualSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!scanInput.trim()) return

    const cleanCode = scanInput.trim().toUpperCase()
    const { data: product } = await supabase
      .from('products')
      .select('*')
      .eq('sku_15_digits', cleanCode)
      .maybeSingle()

    if (product) {
      setScannedItems(prev => {
        const existIdx = prev.findIndex(item => item.id === product.id)
        if (existIdx >= 0) {
          const updated = [...prev]
          updated[existIdx].scan_qty += 1
          return updated
        }
        return [{ ...product, scan_qty: 1 }, ...prev]
      })
      setScanInput('')
    } else {
      alert(`❌ ไม่พบสินค้ารหัส: ${cleanCode}`)
    }
  }

  // ปรับจำนวนสแกน
  const updateQty = (id: string, delta: number) => {
    setScannedItems(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.scan_qty + delta
        return newQty > 0 ? { ...item, scan_qty: newQty } : item
      }
      return item
    }))
  }

  // ลบรายการ
  const removeItem = (id: string) => {
    setScannedItems(prev => prev.filter(item => item.id !== id))
  }

  // บันทึกรายการสแกนลง DB
  const handleSaveTransactions = async () => {
    if (scannedItems.length === 0) return
    const { data: { session } } = await supabase.auth.getSession()
    const userEmail = session?.user?.email || 'Unknown'

    try {
      for (const item of scannedItems) {
        const amount = item.scan_qty
        const newStock = currentMode === 'receive' 
          ? item.current_stock + amount 
          : Math.max(0, item.current_stock - amount)

        // 1. อัปเดตสต๊อกสินค้า
        await supabase.from('products').update({ current_stock: newStock }).eq('id', item.id)

        // 2. เพิ่มประวัติการสแกน
        await supabase.from('transactions').insert([{
          product_id: item.id,
          type: currentMode,
          amount: amount,
          created_by: userEmail
        }])
      }

      alert('✅ บันทึกรายการสแกนสำเร็จ!')
      setScannedItems([])
    } catch (err: any) {
      alert('❌ เกิดข้อผิดพลาด: ' + err.message)
    }
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white font-sans flex flex-col p-4 sm:p-6 select-none">
      
      {/* 🌟 Top Header */}
      <div className="flex justify-between items-center mb-6 pt-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-black italic text-blue-400 uppercase tracking-tight">SCAN CENTER</h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">VERSION 1.1.2</p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => router.push('/')} className="p-3 bg-slate-800/80 hover:bg-slate-700 text-amber-400 rounded-2xl border border-slate-700/50 shadow-sm transition-all active:scale-95">
            <Home size={20} />
          </button>
          <button onClick={() => { if(confirm("ออกจากระบบ?")) supabase.auth.signOut().then(() => router.push('/login')) }} className="p-3 bg-red-950/40 hover:bg-red-900/40 text-red-400 rounded-2xl border border-red-900/40 shadow-sm transition-all active:scale-95">
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* 🌟 Status Badge */}
      <div className="flex justify-center mb-6">
        <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 px-4 py-2 rounded-full shadow-inner text-xs font-bold text-slate-300">
          <span>โหมดปัจจุบัน:</span>
          <span className={`px-2 py-0.5 rounded-full font-black text-[11px] ${currentMode === 'receive' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
            {currentMode === 'receive' ? 'นำเข้า (+)' : 'เบิกจ่าย (-)'}
          </span>
        </div>
      </div>

      {/* 🌟 2x2 Grid Buttons (จะซ่อนปุ่มตามโหมดที่เลือกมา) */}
      <div className="grid grid-cols-2 gap-4 mb-6 max-w-md mx-auto w-full">
        
        {/* 🟢 กลุ่มปุ่ม นำเข้า (แสดงเมื่อไม่มี mode หรือ mode === 'receive') */}
        {(!mode || mode === 'receive') && (
          <>
            <button 
              onClick={() => setCurrentMode('receive')}
              className={`p-6 rounded-[2rem] border flex flex-col items-center justify-center gap-3 transition-all active:scale-95 ${currentMode === 'receive' ? 'bg-[#15232d] border-emerald-500/40 text-emerald-400 shadow-lg shadow-emerald-950/20' : 'bg-slate-900/50 border-slate-800/80 text-slate-400 hover:bg-slate-800/50'}`}
            >
              <Scan size={36} className="text-emerald-400" />
              <div className="text-center">
                <p className="font-black text-sm uppercase leading-tight">นำเข้า</p>
                <p className="text-[10px] text-slate-400 italic">(ทีละชิ้น)</p>
              </div>
            </button>

            <button 
              onClick={() => setCurrentMode('receive')}
              className="p-6 rounded-[2rem] bg-emerald-600 hover:bg-emerald-500 text-white flex flex-col items-center justify-center gap-3 shadow-lg shadow-emerald-900/30 active:scale-95 transition-all"
            >
              <Zap size={36} className="fill-white" />
              <div className="text-center">
                <p className="font-black text-sm uppercase leading-tight">นำเข้า</p>
                <p className="text-[10px] text-emerald-100 italic">(ต่อเนื่อง)</p>
              </div>
            </button>
          </>
        )}

        {/* 🔴 กลุ่มปุ่ม นำออก/เบิกจ่าย (แสดงเมื่อไม่มี mode หรือ mode === 'issue') */}
        {(!mode || mode === 'issue') && (
          <>
            <button 
              onClick={() => setCurrentMode('issue')}
              className={`p-6 rounded-[2rem] border flex flex-col items-center justify-center gap-3 transition-all active:scale-95 ${currentMode === 'issue' ? 'bg-[#2b1720] border-rose-500/40 text-rose-400 shadow-lg shadow-rose-950/20' : 'bg-slate-900/50 border-slate-800/80 text-slate-400 hover:bg-slate-800/50'}`}
            >
              <Scan size={36} className="text-rose-400" />
              <div className="text-center">
                <p className="font-black text-sm uppercase leading-tight">นำออก</p>
                <p className="text-[10px] text-slate-400 italic">(ทีละชิ้น)</p>
              </div>
            </button>

            <button 
              onClick={() => setCurrentMode('issue')}
              className="p-6 rounded-[2rem] bg-rose-600 hover:bg-rose-500 text-white flex flex-col items-center justify-center gap-3 shadow-lg shadow-rose-900/30 active:scale-95 transition-all"
            >
              <Zap size={36} className="fill-white" />
              <div className="text-center">
                <p className="font-black text-sm uppercase leading-tight">นำออก</p>
                <p className="text-[10px] text-rose-100 italic">(ต่อเนื่อง)</p>
              </div>
            </button>
          </>
        )}

      </div>

      {/* 🌟 Search Bar ช่องพิมพ์ 15 หลัก ด้านล่าง */}
      <form onSubmit={handleManualSearch} className="max-w-md mx-auto w-full mb-6">
        <div className="relative">
          <input 
            type="text" 
            placeholder="พิมพ์รหัส 15 หลัก..." 
            className="w-full bg-[#131b2e] border border-slate-700/60 p-5 pr-14 rounded-2xl text-white placeholder-slate-500 font-bold outline-none focus:border-blue-500 transition-all text-center tracking-wider"
            value={scanInput}
            onChange={e => setScanInput(e.target.value)}
          />
          <button type="submit" className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-400 hover:text-white p-2">
            <Search size={22} />
          </button>
        </div>
      </form>

      {/* 🌟 สรุปตะกร้าสินค้าที่สแกนเจอ */}
      {scannedItems.length > 0 && (
        <div className="max-w-md mx-auto w-full space-y-4 animate-in fade-in">
          
          <div className="flex justify-between items-center bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
            <div className="flex items-center gap-2 font-black text-sm text-slate-200">
              <ShoppingCart size={18} className="text-blue-400" />
              รายการที่สแกน ({scannedItems.length})
            </div>
            <button onClick={handleSaveTransactions} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-lg active:scale-95 transition-all">
              <CheckCircle2 size={16}/> ยืนยันบันทึก
            </button>
          </div>

          <div className="space-y-3">
            {scannedItems.map(item => (
              <div key={item.id} className="bg-[#131b2e] border border-slate-800 p-5 rounded-3xl relative flex flex-col gap-3 shadow-md">
                
                <div className="flex justify-between items-start">
                  <div>
                    <span className="bg-blue-500/20 text-blue-400 text-[9px] font-black px-2 py-0.5 rounded border border-blue-500/30 uppercase tracking-widest mr-2">LATEST</span>
                    <span className="font-black text-lg text-white">{item.name}</span>
                  </div>
                  <button onClick={() => removeItem(item.id)} className="text-rose-400 hover:text-rose-300 p-1.5 bg-rose-500/10 rounded-xl">
                    <Trash2 size={18} />
                  </button>
                </div>

                <SKUColoredAdmin sku={item.sku_15_digits} prefix={item.prefix} isDark={true} />

                {/* 🌟 แสดง ขนาด, LOT และ น้ำหนัก (ถ้ามี) */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded">
                    {item.height}x{item.width}x{item.length} มม.
                  </span>
                  <span className="text-[11px] font-black text-slate-300 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded">
                    LOT: {item.received_date}
                  </span>
                  
                  {/* ⚖️ แสดงน้ำหนัก */}
                  {item.weight && (
                    <span className="text-[11px] font-black text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded shadow-sm">
                      ⚖️ {item.weight} กก.
                    </span>
                  )}
                </div>

                <div className="flex justify-between items-center border-t border-slate-800/80 pt-3 mt-1">
                  <span className="text-xs font-bold text-slate-400">
                    สต๊อกปัจจุบัน: <span className="font-black text-white">{item.current_stock}</span>
                  </span>

                  <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl p-1">
                    <button onClick={() => updateQty(item.id, -1)} className="p-1.5 hover:bg-slate-800 text-slate-400 rounded-lg"><Minus size={16}/></button>
                    <span className="font-black text-lg w-8 text-center text-blue-400">{item.scan_qty}</span>
                    <button onClick={() => updateQty(item.id, 1)} className="p-1.5 hover:bg-slate-800 text-slate-400 rounded-lg"><Plus size={16}/></button>
                  </div>
                </div>

              </div>
            ))}
          </div>

        </div>
      )}

    </div>
  )
}

export default function ScanPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0b0f19] flex items-center justify-center font-black text-blue-400">LOADING...</div>}>
      <ScanPageContent />
    </Suspense>
  )
}
