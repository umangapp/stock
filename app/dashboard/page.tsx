'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { APP_VERSION_FALLBACK } from '@/lib/version'
import * as XLSX from 'xlsx'
import BarcodePrintView from '@/components/BarcodePrintView'
import { 
  LayoutDashboard, Package, Settings, LogOut, Search, 
  ChevronDown, ChevronUp, Clock, Edit3, Plus, Trash2, FileSpreadsheet, Info, Zap, QrCode,
  Users, CheckCircle2, Home, AlertTriangle, FileText, RotateCcw, Calendar, User
} from 'lucide-react'

import { parseExcelDate, parseDateToYYMMDD, validateSKU } from '@/lib/productUtils'
import SKUColoredAdmin from '@/components/SKUColored'
import ProductModal from '@/components/ProductModal'

export default function AdminDashboard() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState('inventory')
  const [activeUser, setActiveUser] = useState('')
  const [transactions, setTransactions] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [masterProducts, setMasterProducts] = useState<any[]>([])
  const [masterUnits, setMasterUnits] = useState<any[]>([])
  const [userProfiles, setUserProfiles] = useState<any[]>([]) 
  const [loading, setLoading] = useState(true)
  
  const [searchQuery, setSearchQuery] = useState('')
  const [showLowStockOnly, setShowLowStockOnly] = useState(false)
  
  const [expandedL1, setExpandedL1] = useState<string[]>([])
  const [expandedL2, setExpandedL2] = useState<string[]>([])
  const [expandedL3, setExpandedL3] = useState<string[]>([])

  const [appVersion, setAppVersion] = useState(APP_VERSION_FALLBACK)
  const [newVersionInput, setNewVersionInput] = useState('')
  const [scanDelay, setScanDelay] = useState(1000)
  const [expandedUsers, setExpandedUsers] = useState<string[]>([])
  const [inputName, setInputName] = useState('')
  const [inputPrefix, setInputPrefix] = useState('')
  const [inputUnit, setInputUnit] = useState('')
  
  // 🌟 State สำหรับค้นหาและกรองในหน้า รายงานประวัติ
  const [reportSearchSku, setReportSearchSku] = useState('')
  const [reportSearchDate, setReportSearchDate] = useState('')
  const [reportSearchUser, setReportSearchUser] = useState('')
  const [reportSearchType, setReportSearchType] = useState('all')

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<any>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  
  const [newProduct, setNewProduct] = useState({ 
    name: '', prefix: '', height: '', width: '', length: '', 
    received_date: '', unit: '', current_stock: 0, safety_stock: 0, 
    running: '01', weight: '', sku_15_digits: '' 
  })

  const checkAdminAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return false }
    const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', session.user.id).single()
    if (!profile || profile.role !== 'admin') {
      alert('⚠️ ขออภัยครับ: บัญชีผู้ใช้งานของคุณไม่มีสิทธิ์ในการเข้าถึงหน้าผู้ดูแลระบบ')
      router.push('/')
      return false
    }
    setActiveUser(profile.full_name || session.user.email?.split('@')[0] || 'ADMIN')
    return true
  }

  const fetchData = async () => {
    setLoading(true)
    const hasAccess = await checkAdminAccess()
    if (!hasAccess) return;

    const { data: t } = await supabase.from('transactions').select('*, products(*)').order('created_at', { ascending: false })
    const { data: p } = await supabase.from('products').select('*').order('height', { ascending: true }).order('width', { ascending: true }).order('length', { ascending: true })
    const { data: mp } = await supabase.from('settings_product_master').select('*').order('name')
    const { data: mu } = await supabase.from('settings_units').select('*').order('unit')
    const { data: ver = null } = await supabase.from('settings_app_config').select('*').maybeSingle()
    const { data: profiles } = await supabase.from('profiles').select('*').order('full_name') 
    
    if (t) setTransactions(t)
    if (p) setProducts(p)
    if (mp) setMasterProducts(mp)
    if (mu) setMasterUnits(mu)
    if (profiles) setUserProfiles(profiles)
    if (ver) { setAppVersion(ver.version); setNewVersionInput(ver.version); setScanDelay(ver.scan_delay || 1000); }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const handleUpdateUserName = async (id: string, newName: string) => {
    if (!newName.trim()) return;
    const { error } = await supabase.from('profiles').update({ full_name: newName }).eq('id', id);
    if (!error) { alert("✅ อัปเดตข้อมูลชื่อพนักงานสำเร็จ"); fetchData(); }
  }

  const handleUpdateUserRole = async (id: string, newRole: string) => {
    if (!confirm(`⚠️ ยืนยันการเปลี่ยนสิทธิ์ผู้ใช้งานนี้เป็น "${newRole}" หรือไม่?`)) return;
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', id);
    if (!error) fetchData(); else alert("❌ ไม่สามารถเปลี่ยนสิทธิ์ได้ โปรดลองอีกครั้ง");
  }

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
          
          const prefix = String(row[0] || '').trim().toUpperCase(); 
          if (!prefix) return null;

          const masterItem = masterProducts.find((mp: any) => mp.prefix === prefix);
          if (!masterItem) {
            alert(`⚠️ ข้อผิดพลาดที่บรรทัด ${index + 2}: ไม่พบตัวย่อสินค้า "${prefix}" ในระบบมาสเตอร์! กรุณาเพิ่มมาสเตอร์สินค้าก่อนนำเข้า`);
            hasValidationError = true; return null;
          }
          const productName = masterItem.name;
          
          const sizeStr = String(row[1] || '').toLowerCase().trim(); 
          const sizeParts = sizeStr.split('x');
          const hVal = sizeParts[0] ? sizeParts[0].trim() : '';
          const wVal = sizeParts[1] ? sizeParts[1].trim() : '';
          const lVal = sizeParts[2] ? sizeParts[2].trim() : '';
          
          const formattedDate = parseExcelDate(row[2]); 
          const runningVal = String(row[3] || '01').padStart(2, '0').slice(-2); 
          const unitVal = String(row[4] || '').trim(); 
          
          const colGSku = String(row[6] || '').trim().toUpperCase(); 
          const colHSku = String(row[7] || '').trim().toUpperCase(); 
          
          let weightVal = null;
          let currentStock = 0;
          let manualSku = '';
          let safetyStock = 0;

          if (colGSku.length >= 8) {
            currentStock = Number(row[5] || 0); 
            manualSku = colGSku;               
            safetyStock = Number(row[7] || 0); 
          } else {
            weightVal = row[5] !== undefined && row[5] !== '' && row[5] !== null ? parseFloat(Number(row[5]).toFixed(2)) : null;
            currentStock = Number(row[6] || 0); 
            manualSku = colHSku;               
            safetyStock = Number(row[8] || 0); 
          }

          if (!manualSku) {
            const hClean = hVal.replace(/\./g, '');
            const wClean = wVal.replace(/\./g, '').substring(0, 2);
            const lClean = lVal.replace(/\./g, '').substring(0, 2);
            const lotFormatted = parseDateToYYMMDD(formattedDate);
            
            let coreSku = `${prefix}${hClean}${wClean}${lClean}${lotFormatted}`;
            if (coreSku.length < 6) coreSku = coreSku.padEnd(6, 'X');
            manualSku = `${coreSku}${runningVal}`;
          }

          if (manualSku.length < 8) {
            alert(`⚠️ ข้อผิดพลาดที่บรรทัด ${index + 2}: สินค้าตัวย่อ "${prefix}" รหัส SKU สั้นเกินไป ยกเลิกการ Import ทันที`);
            hasValidationError = true; return null;
          }
          const paddingMatch = manualSku.match(/[X]+$/i);
          const coreSku = paddingMatch ? manualSku.slice(0, -paddingMatch[0].length) : manualSku;
          if (!/^\d{2}$/.test(coreSku.slice(-2))) {
            alert(`⚠️ ข้อผิดพลาดที่บรรทัด ${index + 2}: รหัส 2 หลักหน้าชุด X ของ SKU สินค้า "${prefix}" ต้องเป็นตัวเลขเท่านั้น ยกเลิกการ Import ทันที`);
            hasValidationError = true; return null;
          }

          return { 
            name: productName, 
            prefix: prefix, 
            height: hVal ? parseFloat(hVal) : 0, 
            width: wVal ? parseFloat(wVal) : 0, 
            length: lVal ? parseFloat(lVal) : 0, 
            received_date: formattedDate, 
            unit: unitVal, 
            weight: unitVal.includes('กก') ? weightVal : null,
            current_stock: currentStock, 
            sku_15_digits: manualSku,
            safety_stock: safetyStock 
          }
        }).filter(Boolean)
        
        if (hasValidationError) return;
        
        if (importData.length > 0) {
          const { data: savedProducts, error } = await supabase.from('products').upsert(importData as any, { onConflict: 'sku_15_digits' }).select()
          if (error) throw error

          if (savedProducts && savedProducts.length > 0) {
            const importLogs = savedProducts.map((sp: any) => ({
              product_id: sp.id,
              type: 'import',
              amount: sp.current_stock,
              old_stock: 0,
              new_stock: sp.current_stock,
              created_by: activeUser || 'ADMIN (IMPORT)'
            }));
            await supabase.from('transactions').insert(importLogs);
          }

          alert(`✅ ประมวลผลและนำเข้าสต๊อกสินค้าสำเร็จ ${importData.length} รายการ`); 
          fetchData();
        }
      } catch (err: any) { alert("❌ การนำเข้าผิดพลาด: " + err.message) }
      
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
    reader.readAsArrayBuffer(file)
  }

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateSKU(newProduct.sku_15_digits)) { alert("⚠️ บันทึกไม่สำเร็จ: รูปแบบรหัส SKU ไม่ถูกต้องครับ"); return; }
    
    const dbPayload: any = {
      name: newProduct.name, prefix: newProduct.prefix, height: Number(newProduct.height) || 0,
      width: Number(newProduct.width) || 0, length: Number(newProduct.length) || 0,
      received_date: newProduct.received_date, unit: newProduct.unit,
      current_stock: Number(newProduct.current_stock) || 0, safety_stock: Number(newProduct.safety_stock) || 0,
      sku_15_digits: newProduct.sku_15_digits
    }

    if (newProduct.unit?.includes('กก')) {
      dbPayload.weight = newProduct.weight !== '' ? parseFloat(Number(newProduct.weight).toFixed(2)) : null;
    }

    const { error } = await supabase.from('products').insert([dbPayload])
    if (!error) { setIsAddModalOpen(false); fetchData(); } 
    else { alert(error.code === '23505' ? "❌ รหัส SKU นี้มีอยู่ในระบบแล้วครับ" : `❌ ผิดพลาด: ${error.message}`); }
  }

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateSKU(editingProduct.sku_15_digits)) { alert("⚠️ บันทึกไม่สำเร็จ: รูปแบบรหัส SKU ไม่ถูกต้องครับ"); return; }
    
    const dbPayload: any = {
      name: editingProduct.name, prefix: editingProduct.prefix, height: Number(editingProduct.height) || 0,
      width: Number(editingProduct.width) || 0, length: Number(editingProduct.length) || 0,
      received_date: editingProduct.received_date, unit: editingProduct.unit,
      current_stock: Number(editingProduct.current_stock) || 0, safety_stock: Number(editingProduct.safety_stock) || 0,
      sku_15_digits: editingProduct.sku_15_digits
    }

    if (editingProduct.unit?.includes('กก')) {
      dbPayload.weight = editingProduct.weight !== '' && editingProduct.weight !== null ? parseFloat(Number(editingProduct.weight).toFixed(2)) : null;
    }

    const { error } = await supabase.from('products').update(dbPayload).eq('id', editingProduct.id)
    if (!error) { setIsEditModalOpen(false); fetchData(); } 
    else { alert(`❌ ไม่สามารถอัปเดตได้: ${error.message}`); }
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

  const grouped3LayerInventory = products
    .filter(p => !showLowStockOnly || p.current_stock <= (p.safety_stock || 0))
    .filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.prefix.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.sku_15_digits || '').toLowerCase().includes(searchQuery.toLowerCase())
    )
    .reduce((acc: any, item: any) => {
      const isLowStock = item.current_stock <= (item.safety_stock || 0);
      if (!acc[item.name]) acc[item.name] = { name: item.name, prefix: item.prefix || 'XXX', totalStock: 0, unit: item.unit, hasLowStock: false, heights: {} };
      acc[item.name].totalStock += item.current_stock;
      if (isLowStock) acc[item.name].hasLowStock = true;

      if (!acc[item.name].heights[item.height]) acc[item.name].heights[item.height] = { height: item.height, totalStock: 0, hasLowStock: false, lots: {} };
      acc[item.name].heights[item.height].totalStock += item.current_stock;
      if (isLowStock) acc[item.name].heights[item.height].hasLowStock = true;

      if (!acc[item.name].heights[item.height].lots[item.received_date]) acc[item.name].heights[item.height].lots[item.received_date] = { lot: item.received_date, totalStock: 0, hasLowStock: false, items: [] };
      acc[item.name].heights[item.height].lots[item.received_date].totalStock += item.current_stock;
      if (isLowStock) acc[item.name].heights[item.height].lots[item.received_date].hasLowStock = true;

      acc[item.name].heights[item.height].lots[item.received_date].items.push(item);
      return acc;
  }, {});

  // 🌟 ฟังก์ชันการกรองข้อมูลในเมนู รายงานประวัติ
  const filteredReports = transactions.filter(log => {
    // 1. กรองตาม SKU หรือ ชื่อสินค้า
    const matchesSku = !reportSearchSku || 
      (log.products?.sku_15_digits || '').toLowerCase().includes(reportSearchSku.toLowerCase()) ||
      (log.products?.name || '').toLowerCase().includes(reportSearchSku.toLowerCase()) ||
      (log.products?.prefix || '').toLowerCase().includes(reportSearchSku.toLowerCase());

    // 2. กรองตามวันที่ (เปรียบเทียบ YYYY-MM-DD)
    const logDateStr = log.created_at ? new Date(log.created_at).toISOString().split('T')[0] : '';
    const matchesDate = !reportSearchDate || logDateStr === reportSearchDate;

    // 3. กรองตามชื่อผู้ดำเนินการ
    const matchesUser = !reportSearchUser || 
      (log.created_by || '').toLowerCase() === reportSearchUser.toLowerCase();

    // 4. กรองตามประเภทธุรกรรม
    const matchesType = reportSearchType === 'all' || log.type === reportSearchType;

    return matchesSku && matchesDate && matchesUser && matchesType;
  });

  if (loading) return <div className="h-screen flex items-center justify-center text-blue-600 font-black italic">VERIFYING ACCESS...</div>

  return (
    <div className="flex flex-col h-screen bg-gray-100 lg:flex-row overflow-hidden font-sans text-slate-900">
      
      <style>{`
        @media print {
          .no-print { display: none !important; }
          main { padding: 0 !important; overflow: visible !important; }
          .print-area { display: block !important; width: 210mm; background: white; }
          .sticker-page { 
            display: flex !important; flex-wrap: wrap !important; gap: 4mm !important;
            align-content: flex-start !important; padding: 6mm 5mm !important;
            width: 210mm !important; min-height: 297mm !important; 
            page-break-after: always !important; box-sizing: border-box !important; background-color: #ffffff !important;
          }
        }
        input[type="date"]::-webkit-calendar-picker-indicator { cursor: pointer; opacity: 0.6; transition: 0.2s; }
        input[type="date"]::-webkit-calendar-picker-indicator:hover { opacity: 1; }
      `}</style>

      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx, .xls, .csv" className="hidden" />
      
      <nav className="w-full lg:w-72 bg-slate-900 text-white p-4 lg:p-6 flex flex-col gap-4 shrink-0 z-20 shadow-2xl no-print">
        <div className="flex justify-between items-start lg:flex-col lg:gap-6">
          <div className="mb-2 lg:mb-0">
              <h1 className="text-xl lg:text-2xl text-blue-400 font-black italic uppercase tracking-tighter leading-none">Umang Admin</h1>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Version {appVersion}</p>
          </div>
          
          <div className="flex items-center gap-2">
            <button onClick={() => router.push('/')} className="p-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-2xl transition-all active:scale-95 shadow-sm" title="กลับหน้าเมนูหลัก"><Home size={22} /></button>
            <button onClick={() => { if(confirm("ยืนยันการออกจากระบบ?")) { supabase.auth.signOut().then(() => router.push('/login')) } }} className="p-3 bg-red-950/30 hover:bg-red-900/40 text-red-400 border border-red-900/30 rounded-2xl transition-all active:scale-95 shadow-sm" title="ออกจากระบบ"><LogOut size={22} /></button>
          </div>
        </div>

        {/* 🌟 ปรับชื่อเมนูเป็น รายงานประวัติ */}
        <div className="flex lg:flex-col flex-1 gap-2 overflow-x-auto pb-2 lg:pb-0">
          {[
            { id: 'inventory', label: 'สต๊อกสินค้า', icon: Package },
            { id: 'barcode', label: 'สร้างบาร์โค้ด', icon: QrCode },
            { id: 'dashboard', label: 'ภาพรวมระบบ', icon: LayoutDashboard },
            { id: 'reports', label: 'รายงานประวัติ', icon: FileText },
            { id: 'users', label: 'จัดการผู้ใช้งาน', icon: Users },
            { id: 'settings', label: 'ตั้งค่าระบบ', icon: Settings }
          ].map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex items-center gap-3 px-5 py-4 rounded-3xl text-sm font-bold shrink-0 transition-all ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white/5'}`}>
              <item.icon size={20} /> <span className="whitespace-nowrap">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto p-4 lg:p-10 pb-24">
        
        {/* TAB: สต๊อกสินค้า */}
        {activeTab === 'inventory' && (
          <div className="space-y-8 animate-in fade-in no-print">
            <div className="flex flex-col xl:flex-row justify-between items-end gap-4">
               <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900">สต๊อกสินค้า</h2>
               
               <div className="flex flex-wrap gap-3 w-full xl:w-auto">
                  <button 
                    onClick={() => setShowLowStockOnly(!showLowStockOnly)}
                    className={`px-5 py-4 rounded-2xl font-black uppercase text-xs flex items-center gap-2 shadow-sm active:scale-95 transition-all border ${showLowStockOnly ? 'bg-red-600 text-white border-red-700 shadow-red-600/30' : 'bg-white text-slate-500 border-slate-200 hover:bg-red-50'}`}
                  >
                    <AlertTriangle size={16} className={showLowStockOnly ? 'animate-pulse' : ''} />
                    {showLowStockOnly ? 'แสดงทั้งหมด' : 'สินค้าใกล้หมด'}
                  </button>
                  
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                    <input type="text" placeholder="ค้นหาชื่อ, ตัวย่อ หรือ SKU..." className="w-full bg-white border p-4 pl-12 rounded-2xl outline-none shadow-sm focus:border-blue-500 font-bold" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                  </div>
                  
                  <button onClick={handleImportClick} className="bg-emerald-600 text-white px-6 py-4 rounded-2xl font-black uppercase text-xs flex items-center gap-2 shadow-lg active:scale-95 transition-all"><FileSpreadsheet size={16}/> Import</button>
                  <button onClick={() => { 
                    setNewProduct({ name: '', prefix: '', height: '', width: '', length: '', received_date: '', unit: '', current_stock: 0, safety_stock: 0, running: '01', weight: '', sku_15_digits: '' }); 
                    setIsAddModalOpen(true); 
                  }} className="bg-blue-600 text-white px-6 py-4 rounded-2xl font-black uppercase text-xs shadow-lg active:scale-95 transition-all"><Plus className="inline mr-1"/> เพิ่มใหม่</button>
               </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {Object.values(grouped3LayerInventory).sort((a: any, b: any) => a.prefix.localeCompare(b.prefix)).map((l1: any) => (
                <div key={l1.name} className={`bg-white rounded-[2.5rem] border shadow-sm overflow-hidden h-fit transition-all ${l1.hasLowStock ? 'border-red-400 ring-4 ring-red-500/10' : 'border-slate-200'}`}>
                  <div onClick={() => setExpandedL1(prev => prev.includes(l1.name) ? prev.filter(n => n !== l1.name) : [...prev, l1.name])} className="p-6 cursor-pointer hover:bg-slate-50 flex justify-between items-center text-slate-800">
                    <div className="flex-1 pr-4">
                      <div className="flex items-center gap-3">
                        <h3 className="font-black uppercase text-xl tracking-tighter break-words"><span className="text-blue-600 mr-2">{l1.prefix}:</span>{l1.name}</h3>
                        {l1.hasLowStock && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse flex items-center gap-1"><AlertTriangle size={10}/> LOW STOCK</span>}
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 italic tracking-widest">{Object.keys(l1.heights).length} ความหนา (Thickness)</p>
                    </div>
                    <div className="text-right shrink-0 flex items-center gap-4">
                      <div>
                        <p className={`text-4xl font-black leading-none ${l1.hasLowStock ? 'text-red-600' : 'text-slate-900'}`}>{l1.totalStock}</p>
                        <p className="text-[10px] font-black uppercase text-slate-400 mt-1">{l1.unit}</p>
                      </div>
                      <div className="text-slate-300">{expandedL1.includes(l1.name) ? <ChevronUp/> : <ChevronDown/>}</div>
                    </div>
                  </div>

                  {expandedL1.includes(l1.name) && (
                    <div className="p-4 bg-slate-50/80 space-y-3 border-t border-slate-100">
                      {Object.values(l1.heights).sort((a: any, b: any) => parseFloat(a.height) - parseFloat(b.height)).map((l2: any) => (
                        <div key={l2.height} className={`bg-white rounded-[2rem] border shadow-sm overflow-hidden transition-all ${l2.hasLowStock ? 'border-red-300' : 'border-slate-200'}`}>
                           <div onClick={() => setExpandedL2(prev => prev.includes(`${l1.name}-${l2.height}`) ? prev.filter(n => n !== `${l1.name}-${l2.height}`) : [...prev, `${l1.name}-${l2.height}`])} className="p-5 cursor-pointer hover:bg-slate-50 flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <span className="bg-blue-100 text-blue-700 text-xs font-black px-3 py-1 rounded-xl">หนา {l2.height} มม.</span>
                                {l2.hasLowStock && <AlertTriangle size={14} className="text-red-500"/>}
                              </div>
                              <div className="flex items-center gap-3">
                                <span className={`font-black text-lg ${l2.hasLowStock ? 'text-red-600' : 'text-slate-700'}`}>{l2.totalStock} <span className="text-[10px] text-slate-400">{l1.unit}</span></span>
                                <div className="text-slate-300">{expandedL2.includes(`${l1.name}-${l2.height}`) ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}</div>
                              </div>
                           </div>

                           {expandedL2.includes(`${l1.name}-${l2.height}`) && (
                              <div className="p-3 bg-slate-50 space-y-2 border-t border-slate-100">
                                {Object.values(l2.lots).sort((a: any, b: any) => a.lot.localeCompare(b.lot)).map((l3: any) => (
                                   <div key={l3.lot} className={`bg-white rounded-3xl border transition-all ${l3.hasLowStock ? 'border-red-300' : 'border-slate-200'}`}>
                                      <div onClick={() => setExpandedL3(prev => prev.includes(`${l1.name}-${l2.height}-${l3.lot}`) ? prev.filter(n => n !== `${l1.name}-${l2.height}-${l3.lot}`) : [...prev, `${l1.name}-${l2.height}-${l3.lot}`])} className="p-4 cursor-pointer hover:bg-slate-50 flex justify-between items-center">
                                         <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                                            <span className="uppercase text-[11px] tracking-widest text-slate-400">LOT:</span> {l3.lot}
                                         </div>
                                         <div className="flex items-center gap-3">
                                            <span className={`font-black ${l3.hasLowStock ? 'text-red-500' : 'text-slate-600'}`}>{l3.totalStock}</span>
                                            <div className="text-slate-300">{expandedL3.includes(`${l1.name}-${l2.height}-${l3.lot}`) ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}</div>
                                         </div>
                                      </div>

                                      {expandedL3.includes(`${l1.name}-${l2.height}-${l3.lot}`) && (
                                         <div className="p-2 space-y-2 border-t border-slate-100 bg-slate-50/50">
                                            {l3.items
                                               .sort((a: any, b: any) => (a.sku_15_digits || '').localeCompare(b.sku_15_digits || ''))
                                               .map((item: any) => {
                                                 const isItemLow = item.current_stock <= (item.safety_stock || 0);
                                                 return (
                                                 <div key={item.id} className={`bg-white p-4 rounded-[1.5rem] border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${isItemLow ? 'border-red-300 shadow-sm shadow-red-100' : 'border-slate-100'}`}>
                                                  <div className="flex-1">
                                                    <div className="mb-1"><SKUColoredAdmin sku={item.sku_15_digits} prefix={item.prefix} /></div>
                                                    <div className="flex flex-wrap items-center gap-2 mt-2">
                                                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase">ขนาด {item.height}x{item.width}x{item.length}</span>
                                                        {item.weight && <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded uppercase border border-amber-200">น้ำหนัก: {item.weight} กก.</span>}
                                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${isItemLow ? 'bg-red-100 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                          {isItemLow ? `⚠️ ต่ำกว่า Safety (${item.safety_stock})` : `Safety: ${item.safety_stock || 0}`}
                                                        </span>
                                                    </div>
                                                  </div>
                                                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between">
                                                     <p className={`font-black text-2xl leading-none ${isItemLow ? 'text-red-600' : 'text-slate-900'}`}>{item.current_stock}</p>
                                                     <div className="flex gap-2 shrink-0">
                                                        <button onClick={() => { 
                                                          const sku = item.sku_15_digits || '';
                                                          const paddingMatch = sku.match(/[xX]+$/);
                                                          const coreSku = paddingMatch ? sku.slice(0, -paddingMatch[0].length) : sku;
                                                          const extractedRun = coreSku.length >= 2 ? coreSku.slice(-2) : '01';
                                                          
                                                          setEditingProduct({ ...item, running: extractedRun, weight: item.weight || '' }); 
                                                          setIsEditModalOpen(true); 
                                                        }} className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all"><Edit3 size={16}/></button>
                                                        <button onClick={() => deleteProduct(item.id)} className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16}/></button>
                                                     </div>
                                                  </div>
                                                </div>
                                              )
                                            })}
                                         </div>
                                      )}
                                   </div>
                                ))}
                              </div>
                           )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB อื่นๆ */}
        {activeTab === 'barcode' && ( <BarcodePrintView products={products} /> )}
        
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
                                <div className="flex flex-wrap items-center gap-2 mt-2 leading-none">
                                    <p className="text-[14px] font-black text-slate-600 uppercase tracking-tight">ขนาด: {log.products?.height}x{log.products?.width}x{log.products?.length}</p>
                                    <span className="text-[13px] font-black text-slate-800 uppercase bg-slate-100 px-2 py-0.5 rounded border border-slate-200">Lot: {log.products?.received_date}</span>
                                </div>
                            </div>
                            <span className={`text-3xl font-black ${log.type === 'receive' || log.type === 'import' ? 'text-green-600' : 'text-red-600'}`}>
                              {log.type === 'receive' || log.type === 'import' ? '+' : '-'} {log.amount}
                            </span>
                          </div>
                          
                          <div className="bg-blue-50/50 p-2 rounded-lg">
                            <SKUColoredAdmin sku={log.products?.sku_15_digits} prefix={log.products?.prefix} />
                          </div>
                          
                          <p className="text-[12px] font-black text-blue-600 mt-1 italic leading-none">
                            STOCK: {log.old_stock ?? 0} → {log.new_stock ?? log.amount}
                          </p>

                          <div className="pt-2.5 mt-0.5 border-t border-slate-100 flex justify-between items-center text-[11px] font-bold text-slate-400">
                            <div className="flex items-center gap-1">
                              <Clock size={12} className="text-slate-400" />
                              <span>{new Date(log.created_at).toLocaleDateString('th-TH')} | {new Date(log.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</span>
                            </div>
                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${log.type === 'receive' ? 'text-emerald-600 bg-emerald-50 border border-emerald-100' : log.type === 'import' ? 'text-blue-600 bg-blue-50 border border-blue-100' : 'text-red-600 bg-red-50 border border-red-100'}`}>
                              {log.type === 'receive' ? 'สแกนเข้าคลัง' : log.type === 'import' ? 'IMPORT สต๊อก' : 'สแกนจ่ายออก'}
                            </span>
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

        {/* 🌟 TAB: รายงานประวัติ (รวมสแกนเข้า สแกนออก และ Import) */}
        {activeTab === 'reports' && (
          <div className="space-y-6 animate-in fade-in text-slate-800 no-print">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900">รายงานประวัติการทำงาน</h2>
                <p className="text-xs text-slate-400 font-bold mt-1">ประวัติการสแกนเข้า สแกนออก และการ Import สต๊อกของผู้ใช้งานทั้งหมด</p>
              </div>
              <span className="bg-blue-50 text-blue-600 border border-blue-200 px-4 py-2 rounded-2xl text-xs font-black">
                แสดงผล {filteredReports.length} / {transactions.length} รายการ
              </span>
            </div>

            {/* 🌟 แผงปุ่มค้นหาและ Filter */}
            <div className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                
                {/* 1. ค้นหา SKU / ชื่อสินค้า */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                  <input 
                    type="text" 
                    placeholder="ค้นหา SKU หรือ สินค้า..." 
                    className="w-full bg-slate-50 border border-slate-200 p-3 pl-10 rounded-xl outline-none focus:border-blue-500 text-xs font-bold"
                    value={reportSearchSku}
                    onChange={(e) => setReportSearchSku(e.target.value)}
                  />
                </div>

                {/* 2. ค้นหา วันที่ */}
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16}/>
                  <input 
                    type="date" 
                    className="w-full bg-slate-50 border border-slate-200 p-3 pl-10 rounded-xl outline-none focus:border-blue-500 text-xs font-bold text-slate-700"
                    value={reportSearchDate}
                    onChange={(e) => setReportSearchDate(e.target.value)}
                  />
                </div>

                {/* 3. ค้นหา ผู้ดำเนินการ */}
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16}/>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 p-3 pl-10 rounded-xl outline-none focus:border-blue-500 text-xs font-bold text-slate-700 appearance-none cursor-pointer"
                    value={reportSearchUser}
                    onChange={(e) => setReportSearchUser(e.target.value)}
                  >
                    <option value="">-- ผู้ดำเนินการทั้งหมด --</option>
                    {userProfiles.map(u => (
                      <option key={u.id} value={u.full_name}>{u.full_name}</option>
                    ))}
                  </select>
                </div>

                {/* 4. กรองประเภทธุรกรรม */}
                <div>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl outline-none focus:border-blue-500 text-xs font-bold text-slate-700 appearance-none cursor-pointer"
                    value={reportSearchType}
                    onChange={(e) => setReportSearchType(e.target.value)}
                  >
                    <option value="all">-- ประเภททั้งหมด --</option>
                    <option value="receive">สแกนนำเข้า (+)</option>
                    <option value="issue">สแกนเบิกจ่าย (-)</option>
                    <option value="import">IMPORT สต๊อก</option>
                  </select>
                </div>

              </div>

              {/* ปุ่มล้างค่าการค้นหา */}
              {(reportSearchSku || reportSearchDate || reportSearchUser || reportSearchType !== 'all') && (
                <div className="flex justify-end pt-1">
                  <button 
                    onClick={() => {
                      setReportSearchSku('');
                      setReportSearchDate('');
                      setReportSearchUser('');
                      setReportSearchType('all');
                    }}
                    className="text-xs font-black text-rose-500 hover:text-rose-600 flex items-center gap-1 active:scale-95 transition-all"
                  >
                    <RotateCcw size={14}/> ล้างตัวกรองทั้งหมด
                  </button>
                </div>
              )}
            </div>

            {/* ตารางแสดงผลประวัติ */}
            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      <th className="p-4">วัน-เวลาที่ทำรายการ</th>
                      <th className="p-4 text-center">ประเภท</th>
                      <th className="p-4">สินค้า / SKU</th>
                      <th className="p-4 text-center">จำนวน</th>
                      <th className="p-4 text-center">สต๊อก (เดิม → ใหม่)</th>
                      <th className="p-4 text-right">ผู้ดำเนินการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                    {filteredReports.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400 italic">ไม่พบข้อมูลประวัติที่ตรงตามเงื่อนไขการค้นหา</td>
                      </tr>
                    ) : (
                      filteredReports.map(log => {
                        const isReceive = log.type === 'receive';
                        const isImport = log.type === 'import';
                        const isIssue = log.type === 'issue';

                        return (
                          <tr key={log.id} className="hover:bg-slate-50/80 transition-all">
                            <td className="p-4 whitespace-nowrap">
                              <div className="flex items-center gap-1.5 text-slate-500">
                                <Clock size={12} className="text-blue-500" />
                                <span>{new Date(log.created_at).toLocaleDateString('th-TH')} {new Date(log.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</span>
                              </div>
                            </td>
                            <td className="p-4 text-center whitespace-nowrap">
                              <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                                isReceive ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                isImport ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                'bg-rose-50 text-rose-600 border-rose-200'
                              }`}>
                                {isReceive ? 'นำเข้า (+)' : isImport ? 'IMPORT' : 'เบิกจ่าย (-)'}
                              </span>
                            </td>
                            <td className="p-4">
                              <p className="font-black text-slate-900 uppercase text-sm leading-tight">{log.products?.name}</p>
                              <SKUColoredAdmin sku={log.products?.sku_15_digits} prefix={log.products?.prefix} />
                            </td>
                            <td className="p-4 text-center whitespace-nowrap">
                              <span className={`px-3 py-1 rounded-xl font-black text-sm ${
                                isIssue ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                              }`}>
                                {isIssue ? '-' : '+'}{log.amount} {!log.products?.weight && log.products?.unit}
                              </span>
                            </td>
                            <td className="p-4 text-center font-mono font-black text-blue-600 whitespace-nowrap">
                              {log.old_stock ?? 0} → {log.new_stock ?? log.amount}
                            </td>
                            <td className="p-4 text-right whitespace-nowrap">
                              <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-xl text-[10px] font-black uppercase">
                                {log.created_by || 'SYSTEM'}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB: จัดการผู้ใช้งาน */}
        {activeTab === 'users' && (
          <div className="space-y-8 animate-in fade-in text-slate-800 no-print">
            <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900">จัดการผู้ใช้งาน (Users)</h2>
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {userProfiles.map(user => (
                    <div key={user.id} className={`p-6 rounded-[2rem] border shadow-sm flex flex-col gap-4 transition-all ${user.role === 'admin' ? 'bg-amber-50/50 border-amber-200' : 'bg-slate-50 border-slate-100'}`}>
                       <div className="flex justify-between items-start">
                         <div>
                           <p className="text-[10px] font-black uppercase text-slate-400 mb-1">รหัสพนักงาน</p>
                           <p className="text-xs font-mono text-slate-500 truncate w-48 sm:w-auto">{user.id}</p>
                         </div>
                         <div className="flex flex-col items-end">
                            <select 
                              className={`text-xs font-black uppercase p-2 rounded-xl outline-none shadow-sm cursor-pointer border ${user.role === 'admin' ? 'bg-amber-500 text-white border-amber-600' : 'bg-slate-200 text-slate-600 border-slate-300'}`}
                              value={user.role || 'staff'}
                              onChange={(e) => handleUpdateUserRole(user.id, e.target.value)}
                            >
                              <option value="admin">ADMIN</option>
                              <option value="staff">STAFF</option>
                            </select>
                         </div>
                       </div>
                       <div className="border-t border-slate-200/50 pt-4 mt-2">
                         <div className="flex gap-2">
                            <input 
                              type="text" 
                              className="flex-1 bg-white border p-4 rounded-2xl font-black text-slate-900 outline-none focus:border-blue-500" 
                              defaultValue={user.full_name} 
                              onBlur={(e) => { if (e.target.value !== user.full_name) handleUpdateUserName(user.id, e.target.value) }}
                              onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                            />
                            <button className="bg-blue-100 text-blue-600 p-4 rounded-2xl shadow-sm"><CheckCircle2 size={20} /></button>
                         </div>
                       </div>
                    </div>
                  ))}
               </div>
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

               <div className="space-y-5 border-t border-white/5 pt-8">
                 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                   <h4 className="font-black uppercase text-sm text-blue-400 tracking-widest flex items-center gap-2">
                     <Zap size={18}/> ความไวการสแกน
                   </h4>
                   <span className="bg-blue-600/30 text-blue-300 border border-blue-500/40 px-4 py-1.5 rounded-xl text-xs font-mono font-black shadow-inner">
                     {(scanDelay / 1000).toFixed(1)} วินาที ({scanDelay.toLocaleString()} ms)
                   </span>
                 </div>

                 <div className="space-y-3">
                   <input 
                     type="range" 
                     min="300" 
                     max="3000" 
                     step="100" 
                     className="w-full h-3 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500" 
                     value={scanDelay} 
                     onChange={e => setScanDelay(Number(e.target.value))} 
                   />

                   <div className="grid grid-cols-4 text-center text-[10px] font-black uppercase pt-2 border-t border-white/10">
                     <div className="text-left flex flex-col items-start">
                       <span className="text-emerald-400 font-black">🚀 0.3s</span>
                       <span className="text-[9px] text-slate-500 font-bold">(เร็วสุด)</span>
                     </div>
                     <div className="flex flex-col items-center">
                       <span className="text-blue-300 font-black">1.0s</span>
                       <span className="text-[9px] text-slate-500 font-bold">(แนะนำ)</span>
                     </div>
                     <div className="flex flex-col items-center">
                       <span className="text-amber-300 font-black">2.0s</span>
                       <span className="text-[9px] text-slate-500 font-bold">(ทั่วไป)</span>
                     </div>
                     <div className="text-right flex flex-col items-end">
                       <span className="text-rose-400 font-black">🛡️ 3.0s</span>
                       <span className="text-[9px] text-slate-500 font-bold">(ช้าสุด / กันยิงซ้ำ)</span>
                     </div>
                   </div>
                 </div>

                 <button onClick={updateSettings} className="bg-blue-600 hover:bg-blue-500 text-white px-12 py-5 rounded-2xl font-black uppercase shadow-lg active:scale-95 transition-all">
                   บันทึกตั้งค่า
                 </button>
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

      <ProductModal 
        isOpen={isAddModalOpen || isEditModalOpen}
        isEditModal={isEditModalOpen}
        onClose={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}
        onSubmit={isAddModalOpen ? handleAddProduct : handleUpdateProduct}
        productData={isAddModalOpen ? newProduct : editingProduct}
        setProductData={isAddModalOpen ? setNewProduct : setEditingProduct}
        masterProducts={masterProducts}
        masterUnits={masterUnits}
      />
      
    </div>
  )
}
