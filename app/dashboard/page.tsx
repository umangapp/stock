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
  // --- States ---
  const [activeTab, setActiveTab] = useState('dashboard')
  const [products, setProducts] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isClient, setIsClient] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedGroups, setExpandedGroups] = useState<string[]>([])
  
  // State สำหรับการแก้ไขข้อมูล (Edit Modal)
  const [editingProduct, setEditingProduct] = useState<any>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  // --- Initial Load ---
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

  // --- Logic: จัดกลุ่มข้อมูลตามชื่อสินค้า (Group by Name) ---
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

  // --- Functions: แก้ไขข้อมูลแบบ Full Control ---
  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { error } = await supabase
      .from('products')
      .update({
        name: editingProduct.name,
        sku_15_digits: editingProduct.sku_15_digits,
        unit: editingProduct.unit,
        prefix: editingProduct.prefix,
        current_stock: Number(editingProduct.current_stock) // แก้ไขจำนวนสต๊อกได้โดยตรง
      })
      .eq('id', editingProduct.id);

    if (error) {
      alert("Error: " + error.message);
    } else {
      alert("✅ อัปเดตข้อมูลสินค้าเรียบร้อยแล้ว");
      setIsEditModalOpen(false);
      fetchData();
    }
  };

  const exportToExcel = (data: any[], fileName: string) => {
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Report")
    XLSX.writeFile(wb, `${fileName}.xlsx`)
  }

  if (!isClient) return <div className="h-screen flex items-center justify-center font-black text-slate-300 uppercase italic">Loading System...</div>

  return (
    <div className="flex flex-col h-screen bg-gray-50 lg:flex-row overflow-hidden font-sans text-slate-900">
      
      {/* 1. Sidebar Navigation */}
      <nav className="w-full lg:w-72 bg-slate-900 text-white p-6 flex lg:flex-col gap-2 overflow-x-auto shrink-0 shadow-2xl z-20">
        <div className="hidden lg:block mb-10 px-2 text-center">
          <h1 className="text-2xl font-black text-blue-400 tracking-tighter italic uppercase">Umang BKK</h1>
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-2">Inventory Management</p>
        </div>
        {[
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'inventory', label: 'สต๊อก (3-Column)', icon: Package },
          { id: 'staff', label: 'รายงานพนักงาน', icon: Users },
          { id: 'export', label: 'ส่งออกข้อมูล', icon: Download },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex items-center gap-4 px-6 py-4 rounded-[1.8rem] text-sm font-bold transition-all shrink-0 ${activeTab === item.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/30' : 'text-slate-400 hover:bg-white/5'}`}
          >
            <item.icon size={20} /> {item.label}
          </button>
        ))}
      </nav>

      {/* 2. Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 lg:p-10 pb-24">
        
        {/* --- TAB: DASHBOARD --- */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center gap-5 hover:shadow-md transition-shadow">
                <div className="p-5 bg-blue-50 text-blue-600 rounded-[1.5rem]"><Package size={28}/></div>
                <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">สต๊อกรวม</p><p className="text-3xl font-black">{products.reduce((a, b) => a + b.current_stock, 0)}</p></div>
              </div>
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center gap-5 hover:shadow-md transition-shadow">
                <div className="p-5 bg-green-50 text-green-600 rounded-[1.5rem]"><TrendingUp size={28}/></div>
                <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">วันนี้</p><p className="text-3xl font-black">{transactions.filter(t => t.created_at.startsWith(new Date().toISOString().split('T')[0])).length}</p></div>
              </div>
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center gap-5 hover:shadow-md transition-shadow">
                <div className="p-5 bg-red-50 text-red-600 rounded-[1.5rem]"><AlertTriangle size={28}/></div>
                <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Low Stock</p><p className="text-3xl font-black text-gray-800">{products.filter(p => p.current_stock < 10).length}</p></div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
              <h3 className="font-black text-slate-800 mb-8 flex items-center gap-2 uppercase tracking-widest text-xs italic">Movement Stats</h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={transactions.slice(0, 7)}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="created_at" tickFormatter={(str) => new Date(str).toLocaleDateString()} tick={{fontSize: 10, fontWeight: 'bold'}} />
                    <YAxis tick={{fontSize: 10, fontWeight: 'bold'}} />
                    <Tooltip contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}} />
                    <Bar dataKey="amount" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB: INVENTORY (3-COLUMN GRID & DRILL DOWN) --- */}
        {activeTab === 'inventory' && (
          <div className="space-y-8 animate-in slide-in-from-right-5 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
              <div>
                <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">สต๊อกตามชื่อสินค้า (GROUPED)</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">แบ่งมุมมองเป็น 3 คอลัมน์ และเจาะลึกรายละเอียดสินค้า</p>
              </div>
              <div className="relative w-full md:w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  type="text" 
                  placeholder="ค้นหาชื่อสินค้า..." 
                  className="w-full pl-12 pr-4 py-4 bg-white rounded-[1.5rem] border border-slate-100 shadow-sm focus:ring-4 focus:ring-blue-500/10 outline-none text-sm font-bold transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Grid Layout: 3 Columns on Desktop */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {inventoryList
                .filter((group: any) => group.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((group: any) => {
                  const isExpanded = expandedGroups.includes(group.name);
                  return (
                    <div key={group.name} className={`flex flex-col h-fit bg-white rounded-[2.5rem] shadow-sm border transition-all duration-300 ${isExpanded ? 'border-blue-200 ring-8 ring-blue-50/50' : 'border-slate-100 hover:shadow-lg'}`}>
                      
                      {/* Card Header (Summary) */}
                      <div onClick={() => toggleGroup(group.name)} className="p-7 flex flex-col gap-6 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className={`p-4 rounded-[1.2rem] ${group.totalStock < 10 ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-600'}`}>
                            <Package size={24} />
                          </div>
                          {isExpanded ? <ChevronUp size={20} className="text-slate-300" /> : <ChevronDown size={20} className="text-slate-300" />}
                        </div>

                        <div>
                          <h3 className="text-xl font-black text-slate-800 uppercase leading-tight truncate">{group.name}</h3>
                          <p className="text-[9px] text-slate-400 font-black uppercase mt-2 tracking-widest opacity-60">
                            รวม {group.items.length} รายการ SKU
                          </p>
                        </div>

                        <div className="pt-6 border-t border-slate-50 flex items-end justify-between">
                           <div>
                              <p className="text-[9px] text-slate-400 font-black uppercase mb-1">สต๊อกรวมปัจจุบัน</p>
                              <p className={`text-4xl font-black leading-none ${group.totalStock < 10 ? 'text-red-500' : 'text-slate-900'}`}>
                                {group.totalStock} <span className="text-[10px] font-bold text-slate-400 uppercase">{group.unit}</span>
                              </p>
                           </div>
                           <div className="text-[9px] bg-slate-900 text-white px-4 py-2 rounded-full font-black uppercase tracking-tighter shadow-lg shadow-slate-200">
                             Manage
                           </div>
                        </div>
                      </div>

                      {/* Card Content (Individual SKU Cards) */}
                      {isExpanded && (
                        <div className="bg-slate-50/80 p-5 border-t border-slate-100 flex flex-col gap-4 animate-in fade-in slide-in-from-top-3 duration-500">
                          {group.items.map((item: any) => (
                            <div key={item.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-5 group relative overflow-hidden transition-all hover:border-blue-300">
                              <div className="flex justify-between items-start z-10">
                                <div className="space-y-1">
                                  <span className="text-[8px] font-black bg-blue-600 text-white px-3 py-1 rounded-full uppercase italic tracking-tighter">
                                    {item.prefix || 'SKU'}
                                  </span>
                                  <p className="text-[11px] font-mono font-bold text-slate-400 tracking-tighter mt-1">{item.sku_15_digits}</p>
                                </div>
                                <div className="flex gap-1">
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); setEditingProduct(item); setIsEditModalOpen(true); }}
                                    className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                  >
                                    <Edit3 size={16}/>
                                  </button>
                                </div>
                              </div>
                              <div className="flex justify-between items-end z-10">
                                <div>
                                  <p className="text-[9px] text-slate-400 font-black uppercase mb-1">คงเหลือแยกตัว</p>
                                  <p className={`text-2xl font-black leading-none ${item.current_stock < 5 ? 'text-red-500' : 'text-slate-800'}`}>
                                    {item.current_stock} <span className="text-[10px] font-bold text-slate-400">{item.unit}</span>
                                  </p>
                                </div>
                                <QrCode size={24} className="text-slate-100" />
                              </div>
                              <div className="absolute -bottom-4 -right-4 opacity-[0.03] rotate-12">
                                <Package size={100} />
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
                <h2 className="text-3xl font-black mb-3 uppercase italic tracking-tighter">Data Center</h2>
                <p className="text-slate-400 text-[10px] mb-12 uppercase font-bold tracking-[0.2em]">ส่งออกข้อมูลสต๊อกคงเหลือและประวัติทั้งหมดเข้า Excel</p>
                <div className="grid gap-5">
                  <button onClick={() => exportToExcel(products, 'inventory_report')} className="w-full bg-white text-slate-900 p-7 rounded-[2rem] font-black flex items-center justify-between hover:bg-blue-500 hover:text-white transition-all group uppercase text-sm shadow-xl">
                    สต๊อกปัจจุบัน (Inventory) <FileText size={22} className="text-slate-200 group-hover:text-white" />
                  </button>
                  <button onClick={() => exportToExcel(transactions, 'transaction_history')} className="w-full bg-white/5 text-white p-7 rounded-[2rem] font-black flex items-center justify-between hover:bg-blue-600 transition-all uppercase text-sm border border-white/10">
                    ประวัติรายการ (History) <ClipboardList size={22} className="text-slate-600" />
                  </button>
                </div>
             </div>
          </div>
        )}

      </main>

      {/* --- MODAL: EDIT PRODUCT (FULL CONTROL) --- */}
      {isEditModalOpen && editingProduct && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[4rem] overflow-hidden shadow-2xl animate-in zoom-in duration-300">
            <div className="p-10 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black uppercase italic tracking-tighter">Edit Item</h3>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-2 truncate max-w-[200px]">ID: {editingProduct.id}</p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="p-4 bg-white/5 hover:bg-white/10 rounded-full transition-colors"><X size={20}/></button>
            </div>
            <form onSubmit={handleUpdateProduct} className="p-10 space-y-7">
              <div className="space-y-5">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-3 mb-2 block tracking-widest">ชื่อสินค้าหลัก (Group Name)</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 p-5 rounded-[1.5rem] border-none outline-none focus:ring-4 focus:ring-blue-500/10 font-bold text-slate-800"
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-3 mb-2 block tracking-widest">Prefix</label>
                    <input 
                      type="text" 
                      className="w-full bg-slate-50 p-5 rounded-[1.5rem] border-none outline-none focus:ring-4 focus:ring-blue-500/10 font-black uppercase"
                      value={editingProduct.prefix || ''}
                      onChange={(e) => setEditingProduct({...editingProduct, prefix: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-3 mb-2 block tracking-widest">Unit</label>
                    <input 
                      type="text" 
                      className="w-full bg-slate-50 p-5 rounded-[1.5rem] border-none outline-none focus:ring-4 focus:ring-blue-500/10 font-bold"
                      value={editingProduct.unit}
                      onChange={(e) => setEditingProduct({...editingProduct, unit: e.target.value})}
                    />
                  </div>
                </div>

                {/* ส่วนที่เพิ่มใหม่: แก้ไขจำนวนสต๊อกได้โดยตรง */}
                <div className="bg-blue-50/50 p-5 rounded-[2rem] border border-blue-100">
                  <label className="text-[10px] font-black text-blue-400 uppercase ml-3 mb-2 block tracking-widest italic underline">Current Stock (ยอดปัจจุบัน)</label>
                  <input 
                    type="number" 
                    className="w-full bg-white p-5 rounded-[1.5rem] border-none outline-none focus:ring-4 focus:ring-blue-500/10 font-black text-blue-600 text-2xl shadow-inner"
                    value={editingProduct.current_stock}
                    onChange={(e) => setEditingProduct({...editingProduct, current_stock: e.target.value})}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-3 mb-2 block tracking-widest">รหัส SKU (15 Digits)</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 p-5 rounded-[1.5rem] border-none outline-none focus:ring-4 focus:ring-blue-500/10 font-mono font-bold text-blue-500 shadow-inner"
                    value={editingProduct.sku_15_digits}
                    onChange={(e) => setEditingProduct({...editingProduct, sku_15_digits: e.target.value})}
                  />
                </div>
              </div>
              <button 
                type="submit" 
                className="w-full bg-blue-600 text-white py-6 rounded-[2.2rem] font-black shadow-2xl shadow-blue-500/30 hover:bg-blue-700 transition-all flex items-center justify-center gap-3 active:scale-95"
              >
                <Save size={22} /> SAVE CHANGES
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
