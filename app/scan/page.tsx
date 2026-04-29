'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { Html5Qrcode } from 'html5-qrcode'
import { generateSKU } from '@/lib/skuHelper'
import { 
  QrCode, Clock, History, Calendar, X, Camera, Search, 
  ArrowDownCircle, ArrowUpCircle, Plus, Minus, FileText, CheckCircle2, AlertCircle
} from 'lucide-react'

export default function ScanPage() {
  const router = useRouter()
  const [personalLogs, setPersonalLogs] = useState<any[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [loading, setLoading] = useState(true)
  const [scanInput, setScanInput] = useState('')
  
  // Scanner States
  const [isScanning, setIsScanning] = useState(false)
  const [scanMode, setScanMode] = useState<'receive' | 'issue' | null>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [activeUser, setActiveName] = useState('')

  // Transaction Modal States
  const [showActionModal, setShowActionModal] = useState(false)
  const [showSummaryModal, setShowSummaryModal] = useState(false) // 🌟 หน้าสรุป
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [amount, setAmount] = useState(1)
  const [note, setNote] = useState('')

  const fetchUserData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return; }

    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', session.user.id).single()
    const currentName = profile?.full_name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0];
    setActiveName(currentName)

    const { data: logs } = await supabase.from('transactions')
      .select('*, products(name, unit, sku_15_digits, width, height, length, current_stock)')
      .eq('created_by', currentName)
      .order('created_at', { ascending: false })
    
    if (logs) setPersonalLogs(logs)
    setLoading(false)
  }, [router])

  useEffect(() => { fetchUserData() }, [fetchUserData])

  const startScanner = async (mode: 'receive' | 'issue') => {
    setScanMode(mode)
    setIsScanning(true)
    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode("reader")
        scannerRef.current = scanner
        await scanner.start(
          { facingMode: "environment" },
          { fps: 15, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            handleLookupProduct(decodedText, mode)
            stopScanner()
          },
          () => {}
        )
      } catch (err) {
        alert("ไม่สามารถเปิดกล้องได้")
        setIsScanning(false)
      }
    }, 300)
  }

  const stopScanner = async () => {
    if (scannerRef.current) {
      await scannerRef.current.stop().catch(() => {})
      scannerRef.current = null
      setIsScanning(false)
    }
  }

  const handleLookupProduct = async (sku: string, mode: 'receive' | 'issue') => {
    const { data: product } = await supabase
      .from('products')
      .select('*')
      .eq('sku_15_digits', sku)
      .single()

    if (!product) {
      alert("❌ ไม่พบสินค้าในระบบ: " + sku)
      return
    }

    setSelectedProduct(product)
    setScanMode(mode)
    setAmount(1)
    setNote('')
    setShowActionModal(true)
  }

  // --- 💾 บันทึกจริง (หลังจากผ่านหน้าสรุป) ---
  const handleSaveTransaction = async () => {
    if (!selectedProduct || amount <= 0) return

    const newStock = scanMode === 'receive' 
      ? selectedProduct.current_stock + amount 
      : selectedProduct.current_stock - amount

    const { error: updateErr } = await supabase.from('products').update({ current_stock: newStock }).eq('id', selectedProduct.id)
    const { error: logErr } = await supabase.from('transactions').insert([{
      product_id: selectedProduct.id,
      type: scanMode,
      amount,
      note,
      created_by: activeUser
    }])

    if (!updateErr && !logErr) {
      setShowSummaryModal(false)
      setShowActionModal(false)
      alert(`✅ บันทึกสำเร็จ!\nยอดคงเหลือใหม่: ${newStock} ${selectedProduct.unit}`)
      fetchUserData()
      setScanInput('')
    }
  }

  const groupedByDate = personalLogs.reduce((acc: any, log: any) => {
    const date = new Date(log.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
    if (!acc[date]) acc[date] = [];
    acc[date].push(log);
    return acc;
  }, {});

  if (loading) return <div className="h-screen bg-[#0a0f18] flex items-center justify-center text-blue-500 font-black italic">LOADING...</div>

  return (
    <div className="flex flex-col h-[100dvh] bg-[#0a0f18] text-white font-sans overflow-hidden">
      
      {/* HEADER */}
      <header className="px-6 py-5 flex justify-between items-center bg-[#1e293b] border-b border-white/5 z-[110]">
        <div className="flex items-center gap-3">
          <QrCode className="text-blue-500" />
          <h1 className="text-xs font-black uppercase tracking-[0.2em] italic text-blue-400">Scan Center</h1>
        </div>
        <button onClick={() => setShowHistory(true)} className="bg-blue-600 text-white px-5 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">
          ประวัติรายการ
        </button>
      </header>

      <div className="flex-1 relative flex flex-col">
        {/* HISTORY OVERLAY */}
        {showHistory && (
          <div className="absolute inset-0 bg-[#0a0f18] z-[120] p-6 overflow-y-auto animate-in slide-in-from-right duration-300">
             <div className="max-w-md mx-auto space-y-6 pb-20 text-slate-900">
                <div className="flex items-center justify-between mb-8">
                   <h3 className="text-2xl font-black italic uppercase text-blue-500">My Activity</h3>
                   <button onClick={() => setShowHistory(false)} className="bg-white/10 p-2 rounded-full text-white"><X/></button>
                </div>
                {Object.entries(groupedByDate).map(([date, logs]: [string, any]) => (
                  <div key={date} className="space-y-4">
                    <div className="text-[11px] font-black uppercase text-slate-500 tracking-widest border-l-2 border-blue-500 pl-3">{date}</div>
                    {logs.map((log: any) => (
                      <div key={log.id} className="bg-white rounded-[1.5rem] p-5 flex flex-col gap-3 shadow-xl">
                        <div className="flex justify-between items-start">
                          <p className="font-black text-lg leading-none">{log.products?.name}</p>
                          <span className={`font-black text-2xl ${log.type === 'receive' ? 'text-green-600' : 'text-red-600'}`}>
                            {log.type === 'receive' ? '+' : '-'} {log.amount}
                          </span>
                        </div>
                        <p className="font-mono text-[12px] font-bold text-blue-600 bg-blue-50 p-2 rounded-lg">{log.products?.sku_15_digits}</p>
                        <p className="text-[10px] font-bold text-slate-400 italic">ขนาด: {log.products?.width} x {log.products?.height} x {log.products?.length} มม.</p>
                        {log.note && <p className="text-[10px] text-slate-500 bg-slate-50 p-2 rounded-lg">Note: {log.note}</p>}
                        <div className="flex justify-end text-[10px] font-bold text-slate-300"><Clock size={12} className="mr-1"/> {new Date(log.created_at).toLocaleTimeString('th-TH')}</div>
                      </div>
                    ))}
                  </div>
                ))}
             </div>
          </div>
        )}

        {/* MAIN BUTTONS */}
        <main className="flex-1 flex flex-col p-8 gap-6 justify-center max-w-sm mx-auto w-full">
          <button onClick={() => startScanner('receive')} className="flex-1 bg-green-600 hover:bg-green-500 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 transition-all active:scale-95 shadow-2xl border-b-8 border-green-800">
            <ArrowDownCircle size={60} /><span className="text-2xl font-black uppercase italic tracking-tighter">นำเข้าสินค้า</span>
          </button>
          <button onClick={() => startScanner('issue')} className="flex-1 bg-red-600 hover:bg-red-500 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 transition-all active:scale-95 shadow-2xl border-b-8 border-red-800">
            <ArrowUpCircle size={60} /><span className="text-2xl font-black uppercase italic tracking-tighter">นำออกสินค้า</span>
          </button>
          <div className="mt-4 relative">
            <input type="text" placeholder="พิมพ์รหัส 15 หลัก..." className="w-full bg-slate-900 border border-white/10 p-5 rounded-2xl outline-none focus:border-blue-500 text-center font-black tracking-widest uppercase" value={scanInput} onChange={(e) => setScanInput(e.target.value)} />
            <button onClick={() => handleLookupProduct(scanInput, 'receive')} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 p-2"><Search size={24}/></button>
          </div>
        </main>
      </div>

      {/* --- 🛠 MODAL 1: จัดการจำนวน (โชว์สต๊อกปัจจุบัน) --- */}
      {showActionModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[300] flex items-end sm:items-center justify-center">
          <div className="bg-white w-full max-w-md rounded-t-[3rem] sm:rounded-[3rem] p-8 text-slate-900 animate-in slide-in-from-bottom duration-300 shadow-2xl">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-black uppercase italic tracking-tighter leading-none">{selectedProduct.name}</h2>
                <p className="text-[13px] font-black text-slate-400 mt-2 uppercase tracking-widest">
                  ขนาด: {selectedProduct.width} x {selectedProduct.height} x {selectedProduct.length} มม.
                </p>
                <p className="text-blue-600 font-mono font-bold mt-1 text-[12px]">{selectedProduct.sku_15_digits}</p>
              </div>
              <button onClick={() => setShowActionModal(false)} className="bg-slate-100 p-2 rounded-full text-slate-400"><X/></button>
            </div>

            <div className="space-y-6">
              {/* ส่วนแสดงสต๊อกคงเหลือในระบบ */}
              <div className="bg-slate-900 text-white p-4 rounded-2xl flex justify-between items-center">
                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">สต๊อกคงเหลือในระบบ</span>
                 <span className="text-xl font-black">{selectedProduct.current_stock} <span className="text-[10px] opacity-50">{selectedProduct.unit}</span></span>
              </div>

              {/* ปุ่มลัด 5 10 50 */}
              <div className="grid grid-cols-3 gap-3">
                {[5, 10, 50].map(num => (
                  <button key={num} onClick={() => setAmount(prev => prev + num)} className={`${scanMode === 'receive' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-red-50 text-red-600 border-red-200'} py-4 rounded-2xl font-black text-xl border-b-4 active:translate-y-1 active:border-b-0 transition-all`}>
                    {scanMode === 'receive' ? '+' : '-'}{num}
                  </button>
                ))}
              </div>

              {/* ปรับทีละ 1 และคีย์เลขได้ */}
              <div className="flex items-center justify-between bg-slate-100 p-2 rounded-3xl gap-2 border border-slate-200 shadow-inner">
                <button onClick={() => setAmount(prev => Math.max(1, prev - 1))} className={`w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-md ${scanMode === 'receive' ? 'text-slate-400' : 'text-red-500'}`}><Minus size={30} strokeWidth={3}/></button>
                <div className="flex-1 text-center bg-white rounded-2xl p-2 shadow-sm">
                  <input type="number" value={amount} onChange={(e) => setAmount(Math.max(1, parseInt(e.target.value) || 0))} className="w-full text-5xl font-black tabular-nums text-center outline-none border-none bg-transparent" />
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{selectedProduct.unit}</p>
                </div>
                <button onClick={() => setAmount(prev => prev + 1)} className={`w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-md ${scanMode === 'receive' ? 'text-green-500' : 'text-slate-400'}`}><Plus size={30} strokeWidth={3}/></button>
              </div>

              <div className="relative">
                <FileText className="absolute left-4 top-4 text-slate-300" size={20}/><textarea placeholder="หมายเหตุ (ถ้ามี)..." className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 pl-12 text-sm font-bold outline-none h-20" value={note} onChange={(e) => setNote(e.target.value)}/>
              </div>

              <button 
                onClick={() => setShowSummaryModal(true)} // 🌟 กดยืนยันแล้วไปหน้าสรุป
                className={`w-full py-6 rounded-[2rem] font-black text-xl uppercase italic tracking-tighter text-white shadow-xl transition-all active:scale-95 ${scanMode === 'receive' ? 'bg-green-600 shadow-green-200' : 'bg-red-600 shadow-red-200'}`}
              >
                ยืนยัน{scanMode === 'receive' ? 'นำเข้า' : 'นำออก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- 🌟 MODAL 2: สรุปรายการก่อนบันทึกจริง --- */}
      {showSummaryModal && selectedProduct && (
        <div className="fixed inset-0 bg-slate-900/98 backdrop-blur-xl z-[400] flex items-center justify-center p-6">
           <div className="bg-white w-full max-w-sm rounded-[3rem] p-8 text-slate-900 shadow-2xl animate-in zoom-in duration-200">
              <div className="flex flex-col items-center text-center mb-8">
                 <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${scanMode === 'receive' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    <AlertCircle size={40} />
                 </div>
                 <h3 className="text-2xl font-black uppercase italic tracking-tighter">สรุปรายการ</h3>
                 <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">กรุณาตรวจสอบความถูกต้อง</p>
              </div>

              <div className="space-y-4 mb-10">
                 <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase">สินค้า</span>
                    <span className="font-bold text-sm">{selectedProduct.name}</span>
                 </div>
                 <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase">รหัส SKU</span>
                    <span className="font-mono font-black text-blue-600 text-[11px]">{selectedProduct.sku_15_digits}</span>
                 </div>
                 <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase">ประเภท</span>
                    <span className={`font-black text-sm uppercase ${scanMode === 'receive' ? 'text-green-600' : 'text-red-600'}`}>
                       {scanMode === 'receive' ? 'นำเข้า (+)' : 'นำออก (-)'}
                    </span>
                 </div>
                 <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase">จำนวน</span>
                    <span className="font-black text-xl">{amount} {selectedProduct.unit}</span>
                 </div>

                 {/* สรุปยอดสต๊อกใหม่ */}
                 <div className="bg-slate-50 p-4 rounded-2xl mt-4">
                    <div className="flex justify-between text-xs font-bold">
                       <span>สต๊อกเดิม:</span>
                       <span>{selectedProduct.current_stock}</span>
                    </div>
                    <div className="flex justify-between text-xs font-black mt-2 pt-2 border-t border-slate-200">
                       <span>ยอดคงเหลือใหม่:</span>
                       <span className={scanMode === 'receive' ? 'text-green-600' : 'text-red-600'}>
                          {scanMode === 'receive' ? selectedProduct.current_stock + amount : selectedProduct.current_stock - amount} {selectedProduct.unit}
                       </span>
                    </div>
                 </div>
              </div>

              <div className="flex gap-3">
                 <button onClick={() => setShowSummaryModal(false)} className="flex-1 bg-slate-100 py-4 rounded-2xl font-black text-slate-400 uppercase tracking-widest text-[11px]">แก้ไข</button>
                 <button onClick={handleSaveTransaction} className={`flex-[2] py-4 rounded-2xl font-black text-white shadow-lg ${scanMode === 'receive' ? 'bg-green-600' : 'bg-red-600'}`}>ยืนยันทำรายการ</button>
              </div>
           </div>
        </div>
      )}

      {/* CAMERA SCANNER */}
      {isScanning && (
        <div className="fixed inset-0 bg-black z-[200] flex flex-col">
          <div className="flex justify-between items-center p-6 bg-slate-900 border-b border-white/5">
            <p className="font-black uppercase italic text-blue-400">Mode: {scanMode?.toUpperCase()}</p>
            <button onClick={stopScanner} className="bg-red-50 text-white p-2 rounded-full"><X/></button>
          </div>
          <div id="reader" className="flex-1 bg-black"></div>
        </div>
      )}
    </div>
  )
}
