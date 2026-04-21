'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend 
} from 'recharts'
import { 
  LayoutDashboard, ClipboardList, Users, Download, Package, 
  AlertTriangle, TrendingUp, Search, Printer, QrCode, FileText 
} from 'lucide-react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [products, setProducts] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [summary, setSummary] = useState({ totalStock: 0, todayOps: 0, lowStock: 0 })
  const [loading, setLoading] = useState(true)

  // สำหรับ Filters & Deep Dive
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState({ start: '', end: '' })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const { data: p } = await supabase.from('products').select('*')
    const { data: t } = await supabase.from('transactions').select('*, products(name, sku_15_digits)').order('created_at', { ascending: false })
    
    if (p && t) {
      setProducts(p)
      setTransactions(t)
      
      // คำนวณ Summary
      const today = new Date().toISOString().split('T')[0]
      setSummary({
        totalStock: p.reduce((acc, curr) => acc + curr.current_stock, 0),
        todayOps: t.filter(item => item.created_at.startsWith(today)).length,
        lowStock: p.filter(item => item.current_stock < 10).length
      })
    }
    setLoading(false)
  }

  // --- 5.4 Logic: Export Functions ---
  const exportToExcel = (data: any[], fileName: string) => {
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Report")
    XLSX.writeFile(wb, `${fileName}.xlsx`)
  }

  // --- UI Helper: Stock Status Badge ---
  const getStatusBadge = (stock: number) => {
    if (stock <= 0) return <span className="px-2 py-1 bg-red-100 text-red-600 rounded-full text-xs font-bold">หมด</span>
    if (stock < 10) return <span className="px-2 py-1 bg-yellow-100 text-yellow-600 rounded-full text-xs font-bold">ต่ำ</span>
    return <span className="px-2 py-1 bg-green-100 text-green-600 rounded-full text-xs font-bold">ปกติ</span>
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 lg:flex-row overflow-hidden">
      
      {/* Sidebar Navigation */}
      <nav className="w-full lg:w-64 bg-gray-900 text-white p-4 flex lg:flex-col gap-2 overflow-x-auto shadow-2xl z-10">
        <div className="hidden lg:block mb-8 px-4">
          <h1 className="text-xl font-black text-blue-400 tracking-tighter">STOCK MANAGER</h1>
          <p className="text-[10px] text-gray-500 uppercase font-bold">Admin Panel v2.0</p>
        </div>
        {[
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'inventory', label: 'คลังสินค้า', icon: Package },
          { id: 'staff', label: 'รายงานพนักงาน', icon: Users },
          { id: 'export', label: 'ส่งออกรายงาน', icon: Download },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all shrink-0 ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-gray-400 hover:bg-white/5'}`}
          >
            <item.icon size={18} /> {item.label}
          </button>
        ))}
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 lg:p-8">
        
        {/* ▌ 5.1 Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl"><Package size={30}/></div>
                <div><p className="text-xs font-bold text-gray-400 uppercase">สต๊อกทั้งหมด</p><p className="text-3xl font-black text-gray-800">{summary.totalStock}</p></div>
              </div>
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="p-4 bg-green-50 text-green-600 rounded-2xl"><TrendingUp size={30}/></div>
                <div><p className="text-xs font-bold text-gray-400 uppercase">รายการวันนี้</p><p className="text-3xl font-black text-gray-800">{summary.todayOps}</p></div>
              </div>
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="p-4 bg-red-50 text-red-600 rounded-2xl"><AlertTriangle size={30}/></div>
                <div><p className="text-xs font-bold text-gray-400 uppercase">Low Stock</p><p className="text-3xl font-black text-gray-800">{summary.lowStock}</p></div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
              <h3 className="font-black text-gray-800 mb-6 flex items-center gap-2 uppercase tracking-widest text-sm">การเคลื่อนไหวสต๊อก (7 วันล่าสุด)</h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={transactions.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="created_at" tickFormatter={(str) => new Date(str).toLocaleDateString()} tick={{fontSize: 10}} />
                    <YAxis tick={{fontSize: 10}} />
                    <Tooltip contentStyle={{borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                    <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Table */}
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-50 flex justify-between items-center">
                <h3 className="font-black text-gray-800 uppercase text-sm">รายการอัปเดตล่าสุด</h3>
                <span className="flex items-center gap-1 text-[10px] font-bold text-blue-500 bg-blue-50 px-3 py-1 rounded-full animate-pulse">● LIVE</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-400 uppercase text-[10px] font-black">
                    <tr>
                      <th className="px-6 py-4">เวลา</th>
                      <th className="px-6 py-4">สินค้า</th>
                      <th className="px-6 py-4">ประเภท</th>
                      <th className="px-6 py-4">จำนวน</th>
                      <th className="px-6 py-4">โดย</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {transactions.slice(0, 5).map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 font-mono text-[11px] text-gray-400">{new Date(t.created_at).toLocaleTimeString()}</td>
                        <td className="px-6 py-4 font-bold text-gray-700">{t.products?.name}</td>
                        <td className="px-6 py-4 text-xs">
                          {t.type === 'receive' ? <span className="text-green-600 font-bold">+ รับเข้า</span> : <span className="text-red-600 font-bold">- นำออก</span>}
                        </td>
                        <td className="px-6 py-4 font-black">{t.amount}</td>
                        <td className="px-6 py-4 text-gray-500 font-medium">{t.created_by}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ▌ 5.3 Inventory Report Tab */}
        {activeTab === 'inventory' && (
          <div className="space-y-6 animate-in slide-in-from-right-5 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <h2 className="text-2xl font-black text-gray-800">คลังสินค้าปัจจุบัน</h2>
              <div className="relative w-full md:w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="ค้นหาชื่อสินค้า หรือ รหัส SKU..." 
                  className="w-full pl-12 pr-4 py-3 bg-white rounded-2xl border border-gray-100 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden text-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-gray-400 uppercase text-[10px] font-black">
                    <tr>
                      <th className="px-6 py-4 cursor-pointer hover:text-blue-500">ตัวย่อ</th>
                      <th className="px-6 py-4">ชื่อสินค้า</th>
                      <th className="px-6 py-4">คงเหลือ</th>
                      <th className="px-6 py-4">สถานะ</th>
                      <th className="px-6 py-4 text-center">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {products.filter(p => p.name.includes(searchQuery) || p.sku_15_digits.includes(searchQuery)).map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-black text-blue-600">{p.prefix}</td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-800">{p.name}</div>
                          <div className="text-[10px] text-gray-400 font-mono">{p.sku_15_digits}</div>
                        </td>
                        <td className="px-6 py-4 font-black text-lg">{p.current_stock} <span className="text-[10px] text-gray-400">{p.unit}</span></td>
                        <td className="px-6 py-4">{getStatusBadge(p.current_stock)}</td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center gap-2">
                            <button className="p-2 bg-gray-50 text-gray-400 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all"><QrCode size={16}/></button>
                            <button className="p-2 bg-gray-50 text-gray-400 rounded-xl hover:bg-green-50 hover:text-green-600 transition-all"><Printer size={16}/></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ▌ 5.2 Staff Report Tab */}
        {activeTab === 'staff' && (
          <div className="space-y-6 animate-in slide-in-from-right-5 duration-500">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {/* ตัวอย่าง Card พนักงาน */}
               {Array.from(new Set(transactions.map(t => t.created_by))).map(staff => {
                 const staffTasks = transactions.filter(t => t.created_by === staff)
                 return (
                  <div key={staff} onClick={() => setSelectedStaff(staff)} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 hover:border-blue-200 cursor-pointer transition-all group">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center font-black text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all uppercase">{staff.substring(0,2)}</div>
                      <div>
                        <h3 className="font-black text-gray-800 uppercase">{staff}</h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">พนักงานคลังสินค้า</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-gray-50 p-3 rounded-2xl">
                        <p className="text-[9px] text-gray-400 font-bold uppercase">ทั้งหมด</p>
                        <p className="font-black text-gray-800">{staffTasks.length}</p>
                      </div>
                      <div className="bg-green-50 p-3 rounded-2xl">
                        <p className="text-[9px] text-green-400 font-bold uppercase">เข้า</p>
                        <p className="font-black text-green-600">{staffTasks.filter(t => t.type === 'receive').length}</p>
                      </div>
                      <div className="bg-red-50 p-3 rounded-2xl">
                        <p className="text-[9px] text-red-400 font-bold uppercase">ออก</p>
                        <p className="font-black text-red-600">{staffTasks.filter(t => t.type === 'issue').length}</p>
                      </div>
                    </div>
                  </div>
                 )
               })}
             </div>
          </div>
        )}

        {/* ▌ 5.4 Export Tab */}
        {activeTab === 'export' && (
          <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-5 duration-500">
            <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100">
              <h2 className="text-2xl font-black text-gray-800 mb-8 flex items-center gap-3"><Download className="text-blue-600" /> ส่งออกรายงานระบบ</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                <div>
                  <label className="text-xs font-black text-gray-400 uppercase ml-2 mb-2 block tracking-widest">จากวันที่</label>
                  <input type="date" className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold" />
                </div>
                <div>
                  <label className="text-xs font-black text-gray-400 uppercase ml-2 mb-2 block tracking-widest">ถึงวันที่</label>
                  <input type="date" className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button 
                  onClick={() => exportToExcel(products, 'Inventory_Report')}
                  className="flex flex-col items-center justify-center p-8 bg-green-50 text-green-600 rounded-[2rem] border-2 border-dashed border-green-200 hover:bg-green-100 transition-all gap-3 font-black uppercase text-xs"
                >
                  <FileText size={30} /> Inventory (Excel)
                </button>
                <button 
                  onClick={() => exportToExcel(transactions, 'Transaction_History')}
                  className="flex flex-col items-center justify-center p-8 bg-blue-50 text-blue-600 rounded-[2rem] border-2 border-dashed border-blue-200 hover:bg-blue-100 transition-all gap-3 font-black uppercase text-xs"
                >
                  <ClipboardList size={30} /> History (Excel)
                </button>
                <button 
                  className="flex flex-col items-center justify-center p-8 bg-red-50 text-red-600 rounded-[2rem] border-2 border-dashed border-red-200 hover:bg-red-100 transition-all gap-3 font-black uppercase text-xs"
                >
                  <FileText size={30} /> Summary (PDF)
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}
