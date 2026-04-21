'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts'
import { 
  LayoutDashboard, ClipboardList, Users, Download, Package, 
  AlertTriangle, TrendingUp, Search, Printer, QrCode, FileText, ChevronDown, ChevronUp 
} from 'lucide-react'
import * as XLSX from 'xlsx'

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [products, setProducts] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isClient, setIsClient] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedGroups, setExpandedGroups] = useState<string[]>([])

  useEffect(() => {
    setIsClient(true)
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const { data: p } = await supabase.from('products').select('*')
    const { data: t } = await supabase.from('transactions').select('*, products(name, sku_15_digits)').order('created_at', { ascending: false })
    
    if (p && t) {
      setProducts(p)
      setTransactions(t)
    }
    setLoading(false)
  }

  // --- Logic: จัดกลุ่มตามชื่อสินค้า (Group by Name) ---
  const groupedInventory = products.reduce((acc: any, item: any) => {
    if (!acc[item.name]) {
      acc[item.name] = {
        name: item.name,
        totalStock: 0,
        unit: item.unit,
        items: []
      };
    }
    acc[item.name].totalStock += item.current_stock;
    acc[item.name].items.push(item);
    return acc;
  }, {});

  const inventoryList = Object.values(groupedInventory);

  const toggleGroup = (name: string) => {
    setExpandedGroups(prev => 
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const exportToExcel = (data: any[], fileName: string) => {
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Report")
    XLSX.writeFile(wb, `${fileName}.xlsx`)
  }

  if (!isClient) return <div className="p-10 text-center font-bold text-slate-400 uppercase tracking-widest">Initializing System...</div>

  return (
    <div className="flex flex-col h-screen bg-gray-50 lg:flex-row overflow-hidden font-sans text-slate-900">
      
      {/* Sidebar Navigation */}
      <nav className="w-full lg:w-64 bg-slate-900 text-white p-4 flex lg:flex-col gap-2 overflow-x-auto shrink-0 shadow-xl">
        <div className="hidden lg:block mb-8 px-4">
          <h1 className="text-xl font-black text-blue-400 tracking-tighter italic">UMANG BKK</h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase">Inventory Control Center</p>
        </div>
        {[
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'inventory', label: 'คลังสินค้า (Grouped)', icon: Package },
          { id: 'staff', label: 'รายงานพนักงาน', icon: Users },
          { id: 'export', label: 'Export ข้อมูล', icon: Download },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all shrink-0 ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:bg-white/5'}`}
          >
            <item.icon size={18} /> {item.label}
          </button>
        ))}
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 lg:p-8">
        
        {/* 1. Dashboard Summary */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-4">
                <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl"><Package size={24}/></div>
                <div><p className="text-[10px] font-bold text-slate-400 uppercase">สต๊อกรวมทุกรหัส</p><p className="text-2xl font-black">{products.reduce((a, b) => a + b.current_stock, 0)}</p></div>
              </div>
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-4">
                <div className="p-4 bg-green-50 text-green-600 rounded-2xl"><TrendingUp size={24}/></div>
                <div><p className="text-[10px] font-bold text-slate-400 uppercase">รายการวันนี้</p><p className="text-2xl font-black">{transactions.filter(t => t.created_at.startsWith(new Date().toISOString().split('T')[0])).length}</p></div>
              </div>
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-4">
                <div className="p-4 bg-red-50 text-red-600 rounded-2xl"><AlertTriangle size={24}/></div>
                <div><p className="text-[10px] font-bold text-slate-400 uppercase">สินค้าใกล้หมด</p><p className="text-2xl font-black">{products.filter(p => p.current_stock < 10).length}</p></div>
              </div>
            </div>

            {/* Movement Chart */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
              <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2 uppercase tracking-widest text-[10px]">สถิติการเคลื่อนไหว (7 รายการล่าสุด)</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={transactions.slice(0, 7)}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="created_at" tickFormatter={(str) => new Date(str).toLocaleDateString()} tick={{fontSize: 10}} />
                    <YAxis tick={{fontSize: 10}} />
                    <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                    <Bar dataKey="amount" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* 2. Grouped Inventory Report (Drill Down) */}
        {activeTab === 'inventory' && (
          <div className="space-y-6 animate-in slide-in-from-right-5">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <h2 className="text-xl font-black uppercase italic">สรุปสต๊อกตามชื่อสินค้า</h2>
                <p className="text-[10px] text-slate-400 font-bold">รวมรหัสสินค้า (SKU) ที่เป็นชื่อเดียวกันไว้ด้วยกัน</p>
              </div>
              <div className="relative w-full md:w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <input 
                  type="text" 
                  placeholder="ค้นหาชื่อสินค้า..." 
                  className="w-full pl-12 pr-4 py-3 bg-white rounded-2xl border border-slate-100 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4">
              {inventoryList
                .filter((group: any) => group.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((group: any) => {
                  const isExpanded = expandedGroups.includes(group.name);
                  return (
                    <div key={group.name} className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden transition-all">
                      {/* ส่วนหัวกลุ่ม (Summary) */}
                      <div 
                        onClick={() => toggleGroup(group.name)}
                        className="p-6 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-xl ${group.totalStock < 10 ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                            <Package size={20} />
                          </div>
                          <div>
                            <h3 className="text-lg font-black text-slate-800 uppercase leading-none">{group.name}</h3>
                            <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 tracking-widest">
                              รวม {group.items.length} รายการรหัส
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                           <div className="text-right">
                              <p className="text-[9px] text-slate-400 font-black uppercase">สต๊อกรวม</p>
                              <p className={`text-2xl font-black ${group.totalStock < 10 ? 'text-red-500' : 'text-slate-800'}`}>
                                {group.totalStock} <span className="text-xs text-slate-400">{group.unit}</span>
                              </p>
                           </div>
                           {isExpanded ? <ChevronUp size={20} className="text-slate-300" /> : <ChevronDown size={20} className="text-slate-300" />}
                        </div>
                      </div>

                      {/* ส่วนรายละเอียด (Drill Down) */}
                      {isExpanded && (
                        <div className="bg-slate-50/50 border-t border-slate-50 p-4 animate-in slide-in-from-top-2 duration-300">
                          <div className="space-y-2">
                            {group.items.map((item: any) => (
                              <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between shadow-sm">
                                <div className="flex items-center gap-3">
                                  <div className="text-[10px] bg-slate-100 px-2 py-1 rounded font-mono font-bold text-slate-500 tracking-tighter">
                                    {item.sku_15_digits}
                                  </div>
                                  <span className="text-xs font-bold text-slate-600 uppercase">{item.prefix || 'N/A'}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                  <span className={`text-sm font-black ${item.current_stock < 5 ? 'text-red-600' : 'text-slate-700'}`}>
                                    {item.current_stock}
                                  </span>
                                  <div className="flex gap-1 border-l pl-3 border-slate-100">
                                    <button className="p-1.5 text-slate-300 hover:text-blue-500"><QrCode size={14}/></button>
                                    <button className="p-1.5 text-slate-300 hover:text-green-500"><Printer size={14}/></button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
              })}
            </div>
          </div>
        )}

        {/* 3. Export Center */}
        {activeTab === 'export' && (
          <div className="max-w-2xl mx-auto py-10 animate-in zoom-in-95">
             <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl">
                <h2 className="text-2xl font-black mb-2 uppercase italic">Export Center</h2>
                <p className="text-slate-400 text-xs mb-8">ส่งออกข้อมูลสต๊อกคงเหลือ และ ประวัติรายการทั้งหมด</p>
                <div className="grid gap-4">
                  <button onClick={() => exportToExcel(products, 'inventory_report')} className="w-full bg-white text-slate-900 p-5 rounded-3xl font-black flex items-center justify-between hover:bg-blue-400 hover:text-white transition-all uppercase text-sm group">
                    ดาวน์โหลดสต๊อกปัจจุบัน <FileText size={20} className="text-slate-300 group-hover:text-white" />
                  </button>
                  <button onClick={() => exportToExcel(transactions, 'transaction_history')} className="w-full bg-white/10 text-white p-5 rounded-3xl font-black flex items-center justify-between hover:bg-blue-600 transition-all uppercase text-sm group">
                    ดาวน์โหลดประวัติรายการ <ClipboardList size={20} className="text-slate-600 group-hover:text-white" />
                  </button>
                </div>
             </div>
          </div>
        )}

      </main>
    </div>
  )
}
