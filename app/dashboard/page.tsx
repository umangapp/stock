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

  // ตั้งค่าวันที่เริ่มต้นย้อนหลัง 30 วัน เพื่อให้เห็นข้อมูล
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(today)

  // --- 1. ระบบ Logout & Auto Logout ---
  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }, [])

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const resetTimer = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { handleLogout(); }, 15 * 60 * 1000); 
    };
    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keypress', resetTimer);
    resetTimer();
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keypress', resetTimer);
    };
  }, [handleLogout]);

  // --- 2. ฟังก์ชันดึงข้อมูล (Fetch Data) ---
  const fetchData = async () => {
    setLoading(true)
    // ดึงสินค้า
    const { data: p } = await supabase.from('products').select('*').order('name')
    // ดึงธุรกรรมตามช่วงวันที่
    const { data: t } = await supabase.from('transactions')
      .select('*, products(name, unit)')
      .gte('created_at', `${startDate}T00:00:00`)
      .lte('created_at', `${endDate}T23:59:59`)
      .order('created_at', { ascending: false })
    // ดึงโปรไฟล์พนักงาน
    const { data: u } = await supabase.from('profiles').select('*').order('role')
    
    if (p) setProducts(p)
    if (t) setTransactions(t)
    if (u) setProfiles(u)
    setLoading(false)
  }

  useEffect(() => {
    setIsClient(true)
    fetchData()
  }, [startDate, endDate])

  // --- 3. ระบบนำเข้าสินค้า (Import Excel) ---
  const handleImportProducts = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          alert("❌ ไฟล์ว่างเปล่า");
          return;
        }

        const formattedData = data.map((item: any) => ({
          name: item.name,
          sku_15_digits: String(item.sku_15_digits),
          unit: item.unit || 'ชิ้น',
          prefix: item.prefix || '',
          current_stock: Number(item.current_stock) || 0
        }));

        const { error } = await supabase.from('products').insert(formattedData);

        if (error) {
          alert("❌ Error: " + error.message);
        } else {
          alert(`✅ นำเข้าสำเร็จ ${formattedData.length} รายการ`);
          fetchData();
        }
      } catch (err) {
        alert("❌ รูปแบบไฟล์ไม่ถูกต้อง");
      }
    };
    reader.readAsBinaryString(file);
  };

  // --- 4. Logic จัดกลุ่มข้อมูล ---
  const groupedInventory = products.reduce((acc: any, item: any) => {
    if (!acc[item.name]) acc[item.name] = { name: item.name, totalStock: 0, unit: item.unit, items: [] };
    acc[item.name].totalStock += item.current_stock;
    acc[item.name].items.push(item);
    return acc;
  }, {});

  const groupedUserActivity = transactions.reduce((acc: any, t: any) => {
    const user = t.created_by || 'Unknown';
    if (!acc[user]) acc[user] = { name: user, logs: [] };
    acc[user].logs.push(t);
    return acc;
  }, {});

  const historicalSummary = products.map(p => {
    const itemLogs = transactions.filter(t => t.product_id === p.id);
    const received = itemLogs.filter(t => t.type === 'receive').reduce((sum, t) => sum + t.amount, 0);
    const issued = itemLogs.filter(t => t.type === 'issue').reduce((sum, t) => sum + t.amount, 0);
    return { ...p, received, issued, net: received - issued };
  });

  if (!isClient) return null

  return (
    <div className="flex flex-col h-screen bg-gray-50 lg:flex-row overflow-hidden font-sans text-slate-900">
      
      {/* Sidebar */}
      <nav className="w-full lg:w-72 bg-slate-900 text-white p-6 flex lg:flex-col gap-2 overflow-x-auto shrink-0 shadow-2xl z-20">
        <div className="hidden lg:block mb-10 px-2 text-center font-black">
          <h1 className="text-2xl text-blue-400 italic tracking-tighter uppercase">Umang Admin</h1>
          <p className="text-[9px] text-slate-500 uppercase mt-2 tracking-[0.2em]">Inventory System</p>
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
        <button onClick={handleLogout} className="flex items-center gap-4 px-6 py-4 rounded-[1.8rem] text-sm font-bold text-red-400 hover:bg-red-500/10 transition-all mt-auto"><LogOut size={20} /> ออกจากระบบ</button>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 lg:p-10 pb-24">
        
        {/* --- TAB: DASHBOARD --- */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center gap-5">
                <div className="p-5 bg-blue-50 text-blue-600 rounded-[1.5rem]"><Package size={28}/></div>
                <div><p className="text-[10px] font-black text-slate-400 uppercase mb-1">สต๊อกรวม</p><p className="text-4xl font-black">{products.reduce((a, b) => a + b.current_stock, 0)}</p></div>
              </div>
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center gap-5">
                <div className="p-5 bg-green-50 text-green-600 rounded-[1.5rem]"><TrendingUp size={28}/></div>
                <div><p className="text-[10px] font-black text-slate-400 uppercase mb-1">ทำรายการในช่วงวันที่เลือก</p><p className="text-4xl font-black">{transactions.length}</p></div>
              </div>
            </div>

            {/* Activity Feed */}
            <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-8 border-b border-slate-50 font-black text-slate-800 uppercase text-xs tracking-widest bg-slate-50/30">Activity Feed (User Grouped)</div>
              <div className="p-6 space-y-4">
                {Object.values(groupedUserActivity).map((userGroup: any) => (
                  <div key={userGroup.name} className="border border-slate-100 rounded-[2.5rem] overflow-hidden">
                    <div onClick={() => setExpandedUsers(prev => prev.includes(userGroup.name) ? prev.filter(n => n !== userGroup.name) : [...prev, userGroup.name])} className="p-6 bg-white flex items-center justify-between cursor-pointer">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black">{userGroup.name.substring(0,2)}</div>
                        <h4 className="font-black uppercase text-slate-700">{userGroup.name}</h4>
                      </div>
                      {expandedUsers.includes(userGroup.name) ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                    </div>
                    {expandedUsers.includes(userGroup.name) && (
                      <div className="p-4 bg-slate-50/50 space-y-3">
                        {userGroup.logs.map((log: any) => (
                          <div key={log.id} className="bg-white p-6 rounded-[2rem] flex justify-between items-center shadow-sm">
                            <div>
                                <p className="text-lg font-black text-slate-800 uppercase">{log.products?.name}</p>
                                <p className="text-[10px] text-slate-400 font-bold">{new Date(log.created_at).toLocaleString('th-TH')}</p>
                            </div>
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

        {/* --- TAB: INVENTORY (With Import Button) --- */}
        {activeTab === 'inventory' && (
          <div className="space-y-8 animate-in fade-in">
            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
              <div>
                <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">สต๊อกรายสินค้า (Grid)</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">จัดการสต๊อกและนำเข้าข้อมูลสินค้า</p>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <label className="cursor-pointer bg-green-600 text-white px-6 py-4 rounded-[1.5rem] font-black uppercase text-[10px] flex items-center gap-2 shadow-lg shadow-green-100 hover:bg-green-700 transition-all">
                  <Download size={16} className="rotate-180" /> นำเข้า EXCEL
                  <input type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={handleImportProducts} />
                </label>
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input type="text" placeholder="ค้นหาชื่อสินค้า..." className="w-full pl-12 pr-4 py-4 bg-white rounded-[1.5rem] border border-slate-100 shadow-sm outline-none text-sm font-bold" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.values(groupedInventory)
                .filter((g: any) => g.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((group: any) => (
                <div key={group.name} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden h-fit">
                  <div onClick={() => setExpandedGroups(prev => prev.includes(group.name) ? prev.filter(n => n !== group.name) : [...prev, group.name])} className="p-7 cursor-pointer hover:bg-slate-50 transition-all flex justify-between items-center">
                    <div>
                      <h3 className="font-black uppercase text-slate-800 text-lg leading-tight truncate w-40">{group.name}</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Total {group.items.length} SKU</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-black text-slate-900">{group.totalStock}</p>
                      <p className="text-[9px] font-black uppercase text-slate-400">{group.unit}</p>
                    </div>
                  </div>
                  {expandedGroups.includes(group.name) && (
                    <div className="p-4 bg-slate-50/50 space-y-3">
                      {group.items.map((item: any) => (
                        <div key={item.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 flex justify-between items-center shadow-sm">
                          <div>
                              <p className="text-[10px] font-mono font-bold text-slate-400">{item.sku_15_digits}</p>
                              <p className="font-black text-slate-800 text-xl">{item.current_stock} <span className="text-xs">{item.unit}</span></p>
                          </div>
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

        {/* --- TAB: HISTORY & REPORT --- */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-4 bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 items-center">
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-400 uppercase mb-1 ml-2">เริ่มต้น</span>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-slate-50 p-3 rounded-2xl outline-none font-bold text-sm" />
              </div>
              <ArrowRightLeft className="text-slate-200 mt-4" size={20} />
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-400 uppercase mb-1 ml-2">สิ้นสุด</span>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-slate-50 p-3 rounded-2xl outline-none font-bold text-sm" />
              </div>
            </div>
            <div className="bg-white rounded-[3rem] overflow-hidden border border-slate-100 shadow-sm">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400">
                  <tr className="border-b"><th className="px-8 py-6">ชื่อสินค้า</th><th className="px-8 py-6">รับเข้า (+)</th><th className="px-8 py-6">นำออก (-)</th><th className="px-8 py-6">สุทธิ (Net)</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {historicalSummary.filter(p => p.received > 0 || p.issued > 0).map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-6 font-black text-slate-800 uppercase text-sm">{p.name}</td>
                      <td className="px-8 py-6 font-bold text-green-600">+{p.received}</td>
                      <td className="px-8 py-6 font-bold text-red-600">-{p.issued}</td>
                      <td className="px-8 py-6 font-black"><span className={`px-4 py-1.5 rounded-xl ${p.net >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{p.net}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- TAB: USERS --- */}
        {activeTab === 'users' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in">
            {profiles.map((u) => (
              <div key={u.id} className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mb-6 text-slate-400"><User size={24}/></div>
                <h4 className="font-black text-xl text-slate-800 uppercase leading-none">{u.full_name || 'STAFF'}</h4>
                <p className="text-xs font-mono text-slate-400 mt-2 mb-6">{u.email}</p>
                <span className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${u.role === 'admin' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                  {u.role}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* --- TAB: EXPORT --- */}
        {activeTab === 'export' && (
          <div className="max-w-md mx-auto py-20 text-center space-y-6">
            <div className="p-10 bg-slate-900 rounded-[4rem] text-white space-y-8 shadow-2xl">
              <Download size={60} className="mx-auto text-blue-400 opacity-50" />
              <h2 className="text-2xl font-black uppercase italic tracking-tighter">Export Center</h2>
              <div className="grid gap-4">
                <button onClick={() => XLSX.writeFile(XLSX.utils.book_new(), 'report.xlsx')} className="w-full bg-white text-slate-900 py-5 rounded-[1.5rem] font-black uppercase text-xs hover:bg-blue-500 hover:text-white transition-all">สรุปสต๊อกปัจจุบัน</button>
                <button className="w-full bg-white/5 text-white py-5 rounded-[1.5rem] font-black uppercase text-xs border border-white/10 hover:bg-white/10 transition-all">ประวัติทำรายการ</button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* --- MODAL: EDIT PRODUCT --- */}
      {isEditModalOpen && editingProduct && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[4rem] overflow-hidden shadow-2xl p-10 space-y-8">
            <div className="flex justify-between items-center"><h3 className="text-2xl font-black italic uppercase">Edit Item</h3><button onClick={() => setIsEditModalOpen(false)} className="p-2 bg-slate-50 rounded-full"><X size={20}/></button></div>
            <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">ชื่อสินค้า</label>
                  <input type="text" className="w-full bg-slate-50 p-5 rounded-[1.5rem] outline-none font-bold text-slate-800" value={editingProduct.name} onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})} />
                </div>
                <div className="bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100">
                  <label className="text-[10px] font-black text-blue-400 uppercase block mb-2 italic underline">ปรับแก้จำนวนสต๊อก (Current Stock)</label>
                  <input type="number" className="w-full bg-transparent outline-none font-black text-4xl text-blue-600" value={editingProduct.current_stock} onChange={(e) => setEditingProduct({...editingProduct, current_stock: e.target.value})} />
                </div>
            </div>
            <button onClick={async () => {
                const { error } = await supabase.from('products').update({ name: editingProduct.name, current_stock: Number(editingProduct.current_stock) }).eq('id', editingProduct.id);
                if (!error) { alert("✅ อัปเดตข้อมูลสำเร็จ"); setIsEditModalOpen(false); fetchData(); }
            }} className="w-full bg-blue-600 text-white py-6 rounded-[2.5rem] font-black shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-3 active:scale-95">
              <Save size={20} /> SAVE CHANGES
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
