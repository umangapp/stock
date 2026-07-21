'use client'
import { useState, useRef, useEffect } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { Printer, Upload, Search, Info, X, Type, Move, Columns, Rows } from 'lucide-react'

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
  const [qrSize, setQrSize] = useState(100)      
  const [frameWidth, setFrameWidth] = useState(6.7)   
  const [frameHeight, setFrameHeight] = useState(6.7)  

  const [layoutMode, setLayoutMode] = useState<'horizontal' | 'vertical'>('vertical')
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
    const savedWidth = localStorage.getItem('umang_frame_width')
    if (savedWidth) setFrameWidth(Number(savedWidth))
    const savedHeight = localStorage.getItem('umang_frame_height')
    if (savedHeight) setFrameHeight(Number(savedHeight))
    const savedLayout = localStorage.getItem('umang_layout_mode')
    if (savedLayout === 'horizontal' || savedLayout === 'vertical') setLayoutMode(savedLayout)
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

  const handleFrameWidthChange = (val: number) => {
    setFrameWidth(val)
    localStorage.setItem('umang_frame_width', String(val))
  }

  const handleFrameHeightChange = (val: number) => {
    setFrameHeight(val)
    localStorage.setItem('umang_frame_height', String(val))
  }

  const handleLayoutModeChange = (mode: 'horizontal' | 'vertical') => {
    setLayoutMode(mode)
    localStorage.setItem('umang_layout_mode', mode)
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

  // 🔒 🤖 คำนวณหาโควตาจำนวนดวงต่อหน้ากระดาษ A4 ตามสูตรคำสั่งล็อกเป้าของพี่ตั้ม
  const itemsPerPage = layoutMode === 'vertical' ? 9 : 15;

  return (
    <div className="space-y-8 animate-in fade-in">
      
      {/* 🔒 🤖 ฝังชุดคำสั่ง CSS Grid ควบคุมเครื่องพิมพ์ของระบบ Windows/Mac ให้สับ Layout หน้าตรงเป๊ะตามสั่ง */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-area { display: block !important; width: ${layoutMode === 'vertical' ? '210mm' : '297mm'} !important; }
          @page {
            size: A4 ${layoutMode === 'vertical' ? 'portrait' : 'landscape'};
            margin: 0mm !important;
          }
          body {
            margin: 0mm !important;
            padding: 0mm !important;
            background: #ffffff !important;
          }
          .sticker-page {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            grid-template-rows: repeat(${layoutMode === 'vertical' ? 3 : 5}, 1fr) !important;
            gap: 4mm !important;
            padding: 8mm 6mm !important;
            width: ${layoutMode === 'vertical' ? '210mm' : '297mm'} !important;
            height: ${layoutMode === 'vertical' ? '297mm' : '210mm'} !important;
            page-break-after: always !important;
            page-break-inside: avoid !important;
            box-sizing: border-box !important;
            background-color: #ffffff !important;
          }
          .sticker-card-print {
            width: 100% !important;
            height: 100% !important;
            box-sizing: border-box !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>
      
      {/* แผงควบคุมตั้งค่าระบบบาร์โค้ด */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6 no-print text-slate-800">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900">สร้างบาร์โค้ดสินค้า</h2>
            <p className="text-xs text-slate-400 font-bold mt-1">ระบบจัดพิมพ์สติ๊กเกอร์ล็อกความละเอียดตารางจัดวาง (แนวตั้ง 3x3 รวม 9 ดวง / แนวนอน 3x5 รวม 15 ดวงต่อแผ่น)</p>
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

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 border-t border-slate-100 pt-6 items-start">
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

          <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-200/60">
            <label className="text-[10px] font-black uppercase text-blue-600 ml-2 block mb-2">3. กำหนดขนาดกรอบสติ๊กเกอร์หน้างาน (หน่วย: เซนติเมตร)</label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <input type="number" step="0.1" min="3" max="15" className="w-full bg-white border p-3 rounded-xl font-black text-center pr-10 text-slate-900 outline-none focus:border-blue-500" value={frameWidth} onChange={e => handleFrameWidthChange(parseFloat(e.target.value) || 6.7)} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 uppercase">กว้าง ซม.</span>
              </div>
              <div className="relative flex-1">
                <input type="number" step="0.1" min="3" max="15" className="w-full bg-white border p-3 rounded-xl font-black text-center pr-10 text-slate-900 outline-none focus:border-blue-500" value={frameHeight} onChange={e => handleFrameHeightChange(parseFloat(e.target.value) || 6.7)} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 uppercase">สูง ซม.</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 border-t border-slate-100 pt-6 bg-slate-50 p-6 rounded-3xl border items-center">
          <div className="space-y-2">
            <h4 className="font-black text-xs text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Type size={16} className="text-blue-500"/> 4. แถบปรับขนาดตัวหนังสือ (ปัจจุบัน: {fontSize}px)
            </h4>
            <input 
              type="range" min="12" max="30" step="1" 
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" 
              value={fontSize} onChange={e => handleFontSizeChange(Number(e.target.value))} 
            />
            <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase"><span>เล็ก (12px)</span><span>ใหญ่ (30px)</span></div>
          </div>

          <div className="space-y-2">
            <h4 className="font-black text-xs text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Move size={16} className="text-emerald-500"/> 5. แถบปรับขนาดรูป QR Code (ปัจจุบัน: {qrSize}px)
            </h4>
            <input 
              type="range" min="70" max="250" step="5" 
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600" 
              value={qrSize} onChange={e => handleQrSizeChange(Number(e.target.value))} 
            />
            <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase"><span>เล็ก (70px)</span><span>ใหญ่ (250px)</span></div>
          </div>

          <div className="space-y-2">
            <h4 className="font-black text-xs text-slate-700 uppercase tracking-wider block">6. เลือกรูปแบบการจัดวางป้ายสติ๊กเกอร์</h4>
            <div className="grid grid-cols-2 gap-2">
              <button 
                type="button"
                onClick={() => handleLayoutModeChange('vertical')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl font-black text-xs uppercase shadow-sm border transition-all ${layoutMode === 'vertical' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-slate-100 border-slate-200'}`}
              >
                <Rows size={16}/> แนวตั้ง (3x3 ตาราง)
              </button>
              <button 
                type="button"
                onClick={() => handleLayoutModeChange('horizontal')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl font-black text-xs uppercase shadow-sm border transition-all ${layoutMode === 'horizontal' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-slate-100 border-slate-200'}`}
              >
                <Columns size={16}/> แนวนอน (3x5 ตาราง)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ตารางเลือกของและกำหนดจำนวนใบพิมพ์ */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 no-print text-slate-800">
        <div className="xl:col-span-2 bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col max-h-[700px]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <h4 className="font-black text-sm uppercase text-slate-400 tracking-widest ml-2">7. เลือกสินค้า & ใส่โควตาพิมพ์</h4>
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

        {/* หน้าต่างจำลองแผ่นป้ายสติ๊กเกอร์ดวงแรก (Live Preview) */}
        <div className="bg-slate-900 p-6 rounded-[2.5rem] text-white flex flex-col h-[700px] shadow-2xl">
          <h4 className="font-black text-sm uppercase text-blue-400 tracking-widest mb-4 flex items-center gap-2"><Info size={16}/> 8. จำลองสติ๊กเกอร์ดวงแรก (Live Preview)</h4>
          <div className="flex-1 flex items-center justify-center bg-white/5 rounded-3xl p-4 overflow-auto">
            {printCards.length > 0 ? (
              <div className="bg-white text-slate-900 p-4 rounded-xl shadow-lg flex flex-col justify-between border border-slate-200 overflow-hidden shrink-0" style={{ width: `${frameWidth}cm`, height: `${frameHeight}cm`, boxSizing: 'border-box' }}>
                <p className="text-center font-black border-b pb-1 text-blue-600 uppercase tracking-tight truncate shrink-0" style={{ fontSize: `${fontSize + 2}px`, margin: '0 0 4px 0' }}>{companyName}</p>
                
                {layoutMode === 'vertical' ? (
                  <div style={{ display: 'flex', flexTemplate: 'column', flex: 1, minHeight: 0, justifyContent: 'space-between', width: '100%' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', fontSize: `${fontSize}px`, fontWeight: 'bold', color: '#000000', width: '100%' }}>
                      <p style={{ marginTop: '8px', marginBottom: '8px', marginLeft: 0, marginRight: 0 }}><span style={{ color: '#64748b', fontWeight: '900' }}>Pack No. :</span> {printCards[0].packNo}</p>
                      <p style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><span style={{ color: '#64748b', fontWeight: '900' }}>ตัวย่อ :</span> {printCards[0].prefix} : {printCards[0].name}</p>
                      <p style={{ margin: 0 }}><span style={{ color: '#64748b', fontWeight: '900' }}>ขนาด :</span> {printCards[0].height}x{printCards[0].width}x{printCards[0].length}</p>
                      {printCards[0].showAmount && <p style={{ margin: 0 }}><span style={{ color: '#64748b', fontWeight: '900' }}>จำนวน :</span> {printCards[0].labelAmount} {printCards[0].unit}</p>}
                      <p style={{ margin: 0 }}><span style={{ color: '#64748b', fontWeight: '900' }}>Lot Date :</span> {printCards[0].received_date}</p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginTop: 'auto', flexShrink: 0, width: '100%' }}>
                      <QRCodeCanvas value={printCards[0].sku_15_digits} size={qrSize} level="H" imageSettings={logoUrl ? { src: logoUrl, height: Math.floor(qrSize*0.22), width: Math.floor(qrSize*0.22), excavate: true } : undefined} />
                      <span className="font-mono font-black tracking-widest mt-0.5 text-slate-700" style={{ fontSize: `${Math.max(9, fontSize - 3)}px`, whiteSpace: 'nowrap' }}>{printCards[0].sku_15_digits}</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flex: 1, minHeight: 0, gap: '3mm', width: '100%' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, fontSize: `${fontSize}px`, fontWeight: 'bold', color: '#000000', justifyContent: 'center' }}>
                      <p style={{ marginTop: '8px', marginBottom: '8px', marginLeft: 0, marginRight: 0 }}><span style={{ color: '#64748b', fontWeight: '900' }}>Pack No. :</span> {printCards[0].packNo}</p>
                      <p style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><span style={{ color: '#64748b', fontWeight: '900' }}>ตัวย่อ :</span> {printCards[0].prefix} : {printCards[0].name}</p>
                      <p style={{ margin: 0, whiteSpace: 'nowrap' }}><span style={{ color: '#64748b', fontWeight: '900' }}>ขนาด :</span> {printCards[0].height}x{printCards[0].width}x{printCards[0].length}</p>
                      {printCards[0].showAmount && <p style={{ margin: 0, whiteSpace: 'nowrap' }}><span style={{ color: '#64748b', fontWeight: '900' }}>จำนวน :</span> {printCards[0].labelAmount} {printCards[0].unit}</p>}
                      <p style={{ margin: 0, whiteSpace: 'nowrap' }}><span style={{ color: '#64748b', fontWeight: '900' }}>Lot Date :</span> {printCards[0].received_date}</p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <QRCodeCanvas value={printCards[0].sku_15_digits} size={qrSize} level="H" imageSettings={logoUrl ? { src: logoUrl, height: Math.floor(qrSize*0.22), width: Math.floor(qrSize*0.22), excavate: true } : undefined} />
                      <span className="font-mono font-black tracking-widest mt-1 text-slate-700" style={{ fontSize: `${Math.max(9, fontSize - 3)}px`, whiteSpace: 'nowrap' }}>{printCards[0].sku_15_digits}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : <div className="text-center text-slate-500 font-bold italic text-sm">ติ๊กเลือกสินค้าด้านซ้าย<br/>เพื่อเปิดดูภาพสติกเกอร์ตัวอย่าง</div>}
          </div>
        </div>
      </div>

      {/* 🔒 🤖 หน้าจอพรีวิวบนแอป ปรับเป็นระบบ CSS Grid 3 คอลัมน์ ล็อกตามการตั้งค่าเป๊ะ ๆ */}
      {printCards.length > 0 && (
        <div className="no-print bg-white border border-slate-200 p-6 rounded-[2.5rem] shadow-sm">
          <h4 className="font-black text-sm uppercase text-slate-400 tracking-widest mb-4 ml-2">🖨️ 9. ตัวอย่างจัดหน้ากระดาษ A4 ({layoutMode === 'vertical' ? '3x3' : '3x5'} Layout)</h4>
          <div className="bg-slate-100 p-4 rounded-3xl overflow-x-auto">
            <div className="bg-white border shadow-inner p-[5mm] mx-auto" style={{ width: layoutMode === 'vertical' ? '210mm' : '297mm', minHeight: layoutMode === 'vertical' ? '297mm' : '210mm' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4mm' }}>
                {printCards.map((card, idx) => (
                  <div key={idx} className="border border-slate-300 bg-white text-slate-900 p-3 rounded flex flex-col justify-between overflow-hidden shadow-sm" style={{ width: '100%', height: `${frameHeight}cm`, boxSizing: 'border-box' }}>
                    <p style={{ textAlign: 'center', fontWeight: '900', borderBottom: '1px solid #cbd5e1', paddingBottom: '2px', color: '#2563eb', textTransform: 'uppercase', fontSize: `${fontSize + 1}px`, margin: '0 0 3px 0' }} className="truncate">{companyName}</p>
                    
                    {layoutMode === 'vertical' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, justifyTemplate: 'space-between', width: '100%' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: `${fontSize}px`, fontWeight: 'bold', color: '#000000', width: '100%' }}>
                          <p style={{ marginTop: '4px', marginBottom: '4px', marginLeft: 0, marginRight: 0 }}><span style={{ color: '#64748b', fontWeight: '900' }}>Pack No. :</span> {card.packNo}</p>
                          <p style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><span style={{ color: '#64748b', fontWeight: '900' }}>ตัวย่อ :</span> {card.prefix} : {card.name}</p>
                          <p style={{ margin: 0 }}><span style={{ color: '#64748b', fontWeight: '900' }}>ขนาด :</span> {card.height}x{card.width}x{card.length}</p>
                          {card.showAmount && <p style={{ margin: 0 }}><span style={{ color: '#64748b', fontWeight: '900' }}>จำนวน :</span> {card.labelAmount} {card.unit}</p>}
                          <p style={{ margin: 0 }}><span style={{ color: '#64748b', fontWeight: '900' }}>Lot Date :</span> {card.received_date}</p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginTop: 'auto', flexShrink: 0, width: '100%' }}>
                          <QRCodeCanvas value={card.sku_15_digits} size={qrSize - 10} level="H" imageSettings={logoUrl ? { src: logoUrl, height: Math.floor((qrSize-10)*0.22), width: Math.floor((qrSize-10)*0.22), excavate: true } : undefined} />
                          <span style={{ fontFamily: 'monospace', fontWeight: '900', fontSize: `${Math.max(8, fontSize - 4)}px`, letterSpacing: '0.05em', marginTop: '2px', color: '#000000', whiteSpace: 'nowrap' }}>{card.sku_15_digits}</span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flex: 1, minHeight: 0, gap: '2mm' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, fontSize: `${fontSize}px`, fontWeight: 'bold', color: '#000000', justifyContent: 'center' }}>
                          <p style={{ marginTop: '4px', marginBottom: '4px', marginLeft: 0, marginRight: 0 }}><span style={{ color: '#64748b', fontWeight: '900' }}>Pack No. :</span> {card.packNo}</p>
                          <p style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><span style={{ color: '#64748b', fontWeight: '900' }}>ตัวย่อ :</span> {card.prefix} : {card.name}</p>
                          <p style={{ margin: 0, whiteSpace: 'nowrap' }}><span style={{ color: '#64748b', fontWeight: '900' }}>ขนาด :</span> {card.height}x{card.width}x{card.length}</p>
                          {card.showAmount && <p style={{ margin: 0, whiteSpace: 'nowrap' }}><span style={{ color: '#64748b', fontWeight: '900' }}>จำนวน :</span> {card.labelAmount} {card.unit}</p>}
                          <p style={{ margin: 0, whiteSpace: 'nowrap' }}><span style={{ color: '#64748b', fontWeight: '900' }}>Lot Date :</span> {card.received_date}</p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <QRCodeCanvas value={card.sku_15_digits} size={qrSize - 10} level="H" imageSettings={logoUrl ? { src: logoUrl, height: Math.floor((qrSize-10)*0.22), width: Math.floor((qrSize-10)*0.22), excavate: true } : undefined} />
                          <span style={{ fontFamily: 'monospace', fontWeight: '900', fontSize: `${Math.max(8, fontSize - 4)}px`, letterSpacing: '0.05em', marginTop: '3px', color: '#000000', whiteSpace: 'nowrap' }}>{card.sku_15_digits}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🔒 🖨️ โครงสร้างสำหรับพิมพ์ลงกระดาษจริง ปรับใช้ระบบคำนวณแบ่งแผ่นตามโควตาแนวตั้ง (9 ดวง) / แนวนอน (15 ดวง) */}
      <div className="print-area hidden">
        {Array.from({ length: Math.ceil(printCards.length / itemsPerPage) }).map((_, pageIdx) => (
          <div key={pageIdx} className="sticker-page">
            {printCards.slice(pageIdx * itemsPerPage, (pageIdx + 1) * itemsPerPage).map((card, idx) => (
              <div key={idx} className="sticker-card-print" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid #94a3b8', padding: '4mm', borderRadius: '6px', backgroundColor: '#ffffff', overflow: 'hidden' }}>
                
                <p style={{ textAlign: 'center', fontWeight: '900', borderBottom: '1px solid #cbd5e1', paddingBottom: '4px', color: '#2563eb', textTransform: 'uppercase', fontSize: `${fontSize + 1}px`, margin: '0 0 4px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{companyName}</p>
                
                {layoutMode === 'vertical' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, justifyContent: 'space-between', width: '100%' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: `${fontSize}px`, fontWeight: 'bold', lineHeight: '1.3', color: '#000000', width: '100%' }}>
                      <p style={{ marginTop: '6px', marginBottom: '6px', marginLeft: 0, marginRight: 0 }}><span style={{ color: '#64748b', fontWeight: '900' }}>Pack No. :</span> {card.packNo}</p>
                      <p style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}><span style={{ color: '#64748b', fontWeight: '900' }}>ตัวย่อ :</span> {card.prefix} : {card.name}</p>
                      <p style={{ margin: 0 }}><span style={{ color: '#64748b', fontWeight: '900' }}>ขนาด :</span> {card.height}x{card.width}x{card.length}</p>
                      {card.showAmount && <p style={{ color: '#000000', margin: 0 }}><span style={{ color: '#64748b', fontWeight: '900' }}>จำนวน :</span> {card.labelAmount} {card.unit}</p>}
                      <p style={{ margin: 0 }}><span style={{ color: '#64748b', fontWeight: '900' }}>Lot Date :</span> {card.received_date}</p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginTop: 'auto', flexShrink: 0, width: '100%' }}>
                      <QRCodeCanvas value={card.sku_15_digits} size={qrSize} level="H" imageSettings={logoUrl ? { src: logoUrl, height: Math.floor(qrSize*0.22), width: Math.floor(qrSize*0.22), excavate: true } : undefined} />
                      <span style={{ fontFamily: 'monospace', fontWeight: '900', fontSize: `${Math.max(9, fontSize - 3)}px`, letterSpacing: '0.1em', marginTop: '3px', color: '#000000', whiteSpace: 'nowrap' }}>{card.sku_15_digits}</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flex: 1, minHeight: 0, gap: '3mm' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: `${fontSize}px`, fontWeight: 'bold', lineHeight: '1.3', color: '#000000', flex: 1, minWidth: 0, justifyContent: 'center' }}>
                      <p style={{ marginTop: '6px', marginBottom: '6px', marginLeft: 0, marginRight: 0 }}><span style={{ color: '#64748b', fontWeight: '900' }}>Pack No. :</span> {card.packNo}</p>
                      <p style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}><span style={{ color: '#64748b', fontWeight: '900' }}>ตัวย่อ :</span> {card.prefix} : {card.name}</p>
                      <p style={{ margin: 0 }}><span style={{ color: '#64748b', fontWeight: '900' }}>ขนาด :</span> {card.height}x{card.width}x{card.length}</p>
                      {card.showAmount && <p style={{ color: '#000000', margin: 0 }}><span style={{ color: '#64748b', fontWeight: '900' }}>จำนวน :</span> {card.labelAmount} {card.unit}</p>}
                      <p style={{ margin: 0 }}><span style={{ color: '#64748b', fontWeight: '900' }}>Lot Date :</span> {card.received_date}</p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <QRCodeCanvas value={card.sku_15_digits} size={qrSize} level="H" imageSettings={logoUrl ? { src: logoUrl, height: Math.floor(qrSize*0.22), width: Math.floor(qrSize*0.22), excavate: true } : undefined} />
                      <span style={{ fontFamily: 'monospace', fontWeight: '900', fontSize: `${Math.max(9, fontSize - 3)}px`, letterSpacing: '0.1em', marginTop: '3px', color: '#000000', whiteSpace: 'nowrap' }}>{card.sku_15_digits}</span>
                    </div>
                  </div>
                )}

              </div>
            ))}
          </div>
        ))}
      </div>

    </div>
  )
}
