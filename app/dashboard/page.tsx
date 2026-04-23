'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { 
  LayoutDashboard, ClipboardList, Users, Download, Package, 
  Search, ChevronDown, ChevronUp, Edit3, X, Save, LogOut, Plus, QrCode, TrendingUp, User, ArrowRightLeft, Clock
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

  // Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<any>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newProduct, setNewProduct] = useState({
    name: '', prefix: '', width: '', length: '', height: '', received_date: '', unit: 'เส้น', current_stock: 0
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
    const { data: p } = await supabase.from('products').select('*').order('name')
    const { data: t } = await supabase.from('transactions')
      .select('*, products(name, unit, sku_15_digits)')
      .order('created_at', { ascending: false })
    const { data: u } = await supabase.from('profiles').select('*').order('role')
    
    if (p) setProducts(p)
    if (t) setTransactions(t)
    if (u) setProfiles(u)
    setLoading(false)
  }

  useEffect(() => {
    setIsClient(true);
    fetchData();
  }, [])

  // --- 1. ฟังก์ชันสร้าง SKU (กว้าง/ยาวเต็ม, สูง 2 หลักแรก, เติม x) ---
  const generateSKU = (p: any) => {
    if (!p) return 'ERROR';
    const pre = (p.prefix || '').toUpperCase().slice(0, 3);
    const w = String(p.width || '');
    const l = String(p.length || '');
    const h = String(p.height || '').slice(0, 2);
    const dt = String(p.received_date || '').replace(/\s/g, '').slice(0, 6);
    
    const raw = pre + w + l + h + dt;
    return raw.padEnd(15, 'x').slice(0, 15);
  }

  // --- 2. ฟังก์ชันเพิ่มสินค้าใหม่ ---
  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault();
    const sku = generateSKU(newProduct);
    const { error } = await supabase.from('products').insert([{
      ...newProduct,
      sku_15_digits: sku,
      current_stock: Number(newProduct.current_stock)
    }]);
    
    if (error) {
      alert("❌ เพิ่มไม่สำเร็จ: " + error.message);
    } else {
      alert("✅ เพิ่มสำเร็จ!\nSKU: " + sku);
      setIsAddModalOpen(false);
      setNewProduct({ name: '', prefix: '', width: '', length: '', height: '', received_date: '', unit: 'เส้น', current_stock: 0 });
      fetchData();
    }
  };

  // --- 3. ฟังก์ชันแก้ไขสินค้า ---
  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const sku = generateSKU(editingProduct);
    const { error } = await supabase.from('products')
      .update({ 
        ...editingProduct, 
        sku_15_digits: sku, 
        current_stock: Number(editingProduct.current_stock) 
      })
      .eq('id', editingProduct.id);

    if (error) {
      alert("❌ แก้ไขไม่สำเร็จ: " + error.message);
    } else {
      alert("✅ บันทึกการแก้ไขสำเร็จ!\nSKU: " + sku);
      setIsEditModalOpen(false);
      fetchData();
    }
  };

  // --- 4. จัดกลุ่มธุรกรรมตาม User ---
  const groupedByUser = transactions.reduce((acc: any, t: any) => {
    const userName = t.created_by || 'Unknown User';
    if (!acc[userName]) acc[userName] = [];
    acc[userName].push(t);
    return acc;
  }, {});

  if (!isClient) return null;

  return (
    <div className="flex flex-col h-screen bg-gray-100 lg:flex-row overflow-hidden font-sans text-slate-900">
      
      {/* SIDEBAR */}
      <nav className="w-full lg:w-72 bg-slate-900 text-white p-6 flex lg:flex-col gap-2 overflow-x-auto shrink-0 z-20">
        <div className="hidden lg:block mb-10 px-2 text-center font-black italic">
          <h1 className="text-2xl text-blue-400 tracking-tighter uppercase">Umang Admin</h1>
        </div>
        <div className="flex lg:flex-col flex-1 gap-2">
          {[
            { id: 'dashboard', label: 'ภาพรวมระบบ', icon: LayoutDashboard },
            { id: 'inventory', label: 'สต๊อกสินค้า', icon: Package },
            { id: 'go_to_scan', label: 'เครื่องสแกน', icon: QrCode },
            { id: 'history', label: 'รายงานย้อนหลัง', icon: ClipboardList },
            { id: 'users', label: 'จัดการผู้ใช้งาน', icon: Users },
          ].map((item) => (
            <button 
              key={item.id} 
              onClick={() => item.id === 'go_to_scan' ? router.push('/scan') : setActiveTab(item.id)} 
              className={`flex items-center gap-4 px-6 py-4 rounded-[1.8rem] text-sm font-bold transition-all shrink-0 ${activeTab === item.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/30' : 'text-slate-400 hover:bg-white/5'}`}
            >
              <item.icon size={20} /> {item.label}
            </button>
          ))}
        </div>
        <button onClick={handleLogout} className="flex items-center gap-4 px-6 py-4 rounded-[1.8rem] text-sm font-bold text-red-400 hover:bg-red-500/10 mt-auto"><LogOut size={20} /> ออกจากระบบ</button>
      </nav>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto p-4 lg:p-10 pb-24">
        
        {/* --- TAB: DASHBOARD (3-Column Drill-down) --- */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in">
            <header>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">Live Activity Feed</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-2 tracking-widest">ความเคลื่อนไหวแยกตามรายชื่อพนักงาน</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(groupedByUser).map(([userName, logs]: [string, any]) => (
                <div key={userName} className="bg-white rounded-[2.5rem] shadow-md border border-slate-200 overflow-hidden h-fit transition-all hover:shadow-xl">
                  <div 
                    onClick={() => setExpandedUsers(prev => prev.includes(userName) ? prev.filter(u => u !== userName) : [...prev, userName])}
                    className="p-8 cursor-pointer bg-slate-900 text-white flex justify-between items-center"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center font-black text-xl italic uppercase">
                        {userName.substring(0,2)}
                      </div>
                      <div>
                        <h4 className="font-black text-xl uppercase tracking-tight leading-none">{userName}</h4>
                        <p className="text-[10px] font-bold text-blue-400 uppercase mt-1 tracking-widest">{logs.length} รายการ</p>
                      </div>
                    </div>
                    {expandedUsers.includes(userName) ? <ChevronUp size={24}/> : <ChevronDown size={24}/>}
                  </div>

                  {expandedUsers.includes(userName) && (
                    <div className="p-4 bg-slate-100 space-y-4 max-h-[500px] overflow-y-auto">
                      {logs.map((log: any) => (
                        <div key={log.id} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col gap-4">
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Product Name</p>
                              <p className="text-2xl font-black text-slate-900 uppercase leading-none">{log.products?.name}</p>
                            </div>
                            <span className={`text-4xl font-black ${log.type === 'receive' ? 'text-green-600' : 'text-red-600'}`}>
                              {log.type === 'receive' ? '+' : '-'} {log.amount}
                            </span>
                          </div>

                          <div className="h-px bg-slate-100 w-full" />

                          <div className="space-y-3">
                            <div>
                              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1 italic">SKU CODE</p>
                              <p className="text-2xl font-mono font-black text-blue-700 tracking-widest uppercase bg-blue-50 p-3 rounded-xl border border-blue-100">
                                {log.products?.sku_15_digits}
                              </p>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">วันที่</p>
                                <p className="text-lg font-black text-slate-800 tracking-tighter">
                                  {new Date(log.created_at).toLocaleDateString('th-TH')}
                                </p>
                              </div>
                              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-right">
                                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">เวลา</p>
                                <p className="text-lg font-black text-slate-800 tracking-tighter flex items-center justify-end gap-1">
                                  <Clock size={16} className="text-blue-500" />
                                  {new Date(log.created_at).toLocaleTimeString('th-TH')}
                                </p>
                              </div>
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

        {/* --- TAB: INVENTORY (SKU ตัวใหญ่สะใจ) --- */}
        {activeTab === 'inventory' && (
          <div className="space-y-8 animate-in fade-in">
            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
              <div><h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">สต๊อกสินค้า</h2><p className="text-[10px] text-slate-400 font-bold uppercase mt-2 tracking-widest italic">Inventory list (SKU BIG SIZE)</p></div>
              <div className="flex flex-wrap gap-2 w-full md:w-auto">
                <button onClick={() => setIsAddModalOpen(true)} className="bg-blue-600 text-white px-6 py-4 rounded-[1.5rem] font-black uppercase text-[10px] flex items-center gap-2 shadow-lg"><Plus size={16}/> เพิ่มสินค้า</button>
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input type="text" placeholder="ค้นหาชื่อสินค้า..." className="w-full pl-12 pr-4 py-4 bg-white rounded-[1.5rem] border border-slate-200 shadow-sm outline-none text-sm font-bold" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
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
                <div key={group.name} className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden h-fit transition-all hover:border-blue-400">
                  <div onClick={() => setExpandedGroups(prev => prev.includes(group.name) ? prev.filter(n => n !== group.name) : [...prev, group.name])} className="p-7 cursor-pointer hover:bg-slate-50 transition-all flex justify-between items-center text-slate-800">
                    <div><h3 className="font-black uppercase text-xl leading-tight truncate w-40">{group.name}</h3><p className="text-[10px] font-bold text-slate-400 uppercase mt-1 italic">Total {group.items.length} Variants</p></div>
                    <div className="text-right"><p className="text-4xl font-black text-slate-900 leading-none">{group.totalStock}</p><p className="text-[9px] font-black uppercase text-slate-400 mt-1">{group.unit}</p></div>
                  </div>
                  {expandedGroups.includes(group.name) && (
                    <div className="p-4 bg-slate-100 space-y-3">
                      {group.items.map((item: any) => (
                        <div key={item.id} className="bg-white p-6 rounded-[2rem] border border-slate-200 flex justify-between items-center shadow-sm text-slate-800">
                          <div>
                            {/* SKU ตัวใหญ่หนาสีน้ำเงินตามสั่ง */}
                            <p className="text-lg font-mono font-black text-blue-600 tracking-wider mb-1 italic">
                              {item.sku_15_digits}
                            </p>
                            <p className="font-black text-2xl text-slate-900 leading-none">
                              {item.current_stock} <span className="text-xs font-bold opacity-40 uppercase">{item.unit}</span>
                            </p>
                          </div>
                          <button onClick={() => { setEditingProduct({...item}); setIsEditModalOpen(true); }} className="p-3 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"><Edit3 size={18}/></button>
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

      {/* --- MODAL (Add / Edit) --- */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[4rem] shadow-2xl p-10 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black italic uppercase text-slate-800">{isAddModalOpen ? 'เพิ่มสินค้าใหม่' : 'แก้ไขสเปกสินค้า'}</h3>
              <button onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} className="p-2 bg-slate-50 rounded-full text-slate-800"><X/></button>
            </div>
            
            <form onSubmit={isAddModalOpen ? handleAddManual : handleUpdateProduct} className="space-y-6 text-slate-800">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 font-sans">
                <div className="col-span-full"><label className="text-[10px] font-black uppercase text-slate-400 ml-2">ชื่อสินค้าหลัก</label><input type="text" required className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold" value={isAddModalOpen ? newProduct.name : editingProduct.name} onChange={e => isAddModalOpen ? setNewProduct({...newProduct, name: e.target.value}) : setEditingProduct({...editingProduct, name: e.target.value})} /></div>
                <div><label className="text-[10px] font-black uppercase text-slate-400 ml-2">ตัวย่อ (Prefix)</label><input type="text" required maxLength={3} className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-black text-blue-600 uppercase" value={isAddModalOpen ? newProduct.prefix : editingProduct.prefix} onChange={e => isAddModalOpen ? setNewProduct({...newProduct, prefix: e.target.value}) : setEditingProduct({...editingProduct, prefix: e.target.value})} /></div>
                <div><label className="text-[10px] font-black uppercase text-slate-400 ml-2">กว้าง (mm)</label><input type="number" required className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold" value={isAddModalOpen ? newProduct.width : editingProduct.width} onChange={e => isAddModalOpen ? setNewProduct({...newProduct, width: e.target.value}) : setEditingProduct({...editingProduct, width: e.target.value})} /></div>
                <div><label className="text-[10px] font-black uppercase text-slate-400 ml-2">ยาว (mm)</label><input type="number" required className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold" value={isAddModalOpen ? newProduct.length : editingProduct.length} onChange={e => isAddModalOpen ? setNewProduct({...newProduct, length: e.target.value}) : setEditingProduct({...editingProduct, length: e.target.value})} /></div>
                <div><label className="text-[10px] font-black uppercase text-slate-400 ml-2 text-orange-500 font-bold">สูง (mm)</label><input type="number" required className="w-full bg-orange-50 p-4 rounded-2xl outline-none font-bold" value={isAddModalOpen ? newProduct.height : editingProduct.height} onChange={e => isAddModalOpen ? setNewProduct({...newProduct, height: e.target.value}) : setEditingProduct({...editingProduct, height: e.target.value})} /></div>
                <div><label className="text-[10px] font-black uppercase text-slate-400 ml-2">วันที่รับ (YYMMDD)</label><input type="text" required maxLength={6} className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold" value={isAddModalOpen ? newProduct.received_date : editingProduct.received_date} onChange={e => isAddModalOpen ? setNewProduct({...newProduct, received_date: e.target.value}) : setEditingProduct({...editingProduct, received_date: e.target.value})} /></div>
                <div><label className="text-[10px] font-black uppercase text-slate-400 ml-2">หน่วยนับ</label><select className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold cursor-pointer" value={isAddModalOpen ? newProduct.unit : editingProduct.unit} onChange={e => isAddModalOpen ? setNewProduct({...newProduct, unit: e.target.value}) : setEditingProduct({...editingProduct, unit: e.target.value})}>{unitOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></div>
                <div className="bg-blue-50 rounded-2xl p-4"><label className="text-[10px] font-black uppercase text-blue-400 block mb-1">สต๊อกเริ่มต้น</label><input type="number" required className="w-full bg-transparent outline-none font-black text-xl text-blue-600" value={isAddModalOpen ? newProduct.current_stock : editingProduct.current_stock} onChange={e => isAddModalOpen ? setNewProduct({...newProduct, current_stock: Number(e.target.value)}) : setEditingProduct({...editingProduct, current_stock: Number(e.target.value)})} /></div>
              </div>

              <div className="bg-slate-900 p-8 rounded-[2rem] text-center border-2 border-blue-500/30">
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic">Live Preview SKU (Rules: W/L full, H first 2)</p>
                 <p className="text-3xl font-mono font-black text-blue-400 tracking-widest uppercase italic">
                    {generateSKU(isAddModalOpen ? newProduct : editingProduct)}
                 </p>
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-6 rounded-[2.5rem] font-black shadow-xl uppercase tracking-tighter italic hover:bg-blue-700 transition-all active:scale-95">
                 บันทึกข้อมูลสินค้า
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
