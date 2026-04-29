'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
// 🌟 นำเข้าสูตรคำนวณจากไฟล์กลางที่สร้างไว้ในข้อ 1
import { generateSKU } from '@/lib/skuHelper'
import { 
  LayoutDashboard, ClipboardList, Users, Download, Package, 
  Search, ChevronDown, ChevronUp, Edit3, X, Save, LogOut, Plus, QrCode, Settings, Trash2, Clock
} from 'lucide-react'

export default function AdminDashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [products, setProducts] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  
  // Master Data States (ดึงจากหน้า Setting)
  const [masterProducts, setMasterProducts] = useState<any[]>([])
  const [masterUnits, setMasterUnits] = useState<any[]>([])
  
  // Input สำหรับหน้า Setting (แยก State ชัดเจน)
  const [inputName, setInputName] = useState('')
  const [inputPrefix, setInputPrefix] = useState('')
  const [inputUnit, setInputUnit] = useState('')

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
    name: '', prefix: '', width: '', length: '', height: '', received_date: '', unit: '', current_stock: 0
  })

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
      const { data: mProd } = await supabase.from('settings_product_master').select('*').order('name')
      const { data: mUni } = await supabase.from('settings_units').select('*').order('unit')

      if (p) setProducts(p)
      if (t) setTransactions(t)
      if (u) setProfiles(u)
      if (mProd) setMasterProducts(mProd)
      if (mUni) setMasterUnits(mUni)
    } catch (err) { console.error("Fetch error:", err) }
    setLoading(false)
  }

  useEffect(() => {
    setIsClient(true);
    fetchData();
  }, [])

  // --- ระบบจัดการ Master Data ---
  const addProductMaster = async () => {
    if (!inputName || !inputPrefix) return;
    const { error } = await supabase.from('settings_product_master').insert([{ name: inputName.trim(), prefix: inputPrefix.trim().toUpperCase() }]);
    if (error) alert("เกิดข้อผิดพลาด: " + error.message);
    else { setInputName(''); setInputPrefix(''); fetchData(); }
  }

  const addUnitMaster = async () => {
    if (!inputUnit) return;
    const { error } = await supabase.from('settings_units').insert([{ unit: inputUnit.trim() }]);
    if (error) alert("เกิดข้อผิดพลาด: " + error.message);
    else { setInputUnit(''); fetchData(); }
  }

  const deleteMaster = async (table: string, id: string) => {
    if (confirm("ยืนยันการลบข้อมูลมาสเตอร์?")) { await supabase.from(table).delete().eq('id', id); fetchData(); }
  }

  // --- Logic การเลือกชื่อสินค้า (Auto-fill Prefix) ---
  const handleNameSelect = (name: string, isAdd: boolean) => {
    const matched = masterProducts.find(m => m.name === name);
    if (isAdd) setNewProduct({ ...newProduct, name, prefix: matched ? matched.prefix : '' });
    else setEditingProduct({ ...editingProduct, name, prefix: matched ? matched.prefix : '' });
  }

  // --- บันทึกสินค้า (เรียกใช้ generateSKU จาก lib) ---
  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault();
    const sku = generateSKU(newProduct); // 🌟 เรียกใช้สูตรจากไฟล์กลาง
    const { error } = await supabase.from('products').insert([{ ...newProduct, sku_15_digits: sku, current_stock: Number(newProduct.current_stock) }]);
    if (error) alert("❌ เพิ่มไม่สำเร็จ");
    else { alert("✅ เพิ่มสำเร็จ!\nSKU: " + sku); setIsAddModalOpen(false); fetchData(); }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const sku = generateSKU(editingProduct); // 🌟 เรียกใช้สูตรจากไฟล์กลาง
    const { error } = await supabase.from('products').update({ ...editingProduct, sku_15_digits: sku, current_stock: Number(editingProduct.current_stock) }).eq('id', editingProduct.id);
    if (error) alert("❌ แก้ไขไม่สำเร็จ");
    else { alert("✅ บันทึกสำเร็จ!"); setIsEditModalOpen(false); fetchData(); }
  };

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
      <nav className="w-full lg:w-72 bg-slate-900 text-white p-6 flex lg:flex-col gap-2 overflow-x-auto shrink-0 z-20">
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
        
        {/* --- TAB: DASHBOARD --- */}
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
                    <div className="p-4 bg-slate-50 space-y-4 max-h-[500px] overflow-y-auto">
                      {logs.map((log: any) => (
                        <div key={log.id} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col gap-4 text-slate-800">
                          <div className="flex justify-between items-start">
                            <p className="text-2xl font-black uppercase leading-none">{log.products?.name}</p>
                            <span className={`text-4xl font-black ${log.type === 'receive' ? 'text-green-600' : 'text-red-600'}`}>{log.type === 'receive' ? '+' : '-'} {log.amount}</span>
                          </div>
                          <div className="space-y-3">
                            <p className="text-2xl font-mono font-black text-blue-700 tracking-widest uppercase bg-blue-50 p-3 rounded-xl border border-blue-100">{log.products?.sku_15_digits}</p>
                            <div className="flex justify-between text-lg font-black text-slate-500 uppercase italic">
                                <span>{new Date(log.created_at).toLocaleDateString('th-TH')}</span>
                                <span className="flex items-center gap-1"><Clock size={16}/> {new Date(log.created_at).toLocaleTimeString('th-TH')}</span>
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

        {/* --- TAB: SETTINGS --- */}
        {activeTab === 'settings' && (
          <div className="space-y-8 animate-in fade-in">
            <h2 className="text-3xl font-black uppercase italic tracking-tighter">System Settings</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-slate-800">
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                <h4 className="font-black uppercase text-sm mb-6 text-blue-600 tracking-widest">มาสเตอร์สินค้า (ชื่อ + ตัวย่อ)</h4>
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                  <input type="text" className="flex-[2] bg-slate-50 p-4 rounded-2xl outline-none border focus:border-blue-500 font-bold" placeholder="ชื่อสินค้าหลัก" value={inputName} onChange={e => setInputName(e.target.value)} />
                  <input type="text" className="flex-1 bg-slate-50 p-4 rounded-2xl outline-none border focus:border-blue-500 font-black uppercase text-blue-600" placeholder="ตัวย่อ" maxLength={3} value={inputPrefix} onChange={e => setInputPrefix(e.target.value)} />
                  <button onClick={addProductMaster} className="bg-blue-600 text-white p-4 rounded-2xl shadow-lg hover:bg-blue-700 transition-all active:scale-95"><Plus/></button>
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                  {masterProducts.map(item => (
                    <div key={item.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 font-bold">
                      <span>{item.name} <span className="text-blue-600 ml-2">[{item.prefix}]</span></span>
                      <button onClick={() => deleteMaster('settings_product_master', item.id)} className="text-red-400 p-2"><Trash2 size={18}/></button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                <h4 className="font-black uppercase text-sm mb-6 text-blue-600 tracking-widest">จัดการหน่วยนับ</h4>
                <div className="flex gap-3 mb-6">
                  <input type="text" className="flex-1 bg-slate-50 p-4 rounded-2xl outline-none border focus:border-blue-500 font-bold" placeholder="เพิ่มหน่วย (เช่น เส้น, ถัง)" value={inputUnit} onChange={e => setInputUnit(e.target.value)} />
                  <button onClick={addUnitMaster} className="bg-blue-600 text-white p-4 rounded-2xl shadow-lg hover:bg-blue-700 transition-all active:scale-95"><Plus/></button>
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                  {masterUnits.map(item => (
                    <div key={item.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 font-black">
                      <span>{item.unit}</span>
                      <button onClick={() => deleteMaster('settings_units', item.id)} className="text-red-400 p-2"><Trash2 size={18}/></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB: INVENTORY --- */}
        {activeTab === 'inventory' && (
          <div className="space-y-8 animate-in fade-in text-slate-900">
            <div className="flex justify-between items-end">
              <h2 className="text-3xl font-black uppercase italic tracking-tighter leading-none">สต๊อกสินค้า</h2>
              <button onClick={() => setIsAddModalOpen(true)} className="bg-blue-600 text-white px-8 py-4 rounded-[1.5rem] font-black uppercase text-[10px] shadow-lg hover:bg-blue-700 transition-all active:scale-95"><Plus size={16} className="inline mr-2"/> เพิ่มสินค้าใหม่</button>
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
                    <div><h3 className="font-black uppercase text-xl truncate w-32">{group.name}</h3><p className="text-[10px] font-bold text-slate-400 uppercase mt-1 italic tracking-widest">Total {group.items.length} SKU</p></div>
                    <div className="text-right"><p className="text-4xl font-black text-slate-900 leading-none">{group.totalStock}</p><p className="text-[10px] font-black uppercase text-slate-400 mt-1">{group.unit}</p></div>
                  </div>
                  {expandedGroups.includes(group.name) && (
                    <div className="p-4 bg-slate-50 space-y-3">
                      {group.items.map((item: any) => (
                        <div key={item.id} className="bg-white p-6 rounded-[2rem] border border-slate-200 flex justify-between items-center shadow-sm text-slate-800">
                          <div>
                            <p className="text-lg font-mono font-black text-blue-600 tracking-wider mb-1 italic">{item.sku_15_digits}</p>
                            <p className="font-black text-2xl text-slate-900 leading-none">{item.current_stock} <span className="text-xs font-bold opacity-30 uppercase">{item.unit}</span></p>
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

      {/* --- MODAL (ADD / EDIT) --- */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[100] flex items-center justify-center p-4 text-slate-900 font-sans">
          <div className="bg-white w-full max-w-2xl rounded-[4rem] shadow-2xl p-10 max-h-[90vh] overflow-y-auto font-sans">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black italic uppercase leading-none">{isAddModalOpen ? 'เพิ่มสินค้าใหม่' : 'แก้ไขข้อมูล'}</h3>
              <button onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} className="p-2 bg-slate-50 rounded-full text-slate-800 hover:bg-slate-200 transition-all"><X/></button>
            </div>
            
            <form onSubmit={isAddModalOpen ? handleAddManual : handleUpdateProduct} className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="col-span-full">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2 font-bold">ชื่อสินค้าหลัก</label>
                  <select required className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold cursor-pointer border focus:border-blue-500" value={isAddModalOpen ? newProduct.name : editingProduct.name} onChange={e => handleNameSelect(e.target.value, isAddModalOpen)}>
                    <option value="">-- เลือกชื่อสินค้า --</option>
                    {masterProducts.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2 font-bold">ตัวย่อ (Prefix)</label>
                  <input type="text" readOnly className="w-full bg-slate-200 p-4 rounded-2xl outline-none font-black text-blue-600 uppercase cursor-not-allowed shadow-inner" value={isAddModalOpen ? newProduct.prefix : editingProduct.prefix} />
                </div>

                <div><label className="text-[10px] font-black uppercase text-slate-400 ml-2 font-bold italic">กว้าง (mm)</label><input type="number" required className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold" value={isAddModalOpen ? newProduct.width : editingProduct.width} onChange={e => isAddModalOpen ? setNewProduct({...newProduct, width: e.target.value}) : setEditingProduct({...editingProduct, width: e.target.value})} /></div>
                <div><label className="text-[10px] font-black uppercase text-slate-400 ml-2 font-black italic text-orange-600 underline">หนา (mm)</label><input type="number" required className="w-full bg-orange-50 p-4 rounded-2xl outline-none font-black text-orange-700" value={isAddModalOpen ? newProduct.height : editingProduct.height} onChange={e => isAddModalOpen ? setNewProduct({...newProduct, height: e.target.value}) : setEditingProduct({...editingProduct, height: e.target.value})} /></div>
                <div><label className="text-[10px] font-black uppercase text-slate-400 ml-2 font-bold italic text-blue-600 underline">ยาว (mm)</label><input type="number" required className="w-full bg-blue-50/30 p-4 rounded-2xl outline-none font-bold" value={isAddModalOpen ? newProduct.length : editingProduct.length} onChange={e => isAddModalOpen ? setNewProduct({...newProduct, length: e.target.value}) : setEditingProduct({...editingProduct, length: e.target.value})} /></div>
                <div><label className="text-[10px] font-black uppercase text-slate-400 ml-2 font-bold">วันที่รับ (YYMMDD)</label><input type="text" required maxLength={6} className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold" value={isAddModalOpen ? newProduct.received_date : editingProduct.received_date} onChange={e => isAddModalOpen ? setNewProduct({...newProduct, received_date: e.target.value}) : setEditingProduct({...editingProduct, received_date: e.target.value})} /></div>
                
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2 font-bold">หน่วยนับ</label>
                  <select required className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold cursor-pointer border focus:border-blue-500" value={isAddModalOpen ? newProduct.unit : editingProduct.unit} onChange={e => isAddModalOpen ? setNewProduct({...newProduct, unit: e.target.value}) : setEditingProduct({...editingProduct, unit: e.target.value})}>
                    <option value="">-- หน่วย --</option>
                    {masterUnits.map(m => <option key={m.id} value={m.unit}>{m.unit}</option>)}
                  </select>
                </div>

                <div className="bg-blue-50 rounded-2xl p-4 shadow-inner col-span-1"><label className="text-[10px] font-black uppercase text-blue-400 block mb-1">สต๊อกเริ่มต้น</label><input type="number" required className="w-full bg-transparent outline-none font-black text-xl text-blue-600" value={isAddModalOpen ? newProduct.current_stock : editingProduct.current_stock} onChange={e => isAddModalOpen ? setNewProduct({...newProduct, current_stock: Number(e.target.value)}) : setEditingProduct({...editingProduct, current_stock: Number(e.target.value)})} /></div>
              </div>

              <div className="bg-slate-900 p-8 rounded-[2rem] text-center border-2 border-blue-500/30 shadow-2xl relative overflow-hidden">
                 <p className="relative text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2 italic tracking-widest font-sans">Preview SKU (กว้าง-หนา2หลัก-ยาว-วันที่ + x)</p>
                 <p className="relative text-3xl font-mono font-black text-blue-100 tracking-widest uppercase italic leading-none">{generateSKU(isAddModalOpen ? newProduct : editingProduct)}</p>
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-6 rounded-[2.5rem] font-black shadow-xl uppercase tracking-tighter italic active:scale-95 transition-all shadow-blue-500/30">บันทึกข้อมูลสินค้า</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
