'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { APP_VERSION_FALLBACK } from '@/lib/version'
import * as XLSX from 'xlsx'
import BarcodePrintView from '@/components/BarcodePrintView'
import ProductModal from '@/components/ProductModal'
import { parseExcelDate, parseDateToYYMMDD, validateSKU } from '@/lib/productUtils'
import { 
  Package, QrCode, LayoutDashboard, FileText, Users, Settings, Home, LogOut 
} from 'lucide-react'

// 🌟 Import 5 แท็บย่อยที่เราตัดแบ่ง
import InventoryTab from '@/components/dashboard/InventoryTab'
import ActivityFeedTab from '@/components/dashboard/ActivityFeedTab'
import HistoryReportTab from '@/components/dashboard/HistoryReportTab'
import UserManagementTab from '@/components/dashboard/UserManagementTab'
import SystemSettingsTab from '@/components/dashboard/SystemSettingsTab'

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
  const [appVersion, setAppVersion] = useState(APP_VERSION_FALLBACK)
  const [newVersionInput, setNewVersionInput] = useState('')
  const [scanDelay, setScanDelay] = useState(1000)
  
  const [inputName, setInputName] = useState('')
  const [inputPrefix, setInputPrefix] = useState('')
  const [inputUnit, setInputUnit] = useState('')
  
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
      
      {/* Sidebar Navigation */}
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

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 lg:p-10 pb-24">
        {activeTab === 'inventory' && (
          <InventoryTab 
            products={products} searchQuery={searchQuery} setSearchQuery={setSearchQuery}
            showLowStockOnly={showLowStockOnly} setShowLowStockOnly={setShowLowStockOnly}
            handleImportClick={handleImportClick} setNewProduct={setNewProduct}
            setIsAddModalOpen={setIsAddModalOpen} setEditingProduct={setEditingProduct}
            setIsEditModalOpen={setIsEditModalOpen} deleteProduct={deleteProduct}
          />
        )}

        {activeTab === 'barcode' && <BarcodePrintView products={products} />}

        {activeTab === 'dashboard' && <ActivityFeedTab transactions={transactions} />}

        {activeTab === 'reports' && <HistoryReportTab transactions={transactions} userProfiles={userProfiles} />}

        {activeTab === 'users' && (
          <UserManagementTab 
            userProfiles={userProfiles} 
            handleUpdateUserRole={handleUpdateUserRole} 
            handleUpdateUserName={handleUpdateUserName} 
          />
        )}

        {activeTab === 'settings' && (
          <SystemSettingsTab 
            newVersionInput={newVersionInput} setNewVersionInput={setNewVersionInput}
            scanDelay={scanDelay} setScanDelay={setScanDelay} updateSettings={updateSettings}
            inputName={inputName} setInputName={setInputName} inputPrefix={inputPrefix}
            setInputPrefix={setInputPrefix} masterProducts={masterProducts} fetchData={fetchData}
            inputUnit={inputUnit} setInputUnit={setInputUnit} masterUnits={masterUnits}
          />
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
