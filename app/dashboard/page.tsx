'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts'
import { 
  LayoutDashboard, ClipboardList, Users, Download, Package, 
  AlertTriangle, TrendingUp, Search, Printer, QrCode, FileText 
} from 'lucide-react'
import * as XLSX from 'xlsx'

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [products, setProducts] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [summary, setSummary] = useState({ totalStock: 0, todayOps: 0, lowStock: 0 })
  const [loading, setLoading] = useState(true)
  const [isClient, setIsClient] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

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
      const today = new Date().toISOString().split('T')[0]
      setSummary({
        totalStock: p.reduce((acc, curr) => acc + curr.current_stock, 0),
        todayOps: t.filter(item => item.created_at.startsWith(today)).length,
        lowStock: p.filter(item => item.current_stock < 10).length
      })
    }
    setLoading(false)
  }

  const exportToExcel = (data: any[], fileName: string) => {
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Report")
    XLSX.writeFile(wb, `${fileName}.xlsx`)
  }

  if (loading && !isClient) return <div className="p-10 text-center font-bold">กำลังโหลดระบบ...</div>

  return (
    <div className="flex flex-col h-screen bg-gray-50 lg:flex-row overflow-hidden font-sans text-slate-900">
      
      {/* Sidebar */}
      <nav className="w-full lg:w-64 bg-slate-900 text-white p-4 flex lg:flex-col gap-2 overflow-x-auto shrink-0 shadow-xl">
        <div className="hidden lg:block mb-8 px-4">
          <h1 className="text-xl font-black text-blue-400 tracking-tighter italic">STOCK ADMIN</h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase">Inventory Control</p>
        </div>
        {[
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'inventory', label: 'สต๊อกสินค้า', icon: Package },
          { id: 'staff', label: 'พนักงาน', icon: Users },
          { id: 'export', label: 'ส่งออกข้อมูล', icon: Download },
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

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-4 lg:p-8">
        
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-4">
                <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl"><Package size={24}/></div>
                <div><p className="text-[10px] font-bold text-slate-400 uppercase">รวมสต๊อก</p><p className="text-2xl font-black">{summary.totalStock}</p></div>
              </div>
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-4">
                <div className="p-4 bg-green-50 text-green-600 rounded-2xl"><TrendingUp size={24}/></div>
                <div><p className="text-[10px] font-bold text-slate-400 uppercase">ทำรายการวันนี้</p><p className="text-2xl font-black">{summary.todayOps}</p></div>
              </div>
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-4">
                <div className="p-4 bg-red-50 text-red-600 rounded-2xl"><AlertTriangle size={24}/></div>
                <div><p className="text-[10px] font-bold text-slate-400 uppercase">Low Stock</p><p className="text-2xl font-black">{summary.lowStock}</p></div>
              </div>
            </div>

            {/* Chart Area - แก้ปัญหาที่รูปสีเทา */}
            <div className="bg-white p-6 lg:p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
              <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2 uppercase tracking-widest text-[10px]">Movement (7 Days)</h3>
              <div className="h-64 w-full">
                {isClient && transactions.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={transactions.slice(0, 7)}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="created_at" tickFormatter={(str) => new Date(str).toLocaleDateString()} tick={{fontSize: 10}} />
                      <YAxis tick={{fontSize: 10}} />
                      <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                      <Bar dataKey="amount" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full bg-slate-50 rounded-3xl text-slate-400 text-xs font-bold">
                    {transactions.length === 0 ? "ไม่มีข้อมูลการเคลื่อนไหว" : "กำลังโหลดกราฟ..."}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Table */}
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-widest">Recent Transactions</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50/80 text-slate-400 uppercase text-[9px] font-black">
                    <tr>
                      <th className="px-6 py-4 tracking-widest">Time</th>
                      <th className="px-6 py-4">Product</th>
                      <th className="px-6 py-4">Type</th>
                      <th className="px-6 py-4">Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {transactions.slice(0, 5).map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-mono text-[10px] text-slate-400">{new Date(t.created_at).toLocaleTimeString()}</td>
                        <td className="px-6 py-4 font-bold text-slate-700">{t.products?.name}</td>
                        <td className="px-6 py-4">
                          {t.type === 'receive' ? <span className="text-green-500 font-black">+</span> : <span className="text-red-500 font-black">-</span>}
                        </td>
                        <td className="px-6 py-4 font-black">{t.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Inventory Tab */}
        {activeTab === 'inventory' && (
          <div className="space-y-6 animate-in slide-in-from-right-5">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-black uppercase italic">สต๊อกปัจจุบัน</h2>
              <div className="relative w-64 lg:w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <input 
                  type="text" 
                  placeholder="ค้นหาสินค้า..." 
                  className="w-full pl-12 pr-4 py-3 bg-white rounded-2xl border border-slate-100 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto text-sm">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-400 uppercase text-[9px] font-black tracking-widest">
                    <tr>
                      <th className="px-6 py-4">รหัส</th>
                      <th className="px-6 py-4">ชื่อสินค้า</th>
                      <th className="px-6 py-4 text-center">คงเหลือ</th>
                      <th className="px-6 py-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {products.filter(p => p.name.includes(searchQuery)).map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-black text-blue-600 text-xs">{p.prefix}</td>
                        <td className="px-6 py-4">
                          <p className="font-bold">{p.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono tracking-tighter">{p.sku_15_digits}</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                           <span className={`px-4 py-1.5 rounded-xl font-black ${p.current_stock < 10 ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-800'}`}>
                             {p.current_stock}
                           </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center gap-2">
                            <button className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-blue-600 hover:text-white transition-all"><Printer size={14}/></button>
                            <button className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-blue-600 hover:text-white transition-all"><QrCode size={14}/></button>
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

        {/* Export Tab */}
        {activeTab === 'export' && (
          <div className="max-w-2xl mx-auto space-y-6 py-10 animate-in zoom-in-95">
             <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10"><Download size={120} /></div>
                <h2 className="text-2xl font-black mb-2 uppercase italic">Export Center</h2>
                <p className="text-slate-400 text-xs mb-8">ส่งออกรายงานสต๊อกและการทำรายการในรูปแบบ Excel</p>
                
                <div className="grid gap-4">
                  <button onClick={() => exportToExcel(products, 'inventory_report')} className="w-full bg-white text-slate-900 p-5 rounded-3xl font-black flex items-center justify-between hover:bg-blue-400 hover:text-white transition-all group uppercase text-sm">
                    Inventory Report <div className="p-2 bg-slate-100 rounded-xl group-hover:bg-white"><FileText size={18} /></div>
                  </button>
                  <button onClick={() => exportToExcel(transactions, 'transaction_history')} className="w-full bg-white/10 text-white p-5 rounded-3xl font-black flex items-center justify-between hover:bg-blue-600 transition-all group uppercase text-sm">
                    Transaction History <div className="p-2 bg-white/10 rounded-xl group-hover:bg-white/20"><ClipboardList size={18} /></div>
                  </button>
                </div>
             </div>
          </div>
        )}

      </main>
    </div>
  )
}
