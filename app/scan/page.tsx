'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Home, LogOut, Search, Scan, Zap, ShoppingCart, CheckCircle2, Trash2, Plus, Minus, PackageMinus } from 'lucide-react'
import SKUColoredAdmin from '@/components/SKUColored'

function ScanPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlMode = searchParams.get('mode') 
  
  const [scanMode, setScanMode] = useState<'receive' | 'issue'>(urlMode === 'issue' ? 'issue' : 'receive')
  const [scanType, setScanType] = useState<'single' | 'continuous'>('single')
  const [scanInput, setScanInput] = useState('')
  const [scannedItems, setScannedItems] = useState<any[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  
  // Ref สำหรับออโต้โฟกัสให้เครื่องสแกนบาร์โค้ด
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (urlMode === 'issue') setScanMode('issue')
    else if (urlMode === 'receive') setScanMode('receive')
  }, [urlMode])

  // ฟังก์ชันเมื่อกดเลือกปุ่มโหมดสแกน
  const handleModeSelect = (mode: 'receive' | 'issue', type: 'single' | 'continuous') => {
    setScanMode(mode)
    setScanType(type)
    // 🌟 เล็งเคอร์เซอร์ไปที่กล่องข้อความอัตโนมัติ เพื่อให้ยิงบาร์โค้ดได้เลย
    inputRef.current?.focus()
  }

  // ฟังก์ชันยิงบาร์โค้ด หรือค้นหา
  const handleBarcodeSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const code = scanInput.trim().toUpperCase()
    if (!code) return
    
    setIsProcessing(true)
    const { data: product } = await supabase
      .from('products')
      .select('*')
      .eq('sku_15_digits', code)
      .maybeSingle()
      
    if (product) {
      setScannedItems(prev => {
        const existIdx = prev.findIndex(p => p.id === product.id)
        if (existIdx >= 0) {
          const updated = [...prev]
          updated[existIdx].scan_qty += 1
          return updated
        }
        return [{ ...product, scan_qty: 1 }, ...prev]
      })
    } else {
      alert(`❌ ไม่พบสินค้ารหัส: ${code}`)
    }
    
    // ล้างช่อง และโฟกัสรอรับการสแกนชิ้นต่อไป
    setScanInput('')
    setTimeout(() => inputRef.current?.focus(), 100)
    setIsProcessing(false)
  }

  const updateQty = (id: string, delta: number) => {
    setScannedItems(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.scan_qty + delta
        return newQty > 0 ? { ...item, scan_qty: newQty } : item
      }
      return item
    }))
  }

  const removeItem = (id: string) => {
    setScannedItems(prev => prev.filter(item => item.id !== id))
  }

  // ยืนยันบันทึกลงฐานข้อมูล
  const handleSave = async () => {
    if (scannedItems.length === 0) return
    const { data: { session } } = await supabase.auth.getSession()
    const userEmail = session?.user?.email || 'Unknown'

    try {
      for (const item of scannedItems) {
        const amount = item.scan_qty
        const newStock = scanMode === 'receive' 
          ? item.current_stock + amount 
          : Math.max(0, item.current_stock - amount)

        await supabase.from('products').update({ current_stock: newStock }).eq('id', item.id)

        await supabase.from('transactions').insert([{
          product_id: item.id,
          type: scanMode,
          amount: amount,
          created_by: userEmail
        }])
      }

      alert('✅ บันทึกรายการสแกนสำเร็จ!')
      setScannedItems([])
      setScanInput('')
      inputRef.current?.focus()
    } catch (err: any) {
      alert('❌ เกิดข้อผิดพลาด: ' + err.message)
    }
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white font-sans flex flex-col pt-6 select-none overflow-x-hidden">
      
      {/* 🌟 Top Header */}
      <div className="flex justify-between items-center px-4 sm:px-6 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-black italic text-blue-400 uppercase tracking-tight">SCAN CENTER</h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">VERSION 1.1.2</p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => router.push('/')} className="p-3 bg-[#131b2e] hover:bg-[#1e293b] text-amber-400 rounded-2xl shadow-sm transition-all active:scale-95">
            <Home size={20} />
          </button>
          <button onClick={() => { if(confirm("ออกจากระบบ?")) supabase.auth.signOut().then(() => router.push('/login')) }} className="p-3 bg-[#1a1215] hover:bg-[#2b1720] text-red-400 rounded-2xl shadow-sm transition-all active:scale-95">
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* 🌟 Status Badge */}
      <div className="flex justify-center px-6 mb-6">
        <div className="flex items-center gap-2 bg-[#131b2e] border border-[#1e293b] px-4 py-2 rounded-full shadow-inner text-xs font-bold text-slate-400">
          <span>โหมดปัจจุบัน:</span>
          <span className={`px-2 py-0.5 rounded-full font-black text-[11px] ${scanMode === 'receive' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
            {scanMode === 'receive' ? 'นำเข้า (+)' : 'เบิกจ่าย (-)'}
          </span>
        </div>
      </div>

      {/* 🌟 2x2 Grid Buttons (กรองตาม URL) */}
      <div className="grid grid-cols-2 gap-4 mb-6 max-w-md mx-auto w-full px-4 sm:px-6">
        
        {/* กลุ่มปุ่ม นำเข้า */}
        {(!urlMode || urlMode === 'receive') && (
          <>
            <button 
              onClick={() => handleModeSelect('receive', 'single')}
              className={`p-6 rounded-[2rem] border flex flex-col items-center justify-center gap-3 transition-all active:scale-95 ${scanMode === 'receive' && scanType === 'single' ? 'bg-[#1e293b] border-emerald-500 text-white shadow-lg' : 'bg-[#131b2e] border-transparent text-slate-400 hover:bg-[#1e293b]'}`}
            >
              <Scan size={36} className={scanMode === 'receive' && scanType === 'single' ? 'text-emerald-400' : 'text-emerald-500/50'} />
              <div className="text-center">
                <p className="font-black text-sm uppercase leading-tight">นำเข้า</p>
                <p className="text-[10px] italic">(ทีละชิ้น)</p>
              </div>
            </button>

            <button 
              onClick={() => handleModeSelect('receive', 'continuous')}
              className={`p-6 rounded-[2rem] flex flex-col items-center justify-center gap-3 transition-all active:scale-95 border ${scanMode === 'receive' && scanType === 'continuous' ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/30' : 'bg-emerald-900/20 text-emerald-500 border-emerald-900/30 hover:bg-emerald-900/40'}`}
            >
              <Zap size={36} className={scanMode === 'receive' && scanType === 'continuous' ? 'fill-white text-white' : 'fill-emerald-500/30 text-emerald-500/50'} />
              <div className="text-center">
                <p className="font-black text-sm uppercase leading-tight">นำเข้า</p>
                <p className="text-[10px] italic">(ต่อเนื่อง)</p>
              </div>
            </button>
          </>
        )}

        {/* กลุ่มปุ่ม นำออก */}
        {(!urlMode || urlMode === 'issue') && (
          <>
            <button 
              onClick={() => handleModeSelect('issue', 'single')}
              className={`p-6 rounded-[2rem] border flex flex-col items-center justify-center gap-3 transition-all active:scale-95 ${scanMode === 'issue' && scanType === 'single' ? 'bg-[#1e293b] border-rose-500 text-white shadow-lg' : 'bg-[#131b2e] border-transparent text-slate-400 hover:bg-[#1e293b]'}`}
            >
              <Scan size={36} className={scanMode === 'issue' && scanType === 'single' ? 'text-rose-400' : 'text-rose-500/50'} />
              <div className="text-center">
                <p className="font-black text-sm uppercase leading-tight">นำออก</p>
                <p className="text-[10px] italic">(ทีละชิ้น)</p>
              </div>
            </button>

            <button 
              onClick={() => handleModeSelect('issue', 'continuous')}
              className={`p-6 rounded-[2rem] flex flex-col items-center justify-center gap-3 transition-all active:scale-95 border ${scanMode === 'issue' && scanType === 'continuous' ? 'bg-rose-500 border-rose-400 text-white shadow-lg shadow-rose-500/30' : 'bg-rose-900/20 text-rose-500 border-rose-900/30 hover:bg-rose-900/40'}`}
            >
              <Zap size={36} className={scanMode === 'issue' && scanType === 'continuous' ? 'fill-white text-white' : 'fill-rose-500/30 text-rose-500/50'} />
              <div className="text-center">
                <p className="font-black text-sm uppercase leading-tight">นำออก</p>
                <p className="text-[10px] italic">(ต่อเนื่อง)</p>
              </div>
            </button>
          </>
        )}

      </div>

      {/* 🌟 Search Bar / ช่องรับค่าบาร์โค้ด */}
      <form onSubmit={handleBarcodeSubmit} className="max-w-md mx-auto w-full mb-6 px-4 sm:px-6">
        <div className="relative">
          <input 
            ref={inputRef}
            type="text" 
            placeholder="พิมพ์รหัส 15 หลัก..." 
            className="w-full bg-[#131b2e] border border-slate-700/60 p-5 pr-14 rounded-2xl text-white placeholder-slate-500 font-bold outline-none focus:border-blue-500 transition-all text-center tracking-wider"
            value={scanInput}
            onChange={e => setScanInput(e.target.value)}
            disabled={isProcessing}
            autoFocus
          />
          <button type="submit" disabled={isProcessing} className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-400 hover:text-white p-2 transition-all">
            <Search size={22} />
          </button>
        </div>
      </form>

      {/* 🌟 ตะกร้าสินค้าสีสว่าง (เด้งขึ้นมาจากด้านล่าง) */}
      {scannedItems.length > 0 && (
        <div className="bg-white flex-1 px-4 sm:px-6 pt-8 pb-24 mt-2 rounded-t-[3rem] shadow-[0_-10px_40px_rgba(0,0,0,0.2)] animate-in slide-in-from-bottom-8">
          <div className="max-w-md mx-auto w-full space-y-4">
            
            {/* Header ตะกร้า */}
            <div className="flex justify-between items-center bg-white p-2 mb-2">
              <div className="flex items-center gap-3 font-black text-lg text-slate-800">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-full"><ShoppingCart size={22}/></div>
                รายการที่สแกน ({scannedItems.length})
              </div>
              <button onClick={handleSave} className="bg-emerald-500 hover:bg-emerald-400 text-white px-5 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 shadow-md transition-all active:scale-95">
                <CheckCircle2 size={18}/> ยืนยันบันทึก
              </button>
            </div>

            {/* รายการสินค้าในการ์ดสีขาว */}
            <div className="space-y-4">
              {scannedItems.map((item, idx) => (
                <div key={item.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-blue-100 relative text-slate-800">
                  
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      {idx === 0 && <span className="bg-blue-500 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">Latest</span>}
                      <h3 className="font-black text-lg text-slate-800">{item.name}</h3>
                    </div>
                    <button onClick={() => removeItem(item.id)} className="p-2 bg-rose-50 text-rose-400 rounded-xl hover:bg-rose-100 hover:text-rose-500 transition-all">
                      <Trash2 size={20}/>
                    </button>
                  </div>

                  <div className="mb-3">
                    <SKUColoredAdmin sku={item.sku_15_digits} prefix={item.prefix} isDark={false} />
                  </div>

                  {/* 🌟 ขนาด, LOT และ "น้ำหนัก" */}
                  <div className="flex flex-wrap items-center gap-2 mb-6">
                    <span className="text-[11px] font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded">
                      {item.height}x{item.width}x{item.length} มม.
                    </span>
                    <span className="text-[11px] font-black text-slate-600 bg-slate-100 border border-slate-200 px-2 py-1 rounded">
                      LOT: {item.received_date}
                    </span>
                    
                    {/* ⚖️ ระบบโชว์น้ำหนัก (ถ้าสินค้าชิ้นนั้นมีการใส่น้ำหนักไว้) */}
                    {item.weight && (
                      <span className="text-[11px] font-black text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded shadow-sm">
                        ⚖️ น้ำหนัก: {item.weight} กก.
                      </span>
                    )}
                  </div>

                  <div className="flex justify-between items-center border-t border-slate-100 pt-4">
                    <span className="flex items-center gap-1.5 text-xs font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl uppercase tracking-wider">
                      <PackageMinus size={14}/> STOCK: {item.current_stock}
                    </span>

                    <div className="flex items-center gap-4 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
                      <button onClick={() => updateQty(item.id, -1)} className="p-2 bg-white rounded-xl shadow-sm text-slate-400 hover:text-slate-700"><Minus size={20}/></button>
                      <span className="font-black text-2xl w-10 text-center text-slate-800">{item.scan_qty}</span>
                      <button onClick={() => updateQty(item.id, 1)} className="p-2 bg-blue-600 rounded-xl shadow-sm text-white hover:bg-blue-500"><Plus size={20}/></button>
                    </div>
                  </div>

                </div>
              ))}
            </div>

          </div>
        </div>
      )}

    </div>
  )
}

// ห่อด้วย Suspense เพื่อแก้บั๊กตอนดึงค่า ?mode= ออกจาก URL ของ Next.js
export default function ScanPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0b0f19] flex items-center justify-center font-black text-blue-400 italic">LOADING SCAN CENTER...</div>}>
      <ScanPageContent />
    </Suspense>
  )
}
