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
  const [newSettingVal, setNewSettingVal] = useState('')

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

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const { data: p } = await supabase.from('products').select('*').order('name')
    const { data: t } = await supabase.from('transactions').select('*, products(name, unit, sku_15_digits)').order('created_at', { ascending: false })
    const { data: u } = await supabase.from('profiles').select('*').order('role')
    
    // Fetch Master Settings
    const { data: mName } = await supabase.from('settings_product_names').select('*').order('name')
    const { data: mPre } = await supabase.from('settings_prefixes').select('*').order('prefix')
    const { data: mUni } = await supabase.from('settings_units').select('*').order('unit')

    if (p) setProducts(p)
    if (t) setTransactions(t)
    if (u) setProfiles(u)
    if (mName) setMasterNames(mName)
    if (mPre) setMasterPrefixes(mPre)
    if (mUni) setMasterUnits(mUni)
    setLoading(false)
  }

  useEffect(() => {
    setIsClient(true);
    fetchData();
  }, [])

  // ฟังก์ชันสร้าง SKU (กฎเดิม: กว้าง/ยาวเต็ม, หนา 2 หลักแรก)
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

  // --- ฟังก์ชันจัดการ Setting ---
  const addMasterData = async (table: string, field: string) => {
    if (!newSettingVal) return;
    const { error } = await supabase.from(table).insert([{ [field]: newSettingVal }]);
    if (error) alert("ซ้ำหรือผิดพลาด: " + error.message);
    else { setNewSettingVal(''); fetchData(); }
  }

  const deleteMasterData = async (table: string, id: string) => {
    if (!confirm("ยืนยันการลบ?")) return;
    await supabase.from(table).delete().eq('id', id);
    fetchData();
  }

  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault();
    const sku = generateSKU(newProduct);
    const { error } = await supabase.from('products').insert([{ ...newProduct, sku_15_digits: sku, current_stock: Number(newProduct.current_stock) }]);
    if (error) alert("❌ ผิดพลาด: " + error.message);
    else { alert("✅ เพิ่มสำเร็จ!"); setIsAddModalOpen(false); fetchData(); }
  };

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
            { id: 'users', label: 'จัดการผู้ใช้งาน', icon: Users },
            { id: 'settings', label: 'ตั้งค่าระบบ', icon: Settings }, // เมนูใหม่
          ].map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex items-center gap-4 px-6 py-4 rounded-[1.8rem] text-sm font-bold transition-all shrink-0 ${activeTab === item.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/30' : 'text-slate-400 hover:bg-white/5'}`}>
              <item.icon size={20} /> {item.label}
            </button>
          ))}
        </div>
        <button onClick={handleLogout} className="flex items-center gap-4 px-6 py-4 rounded-[1.8rem] text-sm font-bold text-red-400 hover:bg-red-500/10 mt-auto"><LogOut size={20} /> ออกจากระบบ</button>
      </nav>

      <main className="flex-1 overflow-y-auto p-4 lg:p-10 pb-24">
        
        {/* --- TAB: SETTINGS (หน้าจัดการ Master Data) --- */}
        {activeTab === 'settings' && (
          <div className="space-y-8 animate-in fade-in">
            <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900">System Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* จัดการชื่อสินค้าหลัก */}
              <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200">
                <h4 className="font-black uppercase text-sm mb-4 text-blue-600">ชื่อสินค้าหลัก</h4>
                <div className="flex gap-2 mb-4">
                  <input type="text" className="flex-1 bg-slate-50 p-3 rounded-xl text-sm outline-none border focus:border-blue-500" placeholder="เพิ่มชื่อสินค้า..." value={activeTab === 'settings' ? newSettingVal : ''} onChange={e => setNewSettingVal(e.target.value)} />
                  <button onClick={() => addMasterData('settings_product_names', 'name')} className="bg-blue-600 text-white p-3 rounded-xl"><Plus size={18}/></button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {masterNames.map(item => (
                    <div key={item.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl text-sm font-bold">
                      {item.name}
                      <button onClick={() => deleteMasterData('settings_product_names', item.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                    </div>
                  ))}
                </div>
              </div>

              {/* จัดการตัวย่อ Prefix */}
              <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200">
                <h4 className="font-black uppercase text-sm mb-4 text-blue-600">ตัวย่อสินค้า (Prefix)</h4>
                <div className="flex gap-2 mb-4">
                  <input type="text" className="flex-1 bg-slate-50 p-3 rounded-xl text-sm outline-none border focus:border-blue-500" placeholder="เช่น STU..." maxLength={3} value={newSettingVal} onChange={e => setNewSettingVal(e.target.value)} />
                  <button onClick={() => addMasterData('settings_prefixes', 'prefix')} className="bg-blue-600 text-white p-3 rounded-xl"><Plus size={18}/></button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {masterPrefixes.map(item => (
                    <div key={item.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl text-sm font-black text-blue-600">
                      {item.prefix}
                      <button onClick={() => deleteMasterData('settings_prefixes', item.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                    </div>
                  ))}
                </div>
              </div>

              {/* จัดการหน่วยนับ */}
              <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200">
                <h4 className="font-black uppercase text-sm mb-4 text-blue-600">หน่วยนับ</h4>
                <div className="flex gap-2 mb-4">
                  <input type="text" className="flex-1 bg-slate-50 p-3 rounded-xl text-sm outline-none border focus:border-blue-500" placeholder="เช่น เส้น, แผ่น..." value={newSettingVal} onChange={e => setNewSettingVal(e.target.value)} />
                  <button onClick={() => addMasterData('settings_units', 'unit')} className="bg-blue-600 text-white p-3 rounded-xl"><Plus size={18}/></button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {masterUnits.map(item => (
                    <div key={item.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl text-sm font-bold">
                      {item.unit}
                      <button onClick={() => deleteMasterData('settings_units', item.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB: DASHBOARD & INVENTORY (เหมือนเดิม) */}
        {/* ... (ยึดตามโค้ดเดิมของพี่ได้เลย) ... */}
        {activeTab === 'inventory' && (
           <div className="space-y-8">
              <div className="flex justify-between items-end"><h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900">สต๊อกสินค้า</h2><button onClick={() => setIsAddModalOpen(true)} className="bg-blue-600 text-white px-8 py-4 rounded-[1.5rem] font-black uppercase text-[10px] shadow-lg hover:bg-blue-700 transition-all"><Plus size={16} className="inline mr-2"/> เพิ่มสินค้าใหม่</button></div>
              {/* List สินค้า... */}
           </div>
        )}
      </main>

      {/* --- MODAL: ADD / EDIT (ปรับเป็น DROPDOWN ทั้งหมด!) --- */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[4rem] shadow-2xl p-10 max-h-[90vh] overflow-y-auto text-slate-800 font-sans">
            <div className="flex justify-between items-center mb-8"><h3 className="text-2xl font-black italic uppercase leading-none">{isAddModalOpen ? 'เพิ่มสินค้าใหม่' : 'แก้ไขข้อมูล'}</h3><button onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} className="p-2 bg-slate-50 rounded-full text-slate-800"><X/></button></div>
            
            <form onSubmit={isAddModalOpen ? handleAddManual : async (e) => { e.preventDefault(); /* handleUpdate... */ }} className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                
                {/* 1. เลือกชื่อสินค้าหลัก (Dropdown) */}
                <div className="col-span-full">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2 font-bold">ชื่อสินค้าหลัก</label>
                  <select required className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold cursor-pointer border focus:border-blue-500" value={isAddModalOpen ? newProduct.name : editingProduct.name} onChange={e => isAddModalOpen ? setNewProduct({...newProduct, name: e.target.value}) : setEditingProduct({...editingProduct, name: e.target.value})}>
                    <option value="">-- เลือกชื่อสินค้า --</option>
                    {masterNames.map(opt => <option key={opt.id} value={opt.name}>{opt.name}</option>)}
                  </select>
                </div>

                {/* 2. เลือกตัวย่อ Prefix (Dropdown) */}
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2 font-bold">ตัวย่อ (Prefix)</label>
                  <select required className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-black text-blue-600 uppercase cursor-pointer border focus:border-blue-500" value={isAddModalOpen ? newProduct.prefix : editingProduct.prefix} onChange={e => isAddModalOpen ? setNewProduct({...newProduct, prefix: e.target.value}) : setEditingProduct({...editingProduct, prefix: e.target.value})}>
                    <option value="">-- PREFIX --</option>
                    {masterPrefixes.map(opt => <option key={opt.id} value={opt.prefix}>{opt.prefix}</option>)}
                  </select>
                </div>

                <div><label className="text-[10px] font-black uppercase text-slate-400 ml-2 font-bold italic">กว้าง (mm)</label><input type="number" required className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold" value={isAddModalOpen ? newProduct.width : editingProduct.width} onChange={e => isAddModalOpen ? setNewProduct({...newProduct, width: e.target.value}) : setEditingProduct({...editingProduct, width: e.target.value})} /></div>
                <div><label className="text-[10px] font-black uppercase text-slate-400 ml-2 font-black italic text-orange-600 underline">หนา (mm)</label><input type="number" required className="w-full bg-orange-50 p-4 rounded-2xl outline-none font-black text-orange-700" value={isAddModalOpen ? newProduct.height : editingProduct.height} onChange={e => isAddModalOpen ? setNewProduct({...newProduct, height: e.target.value}) : setEditingProduct({...editingProduct, height: e.target.value})} /></div>
                <div><label className="text-[10px] font-black uppercase text-slate-400 ml-2 font-bold italic text-blue-600 underline">ยาว (mm)</label><input type="number" required className="w-full bg-blue-50/30 p-4 rounded-2xl outline-none font-bold" value={isAddModalOpen ? newProduct.length : editingProduct.length} onChange={e => isAddModalOpen ? setNewProduct({...newProduct, length: e.target.value}) : setEditingProduct({...editingProduct, length: e.target.value})} /></div>
                <div><label className="text-[10px] font-black uppercase text-slate-400 ml-2 font-bold">วันที่รับ (YYMMDD)</label><input type="text" required maxLength={6} className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold" value={isAddModalOpen ? newProduct.received_date : editingProduct.received_date} onChange={e => isAddModalOpen ? setNewProduct({...newProduct, received_date: e.target.value}) : setEditingProduct({...editingProduct, received_date: e.target.value})} /></div>
                
                {/* 3. เลือกหน่วยนับ (Dropdown) */}
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2 font-bold">หน่วยนับ</label>
                  <select required className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold cursor-pointer border focus:border-blue-500" value={isAddModalOpen ? newProduct.unit : editingProduct.unit} onChange={e => isAddModalOpen ? setNewProduct({...newProduct, unit: e.target.value}) : setEditingProduct({...editingProduct, unit: e.target.value})}>
                    <option value="">-- หน่วย --</option>
                    {masterUnits.map(opt => <option key={opt.id} value={opt.unit}>{opt.unit}</option>)}
                  </select>
                </div>

                <div className="bg-blue-50 rounded-2xl p-4 shadow-inner col-span-1"><label className="text-[10px] font-black uppercase text-blue-400 block mb-1">สต๊อกเริ่มต้น</label><input type="number" required className="w-full bg-transparent outline-none font-black text-xl text-blue-600" value={isAddModalOpen ? newProduct.current_stock : editingProduct.current_stock} onChange={e => isAddModalOpen ? setNewProduct({...newProduct, current_stock: Number(e.target.value)}) : setEditingProduct({...editingProduct, current_stock: Number(e.target.value)})} /></div>
              </div>

              <div className="bg-slate-900 p-8 rounded-[2rem] text-center border-2 border-blue-500/30 shadow-2xl">
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic tracking-widest">Preview SKU 15 Digits</p>
                 <p className="text-3xl font-mono font-black text-blue-400 tracking-widest uppercase italic leading-none">{generateSKU(isAddModalOpen ? newProduct : editingProduct)}</p>
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-6 rounded-[2.5rem] font-black shadow-xl uppercase tracking-tighter italic hover:bg-blue-700 active:scale-95 transition-all">บันทึกข้อมูลสินค้า</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
