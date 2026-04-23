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
  ChevronDown, ChevronUp, Edit3, X, Save, Calendar, User, ArrowRightLeft, Clock, Trash2, ShieldCheck, LogOut, Plus
} from 'lucide-react'
import * as XLSX from 'xlsx'

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [products, setProducts] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isClient, setIsClient] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedGroups, setExpandedGroups] = useState<string[]>([])
  const [expandedUsers, setExpandedUsers] = useState<string[]>([])

  // Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<any>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newProduct, setNewProduct] = useState({
    name: '', prefix: '', width: '', length: '', height: '', weight: '', received_date: '', unit: 'เส้น', current_stock: 0
  })

  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(today)

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const { data: p } = await supabase.from('products').select('*').order('name')
    const { data: t } = await supabase.from('transactions').select('*, products(name, unit)')
      .gte('created_at', `${startDate}T00:00:00`).lte('created_at', `${endDate}T23:59:59`)
      .order('created_at', { ascending: false })
    const { data: u } = await supabase.from('profiles').select('*')
    
    if (p) setProducts(p)
    if (t) setTransactions(t)
    if (u) setProfiles(u)
    setLoading(false)
  }

  useEffect(() => {
    setIsClient(true);
    fetchData();
  }, [startDate, endDate])

  // --- ฟังก์ชันสร้าง SKU 15 หลัก ---
  const generateSKU = (p: any) => {
    const prefix = (p.prefix || 'XXX').toUpperCase().slice(0,3);
    const w = String(p.width || '0').slice(0,1);
    const l = String(p.length || '0').padStart(2, '0').slice(0,2);
    const h = String(p.height || '0').padStart(2, '0').slice(0,2);
    const weight = String(p.weight || '0').slice(0,1);
    const date = String(p.received_date || '000000').slice(0,6);
    return (prefix + w + l + h + weight + date).padEnd(15, '0');
  }

  // --- ระบบ Import จาก Excel (รองรับหัวตารางภาษาไทย) ---
  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: 'binary' });
        const data: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        
        const formatted = data.map(item => {
          const p = {
            prefix: item['ตัวย่อ (2-3 หลัก)'],
            width: item['กว้าง (cm)'],
            length: item['ยาว (cm)'],
            height: item['สูง (cm)'],
            weight: item['น้ำหนัก (kg)'],
            received_date: item['วันที่รับ (YYMMDD)']
          };
          return {
            name: item['ชื่อสินค้า'],
            sku_15_digits: generateSKU(p),
            unit: item['หน่วยนับ'] || 'เส้น',
            current_stock: Number(item['สต๊อกเริ่มต้น']) || 0,
            prefix: p.prefix
          }
        });

        const { error } = await supabase.from('products').insert(formatted);
        if (error) alert("Error: " + error.message);
        else { alert("✅ นำเข้าข้อมูลสำเร็จ!"); fetchData(); }
      } catch (err) { alert("❌ ไฟล์ไม่ถูกต้อง"); }
    };
    reader.readAsBinaryString(file);
  }

  // --- เพิ่มสินค้าแบบ Manual ---
  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault();
    const sku = generateSKU(newProduct);
    const { error } = await supabase.from('products').insert([{
      name: newProduct.name,
      sku_15_digits: sku,
      unit: newProduct.unit,
      current_stock: Number(newProduct.current_stock),
      prefix: newProduct.prefix
    }]);
    if (!error) {
      alert("✅ เพิ่มสินค้าสำเร็จ: " + sku);
      setIsAddModalOpen(false);
      fetchData();
    }
  };

  if (!isClient) return null;

  return (
    <div className="flex flex-col h-screen bg-gray-50 lg:flex-row overflow-hidden font-sans text-slate-900">
      
      {/* Sidebar */}
      <nav className="w-full lg:w-72 bg-slate-900 text-white p-6 flex lg:flex-col gap-2 overflow-x-auto shrink-0 shadow-2xl z-20">
        <div className="hidden lg:block mb-10 px-2 text-center font-black">
          <h1 className="text-2xl text-blue-400 italic tracking-tighter uppercase">Umang Admin</h1>
        </div>
        <div className="flex lg:flex-col flex-1 gap-2">
          {[{ id: 'dashboard', label: 'ภาพรวมระบบ', icon: LayoutDashboard }, { id: 'inventory', label: 'สต๊อกสินค้า', icon: Package }, { id: 'history', label: 'รายงาน', icon: ClipboardList }, { id: 'users', label: 'ผู้ใช้งาน', icon: ShieldCheck }].map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex items-center gap-4 px-6 py-4 rounded-[1.8rem] text-sm font-bold transition-all shrink-0 ${activeTab === item.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/30' : 'text-slate-400 hover:bg-white/5'}`}>
              <item.icon size={20} /> {item.label}
            </button>
          ))}
        </div>
        <button onClick={handleLogout} className="flex items-center gap-4 px-6 py-4 rounded-[1.8rem] text-sm font-bold text-red-400 hover:bg-red-500/10 mt-auto"><LogOut size={20} /> ออกจากระบบ</button>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 lg:p-10 pb-24">
        
        {/* --- TAB: DASHBOARD (ภาพรวมระบบ) --- */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center gap-5">
                <div className="p-5 bg-blue-50 text-blue-600 rounded-[1.5rem]"><Package size={28}/></div>
                <div><p className="text-[10px] font-black text-slate-400 uppercase mb-1">สต๊อกรวม</p><p className="text-4xl font-black">{products.reduce((a, b) => a + b.current_stock, 0)}</p></div>
              </div>
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center gap-5">
                <div className="p-5 bg-green-50 text-green-600 rounded-[1.5rem]"><TrendingUp size={28}/></div>
                <div><p className="text-[10px] font-black text-slate-400 uppercase mb-1">รายการวันนี้</p><p className="text-4xl font-black">{transactions.filter(t => t.created_at.startsWith(today)).length}</p></div>
              </div>
            </div>

            {/* Live Feed */}
            <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-8 border-b border-slate-50 font-black text-slate-800 uppercase text-xs tracking-widest italic bg-slate-50/30">Live Activity</div>
                <div className="p-6 space-y-4">
                    {Object.entries(transactions.reduce((acc: any, t: any) => {
                        const user = t.created_by || 'Unknown';
                        if (!acc[user]) acc[user] = [];
                        acc[user].push(t);
                        return acc;
                    }, {})).map(([user, logs]: [string, any]) => (
                        <div key={user} className="border border-slate-100 rounded-[2.5rem] overflow-hidden">
                            <div onClick={() => setExpandedUsers(prev => prev.includes(user) ? prev.filter(u => u !== user) : [...prev, user])} className="p-6 bg-white flex items-center justify-between cursor-pointer">
                                <div className="flex items-center gap-4"><div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black">{user.substring(0,2)}</div><h4 className="font-black uppercase text-slate-700">{user}</h4></div>
                                {expandedUsers.includes(user) ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                            </div>
                            {expandedUsers.includes(user) && (
                                <div className="p-4 bg-slate-50/50 space-y-2">
                                    {logs.map((log: any) => (
                                        <div key={log.id} className="bg-white p-5 rounded-[1.8rem] flex justify-between items-center shadow-sm">
                                            <div><p className="text-lg font-black text-slate-800 uppercase">{log.products?.name}</p><p className="text-[10px] text-slate-400 font-bold">{new Date(log.created_at).toLocaleString('th-TH')}</p></div>
                                            <span className={`text-2xl font-black ${log.type === 'receive' ? 'text-green-600' : 'text-red-600'}`}>{log.type === 'receive' ? '+' : '-'} {log.amount}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
          </div>
        )}

        {/* --- TAB: INVENTORY (สต๊อกสินค้า) --- */}
        {activeTab === 'inventory' && (
          <div className="space-y-8 animate-in fade-in">
            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
              <div>
                <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">สต๊อกสินค้า (Grouped)</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">จัดการข้อมูลและนำเข้าสินค้าด้วย Excel</p>
              </div>
              <div className="flex flex-wrap gap-2 w-full md:w-auto">
                <button onClick={() => setIsAddModalOpen(true)} className="bg-blue-600 text-white px-6 py-4 rounded-[1.5rem] font-black uppercase text-[10px] flex items-center gap-2 shadow-lg shadow-blue-100"><Plus size={16}/> เพิ่มสินค้า</button>
                <label className="cursor-pointer bg-green-600 text-white px-6 py-4 rounded-[1.5rem] font-black uppercase text-[10px] flex items-center gap-2 shadow-lg shadow-green-100">
                  <Download size={16} className="rotate-180" /> Import Excel
                  <input type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={handleImportExcel} />
                </label>
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input type="text" placeholder="ค้นหา..." className="w-full pl-12 pr-4 py-4 bg-white rounded-[1.5rem] border border-slate-100 shadow-sm outline-none text-sm font-bold" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.values(products.reduce((acc: any, item: any) => {
                if (!acc[item.name]) acc[item.name] = { name: item.name, totalStock: 0, unit: item.unit, items: [] };
                acc[item.name].totalStock += item.current_stock;
                acc[item.name].items.push(item);
                return acc;
              }, {})).filter((g: any) => g.name.toLowerCase().includes(searchQuery.toLowerCase())).map((group: any) => (
                <div key={group.name} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden h-fit">
                  <div onClick={() => setExpandedGroups(prev => prev.includes(group.name) ? prev.filter(n => n !== group.name) : [...prev, group.name])} className="p-7 cursor-pointer hover:bg-slate-50 transition-all flex justify-between items-center">
                    <div><h3 className="font-black uppercase text-slate-800 text-lg leading-tight truncate w-32">{group.name}</h3><p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Total {group.items.length} SKU</p></div>
                    <div className="text-right"><p className="text-3xl font-black text-slate-900">{group.totalStock}</p><p className="text-[9px] font-black uppercase text-slate-400">{group.unit}</p></div>
                  </div>
                  {expandedGroups.includes(group.name) && (
                    <div className="p-4 bg-slate-50/50 space-y-3">
                      {group.items.map((item: any) => (
                        <div key={item.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 flex justify-between items-center shadow-sm">
                          <div><p className="text-[10px] font-mono font-bold text-slate-400">{item.sku_15_digits}</p><p className="font-black text-slate-800 text-xl">{item.current_stock} <span className="text-xs">{item.unit}</span></p></div>
                          <button onClick={() => { setEditingProduct(item); setIsEditModalOpen(true); }} className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Edit3 size={16}/></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* --- MODAL: ADD PRODUCT (หน้าต่างเพิ่มสินค้าใหม่) --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[4rem] overflow-hidden shadow-2xl p-10 animate-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-8"><h3 className="text-2xl font-black italic uppercase">Add New Product</h3><button onClick={() => setIsAddModalOpen(false)}><X/></button></div>
            <form onSubmit={handleAddManual} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><label className="text-[10px] font-black uppercase text-slate-400 ml-2">ชื่อสินค้าหลัก</label><input type="text" required className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} placeholder="ตัวอย่าง: Strip (เศษ)" /></div>
                <div><label className="text-[10px] font-black uppercase text-slate-400 ml-2">ตัวย่อ (Prefix)</label><input type="text" required className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-black uppercase" value={newProduct.prefix} onChange={e => setNewProduct({...newProduct, prefix: e.target.value})} placeholder="STU" /></div>
                <div><label className="text-[10px] font-black uppercase text-slate-400 ml-2">หน่วยนับ</label><input type="text" required className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold" value={newProduct.unit} onChange={e => setNewProduct({...newProduct, unit: e.target.value})} /></div>
                <div><label className="text-[10px] font-black uppercase text-slate-400 ml-2">กว้าง (cm)</label><input type="number" required className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold" value={newProduct.width} onChange={e => setNewProduct({...newProduct, width: e.target.value})} /></div>
                <div><label className="text-[10px] font-black uppercase text-slate-400 ml-2">ยาว (cm)</label><input type="number" required className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold" value={newProduct.length} onChange={e => setNewProduct({...newProduct, length: e.target.value})} /></div>
                <div><label className="text-[10px] font-black uppercase text-slate-400 ml-2">วันที่รับ (YYMMDD)</label><input type="text" required className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold" value={newProduct.received_date} onChange={e => setNewProduct({...newProduct, received_date: e.target.value})} placeholder="240606" /></div>
                <div><label className="text-[10px] font-black uppercase text-slate-400 ml-2">สต๊อกเริ่มต้น</label><input type="number" required className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-black text-blue-600" value={newProduct.current_stock} onChange={e => setNewProduct({...newProduct, current_stock: Number(e.target.value)})} /></div>
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black shadow-xl shadow-blue-200">บันทึกและสร้าง SKU</button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: EDIT PRODUCT (แก้ไขสินค้าเดิม) --- */}
      {isEditModalOpen && editingProduct && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[4rem] overflow-hidden shadow-2xl p-10 space-y-8">
            <div className="flex justify-between items-center"><h3 className="text-2xl font-black italic uppercase">Edit Item</h3><button onClick={() => setIsEditModalOpen(false)}><X/></button></div>
            <div className="space-y-6">
                <div><label className="text-[10px] font-black text-slate-400 uppercase ml-2 block mb-1">ชื่อสินค้า</label><input type="text" className="w-full bg-slate-50 p-5 rounded-[1.5rem] outline-none font-bold text-slate-800" value={editingProduct.name} onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})} /></div>
                <div className="bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100"><label className="text-[10px] font-black text-blue-400 uppercase block mb-2 italic underline">ยอดสต๊อกปัจจุบัน</label><input type="number" className="w-full bg-transparent outline-none font-black text-4xl text-blue-600" value={editingProduct.current_stock} onChange={(e) => setEditingProduct({...editingProduct, current_stock: Number(e.target.value)})} /></div>
            </div>
            <button onClick={async () => {
                const { error } = await supabase.from('products').update({ name: editingProduct.name, current_stock: Number(editingProduct.current_stock) }).eq('id', editingProduct.id);
                if (!error) { alert("✅ บันทึกสำเร็จ"); setIsEditModalOpen(false); fetchData(); }
            }} className="w-full bg-blue-600 text-white py-6 rounded-[2.5rem] font-black shadow-xl shadow-blue-200">SAVE CHANGES</button>
          </div>
        </div>
      )}
    </div>
  )
}
