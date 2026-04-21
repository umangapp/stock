'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts'
import { 
  LayoutDashboard, ClipboardList, Users, Download, Package, 
  AlertTriangle, TrendingUp, Search, Printer, QrCode, FileText, 
  ChevronDown, ChevronUp, Edit3, X, Save, Calendar, User, ArrowRightLeft
} from 'lucide-react'
import * as XLSX from 'xlsx'

export default function AdminDashboard() {
  // --- States ---
  const [activeTab, setActiveTab] = useState('dashboard')
  const [products, setProducts] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isClient, setIsClient] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedGroups, setExpandedGroups] = useState<string[]>([])
  
  // Date Filters for Report
  const today = new Date().toISOString().split('T')[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(sevenDaysAgo)
  const [endDate, setEndDate] = useState(today)

  // Edit Modal State
  const [editingProduct, setEditingProduct] = useState<any>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  useEffect(() => {
    setIsClient(true)
    fetchData()
  }, [startDate, endDate])

  const fetchData = async () => {
    setLoading(true)
    // ดึงข้อมูลสินค้า
    const { data: p } = await supabase.from('products').select('*').order('name')
    
    // ดึงข้อมูลรายการย้อนหลังตามช่วงวันที่เลือก
    const { data: t } = await supabase.from('transactions')
      .select('*, products(name, sku_15_digits, unit)')
      .gte('created_at', `${startDate}T00:00:00`)
      .lte('created_at', `${endDate}T23:59:59`)
      .order('created_at', { ascending: false })
    
    if (p && t) {
      setProducts(p)
      setTransactions(t)
    }
    setLoading(false)
  }

  // --- Logic: จัดกลุ่มข้อมูลตามชื่อสินค้า (Group by Name) ---
  const groupedInventory = products.reduce((acc: any, item: any) => {
    if (!acc[item.name]) {
      acc[item.name] = { name: item.name, totalStock: 0, unit: item.unit, items: [] };
    }
    acc[item.name].totalStock += item.current_stock;
    acc[item.name].items.push(item);
    return acc;
  }, {});

  const inventoryList = Object.values(groupedInventory);

  // --- Logic: สรุปยอด Grid Report รายสินค้าในช่วงเวลาที่เลือก ---
  const historicalSummary = products.map(p => {
    const itemLogs = transactions.filter(t => t.product_id === p.id);
    const received = itemLogs.filter(t => t.type === 'receive').reduce((sum, t) => sum + t.amount, 0);
    const issued = itemLogs.filter(t => t.type === 'issue').reduce((sum, t) => sum + t.amount, 0);
    return { ...p, received, issued, net: received - issued };
  });

  const toggleGroup = (name: string) => {
    setExpandedGroups(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('products')
      .update({
        name: editingProduct.name,
        sku_15_digits: editingProduct.sku_15_digits,
        unit: editingProduct.unit,
        prefix: editingProduct.prefix,
        current_stock: Number(editingProduct.current_stock)
      }).eq('id', editingProduct.id);

    if (!error) {
      alert("✅ อัปเดตสำเร็จ");
      setIsEditModalOpen(false);
      fetchData();
    }
  };

  const exportToExcel = (data: any[], fileName: string) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  }

  if (!isClient) return <div className="h-screen flex items-center justify-center font-black text-slate-300">LOADING SYSTEM...</div>

  return (
    <div className="flex flex-col h-screen bg-gray-50 lg:flex-row overflow-hidden font-sans text-slate-900">
      
      {/* 1. Sidebar */}
      <nav className="w-full lg:w-72 bg-slate-900 text-white p-6 flex lg:flex-col gap-2 overflow-x-auto shrink-0 shadow-2xl z-20">
        <div className="hidden lg:block mb-10 px-2 text-center">
          <h1 className="text-2xl font-black text-blue-400 tracking-tighter italic uppercase italic">Umang Stock</h1>
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-2">Management Panel</p>
        </div>
        {[
          { id: 'dashboard', label: 'ภาพรวมระบบ', icon: LayoutDashboard },
          { id: 'inventory', label: 'คลังสินค้า (3-Col)', icon: Package },
          { id: 'history', label: 'ประวัติ & รายงาน', icon: ClipboardList },
          { id: 'export', label: 'Export ข้อมูล', icon: Download },
        ].map((item) => (
          <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex items-center gap-4 px-6 py-4 rounded-[1.8rem] text-sm font-bold transition-all shrink-0 ${activeTab === item.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/30' : 'text-slate-400 hover:bg-white/5'}`}>
            <item.icon size={20} /> {item.label}
          </button>
        ))}
      </nav>

      {/* 2. Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 lg:p-10 pb-24">
        
        {/* --- TAB: DASHBOARD (Includes User Activity Feed) --- */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Side: Stats & Activity */}
              <div className="lg:col-span-2 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center gap-5">
                    <div className="p-5 bg-blue-50 text-blue-600 rounded-[1.5rem]"><Package size={28}/></div>
                    <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">สต๊อกรวม</p><p className="text-3xl font-black">{products.reduce((a, b) => a + b.current_stock, 0)}</p></div>
                  </div>
                  <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center gap-5">
                    <div className="p-5 bg-green-50 text-green-600 rounded-[1.5rem]"><TrendingUp size={28}/></div>
                    <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">วันนี้</p><p className="text-3xl font-black">{transactions.filter(t => t.created_at.startsWith(today)).length}</p></div>
                  </div>
                </div>

                {/* ▌ 1. User Activity Feed (ใครอัปเดตอะไร) */}
                <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
                  <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                    <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest italic">Live Activity Feed (การอัปเดตล่าสุด)</h3>
                    <span className="flex items-center gap-1 text-[10px] font-black text-green-500 bg-green-50 px-3 py-1 rounded-full animate-pulse">LIVE</span>
                  </div>
                  <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
                    {transactions.slice(0, 10).map((t) => (
                      <div key={t.id} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-3xl border border-slate-50 hover:bg-white hover:shadow-md transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-slate-900 text-white rounded-full flex items-center justify-center font-black text-xs uppercase">{t.created_by?.substring(0,2)}</div>
                          <div>
                            <p className="text-[13px] font-black text-slate-800 uppercase">{t.created_by}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">{t.products?.name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-black ${t.type === 'receive' ? 'text-green-600' : 'text-red-600'}`}>
                            {t.type === 'receive' ? '+' : '-'} {t.amount} {t.products?.unit}
                          </p>
                          <p className="text-[9px] text-slate-300 font-mono">{new Date(t.created_at).toLocaleString('th-TH')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Side: Charts */}
              <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 h-full">
                <h3 className="font-black text-slate-800 mb-8 uppercase tracking-widest text-xs italic">Movement Stats</h3>
                <div className="h-96 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={transactions.slice(0, 7).reverse()}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="created_at" tickFormatter={(str) => new Date(str).toLocaleDateString('th-TH', {day: '2-digit', month: 'short'})} tick={{fontSize: 10, fontWeight: 'bold'}} />
                      <YAxis tick={{fontSize: 10, fontWeight: 'bold'}} />
                      <Tooltip contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}} />
                      <Bar dataKey="amount" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB: HISTORY & REPORT (Grid with Calendar) --- */}
        {activeTab === 'history' && (
          <div className="space-y-8 animate-in slide-in-from-right-5 duration-500">
            {/* ▌ 2. Calendar Filter & Summary Report */}
            <div className="bg-slate-900 p-8 lg:p-12 rounded-[4rem] text-white shadow-2xl relative overflow-hidden">
               <div className="absolute -top-10 -right-10 opacity-10 rotate-12"><Calendar size={200} /></div>
               <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-8">
                  <div>
                    <h2 className="text-3xl font-black uppercase italic tracking-tighter">Inventory Update Report</h2>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em] mt-2">สรุปจำนวนการอัปเดตย้อนหลังรายตัว</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-4 bg-white/5 p-4 rounded-[2.5rem] border border-white/10 shadow-inner">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-slate-500 uppercase ml-2 mb-1">เริ่มต้น</span>
                      <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent text-sm font-bold outline-none text-blue-400" />
                    </div>
                    <ArrowRightLeft size={16} className="text-slate-600 mx-2 hidden lg:block" />
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-slate-500 uppercase ml-2 mb-1">สิ้นสุด</span>
                      <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent text-sm font-bold outline-none text-blue-400" />
                    </div>
                  </div>
               </div>
            </div>

            {/* Grid Report Table */}
            <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-black tracking-[0.2em]">
                    <tr>
                      <th className="px-8 py-6">รหัสสินค้า / ชื่อสินค้า</th>
                      <th className="px-8 py-6 text-green-600">รับเข้า (+)</th>
                      <th className="px-8 py-6 text-red-600">นำออก (-)</th>
                      <th className="px-8 py-6 text-slate-800">ยอดขยับสุทธิ (Net)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {historicalSummary.filter(p => p.received > 0 || p.issued > 0).map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-6">
                          <p className="text-sm font-black text-slate-800 uppercase">{p.name}</p>
                          <p className="text-[10px] font-mono font-bold text-slate-400 tracking-tighter">{p.sku_15_digits}</p>
                        </td>
                        <td className="px-8 py-6 font-black text-green-600">+{p.received} <span className="text-[10px] opacity-60 uppercase">{p.unit}</span></td>
                        <td className="px-8 py-6 font-black text-red-600">-{p.issued} <span className="text-[10px] opacity-60 uppercase">{p.unit}</span></td>
                        <td className="px-8 py-6">
                           <span className={`px-5 py-2 rounded-2xl font-black text-sm ${p.net > 0 ? 'bg-green-50 text-green-700' : p.net < 0 ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-400'}`}>
                             {p.net > 0 ? '+' : ''}{p.net}
                           </span>
                        </td>
                      </tr>
                    ))}
                    {historicalSummary.filter(p => p.received > 0 || p.issued > 0).length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-8 py-20 text-center text-slate-300 font-bold uppercase tracking-widest italic">ไม่มีข้อมูลการเคลื่อนไหวในช่วงเวลานี้</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB: INVENTORY (3-COLUMN GRID) --- */}
        {activeTab === 'inventory' && (
          <div className="space-y-8 animate-in slide-in-from-right-5 duration-500">
            {/* (ส่วนนี้คงเดิมตามโค้ด 100% ล่าสุดของคุณ เพื่อให้ใช้งานต่อได้ทันที) */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
              <div>
                <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">คลังสินค้า (GROUPED)</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">จัดการสต๊อกและแก้ไขข้อมูลรายสินค้า</p>
              </div>
              <div className="relative w-full md:w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input type="text" placeholder="ค้นหาชื่อสินค้า..." className="w-full pl-12 pr-4 py-4 bg-white rounded-[1.5rem] border border-slate-100 shadow-sm outline-none text-sm font-bold" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {inventoryList
                .filter((group: any) => group.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((group: any) => {
                  const isExpanded = expandedGroups.includes(group.name);
                  return (
                    <div key={group.name} className={`flex flex-col h-fit bg-white rounded-[2.5rem] shadow-sm border transition-all duration-300 ${isExpanded ? 'border-blue-200 ring-8 ring-blue-50/50' : 'border-slate-100 hover:shadow-lg'}`}>
                      <div onClick={() => toggleGroup(group.name)} className="p-7 flex flex-col gap-6 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className={`p-4 rounded-[1.2rem] ${group.totalStock < 10 ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-600'}`}>
                            <Package size={24} />
                          </div>
                          {isExpanded ? <ChevronUp size={20} className="text-slate-300" /> : <ChevronDown size={20} className="text-slate-300" />}
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-slate-800 uppercase leading-tight truncate">{group.name}</h3>
                          <p className="text-[9px] text-slate-400 font-black uppercase mt-2 tracking-widest">Total {group.items.length} SKU Items</p>
                        </div>
                        <div className="pt-6 border-t border-slate-50 flex items-end justify-between">
                           <div>
                              <p className="text-[9px] text-slate-400 font-black uppercase mb-1">สต๊อกรวม</p>
                              <p className={`text-4xl font-black leading-none ${group.totalStock < 10 ? 'text-red-500' : 'text-slate-900'}`}>
                                {group.totalStock} <span className="text-xs font-bold text-slate-400 uppercase">{group.unit}</span>
                              </p>
                           </div>
                           <div className="text-[9px] bg-slate-900 text-white px-4 py-2 rounded-full font-black uppercase tracking-tighter">View</div>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="bg-slate-50/80 p-5 border-t border-slate-100 flex flex-col gap-4 animate-in fade-in duration-300">
                          {group.items.map((item: any) => (
                            <div key={item.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-5 group relative overflow-hidden transition-all hover:border-blue-300">
                              <div className="flex justify-between items-start z-10">
                                <div className="space-y-1">
                                  <span className="text-[8px] font-black bg-blue-600 text-white px-3 py-1 rounded-full uppercase italic tracking-tighter">{item.prefix || 'SKU'}</span>
                                  <p className="text-[11px] font-mono font-bold text-slate-400 tracking-tighter mt-1">{item.sku_15_digits}</p>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); setEditingProduct(item); setIsEditModalOpen(true); }} className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                                  <Edit3 size={16}/>
                                </button>
                              </div>
                              <div className="flex justify-between items-end z-10">
                                <div>
                                  <p className="text-[9px] text-slate-400 font-black uppercase mb-1">คงเหลือ</p>
                                  <p className={`text-2xl font-black leading-none ${item.current_stock < 5 ? 'text-red-500' : 'text-slate-800'}`}>
                                    {item.current_stock} <span className="text-[10px] font-bold text-slate-400">{item.unit}</span>
                                  </p>
                                </div>
                                <QrCode size={24} className="text-slate-100" />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
              })}
            </div>
          </div>
        )}

        {/* --- TAB: EXPORT --- */}
        {activeTab === 'export' && (
          <div className="max-w-2xl mx-auto py-16 animate-in zoom-in-95 duration-500">
             <div className="bg-slate-900 p-12 rounded-[4rem] text-white shadow-2xl relative overflow-hidden">
                <div className="absolute -top-10 -right-10 opacity-10 rotate-12"><Download size={250} /></div>
                <h2 className="text-3xl font-black mb-3 uppercase italic tracking-tighter">Data Export</h2>
                <div className="grid gap-5">
                  <button onClick={() => exportToExcel(products, 'inventory_report')} className="w-full bg-white text-slate-900 p-7 rounded-[2rem] font-black flex items-center justify-between hover:bg-blue-500 hover:text-white transition-all group uppercase text-sm shadow-xl">
                    สต๊อกปัจจุบัน (Excel) <FileText size={22} className="text-slate-200" />
                  </button>
                  <button onClick={() => exportToExcel(historicalSummary, 'historical_report')} className="w-full bg-white/5 text-white p-7 rounded-[2rem] font-black flex items-center justify-between hover:bg-blue-600 transition-all uppercase text-sm border border-white/10">
                    รายงานสรุปตามช่วงเวลา (Excel) <ClipboardList size={22} className="text-slate-600" />
                  </button>
                </div>
             </div>
          </div>
        )}
      </main>

      {/* --- EDIT MODAL (REUSED FROM PREVIOUS CODE) --- */}
      {isEditModalOpen && editingProduct && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[4rem] overflow-hidden shadow-2xl animate-in zoom-in duration-300">
            <div className="p-10 bg-slate-900 text-white flex justify-between items-center">
              <div><h3 className="text-2xl font-black uppercase italic tracking-tighter">Edit Item</h3><p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-2 truncate max-w-[200px]">ID: {editingProduct.id}</p></div>
              <button onClick={() => setIsEditModalOpen(false)} className="p-4 bg-white/5 hover:bg-white/10 rounded-full"><X size={20}/></button>
            </div>
            <form onSubmit={handleUpdateProduct} className="p-10 space-y-7">
              <div className="space-y-5">
                <input type="text" className="w-full bg-slate-50 p-5 rounded-[1.5rem] outline-none font-bold text-slate-800" value={editingProduct.name} onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})} placeholder="Product Name" />
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" className="bg-slate-50 p-5 rounded-[1.5rem] outline-none font-black uppercase" value={editingProduct.prefix || ''} onChange={(e) => setEditingProduct({...editingProduct, prefix: e.target.value})} placeholder="Prefix" />
                  <input type="text" className="bg-slate-50 p-5 rounded-[1.5rem] outline-none font-bold" value={editingProduct.unit} onChange={(e) => setEditingProduct({...editingProduct, unit: e.target.value})} placeholder="Unit" />
                </div>
                <div className="bg-blue-50/50 p-5 rounded-[2rem] border border-blue-100">
                  <label className="text-[9px] font-black text-blue-400 uppercase ml-3 mb-2 block tracking-widest">Adjust Stock (จำนวนปัจจุบัน)</label>
                  <input type="number" className="w-full bg-white p-5 rounded-[1.5rem] outline-none font-black text-blue-600 text-2xl" value={editingProduct.current_stock} onChange={(e) => setEditingProduct({...editingProduct, current_stock: e.target.value})} />
                </div>
                <input type="text" className="w-full bg-slate-50 p-5 rounded-[1.5rem] outline-none font-mono font-bold text-blue-500" value={editingProduct.sku_15_digits} onChange={(e) => setEditingProduct({...editingProduct, sku_15_digits: e.target.value})} placeholder="SKU" />
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-6 rounded-[2.2rem] font-black shadow-2xl hover:bg-blue-700 transition-all flex items-center justify-center gap-3"><Save size={22} /> SAVE CHANGES</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
