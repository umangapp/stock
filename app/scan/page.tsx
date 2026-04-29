'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { Html5Qrcode } from 'html5-qrcode'
import { 
  QrCode, LogOut, Clock, History, Calendar, X, Camera, Search, 
  ArrowDownCircle, ArrowUpCircle, CheckCircle2
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

  const fetchUserData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return; }

    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', session.user.id).single()
    const currentName = profile?.full_name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0];
    setActiveName(currentName)

    const { data: logs } = await supabase.from('transactions')
      .select('*, products(name, unit, sku_15_digits)')
      .eq('created_by', currentName)
      .order('created_at', { ascending: false })
    
    if (logs) setPersonalLogs(logs)
    setLoading(false)
  }, [router])

  useEffect(() => { fetchUserData() }, [fetchUserData])

  // --- 📸 ระบบควบคุมกล้อง (แยกตามโหมด) ---
  const startScanner = async (mode: 'receive' | 'issue') => {
    try {
      setScanMode(mode)
      setIsScanning(true) // 1. เปิด Modal ขึ้นมาก่อน
      
      // 2. รอจังหวะให้ React วาด Element "reader" ให้เสร็จก่อน (300ms)
      setTimeout(async () => {
        try {
          const scanner = new Html5Qrcode("reader")
          scannerRef.current = scanner
          
          await scanner.start(
            { facingMode: "environment" }, 
            { fps: 15, qrbox: { width: 250, height: 250 } },
            (decodedText) => {
              handleProcessTransaction(decodedText, mode)
              stopScanner()
            },
            () => {} // ไม่พบรหัส (ข้ามไป)
          )
        } catch (err: any) {
          console.error("Camera error:", err)
          // ถ้าเปิดไม่ได้ ให้มันบอกหน่อยว่าติดอะไร
          alert("❌ กล้องไม่ทำงาน: " + (err.message || "กรุณาเช็กสิทธิ์การเข้าถึงกล้อง"));
          setIsScanning(false)
        }
      }, 300); // ดีเลย์นิดนึงให้ UI พร้อม

    } catch (err) {
      setIsScanning(false)
    }
  }

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
      } catch (e) { console.log("Stop error", e) }
      scannerRef.current = null
      setIsScanning(false)
      setScanMode(null)
    }
  }

  // --- 📦 ระบบบันทึกรายการ ---
  const handleProcessTransaction = async (sku: string, mode: 'receive' | 'issue') => {
    const { data: product } = await supabase
      .from('products')
      .select('*')
      .eq('sku_15_digits', sku)
      .single()

    if (!product) {
      alert("❌ ไม่พบสินค้าในระบบ: " + sku)
      return
    }

    const amountStr = prompt(`[${mode === 'receive' ? 'นำเข้า' : 'นำออก'}] ${product.name}\nป้อนจำนวน (${product.unit}):`, "1");
    const amount = Number(amountStr);

    if (isNaN(amount) || amount <= 0) return;

    const newStock = mode === 'receive' ? product.current_stock + amount : product.current_stock - amount;

    const { error: updateErr } = await supabase.from('products').update({ current_stock: newStock }).eq('id', product.id);
    await supabase.from('transactions').insert([{
      product_id: product.id,
      type: mode,
      amount,
      created_by: activeUser
    }]);

    if (!updateErr) {
      alert(`✅ บันทึกเรียบร้อย!\nสต๊อกคงเหลือ: ${newStock} ${product.unit}`);
      fetchUserData();
      setScanInput('');
    }
  }

  const groupedByDate = personalLogs.reduce((acc: any, log: any) => {
    const date = new Date(log.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
    if (!acc[date]) acc[date] = [];
    acc[date].push(log);
    return acc;
  }, {});

  if (loading) return <div className="h-screen bg-[#0a0f18] flex items-center justify-center text-blue-500 font-black tracking-widest">LOADING...</div>

  return (
    <div className="flex flex-col h-[100dvh] bg-[#0a0f18] text-white font-sans overflow-hidden">
      
      {/* HEADER */}
      <header className="px-6 py-5 flex justify-between items-center bg-[#1e293b] border-b border-white/5 z-[110]">
        <div className="flex items-center gap-3">
          <QrCode className="text-blue-500" />
          <h1 className="text-xs font-black uppercase tracking-[0.2em] italic">Scan Center</h1>
        </div>
        <button onClick={() => setShowHistory(true)} className="bg-blue-600 text-white px-5 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
          ประวัติรายการ
        </button>
      </header>

      <div className="flex-1 relative flex flex-col">
        
        {/* HISTORY OVERLAY */}
        {showHistory && (
          <div className="absolute inset-0 bg-[#0a0f18] z-[120] p-6 overflow-y-auto animate-in slide-in-from-right duration-300">
             <div className="max-w-md mx-auto space-y-6 pb-20">
                <div className="flex items-center justify-between mb-8">
                   <h3 className="text-2xl font-black italic uppercase text-blue-500">My Activity</h3>
                   <button onClick={() => setShowHistory(false)} className="bg-white/10 p-2 rounded-full"><X/></button>
                </div>
                {Object.entries(groupedByDate).map(([date, logs]: [string, any]) => (
                  <div key={date} className="space-y-4">
                    <div className="text-[11px] font-black uppercase text-slate-500 tracking-widest border-l-2 border-blue-500 pl-3">{date}</div>
                    {logs.map((log: any) => (
                      <div key={log.id} className="bg-white rounded-[1.5rem] p-5 flex flex-col gap-3 text-slate-900 shadow-xl">
                        <div className="flex justify-between items-start">
                          <p className="font-black text-lg leading-none">{log.products?.name}</p>
                          <span className={`font-black text-2xl ${log.type === 'receive' ? 'text-green-600' : 'text-red-600'}`}>
                            {log.type === 'receive' ? '+' : '-'} {log.amount}
                          </span>
                        </div>
                        <p className="font-mono text-sm font-bold text-blue-600 bg-blue-50 p-2 rounded-lg">{log.products?.sku_15_digits}</p>
                        <div className="flex justify-end text-[10px] font-bold text-slate-400 uppercase italic">
                          <Clock size={12} className="mr-1"/> {new Date(log.created_at).toLocaleTimeString('th-TH')}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
             </div>
          </div>
        )}

        {/* MAIN SCAN BUTTONS (แบบเดิม) */}
        <main className="flex-1 flex flex-col p-8 gap-6 justify-center max-w-sm mx-auto w-full">
          
          {/* ปุ่มที่ 1: นำเข้า */}
          <button 
            onClick={() => startScanner('receive')}
            className="flex-1 bg-green-600 hover:bg-green-500 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 transition-all active:scale-95 shadow-2xl shadow-green-900/20 border-b-8 border-green-800"
          >
            <ArrowDownCircle size={60} />
            <span className="text-2xl font-black uppercase italic tracking-tighter">นำเข้าสินค้า</span>
          </button>

          {/* ปุ่มที่ 2: นำออก */}
          <button 
            onClick={() => startScanner('issue')}
            className="flex-1 bg-red-600 hover:bg-red-500 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 transition-all active:scale-95 shadow-2xl shadow-red-900/20 border-b-8 border-red-800"
          >
            <ArrowUpCircle size={60} />
            <span className="text-2xl font-black uppercase italic tracking-tighter">นำออกสินค้า</span>
          </button>

          {/* Manual Input Search */}
          <div className="mt-4 relative group">
            <input 
              type="text" 
              placeholder="กรอกรหัส 15 หลัก..." 
              className="w-full bg-slate-900 border border-white/10 p-5 rounded-2xl outline-none focus:border-blue-500 text-center font-black tracking-widest"
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
            />
            <button 
              onClick={() => {
                const mode = confirm("กด ตกลง(+) เพื่อรับเข้า | กด ยกเลิก(-) เพื่อจ่ายออก") ? 'receive' : 'issue';
                handleProcessTransaction(scanInput, mode);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 p-2"
            >
              <CheckCircle2 size={24}/>
            </button>
          </div>
        </main>
      </div>

      {/* CAMERA MODAL */}
      {isScanning && (
        <div className="fixed inset-0 bg-black z-[200] flex flex-col">
          <div className="flex justify-between items-center p-6 bg-slate-900">
            <p className="font-black uppercase italic text-blue-400">
              {scanMode === 'receive' ? 'โหมดนำเข้าสินค้า (+)' : 'โหมดนำออกสินค้า (-)'}
            </p>
            <button onClick={stopScanner} className="bg-red-500 text-white p-2 rounded-full"><X/></button>
          </div>
          <div id="reader" className="flex-1"></div>
          <div className="p-8 bg-slate-900 text-center">
            <p className="text-xs text-slate-500 uppercase font-bold tracking-widest animate-pulse">Scanning Barcode / QR Code...</p>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="p-4 flex justify-center bg-[#111827]">
          <button onClick={() => router.push('/dashboard')} className="text-[10px] font-black uppercase text-slate-500 hover:text-white transition-colors tracking-[0.2em]">
             Admin Dashboard
          </button>
      </footer>
    </div>
  )
}
