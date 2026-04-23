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
      timer = setTimeout(() => { handleLogout(); }, 15 * 60 * 1000); // 15 นาที
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

  // --- 2. ดึงข้อมูล ---
  useEffect(() => {
    setIsClient(true)
    fetchData()
  }, [startDate, endDate])

  const fetchData = async () => {
    setLoading(true)
    const { data: p } = await supabase.from('products').select('*').order('name')
    const { data: t } = await supabase.from('transactions')
      .select('*, products(name, unit)')
      .gte('created_at', `${startDate}T00:00:00`)
      .lte('created_at', `${endDate}T23:59:59`)
      .order('created_at', { ascending: false })
    const { data: u } = await supabase.from('profiles').select('*').order('role')
    
    if (p) setProducts(p)
    if (t) setTransactions(t)
    if (u) setProfiles(u)
    setLoading(false)
  }

  // --- 3. Logic จัดกลุ่มข้อมูล ---
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
        <div className="hidden lg:block mb-10 px-2 text-center">
          <h1 className="text-2xl font-black text-blue-400 tracking-tighter italic uppercase">Umang Admin</h1>
          <p className="text-[9px] text-slate-500 font-bold uppercase mt-2 italic">Backend Control</p>
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
                <div><p className="text-[10px] font-black text-slate-400 uppercase mb-1">ทำรายการในช้วงที่เลือก</p><p className="text-4xl font-black">{transactions.length}</p></div>
              </div>
            </div>

            {/* Activity Feed */}
            <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-8 border-b border-slate-50 font-black text-slate-800 uppercase text-xs tracking-widest italic bg-slate-50/30">Live Activity Feed</div>
              <div className="p-6 space-y-4">
                {Object.values(groupedUserActivity).map((userGroup: any) => (
                  <div key={userGroup.name} className="border border-slate-50 rounded-[2.5rem] overflow-hidden">
                    <div onClick={() => setExpandedUsers(prev => prev.includes(userGroup.name) ? prev.filter(n => n !== userGroup.name) : [...prev, userGroup.name])} className="p-6 bg-white flex items-center justify-between cursor-pointer">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black">{userGroup.name.substring(0,2)}</div>
                        <h4 className="font-black uppercase text-slate-700">{userGroup.name}</h4>
                      </div>
                      {expandedUsers.includes(userGroup.name) ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                    </div>
                    {expandedUsers.includes(userGroup.name) && (
                      <div className="p-4 bg-slate-50/50 space-y-2">
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

        {/* --- TAB: INVENTORY --- */}
        {activeTab === 'inventory' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in">
            {Object.values(groupedInventory).map((group: any) => (
              <div key={group.name} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden h-fit">
                <div onClick={() => setExpandedGroups(prev => prev.includes(group.name) ? prev.filter(n => n !== group.name) : [...prev, group.name])} className="p-7 cursor-pointer hover:bg-slate-50 transition-all flex justify-between items-center">
                  <div>
                    <h3 className="font-black uppercase text-slate-800 text-lg leading-tight">{group.name}</h3>
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
        )}

        {/* --- TAB: HISTORY & REPORT --- */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="flex gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-slate-50 p-3 rounded-xl outline-none font-bold text-sm" />
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-slate-50 p-3 rounded-xl outline-none font-bold text-sm" />
            </div>
            <div className="bg-white rounded-[2rem] overflow-hidden border border-slate-100">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400"><tr className="border-b"><th className="px-6 py-4">สินค้า</th><th className="px-6 py-4">รับเข้า</th><th className="px-6 py-4">นำออก</th><th className="px-6 py-4">Net</th></tr></thead>
                <tbody>
                  {historicalSummary.filter(p => p.received > 0 || p.issued > 0).map((p) => (
                    <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/30">
                      <td className="px-6 py-4"><p className="font-black text-slate-800 uppercase">{p.name}</p></td>
                      <td className="px-6 py-4 font-bold text-green-600">+{p.received}</td>
                      <td className="px-6 py-4 font-bold text-red-600">-{p.issued}</td>
                      <td className="px-6 py-4 font-black">{p.net}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- TAB: USERS --- */}
        {activeTab === 'users' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {profiles.map((u) => (
              <div key={u.id} className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
                <h4 className="font-black text-xl text-slate-800 uppercase">{u.full_name || 'Staff'}</h4>
                <p className="text-xs font-mono text-slate-400 mb-6">{u.email}</p>
                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase ${u.role === 'admin' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                  {u.role}
                </span>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* --- MODAL: EDIT PRODUCT --- */}
      {isEditModalOpen && editingProduct && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[4rem] overflow-hidden shadow-2xl p-10 space-y-6">
            <div className="flex justify-between items-center"><h3 className="text-2xl font-black italic uppercase">Edit Item</h3><button onClick={() => setIsEditModalOpen(false)}><X/></button></div>
            <div className="space-y-4">
                <input type="text" className="w-full bg-slate-50 p-5 rounded-2xl outline-none font-bold" value={editingProduct.name} onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})} />
                <div className="bg-blue-50 p-5 rounded-2xl"><label className="text-[10px] font-black text-blue-400 uppercase block mb-1">Adjust Stock</label><input type="number" className="w-full bg-transparent outline-none font-black text-2xl text-blue-600" value={editingProduct.current_stock} onChange={(e) => setEditingProduct({...editingProduct, current_stock: e.target.value})} /></div>
            </div>
            <button onClick={async () => {
                const { error } = await supabase.from('products').update({ name: editingProduct.name, current_stock: Number(editingProduct.current_stock) }).eq('id', editingProduct.id);
                if (!error) { alert("✅ OK"); setIsEditModalOpen(false); fetchData(); }
            }} className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black shadow-xl">SAVE CHANGES</button>
          </div>
        </div>
      )}
    </div>
  )
}
