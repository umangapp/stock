'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { generateSKU } from '@/lib/skuHelper'
import { Html5Qrcode } from 'html5-qrcode' // 🌟 ต้องติดตั้งตัวนี้ก่อน
import { 
  QrCode, LogOut, Clock, History, Calendar, X, Camera, Search, RefreshCw, PackageCheck 
} from 'lucide-react'

export default function ScanPage() {
  const router = useRouter()
  const [personalLogs, setPersonalLogs] = useState<any[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [loading, setLoading] = useState(true)
  const [scanInput, setScanInput] = useState('')
  
  // Scanner States
  const [isScanning, setIsScanning] = useState(false)
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

  // --- 📸 ระบบควบคุมกล้อง ---
  const startScanner = async () => {
    try {
      setIsScanning(true)
      const scanner = new Html5Qrcode("reader")
      scannerRef.current = scanner
      
      await scanner.start(
        { facingMode: "environment" }, // ใช้กล้องหลัง
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          handleProcessScan(decodedText) // เมื่อสแกนติด
          stopScanner()
        },
        () => {} // ไม่พบรหัส (ข้าม)
      )
    } catch (err) {
      console.error(err)
      alert("ไม่สามารถเข้าถึงกล้องได้")
      setIsScanning(false)
    }
  }

  const stopScanner = async () => {
    if (scannerRef.current) {
      await scannerRef.current.stop()
      scannerRef.current = null
      setIsScanning(false)
    }
  }

  // --- 📦 ระบบจัดการสต๊อกหลังสแกน ---
  const handleProcessScan = async (sku: string) => {
    // 1. ค้นหาสินค้า
    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('sku_15_digits', sku)
      .single()

    if (!product) {
      alert("❌ ไม่พบสินค้ารหัสนี้ในระบบ: " + sku)
      return
    }

    // 2. ถามจำนวนและประเภท (รับเข้า/จ่ายออก)
    const type = confirm(`พบสินค้า: ${product.name}\nกด ตกลง(+) เพื่อรับเข้า | กด ยกเลิก(-) เพื่อจ่ายออก`) ? 'receive' : 'issue';
    const amountStr = prompt(`ป้อนจำนวนที่ต้องการ (${product.unit}):`, "1");
    const amount = Number(amountStr);

    if (isNaN(amount) || amount <= 0) {
      alert("จำนวนไม่ถูกต้อง");
      return;
    }

    // 3. อัปเดตสต๊อกและบันทึก Log
    const newStock = type === 'receive' ? product.current_stock + amount : product.current_stock - amount;

    const { error: updateErr } = await supabase.from('products').update({ current_stock: newStock }).eq('id', product.id);
    await supabase.from('transactions').insert([{
      product_id: product.id,
      type,
      amount,
      created_by: activeUser
    }]);

    if (!updateErr) {
      alert(`✅ บันทึกสำเร็จ!\nสต๊อกคงเหลือ: ${newStock} ${product.unit}`);
      fetchUserData();
    }
  }

  // --- จัดกลุ่มประวัติ ---
  const groupedByDate = personalLogs.reduce((acc: any, log: any) => {
    const date = new Date(log.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
    if (!acc[date]) acc[date] = [];
    acc[date].push(log);
    return acc;
  }, {});

  if (loading) return <div className="h-screen bg-[#0a0f18] flex items-center justify-center text-blue-500 font-black animate-pulse uppercase tracking-[0.3em]">Loading...</div>

  return (
    <div className="flex flex-col h-[100dvh] bg-[#0a0f18] text-white font-sans overflow-hidden">
      
      {/* HEADER */}
      <header className="px-6 py-5 flex justify-between items-center bg-[#1e293b] border-b border-blue-500/20 z-[110] shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg shadow-lg"><Camera size={18} className="text-white" /></div>
          <h1 className="text-[12px] font-black uppercase tracking-[0.2em] italic text-blue-400">Scan Center</h1>
        </div>
        <button onClick={() => setShowHistory(true)} className="flex items-center gap-2 bg-blue-500 text-white px-6 py-3 rounded-full transition-all active:scale-95 shadow-[0_0_20px_rgba(59,130,246,0.4)] border border-blue-300">
          <History size={20} /><span className="text-sm font-black uppercase tracking-widest text-[11px]">ประวัติรายการ</span>
        </button>
      </header>

      <div className="flex-1 relative flex flex-col">
        
        {/* DRILL-DOWN HISTORY */}
        {showHistory && (
          <div className="absolute inset-0 bg-[#0a0f18] z-[120] p-6 overflow-y-auto animate-in fade-in zoom-in duration-300">
             <div className="max-w-md mx-auto space-y-6 pb-20">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                   <div className="flex items-center gap-3 text-blue-500"><History size={28} /><h3 className="text-2xl font-black italic uppercase tracking-tighter">My History</h3></div>
                   <button onClick={() => setShowHistory(false)} className="bg-white/10 p-3 rounded-full text-white"><X size={28}/></button>
                </div>
                {Object.entries(groupedByDate).map(([date, logs]: [string, any]) => (
                  <div key={date} className="space-y-4">
                    <div className="flex items-center gap-2 text-blue-400 bg-blue-500/10 p-3 rounded-xl border border-blue-500/20"><Calendar size={18} /><span className="text-[12px] font-black uppercase tracking-widest">{date}</span></div>
                    {logs.map((log: any) => (
                      <div key={log.id} className="bg-white rounded-[2rem] p-6 flex flex-col gap-4 text-slate-900 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-2 h-full bg-blue-500"></div>
                        <div className="flex justify-between items-start">
                          <p className="text-xl font-black uppercase leading-none">{log.products?.name}</p>
                          <span className={`text-3xl font-black ${log.type === 'receive' ? 'text-green-600' : 'text-red-600'}`}>{log.type === 'receive' ? '+' : '-'} {log.amount}</span>
                        </div>
                        <div className="bg-slate-100 p-4 rounded-2xl border border-slate-200">
                          <p className="text-xl font-mono font-black text-blue-700 tracking-widest uppercase">{log.products?.sku_15_digits}</p>
                        </div>
                        <div className="flex justify-end italic text-slate-400 font-bold text-[10px]"><Clock size={12} className="mr-1 text-blue-500" />{new Date(log.created_at).toLocaleTimeString('th-TH')}</div>
                      </div>
                    ))}
                  </div>
                ))}
             </div>
          </div>
        )}

        {/* MAIN SCAN AREA */}
        <main className="flex-1 flex flex-col items-center justify-center p-8 gap-8">
          
          <div className="relative w-full max-w-sm aspect-square bg-slate-900 rounded-[4rem] border-2 border-dashed border-blue-500/30 overflow-hidden flex items-center justify-center">
            {/* จุดแสดงภาพกล้อง */}
            <div id="reader" className="w-full h-full object-cover"></div>
            
            {!isScanning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-900/80 backdrop-blur-sm">
                 <QrCode size={80} className="text-blue-500/20" />
                 <button 
                  onClick={startScanner}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-5 rounded-[2rem] font-black text-xl uppercase italic shadow-[0_10px_40px_rgba(37,99,235,0.4)] transition-all active:scale-95"
                 >
                    สแกนสินค้า
                 </button>
              </div>
            )}

            {isScanning && (
              <button 
                onClick={stopScanner}
                className="absolute bottom-6 bg-red-600/80 backdrop-blur-md text-white px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-widest"
              >
                ปิดกล้อง
              </button>
            )}
          </div>

          <div className="w-full max-w-sm relative group">
            <input 
              type="text" 
              placeholder="กรอกรหัส 15 หลัก..." 
              className="w-full bg-[#111827] border border-white/10 p-7 rounded-[2.5rem] outline-none focus:border-blue-500 text-white font-black text-center tracking-[0.2em] text-2xl shadow-2xl"
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleProcessScan(scanInput)}
            />
            <button 
              onClick={() => handleProcessScan(scanInput)}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-blue-600 p-3 rounded-2xl text-white"
            >
              <Search size={24}/>
            </button>
          </div>
        </main>
      </div>

      {/* FOOTER */}
      <footer className="p-6 flex justify-between items-center bg-[#111827] border-t border-white/5 shrink-0">
          <button onClick={() => router.push('/dashboard')} className="text-[10px] font-black uppercase text-blue-400 hover:text-white transition-colors tracking-widest">Admin Dashboard</button>
          <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))} className="text-[10px] font-black uppercase text-red-500 hover:text-white transition-colors tracking-widest">Sign Out</button>
      </footer>
    </div>
  )
}
