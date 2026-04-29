'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { 
  LayoutDashboard, ClipboardList, Users, Download, Package, 
  Search, ChevronDown, ChevronUp, Edit3, X, Save, LogOut, Plus, QrCode, TrendingUp, User, ArrowRightLeft, Clock, Settings, Trash2
} from 'lucide-react'
import * as XLSX from 'xlsx'

export default function AdminDashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [products, setProducts] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  
  // Settings States
  const [masterNames, setMasterNames] = useState<any[]>([])
  const [masterPrefixes, setMasterPrefixes] = useState<any[]>([])
  const [masterUnits, setMasterUnits] = useState<any[]>([])
  
  // --- จุดที่แก้ไข: แยก State ของแต่ละช่องออกจากกัน ---
  const [inputName, setInputName] = useState('')
  const [inputPrefix, setInputPrefix] = useState('')
  const [inputUnit, setInputUnit] = useState('')

  const [loading, setLoading] = useState(true)
  const [isClient, setIsClient] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedGroups, setExpandedGroups] = useState<string[]>([])
  const [expandedUsers, setExpandedUsers] = useState<string[]>([])

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<any>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newProduct, setNewProduct] = useState({
    name: '', prefix: '', width: '', length: '', height: '', received_date: '', unit: '', current_stock: 0
  })

  const unitOptions = ['เส้น', 'แพ็ค', 'พาเลท', 'ถัง', 'แผ่น', 'Kg']
  const todayStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(todayStr)

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: p } = await supabase.from('products').select('*').order('name')
      const { data: t } = await supabase.from('transactions').select('*, products(name, unit, sku_15_digits)').order('created_at', { ascending: false })
      const { data: u } = await supabase.from('profiles').select('*').order('role')
      
      const { data: mName } = await supabase.from('settings_product_names').select('*').order('name')
      const { data: mPre } = await supabase.from('settings_prefixes').select('*').order('prefix')
      const { data: mUni } = await supabase.from('settings_units').select('*').order('unit')

      if (p) setProducts(p)
      if (t) setTransactions(t)
      if (u) setProfiles(u)
      if (mName) setMasterNames(mName)
      if (mPre) setMasterPrefixes(mPre)
      if (mUni) setMasterUnits(mUni)
    } catch (err) {
      console.error("Fetch Error:", err)
    }
    setLoading(false)
  }

  useEffect(() => {
    setIsClient(true);
    fetchData();
  }, [])

  const generateSKU = (p: any) => {
    if (!p) return 'ERROR';
    const pre = (p.prefix || 'XXX').toUpperCase().slice(0, 3);
    const w = String(p.width || '');
    const l = String(p.length || '');
    const h = String(p.height || '').slice(0, 2);
    const dt = String(p.received_date || '').replace(/\s/g, '').slice(0, 6);
    const raw = pre + w + l + h + dt;
    return raw.padEnd(15, 'x').slice(0, 15);
  }

  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault();
    const sku = generateSKU(newProduct);
    const { error } = await supabase.from('products').insert([{ ...newProduct, sku_15_digits: sku, current_stock: Number(newProduct.current_stock) }]);
    if (error) alert("❌ บันทึกไม่สำเร็จ: " + error.message);
    else { alert("✅ เพิ่มสำเร็จ!"); setIsAddModalOpen(false); fetchData(); }
  };

  // --- จุดที่แก้ไข: ปรับฟังก์ชันเพิ่มข้อมูลให้รับค่าโดยตรง ---
  const addMasterData = async (table: string, field: string, value: string, clearFn: Function) => {
    if (!value) return;
    const { error } = await supabase.from(table).insert([{ [field]: value.trim() }]);
    if (error) alert("ข้อมูลซ้ำหรือผิดพลาด");
    else { clearFn(''); fetchData(); }
  }

  const deleteMasterData = async (table: string, id: string) => {
    if (!confirm("ยืนยันการลบข้อมูลนี้?")) return;
    await supabase.from(table).delete().eq('id', id);
    fetchData();
  }

  const groupedByUser = transactions.reduce((acc: any, t: any) => {
    const userName = t.created_by || 'Unknown';
    if (!acc[userName]) acc[userName] = [];
    acc[userName].push(t);
    return acc;
  }, {});

  if (!isClient) return null;

  return (
    <div className="flex flex-col h-screen bg-gray-100 lg:flex-row overflow-hidden font-sans text-slate-900">
      
      {/* SIDEBAR */}
      <nav className="w-full lg:w-72 bg-slate-900 text-white p-6 flex lg:flex-col gap-2 overflow-x-auto shrink-0 z-20 shadow-2xl">
        <div className="hidden lg:block mb-10 px-2 text-center font-black italic">
          <h1 className="text-2xl text-blue-400 tracking-tighter uppercase leading-none">Umang Admin</h1>
        </div>
        <div className="flex lg:flex-col flex-1 gap-2">
          {[
            { id: 'dashboard', label: 'ภาพรวมระบบ', icon: LayoutDashboard },
            { id: 'inventory', label: 'สต๊อกสินค้า', icon: Package },
            { id: 'users', label: 'จัดการผู้ใช้งาน', icon: Users },
            { id: 'settings', label: 'ตั้งค่าระบบ', icon: Settings },
          ].map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex items-center gap-4 px-6 py-4 rounded-[1.8rem] text-sm font-bold transition-all shrink-0 ${activeTab === item.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/30' : 'text-slate-400 hover:bg-white/5'}`}>
              <item.icon size={20} /> {item.label}
            </button>
          ))}
        </div>
        <button onClick={handleLogout} className="flex items-center gap-4 px-6 py-4 rounded-[1.8rem] text-sm font-bold text-red-400 hover:bg-red-500/10 mt-auto"><LogOut size={20} /> ออกจากระบบ</button>
      </nav>

      <main className="flex-1 overflow-y-auto p-4 lg:p-10 pb-24">
        
        {/* --- DASHBOARD TAB (3-COLUMN) --- */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in">
            <h2 className="text-3xl font-black uppercase italic tracking-tighter">Activity Feed</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(groupedByUser).map(([userName, logs]: [string, any]) => (
                <div key={userName} className="bg-white rounded-[2.5rem] shadow-md border border-slate-200 overflow-hidden h-fit transition-all hover:shadow-xl">
                  <div onClick={() => setExpandedUsers(prev => prev.includes(userName) ? prev.filter(u => u !== userName) : [...prev, userName])} className="p-8 cursor-pointer bg-slate-900 text-white flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center font-black text-xl italic uppercase">{userName.substring(0,2)}</div>
                      <h4 className="font-black text-xl uppercase tracking-tight">{userName}</h4>
                    </div>
                    {expandedUsers.includes(userName) ? <ChevronUp size={24}/> : <ChevronDown size={24}/>}
                  </div>
                  {expandedUsers.includes(userName) && (
                    <div className="p-4 bg-slate-100 space-y-4 max-h-[500px] overflow-y-auto">
                      {logs.map((log: any) => (
                        <div key={log.id} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col gap-4 text-slate-900">
                          <div className="flex justify-between items-start">
                            <p className="text-2xl font-black uppercase leading-none">{log.products?.name}</p>
                            <span className={`text-4xl font-black ${log.type === 'receive' ? 'text-green-600' : 'text-red-600'}`}>{log.type === 'receive' ? '+' : '-'} {log.amount}</span>
                          </div>
                          <div className="space-y-3">
                            <p className="text-2xl font-mono font-black text-blue-700 tracking-widest uppercase bg-blue-50 p-3 rounded-xl border border-blue-100">{log.products?.sku_15_digits}</p>
                            <div className="flex justify-between text-lg font-black text-slate-800 uppercase tracking-tighter">
                                <span>{new Date(log.created_at).toLocaleDateString('th-TH')}</span>
                                <span className="flex items-center gap-1"><Clock size={18}/> {new Date(log.created_at).toLocaleTimeString('th-TH')}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- INVENTORY TAB --- */}
        {activeTab === 'inventory' && (
          <div className="space-y-8 animate-in fade-in">
            <div className="flex flex-col md:flex-row justify-between items-end gap-4 text-slate-900">
              <h2 className="text-3xl font-black uppercase italic tracking-tighter leading-none">สต๊อกสินค้า</h2>
              <button onClick={() => setIsAddModalOpen(true)} className="bg-blue-600 text-white px-8 py-4 rounded-[1.5rem] font-black uppercase text-[10px] shadow-lg hover:bg-blue-700 transition-all active:scale-95"><Plus size={16} className="inline mr-2"/> เพิ่มสินค้าใหม่</button>
            </div>
            {/* ... โค้ดส่วนแสดงผลสินค้าเหมือนเดิม ... */}
          </div>
        )}

        {/* --- SETTINGS TAB (จุดที่แก้ไข) --- */}
        {activeTab === 'settings' && (
          <div className="space-y-8 animate-in fade-in">
            <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">System Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-slate-800">
              
              {/* ช่องที่ 1: ชื่อสินค้าหลัก */}
              <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200">
                <h4 className="font-black uppercase text-sm mb-4 text-blue-600 tracking-widest">ชื่อสินค้าหลัก</h4>
                <div className="flex gap-2 mb-4">
                  <input type="text" className="flex-1 bg-slate-50 p-3 rounded-xl text-sm outline-none border focus:border-blue-500 font-bold" 
                    placeholder="เช่น ปะเก็น..." 
                    value={inputName} 
                    onChange={e => setInputName(e.target.value)} />
                  <button onClick={() => addMasterData('settings_product_names', 'name', inputName, setInputName)} className="bg-blue-600 text-white p-3 rounded-xl"><Plus size={18}/></button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {masterNames.map(item => (
                    <div key={item.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl text-sm font-bold">{item.name} <button onClick={() => deleteMasterData('settings_product_names', item.id)} className="text-red-400"><Trash2 size={16}/></button></div>
                  ))}
                </div>
              </div>

              {/* ช่องที่ 2: ตัวย่อ Prefix */}
              <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200">
                <h4 className="font-black uppercase text-sm mb-4 text-blue-600 tracking-widest">ตัวย่อ (Prefix)</h4>
                <div className="flex gap-2 mb-4">
                  <input type="text" className="flex-1 bg-slate-50 p-3 rounded-xl text-sm outline-none border focus:border-blue-500 font-black uppercase" 
                    maxLength={3} placeholder="เช่น STU" 
                    value={inputPrefix} 
                    onChange={e => setInputPrefix(e.target.value)} />
                  <button onClick={() => addMasterData('settings_prefixes', 'prefix', inputPrefix, setInputPrefix)} className="bg-blue-600 text-white p-3 rounded-xl"><Plus size={18}/></button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {masterPrefixes.map(item => (
                    <div key={item.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl text-sm font-black text-blue-600">{item.prefix} <button onClick={() => deleteMasterData('settings_prefixes', item.id)} className="text-red-400"><Trash2 size={16}/></button></div>
                  ))}
                </div>
              </div>

              {/* ช่องที่ 3: หน่วยนับ */}
              <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200">
                <h4 className="font-black uppercase text-sm mb-4 text-blue-600 tracking-widest">หน่วยนับ</h4>
                <div className="flex gap-2 mb-4">
                  <input type="text" className="flex-1 bg-slate-50 p-3 rounded-xl text-sm outline-none border focus:border-blue-500 font-bold" 
                    placeholder="เส้น, Kg..." 
                    value={inputUnit} 
                    onChange={e => setInputUnit(e.target.value)} />
                  <button onClick={() => addMasterData('settings_units', 'unit', inputUnit, setInputUnit)} className="bg-blue-600 text-white p-3 rounded-xl"><Plus size={18}/></button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {masterUnits.map(item => (
                    <div key={item.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl text-sm font-bold">{item.unit} <button onClick={() => deleteMasterData('settings_units', item.id)} className="text-red-400"><Trash2 size={16}/></button></div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}
      </main>

      {/* --- MODAL (ADD / EDIT) --- */}
      {/* ... โค้ด Modal ส่วนที่เหลือเหมือนเดิม ... */}
      
    </div>
  )
}
