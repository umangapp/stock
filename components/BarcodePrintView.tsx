'use client'
import { useState, useRef, useEffect } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { Printer, Upload, Search, Info, X, Type, Move } from 'lucide-react'

interface Product {
  id: string
  name: string
  prefix: string
  height: number
  width: number
  length: number
  received_date: string
  unit: string
  current_stock: number
  sku_15_digits: string
}

interface BarcodePrintViewProps {
  products: Product[]
}

export default function BarcodePrintView({ products }: BarcodePrintViewProps) {
  const logoInputRef = useRef<HTMLInputElement>(null)
  const [searchQuery, setSearchQuery] = useState('')
  
  const [companyName, setCompanyName] = useState('บริษัท อุมัง จำกัด')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  
  const [fontSize, setFontSize] = useState(14) 
  const [qrSize, setQrSize] = useState(90)     

  const [itemSettings, setItemSettings] = useState<{[key: string]: { checked: boolean, copies: number, packNo: string, labelAmount: number, showAmount: boolean }}>({})

  useEffect(() => {
    const savedName = localStorage.getItem('umang_company_name')
    if (savedName) setCompanyName(savedName)
    const savedLogo = localStorage.getItem('umang_logo_base64')
    if (savedLogo) setLogoUrl(savedLogo)
    const savedFont = localStorage.getItem('umang_font_size')
    if (savedFont) setFontSize(Number(savedFont))
    const savedQr = localStorage.getItem('umang_qr_size')
    if (savedQr) setQrSize(Number(savedQr))
  }, [])

  const handleCompanyNameChange = (val: string) => {
    setCompanyName(val)
    localStorage.setItem('umang_company_name', val)
  }

  const handleFontSizeChange = (val: number) => {
    setFontSize(val)
    localStorage.setItem('umang_font_size', String(val))
  }

  const handleQrSizeChange = (val: number) => {
    setQrSize(val)
    localStorage.setItem('umang_qr_size', String(val))
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = reader.result as string
        setLogoUrl(base64String)
        localStorage.setItem('umang_logo_base64', base64String)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveLogo = () => {
    setLogoUrl(null)
    localStorage.removeItem('umang_logo_base64')
  }

  const updateItemSetting = (id: string, key: string, value: any) => {
    const current = itemSettings[id] || { checked: false, copies: 1, packNo: '', labelAmount: 1, showAmount: false }
    setItemSettings({
      ...itemSettings,
      [id]: { ...current, [key]: value }
    })
  }

  const getFlattenedPrintCards = () => {
    const cards: any[] = []
    products.forEach(item => {
      const setting = itemSettings[item.id] || { checked: false, copies: 1, packNo: '', labelAmount: 1, showAmount: false }
      if (setting.checked && setting.copies > 0) {
        for (let i = 0; i < setting.copies; i++) {
          cards.push({
            ...item,
            packNo: setting.packNo || '-',
            labelAmount: setting.labelAmount ?? 1,
            showAmount: setting.showAmount
          })
        }
      }
    })
    return cards
  }

  const printCards = getFlattenedPrintCards()
  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku_15_digits.includes(searchQuery.toUpperCase()))

  return (
    <div className="space-y-8 animate-in fade-in">
      
      {/* แผงควบคุมตั้งค่าส่วนกลางจำค่าอัตโนมัติ + แถบปรับขนาด Text & QR ด้วยตัวเอง */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6 no-print text-slate-800">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900">สร้างบาร์โค้ดสินค้า</h2>
            <p className="text-xs text-slate-400 font-bold mt-1">ระบบจัดพิมพ์สติ๊กเกอร์สำเร็จรูปขนาด A4 หน้าละ 12 ดวง สามารถเลื่อนสไลเดอร์ปรับสเกลขนาดได้อิสระ</p>
          </div>
          <button 
            onClick={() => {
              if (printCards.length === 0) { alert('⚠️ กรุณาติ๊กเลือกสินค้าและใส่จำนวนใบที่จะพิมพ์ก่อนครับพี่ตั้ม'); return; }
              window.print();
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase flex items-center gap-2 shadow-lg transition-all active:scale-95 shrink-0"
          >
            <Printer size={16}/> สั่งพิมพ์สติ๊กเกอร์ / เซฟ PDF ({printCards.length} ดวง)
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-100 pt-6">
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 block mb-2">1. ข้อความชื่อบริษัทหัวสติ๊กเกอร์ (Auto-Save)</label>
            <input type="text" className="w-full bg-slate-50 border p-4 rounded-2xl font-bold outline-none focus:border-blue-500 text-slate-900" value={companyName} onChange={e => handleCompanyNameChange(e.target.value)} />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 block mb-2">2. อัปโหลดรูปโลโก้บริษัท (Auto-Save ฝังใน QR)</label>
            <div className="flex items-center gap-4">
              <button onClick={() => logoInputRef.current?.click()} className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-4 rounded-2xl text-xs font-black flex items-center gap-2 shadow-md transition-all shrink-0">
                <Upload size={14}/> เลือกภาพ Logo
              </button>
              <input type="file" ref={logoInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
              {logoUrl ? (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl">
                  <img src={logoUrl} className="w-8 h-8 object-contain rounded" alt="Logo Preview" />
                  <button onClick={handleRemoveLogo} className="text-red-400 hover:text-red-600"><X size={14}/></button>
                </div>
              ) : <span className="text-xs text-slate-400 font-bold italic">ไม่ได้ฝังโลโก้คิวอาร์</span>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-slate-100 pt-6 bg-slate-50 p-6 rounded-3xl border">
          <div className="space-y-2">
            <h4 className="font-black text-xs text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Type size={16} className="text-blue-500"/> 3. แถบปรับขนาดตัวหนังสือสติ๊กเกอร์ (ปัจจุบัน: {fontSize}px)
            </h4>
            <input 
              type="range" min="12" max="20" step="1" 
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" 
              value={fontSize} onChange={e => handleFontSizeChange(Number(e.target.value))} 
            />
            <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase"><span>เล็ก (12px)</span><span>ใหญ่มาก (20px)</span></div>
          </div>

          <div className="space-y-2">
            <h4 className="font-black text-xs text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Move size={16} className="text-emerald-500"/> 4. แถบปรับขนาดรูปกล่อง QR Code (ปัจจุบัน: {qrSize}px)
            </h4>
            <input 
              type="range" min="70" max="130" step="5" 
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600" 
              value={qrSize} onChange={e => handleQrSizeChange(Number(e.target.value))} 
            />
            <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase"><span>เล็กกะทัดรัด (70px)</span><span>ใหญ่เต็มดวง (130px)</span></div>
          </div>
        </div>
      </div>

      {/* ตารางเลือกของและกำหนดจำนวนใบพิมพ์ */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 no-print text-slate-800">
        <div className="xl:col-span-2 bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col max-h-[700px]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <h4 className="font-black text-sm uppercase text-slate-400 tracking-widest ml-2">5. เลือกสินค้า & ใส่โควตาพิมพ์</h4>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
              <input type="text" placeholder="ค้นหาด่วน..." className="w-full bg-slate-50 border p-2 pl-9 rounded-xl text-xs font-bold outline-none" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
          </div>
          
          <div className="space-y-3 overflow-y-auto flex-1 pr-2">
            {filteredProducts.map(item => {
              const state = itemSettings[item.id] || { checked: false, copies: 1, packNo: '', labelAmount: 1, showAmount: false };
              return (
                <div key={item.id} className={`p-4 rounded-2xl border transition-all flex flex-col lg:flex-row items-start lg:items-center gap-4 ${state.checked ? 'bg-blue-50/40 border-blue-400 shadow-sm' : 'bg-slate-50/50 border-slate-100'}`}>
                  <div className="flex items-center gap-3 w-full lg:w-auto">
                    <input type="checkbox" className="w-5 h-5 rounded cursor-pointer accent-blue-600 shrink-0" checked={state.checked} onChange={e => updateItemSetting(item.id, 'checked', e.target.checked)} />
                    <div className="min-w-0 flex-1 lg:w-56">
                      <p className="font-black text-sm uppercase text-slate-900 truncate">{item.prefix}: {item.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 italic">ขนาด: {item.height}x{item.width}x{item.length} มม. | SKU: {item.sku_15_digits}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto lg:ml-auto pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-200">
                    <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-2.5 rounded-xl border border-slate-200 h-[54px]">
                      <input type="checkbox" id={`showAmount-${item.id}`} className="w-4 h-4 rounded cursor-pointer accent-blue-600" checked={state.showAmount} onChange={e => updateItemSetting(item.id, 'showAmount', e.target.checked)} />
                      <label htmlFor={`showAmount-${item.id}`} className="text-xs font-bold text-slate-700 cursor-pointer select-none">แสดงจำนวน</label>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block font-black uppercase mb-1">Pack No.</span>
                      <input type="text" className="w-20 bg-white border p-2 h-[38px] rounded-xl text-xs font-bold text-center" placeholder="เช่น P-01" value={state.packNo} onChange={e => updateItemSetting(item.id, 'packNo', e.target.value)} />
                    </div>
                    {state.showAmount && (
                      <div>
                        <span className="text-[9px] text-blue-500 block font-black uppercase mb-1">ระบุจำนวน ({item.unit})</span>
                        <input type="number" min={1} className="w-20 bg-white border border-blue-400 h-[38px] p-2 rounded-xl text-xs font-black text-center text-blue-600" value={state.labelAmount ?? 1} onChange={e => updateItemSetting(item.id, 'labelAmount', Math.max(1, parseInt(e.target.value) || 1))} />
                      </div>
                    )}
                    <div className="bg-amber-50 border border-amber-300 p-1.5 rounded-xl text-center shadow-inner">
                      <span className="text-[9px] text-amber-700 block font-black uppercase mb-0.5">🔥 พิมพ์กี่ดวง?</span>
                      <input type="number" min={1} className="w-20 bg-white border border-amber-400 h-[32px] p-1 rounded-lg text-sm font-black text-center text-amber-900 focus:border-amber-600 outline-none" value={state.copies} onChange={e => updateItemSetting(item.id, 'copies', Math.max(1, parseInt(e.target.value) || 1))} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* หน้าต่างจำลองแผ่นป้ายสติ๊กเกอร์ตัวอย่าง */}
        <div className="bg-slate-900 p-6 rounded-[2.5rem] text-white flex flex-col h-[700px] shadow-2xl">
          <h4 className="font-black text-sm uppercase text-blue-400 tracking-widest mb-4 flex items-center gap-2"><Info size={16}/> ตัวอย่างสติ๊กเกอร์ดวงแรก</h4>
          <div className="flex-1 flex items-center justify-center bg-white/5 rounded-3xl p-4 overflow-hidden">
            {printCards.length > 0 ? (
              /* 🌟 ปรับปลดล็อกเปลี่ยนจาก minHeight คงที่ เป็นปรับตัวยืดหดออโต้ไม่บีบตัวหนังสือ */
              <div className="bg-white text-slate-900 p-5 rounded-2xl w-full max-w-[270px] shadow-lg flex flex-col justify-between border border-slate-200 h-auto min-h-[350px]">
                <div className="font-bold text-slate-900 leading-normal flex-shrink-0" style={{ fontSize: `${fontSize}px` }}>
                  <p className="text-center font-black border-b pb-1 text-blue-600 uppercase tracking-tight text-sm" style={{ fontSize: `${fontSize + 1}px` }}>{companyName}</p>
                  <p className="mt-1.5"><span className="text-slate-400 font-black uppercase">Pack No. :</span> {printCards[0].packNo}</p>
                  <p className="truncate"><span className="text-slate-400 font-black uppercase">ตัวย่อ :</span> {printCards[0].prefix}: {printCards[0].name}</p>
                  <p><span className="text-slate-400 font-black uppercase">ขนาด :</span> {printCards[0].height}x{printCards[0].width}x{printCards[0].length}</p>
                  {printCards[0].showAmount && <p><span className="text-slate-400 font-black uppercase">จำนวน :</span> {printCards[0].labelAmount} {printCards[0].unit}</p>}
                  <p><span className="text-slate-400 font-black uppercase">Lot Date :</span> {printCards[0].received_date}</p>
                </div>
                {/* 🌟 บล็อกคิวอาร์โค้ดเพิ่ม flex-shrink-0 กันโดนบีบหาย */}
                <div className="mt-3 flex flex-col items-center gap-1 bg-slate-50 p-2 rounded-xl border border-slate-200 flex-shrink-0">
                  <QRCodeCanvas { /* @ts-ignore */ ...{}} value={printCards[0].sku_15_digits} size={qrSize} level="H" imageSettings={logoUrl ? { src: logoUrl, height: Math.floor(qrSize*0.2), width: Math.floor(qrSize*0.2), excavate: true } : undefined} />
                  <span className="font-mono font-black tracking-widest mt-1 text-slate-700" style={{ fontSize: `${Math.max(9, fontSize - 3)}px` }}>{printCards[0].sku_15_digits}</span>
                </div>
              </div>
            ) : <div className="text-center text-slate-500 font-bold italic text-sm">ติ๊กเลือกสินค้าด้านซ้าย<br/>เพื่อเปิดดูภาพสติกเกอร์ตัวอย่าง</div>}
          </div>
        </div>
      </div>

      {/* หน้าจอพรีวิวแบบตารางรวม 3x4 บนหน้าเว็บแอปหลัก (no-print) */}
      {printCards.length > 0 && (
        <div className="no-print bg-white border border-slate-200 p-6 rounded-[2.5rem] shadow-sm">
          <h4 className="font-black text-sm uppercase text-slate-400 tracking-widest mb-4 ml-2">🖨️ โครงสร้างจำลองก่อนส่งพิมพ์ลงแผ่น A4 (หน้าละ 12 ดวง)</h4>
          <div className="bg-slate-100 p-4 rounded-3xl overflow-x-auto">
            <div className="w-[210mm] bg-white border shadow-inner p-[5mm] mx-auto min-h-[297mm]">
              <div className="grid grid-cols-3 gap-3">
                {printCards.map((card, idx) => (
                  /* 🌟 ปรับตรงจำลองแผงพริ้นต์ให้ใช้ minHeight และขยายความสูงตามจริง */
                  <div key={idx} className="border border-slate-300 rounded-lg p-3 flex flex-col justify-between bg-white text-slate-900 h-auto min-h-[67mm]" style={{ boxSizing: 'border-box' }}>
                    <div className="font-bold leading-normal text-slate-900 flex-shrink-0" style={{ fontSize: `${fontSize}px` }}>
                      <p className="text-center font-black border-b border-slate-200 pb-0.5 text-blue-600 uppercase text-xs truncate" style={{ fontSize: `${fontSize + 1}px` }}>{companyName}</p>
                      <p className="mt-1"><span className="text-slate-400 font-black">Pack No. :</span> {card.packNo}</p>
                      <p className="truncate"><span className="text-slate-400 font-black">ตัวย่อ :</span> {card.prefix}: {card.name}</p>
                      <p><span className="text-slate-400 font-black">ขนาด :</span> {card.height}x{card.width}x{card.length}</p>
                      {card.showAmount && <p><span className="text-slate-400 font-black">จำนวน :</span> {card.labelAmount} {card.unit}</p>}
                      <p><span className="text-slate-400 font-black">Lot Date :</span> {card.received_date}</p>
                    </div>
                    <div className="flex flex-col items-center mt-1 bg-slate-50 p-1 rounded border border-slate-100 flex-shrink-0">
                      <QRCodeCanvas { /* @ts-ignore */ ...{}} value={card.sku_15_digits} size={qrSize - 10} level="H" imageSettings={logoUrl ? { src: logoUrl, height: Math.floor((qrSize-10)*0.2), width: Math.floor((qrSize-10)*0.2), excavate: true } : undefined} />
                      <span className="font-mono font-black tracking-wider mt-0.5 text-slate-800" style={{ fontSize: `${Math.max(8, fontSize - 4)}px` }}>{card.sku_15_digits}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* โครงสร้างสำหรับยิงเข้ากระดาษพิมพ์สติกเกอร์ / PDF ตัวจริง (ปลดล็อกความสูงขยายตามสเกลสไลเดอร์ 100%) */}
      <div className="print-area hidden">
        {Array.from({ length: Math.ceil(printCards.length / 12) }).map((_, pageIdx) => (
          <div key={pageIdx} className="sticker-page">
            {printCards.slice(pageIdx * 12, (pageIdx + 1) * 12).map((card, idx) => (
              /* 🌟 ปลดล็อกกรอกขนาดแผ่นจริงให้ใช้ min-height ขยายตามมือสไลเดอร์ */
              <div key={idx} className="sticker-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid #94a3b8', padding: '4mm', borderRadius: '6px', boxSizing: 'border-box', pageBreakInside: 'avoid', height: 'auto', minHeight: '67mm' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: `${fontSize}px`, fontWeight: 'bold', lineHeight: '1.3', color: '#000000', flexShrink: 0 }}>
                  <p style={{ textAlign: 'center', fontWeight: '900', borderBottom: '1px solid #cbd5e1', paddingBottom: '4px', color: '#2563eb', textTransform: 'uppercase', fontSize: `${fontSize + 1}px` }}>{companyName}</p>
                  <p style={{ margin: '2px 0 0 0' }}><span style={{ color: '#64748b', fontWeight: '900' }}>Pack No. :</span> {card.packNo}</p>
                  <p style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}><span style={{ color: '#64748b', fontWeight: '900' }}>ตัวย่อ :</span> {card.prefix}: {card.name}</p>
                  <p style={{ margin: 0 }}><span style={{ color: '#64748b', fontWeight: '900' }}>ขนาด :</span> {card.height}x{card.width}x{card.length}</p>
                  {card.showAmount && <p style={{ color: '#000000', margin: 0 }}><span style={{ color: '#64748b', fontWeight: '900' }}>จำนวน :</span> {card.labelAmount} {card.unit}</p>}
                  <p style={{ margin: 0 }}><span style={{ color: '#64748b', fontWeight: '900' }}>Lot Date :</span> {card.received_date}</p>
                </div>
                <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: '#f8fafc', padding: '5px', borderRadius: '6px', border: '1px solid #e2e8f0', flexShrink: 0 }}>
                  <QRCodeCanvas { /* @ts-ignore */ ...{}} value={card.sku_15_digits} size={qrSize} level="H" imageSettings={logoUrl ? { src: logoUrl, height: Math.floor(qrSize*0.2), width: Math.floor(qrSize*0.2), excavate: true } : undefined} />
                  <span style={{ fontFamily: 'monospace', fontWeight: '900', fontSize: `${Math.max(9, fontSize - 3)}px`, letterSpacing: '0.1em', marginTop: '3px', color: '#000000' }}>{card.sku_15_digits}</span>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

    </div>
  )
}
