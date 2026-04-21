'use client'
import { useEffect, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { supabase } from '@/lib/supabaseClient'
import { Minus, Plus, Camera, Search, RefreshCw, X, User, Clock, ArrowRight, MessageSquare, Calendar, Hash, Package } from 'lucide-react'

export default function ScanPage() {
  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  
  const [mode, setMode] = useState<'receive' | 'issue'>('receive')
  const [adjustment, setAdjustment] = useState(0)
  const [note, setNote] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [userName] = useState('ADMIN') 

  const isStockShort = mode === 'issue' && adjustment > (product?.current_stock || 0);

// เพิ่ม useEffect เพื่อเช็ก User
const [userName, setUserName] = useState('Guest')

useEffect(() => {
  const getUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      // ใช้ Email หรือ Metadata ชื่อมาแสดง
      setUserName(user.email?.split('@')[0].toUpperCase() || 'USER')
    } else {
      router.push('/login') // ถ้าไม่ได้ล็อคอิน ให้เด้งไปหน้า Login
    }
  }
  getUser()
}, [])
  
  const startScanner = async () => {
    const html5QrCode = new Html5Qrcode("reader");
    setIsScanning(true);
    try {
      await html5QrCode.start(
        { facingMode: "environment" }, 
        { fps: 15, qrbox: { width: 200, height: 200 } },
        (decodedText) => {
          fetchProduct(decodedText);
          html5QrCode.stop().then(() => setIsScanning(false));
        },
        () => {}
      );
    } catch (err) {
      alert("เปิดกล้องไม่ได้");
      setIsScanning(false);
    }
  };

  const fetchProduct = async (sku: string) => {
    setLoading(true)
    const { data } = await supabase.from('products').select('*').eq('sku_15_digits', sku).single()
    if (data) {
      setProduct(data)
      setAdjustment(0)
      setNote('')
    } else {
      alert('ไม่พบรหัสสินค้า: ' + sku)
    }
    setLoading(false)
  }

  const handleQuickAdd = (num: number) => {
    setAdjustment(prev => {
      const next = prev + num;
      if (mode === 'issue' && next > product.current_stock) return product.current_stock;
      return next;
    });
  };

  const handleManualInput = (val: string) => {
    let num = parseInt(val) || 0;
    if (num < 0) num = 0;
    if (mode === 'issue' && num > product.current_stock) num = product.current_stock;
    setAdjustment(num);
  };

  const confirmUpdate = async () => {
    const finalAmount = mode === 'receive' ? adjustment : -adjustment;
    const newStock = product.current_stock + finalAmount;

    const { error: updateError } = await supabase
      .from('products')
      .update({ current_stock: newStock })
      .eq('id', product.id);

    // เพิ่มการเช็ก Error ตรงนี้ครับ
const { error: txError } = await supabase.from('transactions').insert([{
  product_id: product.id,
  type: mode,
  quantity: adjustment, // เปลี่ยนจาก amount: เป็น quantity:
  stock_before: product.current_stock,
  stock_after: newStock,
  note: note,
  created_by: userName
}]);

  if (txError) {
    console.error("Transaction Error:", txError); // ดูใน Inspect ของบราวเซอร์
    alert("เกิดข้อผิดพลาดในการบันทึกประวัติ: " + txError.message);
    return; // หยุดการทำงานถ้าบันทึกประวัติไม่สำเร็จ
  }

    if (!updateError) {
      await supabase.from('transactions').insert([{
        product_id: product.id,
        type: mode,
        amount: adjustment,
        stock_before: product.current_stock,
        stock_after: newStock,
        note: note,
        created_by: userName
      }]);
      alert("✅ บันทึกรายการสำเร็จ");
      setProduct(null);
      setShowConfirm(false);
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-gray-950 text-slate-100 overflow-hidden font-sans">
      
      {/* Header */}
      <header className="p-3 flex justify-between items-center bg-black/20 border-b border-white/5">
        <h1 className="text-xs font-bold tracking-widest flex items-center gap-2">
          <Camera size={16} className="text-blue-400" /> STOCK SYSTEM
        </h1>
        {product && (
          <button onClick={() => setProduct(null)} className="p-1.5 bg-white/10 rounded-full active:scale-90">
            <X size={18} />
          </button>
        )}
      </header>

      <main className="flex-1 flex flex-col p-3 gap-3 overflow-hidden">
        {!product && (
          <div className="flex-1 flex flex-col gap-3">
            <div className="flex-1 relative rounded-[2.5rem] bg-black overflow-hidden border border-white/10 shadow-2xl">
              <div id="reader" className="w-full h-full"></div>
              {!isScanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900">
                  <button onClick={startScanner} className="bg-blue-600 px-10 py-4 rounded-2xl font-black text-lg shadow-xl active:scale-95">เปิดกล้องสแกน</button>
                </div>
              )}
            </div>
            <div className="flex gap-2 p-1.5 bg-white/5 rounded-2xl border border-white/10">
              <input type="text" placeholder="พิมพ์รหัส 15 หลัก..." className="flex-1 bg-transparent px-3 outline-none text-sm" value={manualCode} onChange={(e) => setManualCode(e.target.value)} />
              <button onClick={() => fetchProduct(manualCode)} className="bg-blue-600 p-3 rounded-xl"><Search size={20} /></button>
            </div>
          </div>
        )}

        {product && !showConfirm && (
          <div className="flex-1 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300">
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-5 rounded-[2.5rem] shadow-xl flex items-center justify-between border border-blue-400/20">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-black truncate leading-none mb-1 uppercase">{product.name}</h2>
                <p className="text-[10px] font-mono opacity-60 truncate">{product.sku_15_digits}</p>
              </div>
              <div className="text-right ml-4">
                <p className="text-[9px] opacity-70 font-bold uppercase mb-1">คงเหลือ</p>
                <p className="text-4xl font-black leading-none">{product.current_stock}</p>
              </div>
            </div>

            <div className="flex-1 bg-white text-slate-900 rounded-[2.5rem] p-5 flex flex-col gap-3 shadow-2xl overflow-hidden">
              <div className="flex p-1 bg-gray-100 rounded-2xl">
                <button onClick={() => {setMode('receive'); setAdjustment(0);}} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-xs transition-all ${mode === 'receive' ? 'bg-white shadow-sm text-green-600' : 'text-gray-400'}`}>
                  <Plus size={14}/> รับเข้า
                </button>
                <button onClick={() => {setMode('issue'); setAdjustment(0);}} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-xs transition-all ${mode === 'issue' ? 'bg-white shadow-sm text-red-600' : 'text-gray-400'}`}>
                  <Minus size={14}/> นำออก
                </button>
              </div>

              <div className="flex w-full items-stretch gap-2 h-16">
                <input 
                  type="number" 
                  inputMode="numeric"
                  className={`flex-1 w-0 min-w-0 text-3xl font-black rounded-2xl bg-gray-50 border-2 text-center outline-none transition-all ${mode === 'issue' && adjustment >= product.current_stock ? 'border-red-500 text-red-600 bg-red-50' : 'border-transparent focus:border-blue-500'}`} 
                  value={adjustment || ''} 
                  onChange={(e) => handleManualInput(e.target.value)}
                  placeholder="0"
                />
                <button onClick={() => setAdjustment(prev => Math.max(0, prev - 1))} className="w-16 flex-shrink-0 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400">
                  <Minus size={24} />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {[1, 5, 10, 50].map(num => (
                  <button key={num} onClick={() => handleQuickAdd(num)} className={`py-3.5 rounded-2xl font-black text-sm active:scale-90 transition-all ${mode === 'receive' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {mode === 'receive' ? '+' : '-'}{num}
                  </button>
                ))}
              </div>

              <div className={`p-4 rounded-2xl border-2 border-dashed flex justify-between items-center ${mode === 'receive' ? 'bg-green-50/50 border-green-200' : 'bg-red-50/50 border-red-200'}`}>
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">คำนวณ</span>
                <span className={`text-xl font-black ${mode === 'receive' ? 'text-green-600' : 'text-red-600'}`}>
                  {product.current_stock} {mode === 'receive' ? '+' : '-'} {adjustment} = {mode === 'receive' ? product.current_stock + adjustment : product.current_stock - adjustment}
                </span>
              </div>

              <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-2xl border border-gray-100">
                <MessageSquare size={16} className="text-gray-300" />
                <input type="text" placeholder="ระบุหมายเหตุ..." className="bg-transparent flex-1 text-sm outline-none font-medium" value={note} onChange={(e) => setNote(e.target.value)} />
              </div>

              <div className="flex gap-2 mt-auto pt-2">
                <button onClick={() => setProduct(null)} className="flex-1 py-4 bg-gray-50 text-gray-400 rounded-2xl font-bold text-sm">ยกเลิก</button>
                <button 
                  onClick={() => setShowConfirm(true)} 
                  disabled={adjustment === 0}
                  className={`flex-[2.5] py-4 rounded-2xl font-black text-sm shadow-xl transition-all ${adjustment === 0 ? 'bg-gray-200 text-gray-400' : 'bg-blue-600 text-white shadow-blue-200'}`}
                >
                  บันทึกรายการ
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Confirmation Overlay - อัปเดตใหม่ตามโจทย์ */}
      {showConfirm && (
        <div className="fixed inset-0 bg-gray-900/95 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[3rem] overflow-hidden text-gray-900 animate-in zoom-in duration-300 shadow-2xl border border-white">
            
            {/* Header: เพิ่มชื่อ User และ วันที่อัปเดต (ข้อ 3) */}
            <div className={`p-8 text-center text-white ${mode === 'receive' ? 'bg-green-600' : 'bg-red-600'}`}>
              <h3 className="text-2xl font-black mb-1 leading-none uppercase">ยืนยันรายการ</h3>
              <div className="flex flex-col items-center gap-1 mt-3 opacity-90">
                <div className="flex items-center gap-1 text-[11px] font-black uppercase tracking-widest">
                  <User size={12} /> {userName}
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold">
                  <Calendar size={12} /> {new Date().toLocaleDateString('th-TH')} <Clock size={12} className="ml-1" /> {new Date().toLocaleTimeString('th-TH')}
                </div>
              </div>
            </div>

            <div className="p-8 space-y-6">
              {/* รายละเอียดสินค้า (ข้อ 1) */}
              <div className="space-y-1 text-center border-b border-gray-50 pb-4">
                 <h4 className="text-lg font-black text-gray-800 leading-tight uppercase">{product.name}</h4>
                 <p className="text-[10px] font-mono text-gray-400 flex items-center justify-center gap-1">
                   <Hash size={10} /> {product.sku_15_digits}
                 </p>
              </div>
              
              <div className="space-y-4">
                {/* ยอดปัจจุบัน และ จำนวนที่ทำรายการ (ข้อ 2) */}
                <div className="flex justify-between items-center text-xs px-2">
                  <span className="text-gray-400 font-bold uppercase tracking-tighter">ยอดปัจจุบัน</span>
                  <span className="font-bold text-gray-500">{product.current_stock} {product.unit}</span>
                </div>

                <div className="flex justify-between items-center text-xs px-2 -mt-2">
                  <span className={`font-black uppercase tracking-tighter ${mode === 'receive' ? 'text-green-500' : 'text-red-500'}`}>
                    {mode === 'receive' ? 'รับเข้าสินค้า' : 'นำออกสินค้า'}
                  </span>
                  <span className={`font-black text-sm ${mode === 'receive' ? 'text-green-500' : 'text-red-500'}`}>
                    {mode === 'receive' ? '+' : '-'} {adjustment} {product.unit}
                  </span>
                </div>

                {/* ยอดหลังอัปเดต */}
                <div className="bg-gray-50 p-6 rounded-[2.5rem] flex items-center justify-between border-2 border-gray-100 shadow-inner">
                  <span className="text-gray-400 text-[10px] font-black uppercase">ยอดหลังอัปเดต</span>
                  <span className={`text-5xl font-black ${mode === 'receive' ? 'text-green-600' : 'text-red-600'}`}>
                    {mode === 'receive' ? product.current_stock + adjustment : product.current_stock - adjustment}
                  </span>
                </div>
              </div>

              {/* หมายเหตุ */}
              <div className="bg-gray-50 p-4 rounded-2xl text-xs text-gray-500 flex flex-col gap-1 border border-gray-100">
                <span className="font-black text-[9px] text-gray-400 uppercase tracking-widest">หมายเหตุ (Note)</span>
                <span className="italic font-medium">{note || '-'}</span>
              </div>

              {/* ปุ่มกดยืนยัน/แก้ไข */}
              <div className="flex gap-4 pt-2">
                <button onClick={() => setShowConfirm(false)} className="flex-1 py-4 font-bold text-gray-300 active:text-gray-500">แก้ไข</button>
                <button onClick={confirmUpdate} className="flex-[2.5] py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-200 active:scale-95 transition-all">บันทึกข้อมูล</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
