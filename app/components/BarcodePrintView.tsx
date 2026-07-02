'use client'
import { useState, useRef } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { Printer, Upload, Search, Info, X } from 'lucide-react'

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
  
  // 🌟 แผงควบคุมส่วนกลางตามสั่งของพี่ตั้ม
  const [companyName, setCompanyName] = useState('บริษัท อุมัง จำกัด')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [showAmountRow, setShowAmountRow] = useState(false) // 🔒 Default = ไม่แสดง (false)

  // 🌟 เก็บสถานะตัวเลือกสินค้าแต่ละแถว (ติ๊กเลือก, จำนวนใบสติ๊กเกอร์, รหัส Pack, และจำนวนชิ้นบนป้าย)
  const [itemSettings, setItemSettings] = useState<{[key: string]: { checked: boolean, copies: number, packNo: string, labelAmount: number }}>({})

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setLogoUrl(URL.createObjectURL(file))
    }
  }

  const updateItemSetting = (id: string, key: string, value: any) => {
    const current = itemSettings[id] || { checked: false, copies: 1, packNo: '', labelAmount: 1 } // 🔒 Default จำนวนชิ้นบนป้าย = 1
    setItemSettings({
      ...itemSettings,
      [id]: { ...current, [key]: value }
    })
  }

  // คัดลอกการ์ดสินค้าออกมาซ้ำตามจำนวนโควตา "จำนวนใบ" ที่คนงานสั่งพิมพ์
  const getFlattenedPrintCards = () => {
    const cards: any[] = []
    products.forEach(item => {
      const setting = itemSettings[item.id] || { checked: false, copies: 1, packNo: '', labelAmount: 1 }
      if (setting.checked && setting.copies > 0) {
        for (let i = 0; i < setting.copies; i++) {
          cards.push({
            ...item,
            packNo: setting.packNo || '-',
            labelAmount: setting.labelAmount ?? 1
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
      
      {/* 🌟 แผงควบคุมตั้งค่าส่วนกลาง (หัวบริษัท, โลโก้, และสวิตช์เปิดปิดจำนวน) */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6 no-print text-slate-800">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900">สร้างบาร์โค้ดสินค้า</h2>
            <p className="text-xs text-slate-400 font-bold mt-1">ระบบจัดพิมพ์สติ๊กเกอร์ไดคัทสำเร็จรูปขนาด A4 หน้าละ 12 ดวง (เรียงตาราง 3 คอลัมน์ x 4 แถว)</p>
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-slate-100 pt-6 items-end">
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 block mb-2">1. ข้อความชื่อบริษัทหัวสติ๊กเกอร์</label>
            <input type="text" className="w-full bg-slate-50 border p-4 rounded-2xl font-bold outline-none focus:border-blue-500 text-slate-900" value={companyName} onChange={e => setCompanyName(e.target.value)} />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 block mb-2">2. อัปโหลดรูปโลโก้ (ฝังตรงกลาง QR)</label>
            <div className="flex items-center gap-4">
              <button onClick={() => logoInputRef.current?.click()} className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-4 rounded-2xl text-xs font-black flex items-center gap-2 shadow-md transition-all shrink-0">
                <Upload size={14}/> เลือกภาพ Logo
              </button>
              <input type="file" ref={logoInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
              {logoUrl ? (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl">
                  <img src={logoUrl} className="w-8 h-8 object-contain rounded" alt="Logo Preview" />
                  <button onClick={() => setLogoUrl(null)} className="text-red-400 hover:text-red-600"><X size={14}/></button>
                </div>
              ) : <span className="text-xs text-slate-400 font-bold italic">ไม่ได้ฝังโลโก้</span>}
            </div>
          </div>
          
          {/* 🔒 ตัวเลือก Checkbox ยืดหยุ่นตามเงื่อนไขของพี่ตั้ม */}
          <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/60 h-[58px]">
            <input 
              type="checkbox" 
              id="showAmountToggle"
              className="w-5 h-5 rounded cursor-pointer accent-blue-600"
              checked={showAmountRow}
              onChange={e => setShowAmountRow(e.target.checked)}
            />
            <label htmlFor="showAmountToggle" className="text-xs font-black text-slate-700 cursor-pointer select-none">
              แสดงบรรทัด "จำนวน" บนป้ายสติ๊กเกอร์
            </label>
          </div>
        </div>
      </div>

      {/* 🌟 ตารางเลือกของและกำหนดจำนวนใบพิมพ์ */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 no-print text-slate-800">
        <div className="xl:col-span-2 bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col max-h-[700px]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <h4 className="font-black text-sm uppercase text-slate-400 tracking-widest ml-2">3. เลือกสินค้า & ใส่โควตาพิมพ์</h4>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
              <input type="text" placeholder="ค้นหาด่วน..." className="w-full bg-slate-50 border p-2 pl-9 rounded-xl text-xs font-bold outline-none" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
          </div>
          
          <div className="space-y-3 overflow-y-auto flex-1 pr-2">
            {filteredProducts.map(item => {
              const state = itemSettings[item.id] || { checked: false, copies: 1, packNo: '', labelAmount: 1 };
              return (
                <div key={item.id} className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row items-start md:items-center gap-4 ${state.checked ? 'bg-blue-50/40 border-blue-400' : 'bg-slate-50/50 border-slate-100'}`}>
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 rounded cursor-pointer accent-blue-600 mt-1 md:mt-0" 
                    checked={state.checked}
                    onChange={e => updateItemSetting(item.id, 'checked', e.target.checked)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm uppercase text-slate-900 truncate">{item.prefix}: {item.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 italic">ขนาด: {item.height}x{item.width}x{item.length} มม. | SKU: {item.sku_15_digits}</p>
                  </div>
                  <div className="flex flex-wrap gap-3 items-center w-full md:w-auto shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                    <div>
                      <span className="text-[9px] text-slate-400 block font-black uppercase mb-1">Pack No.</span>
                      <input type="text" className="w-20 bg-white border p-2 rounded-xl text-xs font-bold text-center" placeholder="P-01" value={state.packNo} onChange={e => updateItemSetting(item.id, 'packNo', e.target.value)} />
                    </div>
                    
                    {/* 🔒 แสดงช่องป้อนจำนวนชิ้นสติกเกอร์เฉพาะเมื่อเปิดติ๊กถูกข้างบน ดึงหน่วยท้ายช่องอัตโนมัติ */}
                    {showAmountRow && (
                      <div>
                        <span className="text-[9px] text-blue-500 block font-black uppercase mb-1">จำนวน ({item.unit})</span>
                        <input type="number" min={1} className="w-20 bg-white border border-blue-300 p-2 rounded-xl text-xs font-black text-center text-blue-600" value={state.labelAmount ?? 1} onChange={e => updateItemSetting(item.id, 'labelAmount', Math.max(1, parseInt(e.target.value) || 1))} />
                      </div>
                    )}

                    <div>
                      <span className="text-[9px] text-slate-400 block font-black uppercase mb-1">จำนวนใบที่จะปรินท์</span>
                      <input type="number" min={1} className="w-16 bg-white border p-2 rounded-xl text-xs font-black text-center" value={state.copies} onChange={e => updateItemSetting(item.id, 'copies', Math.max(1, parseInt(e.target.value) || 1))} />
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
              <div className="bg-white text-slate-900 p-5 rounded-2xl w-full max-w-[270px] shadow-lg flex flex-col justify-between border border-slate-200" style={{ minHeight: '350px' }}>
                <div className="space-y-2 text-[12px] font-bold text-slate-900 leading-tight">
                  <p className="text-center font-black border-b pb-1 text-blue-600 uppercase tracking-tight text-xs">{companyName}</p>
                  <p><span className="text-slate-400 font-black uppercase">Pack No. :</span> {printCards[0].packNo}</p>
                  <p className="truncate"><span className="text-slate-400 font-black uppercase">ตัวย่อ :</span> {printCards[0].prefix}: {printCards[0].name}</p>
                  <p><span className="text-slate-400 font-black uppercase">ขนาด :</span> {printCards[0].height}x{printCards[0].width}x{printCards[0].length}</p>
                  
                  {/* 🔒 ดักจับซ่อน/แสดงบรรทัดจำนวนแบบเรียบเนียนออโต้ */}
                  {showAmountRow && <p><span className="text-slate-400 font-black uppercase">จำนวน :</span> {printCards[0].labelAmount} {printCards[0].unit}</p>}
                  
                  <p><span className="text-slate-400 font-black uppercase">Lot Date :</span> {printCards[0].received_date}</p>
                </div>
                <div className="mt-4 flex flex-col items-center gap-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <QRCodeCanvas value={printCards[0].sku_15_digits} size={110} level="H" imageSettings={logoUrl ? { src: logoUrl, height: 22, width: 22, excavate: true } : undefined} />
                  <span className="font-mono font-black text-[10px] tracking-widest mt-1 text-slate-700">{printCards[0].sku_15_digits}</span>
                </div>
              </div>
            ) : <div className="text-center text-slate-500 font-bold italic text-sm">ติ๊กเลือกสินค้าด้านซ้าย<br/>เพื่อเปิดดูภาพสติกเกอร์ตัวอย่าง</div>}
          </div>
        </div>
      </div>

      {/* 🌟 หน้าจอพรีวิวแบบตารางรวม 3x4 บนหน้าเว็บแอปหลัก (no-print) */}
      {printCards.length > 0 && (
        <div className="no-print bg-white border border-slate-200 p-6 rounded-[2.5rem] shadow-sm">
          <h4 className="font-black text-sm uppercase text-slate-400 tracking-widest mb-4 ml-2">🖨️ โครงสร้างจำลองก่อนส่งพิมพ์ลงแผ่น A4 (หน้าละ 12 ดวง)</h4>
          <div className="bg-slate-100 p-4 rounded-3xl overflow-x-auto">
            <div className="w-[210mm] bg-white border shadow-inner p-[5mm] mx-auto min-h-[297mm]">
              <div className="grid grid-cols-3 gap-3">
                {printCards.map((card, idx) => (
                  <div key={idx} className="border border-slate-300 rounded-lg p-3 flex flex-col justify-between bg-white text-slate-900" style={{ height: '67mm', boxSizing: 'border-box' }}>
                    <div className="space-y-1 text-[11px] font-bold leading-tight text-slate-900">
                      <p className="text-center font-black border-b border-slate-200 pb-0.5 text-blue-600 uppercase text-xs truncate">{companyName}</p>
                      <p><span className="text-slate-400 font-black">Pack No. :</span> {card.packNo}</p>
                      <p className="truncate"><span className="text-slate-400 font-black">ตัวย่อ :</span> {card.prefix}: {card.name}</p>
                      <p><span className="text-slate-400 font-black">ขนาด :</span> {card.height}x{card.width}x{card.length}</p>
                      {showAmountRow && <p><span className="text-slate-400 font-black">จำนวน :</span> {card.labelAmount} {card.unit}</p>}
                      <p><span className="text-slate-400 font-black">Lot Date :</span> {card.received_date}</p>
                    </div>
                    <div className="flex flex-col items-center mt-1 bg-slate-50 p-1.5 rounded border border-slate-100">
                      <QRCodeCanvas value={card.sku_15_digits} size={80} level="H" imageSettings={logoUrl ? { src: logoUrl, height: 16, width: 16, excavate: true } : undefined} />
                      <span className="font-mono font-black text-[9px] tracking-wider mt-0.5 text-slate-800">{card.sku_15_digits}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🔒 🖨️ โครงสร้าง HTML แท้ๆ สำหรับยิงเข้าเครื่องพิมพ์ (แสดงผลเฉพาะตอนสั่งพิมพ์/เซฟ PDF เท่านั้น) */}
      <div className="print-area hidden">
        {Array.from({ length: Math.ceil(printCards.length / 12) }).map((_, pageIdx) => (
          <div key={pageIdx} className="sticker-page">
            {printCards.slice(pageIdx * 12, (pageIdx + 1) * 12).map((card, idx) => (
              <div key={idx} className="sticker-card">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '12px', fontWeight: 'bold', lineHeight: '1.2', color: '#000000' }}>
                  <p style={{ textAlign: 'center', fontWeight: '900', borderBottom: '1px solid #cbd5e1', paddingBottom: '3px', color: '#2563eb', textTransform: 'uppercase', fontSize: '13px' }}>{companyName}</p>
                  <p><span style={{ color: '#64748b', fontWeight: '900' }}>Pack No. :</span> {card.packNo}</p>
                  <p style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><span style={{ color: '#64748b', fontWeight: '900' }}>ตัวย่อ :</span> {card.prefix}: {card.name}</p>
                  <p><span style={{ color: '#64748b', fontWeight: '900' }}>ขนาด :</span> {card.height}x{card.width}x{card.length}</p>
                  {showAmountRow && <p><span style={{ color: '#64748b', fontWeight: '900' }}>จำนวน :</span> {card.labelAmount} {card.unit}</p>}
                  <p><span style={{ color: '#64748b', fontWeight: '900' }}>Lot Date :</span> {card.received_date}</p>
                </div>
                <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: '#f8fafc', padding: '5px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <QRCodeCanvas value={card.sku_15_digits} size={90} level="H" imageSettings={logoUrl ? { src: logoUrl, height: 18, width: 18, excavate: true } : undefined} />
                  <span style={{ fontFamily: 'monospace', fontWeight: '900', fontSize: '10px', tracking: '0.1em', marginTop: '3px', color: '#000000' }}>{card.sku_15_digits}</span>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

    </div>
  )
}
