'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { QrCode, Zap, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react'

// 🔒 🤖 ฟังก์ชันแยกสี SKU ตัวจบ (แก้ปัญหาสีเลื่อนจากภาพ image_8ea7cb.png รองรับ X ใหญ่ + เปลี่ยนท้ายเป็นสีเทา)
const SKUColored = ({ sku, prefix, isDark = false }: { sku: string; prefix: string; isDark?: boolean }) => {
  if (!sku) return null;
  const cleanSku = sku.trim(); // ล้างช่องว่างเผื่อพนักงานเคาะวรรค
  const preLen = prefix?.length || 2;
  
  // 🎯 เปลี่ยนตัวดักจับเป็น /[xX]+$/ เพื่อล็อกเป้าทั้ง x เล็ก และ X ใหญ่หน้างานไม่ให้หลุดตำแหน่ง
  const paddingMatch = cleanSku.match(/[xX]+$/);
  const paddingLen = paddingMatch ? paddingMatch[0].length : 0;
  
  const p1 = cleanSku.substring(0, preLen);
  const p4 = cleanSku.substring(cleanSku.length - paddingLen);
  const p3 = cleanSku.substring(cleanSku.length - paddingLen - 6, cleanSku.length - paddingLen);
  const p2 = cleanSku.substring(preLen, cleanSku.length - paddingLen - 6);
  
  // 🎨 ตั้งค่าชุดสีอัปเกรด บังคับตัวปิดท้าย (pad) ให้เป็นสีเทา Slate สบายตา
  const colors = isDark 
    ? { pre: "text-blue-400", dim: "text-green-400", lot: "text-orange-400", pad: "text-slate-500" } 
    : { pre: "text-blue-600", dim: "text-green-600", lot: "text-orange-500", pad: "text-slate-400" };
    
  return (
    <span className="font-mono font-black tracking-widest uppercase italic">
      <span className={colors.pre}>{p1}</span>
      <span className={colors.dim}>{p2}</span>
      <span className={colors.lot}>{p3}</span>
      <span className={colors.pad}>{p4}</span>
    </span>
  );
};
  );
};

// 🌟 หน้าจอหลักสำหรับคนงานสแกนบาร์โค้ดเข้า-ออกคลัง
export default function ScanPage() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [skuInput, setSkuInput] = useState('')
  const [scanMode, setLayoutMode] = useState<'receive' | 'distribute'>('receive')
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'idle', message: string }>({ type: 'idle', message: '' })
  const [recentLogs, setRecentLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // ดึงประวัติการยิงบาร์โค้ดล่าสุดมาโชว์หน้าจอ
  const fetchRecentLogs = async () => {
    const { data } = await supabase
      .from('transactions')
      .select('*, products(*)')
      .order('created_at', { ascending: false })
      .limit(5)
    if (data) setRecentLogs(data)
  }

  useEffect(() => {
    fetchRecentLogs()
    inputRef.current?.focus()
  }, [])

  // บังคับให้ช่องกรอก Focus ตลอดเวลา สำหรับใช้ร่วมกับปืนยิงบาร์โค้ดหน้างาน
  const handleBlur = () => {
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanSku = skuInput.trim().toUpperCase()
    if (cleanSku.length !== 15) {
      setStatus({ type: 'error', message: '⚠️ รหัสบาร์โค้ดต้องมีความยาวครบ 15 หลักพอดีเป๊ะครับ' })
      setSkuInput('')
      return
    }

    setLoading(true)
    setStatus({ type: 'idle', message: '' })

    try {
      // 1. ตรวจสอบสินค้าในฐานข้อมูล
      const { data: product, error: pError } = await supabase
        .from('products')
        .select('*')
        .eq('sku_15_digits', cleanSku)
        .maybeSingle()

      if (pError || !product) {
        setStatus({ type: 'error', message: `❌ ไม่พบรหัสสินค้า ${cleanSku} ในระบบสต๊อกหลัก` })
        setSkuInput('')
        setLoading(false)
        return
      }

      // 2. คำนวณจำนวนยอดสต๊อกใหม่
      const changeAmount = 1
      const newStock = scanMode === 'receive' 
        ? product.current_stock + changeAmount 
        : product.current_stock - changeAmount

      if (newStock < 0) {
        setStatus({ type: 'error', message: `⚠️ สินค้าหมด! ไม่สามารถจ่ายออกได้ (สต๊อกปัจจุบัน: 0)` })
        setSkuInput('')
        setLoading(false)
        return
      }

      // 3. อัปเดตยอดลงตารางสินค้า
      await supabase
        .from('products')
        .update({ current_stock: newStock })
        .eq('id', product.id)

      // 4. บันทึกประวัติการสแกนเข้าตารางธุรกรรม
      await supabase
        .from('transactions')
        .insert([{
          product_id: product.id,
          type: scanMode,
          amount: changeAmount,
          created_by: 'พนักงานคลังสินค้า'
        }])

      setStatus({ 
        type: 'success', 
        message: `✅ ทำรายการสำเร็จ! ${product.name} ยอดปัจจุบันคือ ${newStock} ${product.unit}` 
      })
      fetchRecentLogs()
    } catch (err) {
      setStatus({ type: 'error', message: '❌ ระบบขัดข้อง ไม่สามารถเชื่อมต่อฐานข้อมูลได้' })
    } finally {
      setSkuInput('')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center p-4 md:p-8 font-sans">
      
      {/* ส่วนหัวหน้าแอป */}
      <div className="w-full max-w-xl text-center my-6">
        <h1 className="text-3xl font-black uppercase tracking-tight text-blue-400 italic flex items-center justify-center gap-2">
          <QrCode size={32}/> Umang Terminal
        </h1>
        <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-1">ระบบสแกนรับเข้า-จ่ายออก คลังสินค้าชิ้นงาน</p>
      </div>

      {/* แผงปุ่มสลับโหมดการทำงาน */}
      <div className="w-full max-w-xl grid grid-cols-2 gap-4 mb-6">
        <button 
          onClick={() => setLayoutMode('receive')}
          className={`py-4 rounded-2xl font-black uppercase text-sm transition-all shadow-md tracking-wider ${scanMode === 'receive' ? 'bg-emerald-600 text-white shadow-emerald-900/30' : 'bg-slate-900 text-slate-400 border border-slate-800'}`}
        >
          📥 สแกนรับเข้าสินค้า
        </button>
        <button 
          onClick={() => setLayoutMode('distribute')}
          className={`py-4 rounded-2xl font-black uppercase text-sm transition-all shadow-md tracking-wider ${scanMode === 'distribute' ? 'bg-red-600 text-white shadow-red-900/30' : 'bg-slate-900 text-slate-400 border border-slate-800'}`}
        >
          📤 สแกนจ่ายออกสินค้า
        </button>
      </div>

      {/* ฟอร์มรับแรงกระแทกจากปืนยิงบาร์โค้ด */}
      <form onSubmit={handleScanSubmit} className="w-full max-w-xl bg-slate-900 border border-slate-800 p-6 rounded-[2.5rem] shadow-xl text-center space-y-4">
        <div className="relative">
          <input 
            ref={inputRef}
            type="text"
            maxLength={15}
            placeholder="[ พร้อมยิงบาร์โค้ด 15 หลัก ]"
            onBlur={handleBlur}
            value={skuInput}
            onChange={e => setSkuInput(e.target.value.replace(/\s+/g, ''))}
            disabled={loading}
            className="w-full bg-slate-950 border border-slate-800 p-5 rounded-2xl text-center text-xl font-mono font-black tracking-widest uppercase text-blue-400 outline-none focus:border-blue-500 transition-all placeholder:text-slate-700 placeholder:font-sans placeholder:text-sm placeholder:tracking-normal"
          />
          <Zap size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-500/50 animate-pulse" />
        </div>

        {/* แสดงกล่องสถานะผลลัพธ์การยิง */}
        {status.type !== 'idle' && (
          <div className={`p-4 rounded-xl flex items-center gap-3 text-left border ${status.type === 'success' ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' : 'bg-red-950/40 border-red-500/30 text-red-300'}`}>
            {status.type === 'success' ? <CheckCircle2 size={20} className="shrink-0"/> : <AlertTriangle size={20} className="shrink-0"/>}
            <p className="text-xs font-bold leading-normal">{status.message}</p>
          </div>
        )}
      </form>

      {/* บล็อกโชว์รายการยิงล่าสุดของพนักงานคลัง */}
      <div className="w-full max-w-xl mt-8 space-y-4">
        <h3 className="font-black uppercase text-xs text-slate-500 tracking-widest flex items-center gap-2">
          <RefreshCw size={14}/> ประวัติการยิงล่าสุด (5 รายการล่าสุด)
        </h3>
        <div className="space-y-2">
          {recentLogs.length > 0 ? (
            recentLogs.map((log) => (
              <div key={log.id} className="bg-slate-950 border border-slate-900 p-4 rounded-2xl flex justify-between items-center shadow-sm">
                <div>
                  <div className="mb-1 leading-none">
                    <SKUColored sku={log.products?.sku_15_digits} prefix={log.products?.prefix} isDark={true} />
                  </div>
                  <p className="text-xs font-black text-slate-300 uppercase truncate max-w-[280px]">{log.products?.name}</p>
                  <p className="text-[9px] font-bold text-slate-500 uppercase italic mt-0.5">
                    ผู้ทำรายการ: {log.created_by}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`text-xl font-black ${log.type === 'receive' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {log.type === 'receive' ? '+' : '-'} {log.amount}
                  </span>
                  <span className="text-[10px] text-slate-500 block font-bold uppercase">{log.products?.unit}</span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-xs text-slate-600 font-bold italic py-4">ยังไม่มีประวัติการสแกนในล็อตนี้</p>
          )}
        </div>
      </div>

    </div>
  )
}
