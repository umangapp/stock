'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { APP_VERSION_FALLBACK } from '@/lib/version'
import * as XLSX from 'xlsx'
import BarcodePrintView from '@/components/BarcodePrintView'
import { 
  LayoutDashboard, Package, Settings, LogOut, Search, 
  ChevronDown, ChevronUp, Clock, Edit3, Plus, Trash2, X, FileSpreadsheet, Info, Zap, QrCode 
} from 'lucide-react'

const parseExcelDate = (dateVal: any): string => {
  if (!dateVal) return '';
  let dateStr = String(dateVal).trim();
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      let year = parts[2].trim();
      if (year.length === 4) { year = year.substring(2); }
      return `${year}${month}${day}`;
    }
  }
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      let year = parts[0].trim();
      const month = parts[1].padStart(2, '0');
      const day = parts[2].padStart(2, '0');
      if (year.length === 4) { year = year.substring(2); }
      return `${year}${month}${day}`;
    }
  }
  if (/^\d+$/.test(dateStr) && dateStr.length === 5) {
    const serial = Number(dateStr);
    const utc_days  = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;                                        
    const date_info = new Date(utc_value * 1000);
    const year = String(date_info.getFullYear()).substring(2);
    const month = String(date_info.getMonth() + 1).padStart(2, '0');
    const day = String(date_info.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }
  return dateStr;
};

// 🌟 🤖 อัปเดตปรับปรุงตัวคัดกรองแยกสี SKU ใหม่ แก้ไขปัญหาสีเพี้ยนจากรูปภาพ image_8e2f8e.png
const SKUColoredAdmin = ({ sku, prefix, isDark = false }: { sku: string; prefix: string; isDark?: boolean }) => {
  if (!sku) return null;
  const preLen = prefix?.length || 2;
  
  // 🔒 เปลี่ยนมาใช้ /[xX]+$/ เพื่อดักจับทั้ง x ตัวเล็ก และ X ตัวใหญ่หน้างาน
  const paddingMatch = sku.match(/[xX]+$/); 
  const paddingLen = paddingMatch ? paddingMatch[0].length : 0;
  
  const p1 = sku.substring(0, preLen);
  const p4 = sku.substring(sku.length - paddingLen);
  const p3 = sku.substring(sku.length - paddingLen - 6, sku.length - paddingLen);
  const p2 = sku.substring(preLen, sku.length - paddingLen - 6);
  
  // 🔒 เปลี่ยนสีของกล่อง 'pad' จากโค้ดสีฟ้าเดิม ให้กลายเป็นสีเทา (text-slate-400 / text-slate-500) ตามบรีฟพี่ตั้มครับ
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

export default function AdminDashboard() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState('inventory')
  const [transactions, setTransactions] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [masterProducts, setMasterProducts] = useState<any[]>([])
  const [masterUnits, setMasterUnits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  
  const [appVersion, setAppVersion] = useState(APP_VERSION_FALLBACK)
  const [newVersionInput, setNewVersionInput] = useState('')
  const [scanDelay, setScanDelay] = useState(1000)
  const [expandedUsers, setExpandedUsers] = useState<string[]>([])
  const [expandedGroups, setExpandedGroups] = useState<string[]>([])
  const [inputName, setInputName] = useState('')
  const [inputPrefix, setInputPrefix] = useState('')
  const [inputUnit, setInputUnit] = useState('')
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<any>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newProduct, setNewProduct] = useState({ name: '', prefix: '', height: '', width: '', length: '', received_date: '', unit: '', current_stock: 0, sku_15_digits: '' })

  const fetchData = async () => {
    setLoading(true)
    const { data: t } = await supabase.from('transactions').select('*, products(*)').order('created_at', { ascending: false })
    const { data: p } = await supabase.from('products').select('*').order('height', { ascending: true }).order('width', { ascending: true }).order('length', { ascending: true })
    const { data: mp } = await supabase.from('settings_product_master').select('*').order('name')
    const { data: mu } = await supabase.from('settings_units').select('*').order('unit')
    const { data: ver = null } = await supabase.from('settings_app_config').select('*').maybeSingle()
    if (t) setTransactions(t)
    if (p) setProducts(p)
    if (mp) setMasterProducts(mp)
    if (mu) setMasterUnits(mu)
    if (ver) { setAppVersion(ver.version); setNewVersionInput(ver.version); setScanDelay(ver.scan_delay || 1000); }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const updateSettings = async () => {
    const { error } = await supabase.from('settings_app_config').update({ version: newVersionInput, scan_delay: scanDelay }).eq('id', 1)
    if (!error) { setAppVersion(newVersionInput); alert("✅ บันทึกการตั้งค่าระบบเรียบร้อย"); }
  }

  const handleImportClick = () => fileInputRef.current?.click()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
        const rows = jsonData.slice(1)
        let hasValidationError = false;
        const importData = rows.map((row, index) => {
          if (!row[0]) return null
          if (hasValidationError) return null;
          const sizeStr = String(row[2] || '').toLowerCase().trim();
          const sizeParts = sizeStr.split('x');
          const hVal = sizeParts[0] ? sizeParts[0].trim() : '';
          const wVal = sizeParts[1] ? sizeParts[1].trim() : '';
          const lVal = sizeParts[2] ? sizeParts[2].trim() : '';
          const formattedDate = parseExcelDate(row[3]);
          const manualSku = String(row[6] || '').trim().toUpperCase();
          if (manualSku.length !== 15) {
            alert(`⚠️ ข้อผิดพลาดที่บรรทัด ${index + 2}: สินค้าชื่อ "${row[0]}" ระบุรหัส SKU ยาว ${manualSku.length} หลัก ซึ่งไม่ตรงกับสเปกควบคุม (ต้องครบ 15 หลักพอดีเป๊ะ) ระบบยกเลิกการ Import ทันที กรุณาตรวจสอบไฟล์ Excel`);
            hasValidationError = true;
            return null;
          }
          return { name: String(row[0]).trim(), prefix: String(row[1] || 'XXX').trim().toUpperCase(), height: hVal ? parseFloat(hVal) : 0, width: wVal ? parseFloat(wVal) : 0, length: lVal ? parseFloat(lVal) : 0, received_date: formattedDate, unit: String(row[4] || '').trim(), current_stock: Number(row[5] || 0), sku_15_digits: manualSku }
        }).filter(Boolean)
        if (hasValidationError) return;
        if (importData.length > 0) {
          const { error } = await supabase.from('products').upsert(importData as any, { onConflict: 'sku_15_digits' })
          if (error) throw error
          alert(`✅ ประมวลผลและนำเข้าสต๊อกสินค้าสำเร็จ ${importData.length} รายการ`); fetchData()
        }
      } catch (err: any) { alert("❌ การนำเข้าผิดพลาด: " + err.message) }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleNameSelect = (name: string, isAdd: boolean) => {
    const matched = masterProducts.find(m => m.name === name)
    if (isAdd) setNewProduct({ ...newProduct, name, prefix: matched ? matched.prefix : '' })
    else setEditingProduct({ ...editingProduct, name, prefix: matched ? matched.prefix : '' })
  }

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newProduct.sku_15_digits.length !== 15) { alert("⚠️ บันทึกไม่สำเร็จ: รหัส SKU ต้องมีความยาวครบ 15 หลักพอดีเป๊ะครับ"); return; }
    const { error } = await supabase.from('products').insert([{ ...newProduct, current_stock: Number(newProduct.current_stock) }])
    if (!error) { setIsAddModalOpen(false); fetchData(); }
    else { alert("❌ เกิดข้อผิดพลาด: รหัส SKU นี้อาจซ้ำกับสินค้าอื่นในระบบ"); }
  }

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editingProduct.sku_15_digits.length !== 15) { alert("⚠️ บันทึกไม่สำเร็จ: รหัส SKU ต้องมีความยาวครบ 15 หลักพอดีเป๊ะครับ"); return; }
    const { error } = await supabase.from('products').update({ ...editingProduct, current_stock: Number(editingProduct.current_stock) }).eq('id', editingProduct.id)
    if (!error) { setIsEditModalOpen(false); fetchData(); }
  }

  const deleteProduct = async (id: string) => {
    if (!confirm("⚠️ ยืนยันการลบ?")) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) alert(`❌ ไม่สามารถลบได้เนื่องจาก: สินค้านี้มีประวัติการสแกนผูกอยู่ในระบบครับ`);
    else fetchData();
  }

  const groupedByUser = transactions.reduce((acc: any, t: any) => {
    const user = t.created_by || 'Unknown';
    if (!acc[user]) acc[user] = [];
    acc[user].push(t);
    return acc;
  }, {});

  const groupedInventory = products.reduce((acc: any, item: any) => {
    if (!acc[item.name]) {
      acc[item.name] = { 
        name: item.name, 
        prefix: item.prefix || 'XXX', 
        totalStock: 0, 
        unit: item.unit, 
        items: [] 
      };
    }
    acc[item.name].totalStock += item.current_stock;
    acc[item.name].items.push(item);
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-screen bg-gray-100 lg:flex-row overflow-hidden font-sans text-slate-900">
      
      <style>{`
        @media print {
          .no-print { display: none !important; }
          main { padding: 0 !important; overflow: visible !important; }
          .print-area { display: block !important; width: 210mm; background: white; }
          .sticker-page { 
            display: flex !important; 
            flex-wrap: wrap !important; 
            gap: 4mm !important;
            align-content: flex-start !important;
            padding: 6mm 5mm !important;
            width: 210mm !important;
            min-height: 297mm !important; 
            page-break-after: always !important;
            box-sizing: border-box !important;
            background-color: #ffffff !important;
          }
        }
      `}</style>

      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx, .xls, .csv" className="hidden" />
      
      <nav className="w-full lg:w-72 bg-slate-900 text-white p-6 flex lg:flex-col gap-2 shrink-0 z-20 shadow-2xl no-print">
        <div className="mb-10">
            <h1 className="text-2xl text-blue-400 font-black italic uppercase tracking-tighter leading-none">Umang Admin</h1>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Version {appVersion}</p>
        </div>
        <div className="flex lg:flex-col flex-1 gap-2 overflow-x-auto">
          {[
            { id: 'inventory', label: 'สต๊อกสินค้า', icon: Package },
            { id: 'barcode', label: 'สร้างบาร์โค้ด', icon: QrCode },
            { id: 'dashboard', label: 'ภาพรวมระบบ', icon: LayoutDashboard },
            { id: 'settings', label: 'ตั้งค่าระบบ', icon: Settings }
          ].map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex items-center gap-4 px-6 py-4 rounded-3xl text-sm font-bold shrink-0 transition-all ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white/5'}`}>
              <item.icon size={20} /> {item.label}
            </button>
          ))}
        </div>
        <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))} className="flex items-center gap-4 px-6 py-4 rounded-3xl text-sm font-bold text-red-400 mt-auto"><LogOut size={20}/> ออกจากระบบ</button>
      </nav>

      <main className="flex-1 overflow-y-auto p-4 lg:p-10 pb-24">
        {/* TAB: สต๊อกสินค้า */}
        {activeTab === 'inventory' && (
          <div className="space-y-8 animate-in fade-in no-print">
            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
               <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900">สต๊อกสินค้า</h2>
               <div className="flex gap-3 w-full md:w-auto">
                  <div className="relative flex-1 md:w-64"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/><input type="text" placeholder="ค้นหา..." className="w-full bg-white border p-4 pl-12 rounded-2xl outline-none shadow-sm focus:border-blue-500 font-bold" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
                  <button onClick={handleImportClick} className="bg-emerald-600 text-white px-6 py-4 rounded-2xl font-black uppercase text-xs flex items-center gap-2 shadow-lg active:scale-95 transition-all"><FileSpreadsheet size={16}/> Import</button>
                  <button onClick={() => { setNewProduct({ name: '', prefix: '', height: '', width: '', length: '', received_date: '', unit: '', current_stock: 0, sku_15_digits: '' }); setIsAddModalOpen(true); }} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs shadow-lg active:scale-95 transition-all"><Plus className="inline mr-1"/> เพิ่มใหม่</button>
               </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.values(groupedInventory)
                .filter((g: any) => g.name.toLowerCase().includes(searchQuery.toLowerCase()) || g.prefix.toLowerCase().includes(searchQuery.toLowerCase()))
                .sort((a: any, b: any) => a.prefix.localeCompare(b.prefix))
                .map((group: any) => (
                <div key={group.name} className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden h-fit">
                  <div onClick={() => setExpandedGroups(prev => prev.includes(group.name) ? prev.filter(n => n !== group.name) : [...prev, group.name])} className="p-7 cursor-pointer hover:bg-slate-50 flex justify-between items-center text-slate-800">
                    <div className="flex-1 pr-4">
                      <h3 className="font-black uppercase text-xl tracking-tighter break-words">
                        <span className="text-blue-600 mr-2">{group.prefix}:</span>{group.name}
                      </h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 italic tracking-widest">Total {group.items.length} SKU</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-4xl font-black text-slate-900 leading-none">{group.totalStock}</p>
                      <p className="text-[10px] font-black uppercase text-slate-400 mt-1">{group.unit}</p>
                    </div>
                  </div>
                  {expandedGroups.includes(group.name) && (
                    <div className="p-4 bg-slate-50 space-y-3">
                      {group.items.map((item: any) => (
                        <div key={item.id} className="bg-white p-5 rounded-3xl border border-slate-200 flex justify-between items-center shadow-sm text-slate-800">
                          <div className="flex-1">
                            <div className="mb-1 leading-none"><SKUColoredAdmin sku={item.sku_15_digits} prefix={item.prefix} /></div>
                            <div className="flex items-center gap-2 mb-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase leading-none italic">{item.height} x {item.width} x {item.length}</p>
                                <span className="text-[9px] font-black text-slate-500 uppercase italic bg-slate-50 px-2 py-0.5 rounded border border-slate-100">Lot: {item.received_date}</span>
                            </div>
                            <p className="font-black text-2xl text-slate-900 leading-none">{item.current_stock} <span className="text-xs opacity-30 uppercase tracking-widest ml-1">{item.unit}</span></p>
                          </div>
                          <div className="flex flex-col gap-2 shrink-0 ml-4">
                             <button onClick={() => { setEditingProduct({...item}); setIsEditModalOpen(true); }} className="p-3 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"><Edit3 size={18}/></button>
                             <button onClick={() => deleteProduct(item.id)} className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-sm"><Trash2 size={18}/></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: สร้างบาร์โค้ด */}
        {activeTab === 'barcode' && (
          <BarcodePrintView products={products} />
        )}

        {/* TAB: ภาพรวมระบบ */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in no-print">
            <h2 className="text-3xl font-black uppercase italic tracking-tighter">Activity Feed</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(groupedByUser).map(([user, logs]: [string, any]) => (
                <div key={user} className="bg-white rounded-[2.5rem] border overflow-hidden h-fit shadow-sm border-slate-200">
                  <div onClick={() => setExpandedUsers(prev => prev.includes(user) ? prev.filter(u => u !== user) : [...prev, user])} className="p-7 cursor-pointer bg-slate-900 text-white flex justify-between items-center">
                    <h4 className="font-black text-xl uppercase italic">{user}</h4>
                    {expandedUsers.includes(user) ? <ChevronUp size={24}/> : <ChevronDown size={24}/>}
                  </div>
                  {expandedUsers.includes(user) && (
                    <div className="p-4 bg-slate-50 space-y-4 max-h-[600px] overflow-y-auto text-slate-900">
                      {logs.map((log: any) => (
                        <div key={log.id} className="bg-white p-5 rounded-3xl border shadow-sm flex flex-col gap-3">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <p className="text-xl font-black uppercase leading-none">{log.products?.name}</p>
                                <div className="flex items-center gap-2 mt-2">
                                    <p className="text-[10px] font-bold text-slate-400 italic uppercase">ขนาด: {log.products?.height}x{log.products?.width}x{log.products?.length} มม.</p>
                                    <span className="text-[9px] font-black text-slate-500 uppercase italic bg-slate-100 px-2 py-0.5 rounded border border-slate-200">Lot: {log.products?.received_date}</span>
                                </div>
                            </div>
                            <span className={`text-3xl font-black ${log.type === 'receive' ? 'text-green-600' : 'text-red-600'}`}>{log.type === 'receive' ? '+' : '-'} {log.amount}</span>
                          </div>
                          <div className="bg-blue-50/50 p-2 rounded-lg"><SKUColoredAdmin sku={log.products?.sku_15_digits} prefix={log.products?.prefix} /></div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: ตั้งค่าระบบ */}
        {activeTab === 'settings' && (
           <div className="space-y-8 animate-in fade-in text-slate-800 no-print">
             <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900">System Settings</h2>
             
             <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-blue-500/20 shadow-xl text-white mb-8 space-y-8">
               <div className="space-y-4">
                 <h4 className="font-black uppercase text-sm text-blue-400 tracking-widest flex items-center gap-2"><Info size={18}/> App Version</h4>
                 <input type="text" className="w-full sm:w-64 bg-white/5 p-5 rounded-2xl border border-white/10 outline-none focus:border-blue-500 font-black text-xl" value={newVersionInput} onChange={e => setNewVersionInput(e.target.value)} />
               </div>
               <div className="space-y-4 border-t border-white/5 pt-8">
                 <h4 className="font-black uppercase text-sm text-blue-400 tracking-widest flex items-center gap-2"><Zap size={18}/> ความไวการสแกน</h4>
                 <input type="range" min="500" max="3000" step="100" className="w-full h-2 bg-blue-900 rounded-lg appearance-none cursor-pointer" value={scanDelay} onChange={e => setScanDelay(Number(e.target.value))} />
                 <button onClick={updateSettings} className="bg-blue-600 text-white px-12 py-5 rounded-2xl font-black uppercase shadow-lg active:scale-95 transition-all">บันทึกตั้งค่า</button>
               </div>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                   <h4 className="font-black uppercase text-sm mb-6 text-blue-600 tracking-widest">มาสเตอร์สินค้า (ตัวย่อ/Prefix)</h4>
                   <div className="flex flex-col sm:flex-row gap-3 mb-6">
                      <input type="text" className="flex-[2] bg-slate-50 p-4 rounded-2xl border outline-none focus:border-blue-500 font-bold" placeholder="ชื่อสินค้าหลัก" value={inputName} onChange={e => setInputName(e.target.value)} />
                      <input type="text" className="flex-1 bg-slate-50 p-4 rounded-2xl border outline-none focus:border-blue-500 font-black uppercase text-blue-600 text-center" placeholder="ตัวย่อ" maxLength={3} value={inputPrefix} onChange={e => setInputPrefix(e.target.value)} />
                      <button onClick={() => { supabase.from('settings_product_master').insert([{name: inputName, prefix: inputPrefix}]).then(() => {setInputName(''); setInputPrefix(''); fetchData();}) }} className="bg-blue-600 text-white p-4 rounded-2xl shadow-lg active:scale-95"><Plus/></button>
                   </div>
                   <div className="space-y-2 max-h-96 overflow-y-auto pr-2 font-bold">{masterProducts.map(item => (<div key={item.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm"><span>{item.name} <span className="text-blue-600 ml-2">[{item.prefix}]</span></span><button onClick={() => { if(confirm("ลบ?")) supabase.from('settings_product_master').delete().eq('id', item.id).then(()=>fetchData()) }} className="text-red-400 p-2"><Trash2 size={18}/></button></div>))}</div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                   <h4 className="font-black uppercase text-sm mb-6 text-blue-600 tracking-widest">จัดการหน่วยนับ</h4>
                   <div className="flex gap-3 mb-6">
                      <input type="text" className="flex-1 bg-slate-50 p-4 rounded-2xl border outline-none focus:border-blue-500 font-bold" placeholder="หน่วยนับ..." value={inputUnit} onChange={e => setInputUnit(e.target.value)} />
                      <button onClick={() => { supabase.from('settings_units').insert([{unit: inputUnit}]).then(() => {setInputUnit(''); fetchData();}) }} className="bg-blue-600 text-white p-4 rounded-2xl shadow-lg active:scale-95"><Plus/></button>
                   </div>
                   <div className="space-y-2 max-h-96 overflow-y-auto pr-2 font-black">{masterUnits.map(item => (<div key={item.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm"><span>{item.unit}</span><button onClick={() => { if(confirm("ลบ?")) supabase.from('settings_units').delete().eq('id', item.id).then(()=>fetchData()) }} className="text-red-400 p-2"><Trash2 size={18}/></button></div>))}</div>
                </div>
             </div>

           </div>
        )}
      </main>

      {/* MODALS */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[100] flex items-center justify-center p-4 text-slate-800 no-print">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl p-8 max-h-[90vh] overflow-y-auto text-slate-900">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black italic uppercase tracking-tighter leading-none">{isAddModalOpen ? 'เพิ่มสินค้าใหม่' : 'แก้ไขข้อมูล'}</h3>
              <button onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} className="p-2 bg-slate-100 rounded-full text-slate-400"><X/></button>
            </div>
            <form onSubmit={isAddModalOpen ? handleAddProduct : handleUpdateProduct} className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="col-span-full">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">ชื่อสินค้าหลัก</label>
                  <select required className="w-full bg-slate-50 p-4 rounded-2xl border shadow-sm font-bold" value={isAddModalOpen ? newProduct.name : editingProduct.name} onChange={e => handleNameSelect(e.target.value, isAddModalOpen)}>
                    <option value="">-- เลือกชื่อสินค้า --</option>
                    {masterProducts.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                  </select>
                </div>
                <div className="col-span-full bg-slate-900 p-5 rounded-3xl border border-white/5 text-white">
                  <label className="text-[11px] font-black uppercase text-blue-400 ml-2 block mb-2">รหัส SKU คิวอาร์โค้ด (ล็อกสเปก 15 หลักพอดีเป๊ะ)</label>
                  <input type="text" required maxLength={15} className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl font-mono font-black text-2xl uppercase tracking-widest text-center text-emerald-400 outline-none" placeholder="พิมพ์รหัส 15 หลัก..." value={isAddModalOpen ? newProduct.sku_15_digits : editingProduct.sku_15_digits} onChange={e => { const val = e.target.value.replace(/\s+/g, '').toUpperCase(); if (isAddModalOpen) setNewProduct({...newProduct, sku_15_digits: val}); else setEditingProduct({...editingProduct, sku_15_digits: val}); }} />
                </div>
                <div><label className="text-[10px] font-black uppercase text-slate-400 ml-2 font-bold">ตัวย่อประเภท</label><input type="text" readOnly className="w-full bg-slate-200 p-4 rounded-2xl font-black text-blue-600 text-center" value={isAddModalOpen ? newProduct.prefix : editingProduct.prefix} /></div>
                <div><label className="text-[10px] font-black uppercase text-slate-400 ml-2 font-bold">หนา (mm)</label><input type="number" required step="any" className="w-full bg-slate-50 p-4 rounded-2xl border font-black shadow-sm" value={isAddModalOpen ? newProduct.height : editingProduct.height} onChange={e => isAddModalOpen ? setNewProduct({...newProduct, height: e.target.value}) : setEditingProduct({...editingProduct, height: e.target.value})} /></div>
                <div><label className="text-[10px] font-black uppercase text-slate-400 ml-2 font-bold">กว้าง (mm)</label><input type="number" required step="any" className="w-full bg-slate-50 p-4 rounded-2xl border font-black shadow-sm" value={isAddModalOpen ? newProduct.width : editingProduct.width} onChange={e => isAddModalOpen ? setNewProduct({...newProduct, width: e.target.value}) : setEditingProduct({...editingProduct, width: e.target.value})} /></div>
                <div><label className="text-[10px] font-black uppercase text-slate-400 ml-2 font-bold">ยาว (mm)</label><input type="number" required step="any" className="w-full bg-slate-50 p-4 rounded-2xl border font-black shadow-sm" value={isAddModalOpen ? newProduct.length : editingProduct.length} onChange={e => isAddModalOpen ? setNewProduct({...newProduct, length: e.target.value}) : setEditingProduct({...editingProduct, length: e.target.value})} /></div>
                <div><label className="text-[10px] font-black uppercase text-slate-400 ml-2 font-bold">วันที่รับ (Lot Date)</label><input type="text" required className="w-full bg-slate-50 p-4 rounded-2xl border font-black text-center" placeholder="เช่น 27/11/2025" value={isAddModalOpen ? newProduct.received_date : editingProduct.received_date} onChange={e => isAddModalOpen ? setNewProduct({...newProduct, received_date: e.target.value}) : setEditingProduct({...editingProduct, received_date: e.target.value})} /></div>
                <div><label className="text-[10px] font-black uppercase text-slate-400 ml-2 font-bold">หน่วยนับ</label><select required className="w-full bg-slate-50 p-4 rounded-2xl border font-bold" value={isAddModalOpen ? newProduct.unit : editingProduct.unit} onChange={e => isAddModalOpen ? setNewProduct({...newProduct, unit: e.target.value}) : setEditingProduct({...editingProduct, unit: e.target.value})}>{masterUnits.map(m => <option key={m.id} value={m.unit}>{m.unit}</option>)}</select></div>
                <div className="bg-blue-50 rounded-2xl p-4"><label className="text-[10px] font-black uppercase text-blue-400 block mb-1">สต๊อกเริ่มต้น</label><input type="number" required className="w-full bg-transparent font-black text-2xl text-blue-600 outline-none" value={isAddModalOpen ? newProduct.current_stock : editingProduct.current_stock} onChange={e => isAddModalOpen ? setNewProduct({...newProduct, current_stock: Number(e.target.value)}) : setEditingProduct({...editingProduct, current_stock: Number(e.target.value)})} /></div>
              </div>
              <button type="submit" disabled={((isAddModalOpen ? newProduct.sku_15_digits : editingProduct.sku_15_digits) || '').length !== 15} className={`w-full py-6 rounded-3xl font-black text-xl uppercase italic shadow-xl transition-all ${((isAddModalOpen ? newProduct.sku_15_digits : editingProduct.sku_15_digits) || '').length === 15 ? 'bg-blue-600 text-white active:scale-95' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
                {((isAddModalOpen ? newProduct.sku_15_digits : editingProduct.sku_15_digits) || '').length === 15 ? 'บันทึกข้อมูลสินค้า' : '❌ กรุณากรอก SKU ให้ครบ 15 หลัก'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
