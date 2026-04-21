'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts'
import { 
  LayoutDashboard, ClipboardList, Users, Download, Package, 
  AlertTriangle, TrendingUp, Search, Printer, QrCode, FileText, 
  ChevronDown, ChevronUp, Edit3, X, Save 
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

  // State สำหรับการแก้ไขข้อมูล
  const [editingProduct, setEditingProduct] = useState<any>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  useEffect(() => {
    setIsClient(true)
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const { data: p } = await supabase.from('products').select('*').order('name')
    const { data: t } = await supabase.from('transactions').select('*, products(name, sku_15_digits)').order('created_at', { ascending: false })
    
    if (p && t) {
      setProducts(p)
      setTransactions(t)
    }
    setLoading(false)
  }

  // --- Logic: จัดกลุ่มตามชื่อสินค้า ---
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

  // --- ฟังก์ชันอัปเดตข้อมูลสินค้า ---
  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase
      .from('products')
      .update({
        name: editingProduct.name,
        sku_15_digits: editingProduct.sku_15_digits,
        unit: editingProduct.unit,
        prefix: editingProduct.prefix
      })
      .eq('id', editingProduct.id);

    if (error) {
      alert("ไม่สามารถอัปเดตได้: " + error.message);
    } else {
      alert("✅ อัปเดตข้อมูลสำเร็จ");
      setIsEditModalOpen(false);
      fetchData(); // โหลดข้อมูลใหม่
    }
  };

  const exportToExcel = (data: any[], fileName: string) => {
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Report")
    XLSX.writeFile(wb, `${fileName}.xlsx`)
  }

  if (!isClient) return <div className="p-10 text-center font-black text-slate-300 uppercase tracking-widest">Loading...</div>

  return (
    <div className="flex flex-col h-screen bg-gray-50 lg:flex-row overflow-hidden font-sans text-slate-900">
      
      {/* Sidebar */}
      <nav className="w-full lg:w-64 bg-slate-900 text-white p-4 flex lg:flex-col gap-2 overflow-x-auto shrink-0 shadow-xl">
        <div className="hidden lg:block mb-8 px-4">
          <h1 className="text-xl font-black text-blue-400 tracking-tighter italic">UMANG BKK</h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase">Stock Admin Panel</p>
        </div>
        {[
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'inventory', label: 'จัดการคลังสินค้า', icon: Package },
          { id: 'staff', label: 'พนักงาน', icon: Users },
          { id: 'export', label: 'Export', icon: Download },
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

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 lg:p-8">
        
        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-4">
                <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl"><Package size={24}/></div>
                <div><p className="text-[10px] font-bold text-slate-400 uppercase">สต๊อกรวม</p><p className="text-2xl font-black">{products.reduce((a, b) => a + b.current_stock, 0)}</p></div>
              </div>
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-4">
                <div className="p-4 bg-green-50 text-green-600 rounded-2xl"><TrendingUp size={24}/></div>
                <div><p className="text-[10px] font-bold text-slate-400 uppercase">ทำรายการวันนี้</p><p className="text-2xl font-black">{transactions.filter(t => t.created_at.startsWith(new Date().toISOString().split('T')[0])).length}</p></div>
              </div>
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-4">
                <div className="p-4 bg-red-50 text-red-600 rounded-2xl"><AlertTriangle size={24}/></div>
                <div><p className="text-[10px] font-bold text-slate-400 uppercase">สินค้าต่ำกว่าเกณฑ์</p><p className="text-2xl font-black">{products.filter(p => p.current_stock < 10).length}</p></div>
              </div>
            </div>
            {/* Chart... (โค้ด Recharts เดิมของคุณ) */}
          </div>
        )}

        {/* INVENTORY TAB (Card Layout & Edit) */}
        {activeTab === 'inventory' && (
          <div className="space-y-6 animate-in slide-in-from-right-5 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <h2 className="text-xl font-black uppercase italic">สต๊อกตามชื่อสินค้า (Grouped)</h2>
              <div className="relative w-full md:w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <input 
                  type="text" 
                  placeholder="ค้นหาชื่อสินค้า..." 
                  className="w-full pl-12 pr-4 py-3 bg-white rounded-2xl border border-slate-100 shadow-sm outline-none text-sm"
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
                    <div key={group.name} className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                      <div 
                        onClick={() => toggleGroup(group.name)}
                        className="p-6 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-4 rounded-2xl ${group.totalStock < 10 ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-600'}`}>
                            <Package size={22} />
                          </div>
                          <div>
                            <h3 className="text-lg font-black text-slate-800 uppercase">{group.name}</h3>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                              รวม {group.items.length} รายการรหัส
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                           <div className="text-right">
                              <p className="text-[9px] text-slate-400 font-black uppercase">ยอดสต๊อกรวม</p>
                              <p className={`text-2xl font-black ${group.totalStock < 10 ? 'text-red-500' : 'text-slate-800'}`}>
                                {group.totalStock} <span className="text-xs text-slate-400">{group.unit}</span>
                              </p>
                           </div>
                           {isExpanded ? <ChevronUp size={20} className="text-slate-300" /> : <ChevronDown size={20} className="text-slate-300" />}
                        </div>
                      </div>

                      {/* รายละเอียดสินค้า (Card Style) */}
                      {isExpanded && (
                        <div className="bg-slate-50/50 border-t border-slate-100 p-5 grid grid-cols-1 md:grid-cols-2 gap-3 animate-in fade-in duration-300">
                          {group.items.map((item: any) => (
                            <div key={item.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-4 relative group">
                              <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                  <span className="text-[9px] font-black bg-blue-600 text-white px-2 py-0.5 rounded-full uppercase tracking-tighter italic">
                                    {item.prefix || 'SKU'}
                                  </span>
                                  <p className="text-[11px] font-mono font-bold text-slate-400 mt-1">{item.sku_15_digits}</p>
                                </div>
                                <div className="flex gap-1">
                                  <button 
                                    onClick={() => { setEditingProduct(item); setIsEditModalOpen(true); }}
                                    className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all"
                                  >
                                    <Edit3 size={14}/>
                                  </button>
                                  <button className="p-2 bg-slate-50 text-slate-300 rounded-xl hover:text-green-600"><Printer size={14}/></button>
                                </div>
                              </div>
                              <div className="flex justify-between items-end">
                                <div>
                                  <p className="text-[9px] text-slate-400 font-bold uppercase">คงเหลือ</p>
                                  <p className={`text-2xl font-black ${item.current_stock < 5 ? 'text-red-500' : 'text-slate-800'}`}>
                                    {item.current_stock} <span className="text-[10px] text-slate-400 uppercase">{item.unit}</span>
                                  </p>
                                </div>
                                <div className="text-blue-500 opacity-20 group-hover:opacity-100 transition-opacity">
                                  <QrCode size={30} />
                                </div>
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
      </main>

      {/* EDIT MODAL - หน้าต่างสำหรับแก้ไขข้อมูลสินค้า */}
      {isEditModalOpen && editingProduct && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-md rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in duration-300">
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black uppercase italic italic">แก้ไขข้อมูลสินค้า</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">รหัส ID: {editingProduct.id}</p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full"><X size={20}/></button>
            </div>
            <form onSubmit={handleUpdateProduct} className="p-8 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">ชื่อสินค้าหลัก</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 p-4 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">ตัวย่อ Prefix</label>
                    <input 
                      type="text" 
                      className="w-full bg-slate-50 p-4 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold uppercase"
                      value={editingProduct.prefix}
                      onChange={(e) => setEditingProduct({...editingProduct, prefix: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">หน่วยนับ</label>
                    <input 
                      type="text" 
                      className="w-full bg-slate-50 p-4 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                      value={editingProduct.unit}
                      onChange={(e) => setEditingProduct({...editingProduct, unit: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">รหัส SKU (15 หลัก)</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 p-4 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold"
                    value={editingProduct.sku_15_digits}
                    onChange={(e) => setEditingProduct({...editingProduct, sku_15_digits: e.target.value})}
                  />
                </div>
              </div>
              <button 
                type="submit" 
                className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
              >
                <Save size={18} /> บันทึกการเปลี่ยนแปลง
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
