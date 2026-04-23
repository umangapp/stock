'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts'
import { 
  LayoutDashboard, ClipboardList, Users, Download, Package, 
  AlertTriangle, TrendingUp, Search, Printer, QrCode, FileText, 
  ChevronDown, ChevronUp, Edit3, X, Save, Calendar, User, ArrowRightLeft, Clock, Trash2, ShieldCheck, LogOut
} from 'lucide-react'
import * as XLSX from 'xlsx'

export default function AdminDashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [products, setProducts] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isClient, setIsClient] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedGroups, setExpandedGroups] = useState<string[]>([])
  const [expandedUsers, setExpandedUsers] = useState<string[]>([])
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<any>(null)
  const [isUserModalOpen, setIsUserModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)

  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(today)

  // --- ฟังก์ชัน Logout ---
  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut()
    window.location.href = '/login' // ใช้ตัวนี้เพื่อล้างสถานะทุกอย่าง
  }, [])

  // --- ระบบ Auto Logout 15 นาที ---
  useEffect(() => {
    let timer: NodeJS.Timeout;
    const timeLimit = 15 * 60 * 1000; // 15 นาที

    const resetTimer = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        alert("เซสชันหมดอายุเนื่องจากไม่มีการใช้งานเกิน 15 นาที");
        handleLogout();
      }, timeLimit);
    };

    // จับเหตุการณ์การใช้งาน
    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keypress', resetTimer);
    window.addEventListener('scroll', resetTimer);
    window.addEventListener('touchstart', resetTimer);

    resetTimer(); // เริ่มนับถอยหลังครั้งแรก

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keypress', resetTimer);
      window.removeEventListener('scroll', resetTimer);
      window.removeEventListener('touchstart', resetTimer);
    };
  }, [handleLogout]);

  useEffect(() => {
    setIsClient(true)
    fetchData()
  }, [startDate, endDate])

const fetchData = async () => {
    setLoading(true)
    try {
      // 1. ดึงข้อมูลสินค้า (ตรวจสอบว่า p มีข้อมูลไหม)
      const { data: p, error: pError } = await supabase.from('products').select('*').order('name')
      if (pError) console.error("Product Error:", pError.message)

      // 2. ดึงข้อมูลธุรกรรม (ลองถอดตัวกรองวันที่ออกก่อน เพื่อดูว่ามีข้อมูลไหม)
      // ถ้าอยากให้กรองวันที่เหมือนเดิม ให้ใช้บรรทัดที่มี .gte และ .lte ครับ
      const { data: t, error: tError } = await supabase
        .from('transactions')
        .select('*, products(name, unit)')
        .order('created_at', { ascending: false })
      
      if (tError) console.error("Transaction Error:", tError.message)

      // 3. ดึงข้อมูลโปรไฟล์พนักงาน
      const { data: u, error: uError } = await supabase.from('profiles').select('*').order('role')
      if (uError) console.error("Profile Error:", uError.message)

      // ตรวจสอบและอัปเดต State
      if (p) setProducts(p)
      if (t) setTransactions(t)
      if (u) setProfiles(u)

      // ลองเช็กใน Console (F12) ว่าข้อมูลมาไหม
      console.log("Fetched Products:", p?.length)
      console.log("Fetched Transactions:", t?.length)

    } catch (err) {
      console.error("System Error:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('products').update({
      name: editingProduct.name, sku_15_digits: editingProduct.sku_15_digits,
      unit: editingProduct.unit, prefix: editingProduct.prefix,
      current_stock: Number(editingProduct.current_stock)
    }).eq('id', editingProduct.id);
    if (!error) { alert("✅ อัปเดตสำเร็จ"); setIsEditModalOpen(false); fetchData(); }
  };

  if (!isClient) return null

  return (
    <div className="flex flex-col h-screen bg-gray-50 lg:flex-row overflow-hidden font-sans text-slate-900">
      
      {/* Sidebar */}
      <nav className="w-full lg:w-72 bg-slate-900 text-white p-6 flex lg:flex-col gap-2 overflow-x-auto shrink-0 shadow-2xl z-20">
        <div className="hidden lg:block mb-10 px-2 text-center">
          <h1 className="text-2xl font-black text-blue-400 tracking-tighter italic uppercase">Umang Admin</h1>
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-2 italic">Backend Control</p>
        </div>
        
        <div className="flex lg:flex-col flex-1 gap-2">
          {[
            { id: 'dashboard', label: 'ภาพรวมระบบ', icon: LayoutDashboard },
            { id: 'inventory', label: 'สต๊อกสินค้า', icon: Package },
            { id: 'history', label: 'รายงานย้อนหลัง', icon: ClipboardList },
            { id: 'users', label: 'จัดการผู้ใช้งาน', icon: ShieldCheck },
            { id: 'export', label: 'Export', icon: Download },
          ].map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex items-center gap-4 px-6 py-4 rounded-[1.8rem] text-sm font-bold transition-all shrink-0 ${activeTab === item.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/30' : 'text-slate-400 hover:bg-white/5'}`}>
              <item.icon size={20} /> {item.label}
            </button>
          ))}
        </div>

        {/* ปุ่ม Logout ท้ายเมนู */}
        <button 
          onClick={handleLogout}
          className="flex items-center gap-4 px-6 py-4 rounded-[1.8rem] text-sm font-bold text-red-400 hover:bg-red-500/10 transition-all mt-auto"
        >
          <LogOut size={20} /> ออกจากระบบ
        </button>
      </nav>

      {/* Main Content (โค้ดส่วนเดิมของคุณ...) */}
      <main className="flex-1 overflow-y-auto p-4 lg:p-10 pb-24">
         {/* ... (เนื้อหาเดิมใน Dashboard ที่เราทำกันไว้) ... */}
         <p className="text-[10px] text-slate-300 font-bold mb-4 uppercase tracking-[0.3em]">โหมดแอดมิน: {activeTab}</p>
         {/* แนะนำให้ยกเนื้อหาจากรอบที่แล้วมาวางตรงนี้ครับ */}
      </main>
    </div>
  )
}
