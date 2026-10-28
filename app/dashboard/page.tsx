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
  Package, QrCode, LayoutDashboard, FileText, Users, Settings, Home, LogOut, BarChart3 
} from 'lucide-react'

// 🌟 Import แท็บย่อยทั้งหมดจาก components/dashboard/
import InventoryTab from '@/components/dashboard/InventoryTab'
import ExecutiveReportTab from '@/components/dashboard/ExecutiveReportTab'
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
        
        if (!jsonData || jsonData.length < 2) {
          alert('⚠️ ไฟล์ Excel ไม่มีข้อมูล');
          return;
        }

        const headerRow = jsonData[0] || [];
        const rows = jsonData.slice(1);
        
        const col1Header = String(headerRow[1] || '').trim().toLowerCase();
        const col2Header = String(headerRow[2] || '').trim().toLowerCase();
        
        let hasNameCol = (col1Header.includes('ชื่อ') || col1Header.includes('name') || 
                          col2Header.includes('ขนาด') || col2Header.includes('size')) && 
                         !(col1Header.includes('ขนาด') || col1Header.includes('size'));

        const offset = hasNameCol ? 1 : 0;
        let hasValidationError = false;
        
        const importData = rows.map((row, index) => {
          if (!row[0]) return null;
          if (hasValidationError) return null;
          
          const prefix = String(row[0] || '').trim().toUpperCase(); 
          if (!prefix) return null;

          const masterItem = masterProducts.find((mp: any) => mp.prefix === prefix);
          
          let productName = '';
          if (hasNameCol && String(row[1] || '').trim()) {
            productName = String(row[1]).trim();
          } else if (masterItem) {
            productName = masterItem.name;
          } else {
            alert(`⚠️ ข้อผิดพลาดที่บรรทัด ${index + 2}: ไม่พบตัวย่อสินค้า "${prefix}" ในระบบมาสเตอร์! กรุณาเพิ่มมาสเตอร์สินค้าก่อนนำเข้า`);
            hasValidationError = true; 
            return null;
          }
          
          const sizeStr = String(row[1 + offset] || '').toLowerCase().trim(); 
          const sizeParts = sizeStr.split('x');
          const hVal = sizeParts[0] ? sizeParts[0].trim() : '';
          const wVal = sizeParts[1] ? sizeParts[1].trim() : '';
          const lVal = sizeParts[2] ? sizeParts[2].trim() : '';
          
          const formattedDate = parseExcelDate(row[2 + offset]); 
          const runningVal = String(row[3 + offset] || '01').padStart(2, '0').slice(-2); 
          const unitVal = String(row[4 + offset] || '').trim(); 
          
          const rawWeight = row[5 + offset];
          let weightVal = null;
          if (rawWeight !== undefined && rawWeight !== '' && rawWeight !== null && !isNaN(Number(rawWeight))) {
            weightVal = parseFloat(Number
