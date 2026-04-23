'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts'
import { 
  LayoutDashboard, ClipboardList, Users, Download, Package, 
  AlertTriangle, TrendingUp, Search, Printer, QrCode, FileText, 
  ChevronDown, ChevronUp, Edit3, X, Save, Calendar, User, ArrowRightLeft, Clock, Trash2, ShieldCheck
} from 'lucide-react'
import * as XLSX from 'xlsx'

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [products, setProducts] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([]) // สำหรับจัดการ User
  const [loading, setLoading] = useState(true)
  const [isClient, setIsClient] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedGroups, setExpandedGroups] = useState<string[]>([])
  const [expandedUsers, setExpandedUsers] = useState<string[]>([])

  // Edit Modal States
  const [editingProduct, setEditingProduct] = useState<any>(null)
  const [editingUser, setEditingUser] = useState<any>(null) // สำหรับแก้สิทธิ์ User
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isUserModalOpen, setIsUserModalOpen] = useState(false)

  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(today)

  useEffect(() => {
    setIsClient(true)
    fetchData()
  }, [startDate, endDate])

  const fetchData = async () => {
    setLoading(true)
    const { data: p } = await supabase.from('products').select('*').order('name')
    const { data: t } = await supabase.from('transactions').select('*, products(name, unit)').gte('created_at', `${startDate}T00:00:00`).lte('created_at', `${endDate}T23:59:59`).order('created_at', { ascending: false })
    const { data: u } = await supabase.from('profiles').select('*').order('role') // ดึงข้อมูลผู้ใช้งาน
    
    if (p && t) {
      setProducts(p)
      setTransactions(t)
      if (u) setProfiles(u)
    }
    setLoading(false)
  }

  // --- Logic Management ---
  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('profiles').update({
      full_name: editingUser.full_name,
      role: editingUser.role
    }).eq('id', editingUser.id);
    
    if (!error) {
      alert("✅ ปรับสิทธิ์ผู้ใช้งานสำเร็จ");
      setIsUserModalOpen(false);
      fetchData();
    }
  };

  const handleDeleteUser = async (id: string) => {
    if(confirm("ยืนยันการลบผู้ใช้งาน? (ข้อมูล Auth จะยังอยู่แต่สิทธิ์ในระบบจะถูกถอน)")) {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if(!error) fetchData();
    }
  }

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

  const toggleGroup = (name: string) => setExpandedGroups(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  const toggleUser = (name: string) => setExpandedUsers(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);

  if (!isClient) return <div className="h-screen flex items-center justify-center font-black text-slate-300">ADMIN INITIALIZING...</div>

  return (
    <div className="flex flex-col h-screen bg-gray-50 lg:flex-row overflow-hidden font-sans text-slate-900">
      
      {/* 1. Sidebar */}
      <nav className="w-full lg:w-72 bg-slate-900 text-white p-6 flex lg:flex-col gap-2 overflow-x-auto shrink-0 shadow-2xl z-20">
        <div className="hidden lg:block mb-10 px-2 text-center">
          <h1 className="text-2xl font-black text-blue-400 tracking-tighter italic uppercase">Umang Admin</h1>
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-2 italic">Backend Control</p>
        </div>
        {[
          { id: 'dashboard', label: 'ภาพรวมระบบ', icon: LayoutDashboard },
          { id: 'inventory', label: 'สต๊อกสินค้า', icon: Package },
          { id: 'history', label: 'รายงานย้อนหลัง', icon: ClipboardList },
          { id: 'users', label: 'จัดการผู้ใช้งาน', icon: ShieldCheck }, // เมนูใหม่
          { id: 'export', label: 'Export', icon: Download },
        ].map((item) => (
          <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex items-center gap-4 px-6 py-4 rounded-[1.8rem] text-sm font-bold transition-all shrink-0 ${activeTab === item.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/30' : 'text-slate-400 hover:bg-white/5'}`}>
            <item.icon size={20} /> {item.label}
          </button>
        ))}
      </nav>

      {/* 2. Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 lg:p-10 pb-24">
        
        {/* --- TAB: DASHBOARD --- */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Stats Cards ... (คงเดิมจากโค้ดก่อนหน้า) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center gap-5">
                    <div className="p-5 bg-blue-50 text-blue-600 rounded-[1.5rem]"><Package size={28}/></div>
                    <div><p className="text-[10px] font-black text-slate-400 uppercase mb-1">สต๊อกรวม</p><p className="text-4xl font-black">{products.reduce((a, b) => a + b.current_stock, 0)}</p></div>
                </div>
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center gap-5">
                    <div className="p-5 bg-green-50 text-green-600 rounded-[1.5rem]"><TrendingUp size={28}/></div>
                    <div><p className="text-[10px] font-black text-slate-400 uppercase mb-1">ทำรายการวันนี้</p><p className="text-4xl font-black">{transactions.filter(t => t.created_at.startsWith(today)).length}</p></div>
                </div>
            </div>

            {/* Live Activity Feed */}
            <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                    <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest italic">Live Activity (User Grouped)</h3>
                </div>
                <div className="p-6 space-y-4">
                    {Object.values(groupedUserActivity).map((userGroup: any) => (
                        <div key={userGroup.name} className="border border-slate-50 rounded-[2.5rem] overflow-hidden">
                            <div onClick={() => toggleUser(userGroup.name)} className="p-6 bg-white flex items-center justify-between cursor-pointer">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black">{userGroup.name.substring(0,2)}</div>
                                    <h4 className="font-black uppercase text-slate-700">{userGroup.name}</h4>
                                </div>
                                {expandedUsers.includes(userGroup.name) ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                            </div>
                            {expandedUsers.includes(userGroup.name) && (
                                <div className="p-4 bg-slate-50/50 space-y-2">
                                    {userGroup.logs.slice(0,5).map((log: any) => (
                                        <div key={log.id} className="bg-white p-4 rounded-2xl flex justify-between items-center shadow-sm">
                                            <span className="text-sm font-bold text-slate-600 uppercase">{log.products?.name}</span>
                                            <span className={`font-black ${log.type === 'receive' ? 'text-green-600' : 'text-red-600'}`}>{log.type === 'receive' ? '+' : '-'} {log.amount}</span>
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

        {/* --- TAB: MANAGE USERS (เพิ่มใหม่) --- */}
        {activeTab === 'users' && (
          <div className="space-y-8 animate-in slide-in-from-right-5 duration-500">
            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-3xl font-black uppercase italic tracking-tighter">User Management</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">จัดการสิทธิ์พนักงาน (Backend vs Frontend)</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {profiles.map((u) => (
                <div key={u.id} className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col gap-6 relative group overflow-hidden">
                  <div className="flex justify-between items-start">
                    <div className={`p-4 rounded-2xl ${u.role === 'admin' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-slate-100 text-slate-400'}`}>
                      <User size={24} />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setEditingUser(u); setIsUserModalOpen(true); }} className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all"><Edit3 size={16}/></button>
                      <button onClick={() => handleDeleteUser(u.id)} className="p-2.5 bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16}/></button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-black text-slate-800 uppercase leading-none">{u.full_name || 'พนักงานใหม่'}</h3>
                    <p className="text-[11px] font-mono text-slate-400 mt-2">{u.email}</p>
                  </div>

                  <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                    <div>
                      <p className="text-[9px] text-slate-400 font-black uppercase mb-1">ระดับสิทธิ์</p>
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${u.role === 'admin' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                        {u.role === 'admin' ? 'Backend (Admin)' : 'Frontend (Scan Only)'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- TAB: INVENTORY (3-Col Grid) --- */}
        {activeTab === 'inventory' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
                {Object.values(groupedInventory).map((group: any) => (
                    <div key={group.name} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                        <div onClick={() => toggleGroup(group.name)} className="p-7 cursor-pointer hover:bg-slate-50 transition-all flex justify-between items-center">
                            <div>
                                <h3 className="font-black uppercase text-slate-800 text-lg leading-tight">{group.name}</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">รวม {group.items.length} รายการ</p>
                            </div>
                            <div className="text-right">
                                <p className="text-3xl font-black text-slate-900">{group.totalStock}</p>
                                <p className="text-[9px] font-black uppercase text-slate-400">{group.unit}</p>
                            </div>
                        </div>
                        {expandedGroups.includes(group.name) && (
                            <div className="p-4 bg-slate-50/50 space-y-3">
                                {group.items.map((item: any) => (
                                    <div key={item.id} className="bg-white p-4 rounded-3xl border border-slate-100 flex justify-between items-center shadow-sm">
                                        <div className="text-xs font-bold text-slate-500">{item.sku_15_digits}</div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-black text-slate-800">{item.current_stock}</span>
                                            <button onClick={() => { setEditingProduct(item); setIsEditModalOpen(true); }} className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Edit3 size={12}/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        )}
      </main>

      {/* --- MODAL: EDIT USER ROLE --- */}
      {isUserModalOpen && editingUser && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[4rem] overflow-hidden shadow-2xl animate-in zoom-in duration-300">
            <div className="p-10 bg-slate-900 text-white flex justify-between items-center">
              <div><h3 className="text-2xl font-black uppercase italic tracking-tighter">Manage Permission</h3><p className="text-[9px] text-slate-500 font-bold uppercase mt-2">Update Employee Access</p></div>
              <button onClick={() => setIsUserModalOpen(false)} className="p-4 bg-white/5 rounded-full"><X size={20}/></button>
            </div>
            <form onSubmit={handleUpdateRole} className="p-10 space-y-8">
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-3 mb-2 block">ชื่อพนักงาน (Display Name)</label>
                  <input type="text" className="w-full bg-slate-50 p-5 rounded-[1.5rem] outline-none font-bold" value={editingUser.full_name || ''} onChange={(e) => setEditingUser({...editingUser, full_name: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-3 mb-2 block">ระดับสิทธิ์ (Role)</label>
                  <select 
                    className="w-full bg-slate-50 p-5 rounded-[1.5rem] outline-none font-black text-blue-600 appearance-none"
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({...editingUser, role: e.target.value})}
                  >
                    <option value="staff">Frontend (Scan Only)</option>
                    <option value="admin">Backend (Admin + Dashboard)</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-6 rounded-[2.2rem] font-black shadow-2xl hover:bg-blue-700 transition-all flex items-center justify-center gap-3"><Save size={22} /> UPDATE ACCESS</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
