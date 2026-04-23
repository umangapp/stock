'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { 
  LayoutDashboard, ClipboardList, Users, Download, Package, 
  Search, ChevronDown, ChevronUp, Edit3, X, Save, LogOut, Plus, QrCode, TrendingUp, User, ArrowRightLeft
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
    const { data: t } = await supabase.from('transactions').select('*, products(name, unit)').order('created_at', { ascending: false })
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

  // --- 1. ฟังก์ชันสร้าง SKU (ตัด 0 ท้าย กว้าง/ยาว/สูง และเติม x) ---
  const generateSKU = (p: any) => {
    if (!p) return 'ERROR';
    const pre = (p.prefix || 'XXX').toUpperCase().slice(0, 3);
    
    // ตัดเลข 0 ที่ต่อท้ายออก (เช่น 1800 -> 18)
    const cleanNum = (val: any) => {
      const s = String(val || '').trim();
      if (!s) return '';
      return s.replace(/0+$/, '') || s; 
    };

    const w = cleanNum(p.width);
    const l = cleanNum(p.length);
    const h = cleanNum(p.height);
    const dt = String(p.received_date || '').replace(/\s/g, '').slice(0, 6);
    
    const raw = pre + w + l + h + dt;
    return raw.padEnd(15, 'x').slice(0, 15);
  }

  // --- 2. ระบบ Import จาก Excel ---
  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: 'binary' });
        const data: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        const formatted = data.map(item => {
          const specs = {
            prefix: item['ตัวย่อ (2-3 หลัก)'],
            width: item['กว้าง (mm)'],
            length: item['ยาว (mm)'],
            height: item['สูง (mm)'],
            received_date: item['วันที่รับ (YYMMDD)']
          };
          return {
            name: item['ชื่อสินค้า'],
            sku_15_digits: generateSKU(specs),
            unit: item['หน่วยนับ'] || 'เส้น',
            current_stock: Number(item['สต๊อกเริ่มต้น']) || 0,
            prefix: specs.prefix, width: specs.width, length: specs.length, height: specs.height, received_date: specs.received_date
          }
        });
        const { error } = await supabase.from('products').insert(formatted);
        if (error) alert("❌ บันทึกไม่สำเร็จ: " + error.message);
        else { alert("✅ นำเข้าสำเร็จ!"); fetchData(); }
      } catch (err) { alert("❌ ไฟล์ไม่ถูกต้อง"); }
    };
    reader.readAsBinaryString(file);
  }

  // --- 3. บันทึกเพิ่มสินค้าใหม่ ---
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
      alert("✅ เพิ่มสินค้าสำเร็จ!\nSKU: " + sku);
      setIsAddModalOpen(false);
      setNewProduct({ name: '', prefix: '', width: '', length: '', height: '', received_date: '', unit: 'เส้น', current_stock: 0 });
      fetchData();
    }
  };

  // --- 4. บันทึกแก้ไขสินค้าเดิม ---
  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const sku = generateSKU(editingProduct);
    const { error } = await supabase.from('products')
      .update({ 
        name: editingProduct.name,
        prefix: editingProduct.prefix,
        width: editingProduct.width,
        length: editingProduct.length,
        height: editingProduct.height,
        received_date: editingProduct.received_date,
        unit: editingProduct.unit,
        current_stock: Number(editingProduct.current_stock),
        sku_15_digits: sku 
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

  if (!isClient) return null;

  return (
    <div className="flex flex-col h-screen bg-gray-50 lg:flex-row overflow-hidden font-sans text-slate-900">
      
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
            <button key={item.id} onClick={() => item.id === 'go_to_scan' ? router.push('/scan') : setActiveTab(item.id)} className={`flex items-center gap-4 px-6 py-4 rounded-[1.8rem] text-sm font-bold transition-all shrink-0 ${activeTab === item.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/30' : 'text-slate-400 hover:bg-white/5'}`}>
              <item.icon size={20} /> {item.label}
            </button>
          ))}
        </div>
        <button onClick={handleLogout} className="flex items-center gap-4 px-6 py-4 rounded-[1.8rem] text-sm font-bold text-red-400 hover:bg-red-500/10 mt-auto"><LogOut size={20} /> ออกจากระบบ</button>
      </nav>

      <main className="flex-1 overflow-y-auto p-4 lg:p-10 pb-24">
        
        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center gap-5 text-slate-800">
                <div className="p-5 bg-blue-50 text-blue-600 rounded-[1.5rem]"><Package size={28}/></div>
                <div><p className="text-[10px] font-black text-slate-400 uppercase mb-1">สต๊อกรวม</p><p className="text-4xl font-black">{products.reduce((a, b) => a + b.current_stock, 0)}</p></div>
              </div>
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center gap-5 text-slate-800">
                <div className="p-5 bg-green-50 text-green-600 rounded-[1.5rem]"><TrendingUp size={28}/></div>
                <div><p className="text-[10px] font-black text-slate-400 uppercase mb-1">ธุรกรรมทั้งหมด</p><p className="text-4xl font-black">{transactions.length}</p></div>
              </div>
            </div>
            {/* Live Activity Feed */}
            <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-8 border-b border-slate-50 font-black text-slate-800 uppercase text-xs tracking-widest bg-slate-50/30">Live Activity Feed</div>
                <div className="p-6 space-y-4">
                    {transactions.slice(0, 10).map((log: any) => (
                        <div key={log.id} className="bg-white p-5 rounded-[1.8rem] flex justify-between items-center shadow-sm border border-slate-50 text-slate-800">
                            <div><p className="text-lg font-black uppercase leading-tight">{log.products?.name}</p><p className="text-[9px] text-slate-400 font-bold">{new Date(log.created_at).toLocaleString('th-TH')} | โดย {log.created_by}</p></div>
                            <span className={`text-2xl font-black ${log.type === 'receive' ? 'text-green-600' : 'text-red-600'}`}>{log.type === 'receive' ? '+' : '-'} {log.amount}</span>
                        </div>
                    ))}
                </div>
            </div>
          </div>
        )}

        {/* INVENTORY TAB */}
        {activeTab === 'inventory' && (
          <div className="space-y-8 animate-in fade-in">
            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
              <div><h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900">คลังสินค้า</h2><p className="text-[10px] text-slate-400 font-bold uppercase mt-2">สต๊อกกลุ่มสินค้า (mm.)</p></div>
              <div className="flex flex-wrap gap-2 w-full md:w-auto">
                <button onClick={() => setIsAddModalOpen(true)} className="bg-blue-600 text-white px-6 py-4 rounded-[1.5rem] font-black uppercase text-[10px] flex items-center gap-2 shadow-lg"><Plus size={16}/> เพิ่มสินค้า</button>
                <label className="cursor-pointer bg-green-600 text-white px-6 py-4 rounded-[1.5rem] font-black uppercase text-[10px] flex items-center gap-2 shadow-lg">
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
                  <div onClick={() => setExpandedGroups(prev => prev.includes(group.name) ? prev.filter(n => n !== group.name) : [...prev, group.name])} className="p-7 cursor-pointer hover:bg-slate-50 transition-all flex justify-between items-center text-slate-800">
                    <div><h3 className="font-black uppercase text-lg leading-tight truncate w-32">{group.name}</h3><p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Total {group.items.length} SKU</p></div>
                    <div className="text-right"><p className="text-3xl font-black">{group.totalStock}</p><p className="text-[9px] font-black uppercase text-slate-400">{group.unit}</p></div>
                  </div>
                  {expandedGroups.includes(group.name) && (
                    <div className="p-4 bg-slate-50/50 space-y-3">
                      {group.items.map((item: any) => (
                        <div key={item.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 flex justify-between items-center shadow-sm text-slate-800">
                          <div><p className="text-[10px] font-mono font-black text-blue-600 tracking-tighter italic">{item.sku_15_digits}</p><p className="font-black text-xl">{item.current_stock} <span className="text-xs opacity-50">{item.unit}</span></p></div>
                          <button onClick={() => { setEditingProduct({...item}); setIsEditModalOpen(true); }} className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Edit3 size={16}/></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: HISTORY */}
        {activeTab === 'history' && (
          <div className="space-y-6 animate-in fade-in">
             <div className="flex flex-wrap gap-4 bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 items-center">
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-slate-50 p-3 rounded-2xl outline-none font-bold text-sm text-slate-800" />
                <ArrowRightLeft className="text-slate-200" size={20} />
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-slate-50 p-3 rounded-2xl outline-none font-bold text-sm text-slate-800" />
             </div>
             <div className="bg-white rounded-[3rem] overflow-hidden border border-slate-100 shadow-sm text-slate-800">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 border-b">
                    <tr><th className="px-8 py-6">สินค้า</th><th className="px-8 py-6">รับเข้า (+)</th><th className="px-8 py-6">นำออก (-)</th><th className="px-8 py-6">สุทธิ</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {products.map((p) => {
                        const itemLogs = transactions.filter(t => t.product_id === p.id && t.created_at >= startDate && t.created_at <= `${endDate}T23:59:59`);
                        const received = itemLogs.filter(t => t.type === 'receive').reduce((sum, t) => sum + t.amount, 0);
                        const issued = itemLogs.filter(t => t.type === 'issue').reduce((sum, t) => sum + t.amount, 0);
                        if (received === 0 && issued === 0) return null;
                        return (
                          <tr key={p.id}>
                            <td className="px-8 py-6 font-black uppercase text-sm">{p.name}</td>
                            <td className="px-8 py-6 font-bold text-green-600">+{received}</td>
                            <td className="px-8 py-6 font-bold text-red-600">-{issued}</td>
                            <td className="px-8 py-6 font-black">{received - issued}</td>
                          </tr>
                        );
                    })}
                  </tbody>
                </table>
             </div>
          </div>
        )}

        {/* TAB: USERS */}
        {activeTab === 'users' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in">
            {profiles.map((u) => (
              <div key={u.id} className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 text-slate-800">
                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mb-6 text-slate-400"><User size={24}/></div>
                <h4 className="font-black text-xl uppercase">{u.full_name || 'STAFF'}</h4>
                <p className="text-xs font-mono text-slate-400 mt-2 mb-6">{u.email}</p>
                <span className={`px-4 py-2 rounded-full text-[10px] font-black uppercase ${u.role === 'admin' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>{u.role}</span>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* --- MODAL (ร่วมกันทั้ง Add และ Edit) --- */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[4rem] shadow-2xl p-10 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-8"><h3 className="text-2xl font-black italic uppercase text-slate-800">{isAddModalOpen ? 'เพิ่มสินค้าใหม่' : 'แก้ไขสเปกสินค้า'}</h3><button onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} className="p-2 bg-slate-50 rounded-full text-slate-800"><X/></button></div>
            
            <form onSubmit={isAddModalOpen ? handleAddManual : handleUpdateProduct} className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-slate-800">
                <div className="col-span-full"><label className="text-[10px] font-black uppercase text-slate-400 ml-2">ชื่อสินค้าหลัก</label><input type="text" required className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold" value={isAddModalOpen ? newProduct.name : editingProduct.name} onChange={e => isAddModalOpen ? setNewProduct({...newProduct, name: e.target.value}) : setEditingProduct({...editingProduct, name: e.target.value})} /></div>
                <div><label className="text-[10px] font-black uppercase text-slate-400 ml-2">ตัวย่อ (Prefix)</label><input type="text" required maxLength={3} className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-black text-blue-600 uppercase" value={isAddModalOpen ? newProduct.prefix : editingProduct.prefix} onChange={e => isAddModalOpen ? setNewProduct({...newProduct, prefix: e.target.value}) : setEditingProduct({...editingProduct, prefix: e.target.value})} /></div>
                <div><label className="text-[10px] font-black uppercase text-slate-400 ml-2 italic">กว้าง (mm)</label><input type="number" required className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold" value={isAddModalOpen ? newProduct.width : editingProduct.width} onChange={e => isAddModalOpen ? setNewProduct({...newProduct, width: e.target.value}) : setEditingProduct({...editingProduct, width: e.target.value})} /></div>
                <div><label className="text-[10px] font-black uppercase text-slate-400 ml-2 italic">ยาว (mm)</label><input type="number" required className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold" value={isAddModalOpen ? newProduct.length : editingProduct.length} onChange={e => isAddModalOpen ? setNewProduct({...newProduct, length: e.target.value}) : setEditingProduct({...editingProduct, length: e.target.value})} /></div>
                <div><label className="text-[10px] font-black uppercase text-slate-400 ml-2 italic">สูง (mm)</label><input type="number" required className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold" value={isAddModalOpen ? newProduct.height : editingProduct.height} onChange={e => isAddModalOpen ? setNewProduct({...newProduct, height: e.target.value}) : setEditingProduct({...editingProduct, height: e.target.value})} /></div>
                <div><label className="text-[10px] font-black uppercase text-slate-400 ml-2">วันที่รับ (YYMMDD)</label><input type="text" required maxLength={6} className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold" value={isAddModalOpen ? newProduct.received_date : editingProduct.received_date} onChange={e => isAddModalOpen ? setNewProduct({...newProduct, received_date: e.target.value}) : setEditingProduct({...editingProduct, received_date: e.target.value})} /></div>
                <div><label className="text-[10px] font-black uppercase text-slate-400 ml-2">หน่วยนับ</label><select className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold cursor-pointer" value={isAddModalOpen ? newProduct.unit : editingProduct.unit} onChange={e => isAddModalOpen ? setNewProduct({...newProduct, unit: e.target.value}) : setEditingProduct({...editingProduct, unit: e.target.value})}>{unitOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></div>
                <div className="bg-blue-50 rounded-2xl p-4"><label className="text-[10px] font-black uppercase text-blue-400 block mb-1">สต๊อกปัจจุบัน</label><input type="number" required className="w-full bg-transparent outline-none font-black text-xl text-blue-600" value={isAddModalOpen ? newProduct.current_stock : editingProduct.current_stock} onChange={e => isAddModalOpen ? setNewProduct({...newProduct, current_stock: Number(e.target.value)}) : setEditingProduct({...editingProduct, current_stock: Number(e.target.value)})} /></div>
              </div>

              <div className="bg-slate-900 p-6 rounded-[2rem] text-center border-2 border-blue-500/30">
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 italic">SKU 15 Digits Preview (Strip 0 out)</p>
                 <p className="text-2xl font-mono font-black text-blue-400 tracking-widest uppercase">{generateSKU(isAddModalOpen ? newProduct : editingProduct)}</p>
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-6 rounded-[2.5rem] font-black shadow-xl uppercase tracking-tighter italic hover:bg-blue-700 active:scale-95 transition-all">
                {isAddModalOpen ? 'ยืนยันเพิ่มสินค้าใหม่' : 'บันทึกการแก้ไขข้อมูล'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
