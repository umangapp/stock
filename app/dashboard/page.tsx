'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { generateSKU } from '@/lib/skuHelper'
import { 
  LayoutDashboard, Package, Settings, LogOut, Search,
  ChevronDown, ChevronUp, Clock, TrendingUp, Edit3, Plus, Trash2, X, FileSpreadsheet
} from 'lucide-react'

export default function AdminDashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [transactions, setTransactions] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [masterProducts, setMasterProducts] = useState<any[]>([])
  const [masterUnits, setMasterUnits] = useState<any[]>([])
  
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedUsers, setExpandedUsers] = useState<string[]>([])
  const [expandedGroups, setExpandedGroups] = useState<string[]>([])
  
  const [inputName, setInputName] = useState('')
  const [inputPrefix, setInputPrefix] = useState('')
  const [inputUnit, setInputUnit] = useState('')

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<any>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newProduct, setNewProduct] = useState({
    name: '', prefix: '', width: '', length: '', height: '', received_date: '', unit: '', current_stock: 0
  })

  const fetchData = async () => {
    setLoading(true)
    const { data: t } = await supabase.from('transactions').select('*, products(*)').order('created_at', { ascending: false })
    const { data: p } = await supabase.from('products').select('*').order('name')
    const { data: mp } = await supabase.from('settings_product_master').select('*').order('name')
    const { data: mu } = await supabase.from('settings_units').select('*').order('unit')
    if (t) setTransactions(t)
    if (p) setProducts(p)
    if (mp) setMasterProducts(mp)
    if (mu) setMasterUnits(mu)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const handleNameSelect = (name: string, isAdd: boolean) => {
    const matched = masterProducts.find(m => m.name === name)
    if (isAdd) setNewProduct({ ...newProduct, name, prefix: matched ? matched.prefix : '' })
    else setEditingProduct({ ...editingProduct, name, prefix: matched ? matched.prefix : '' })
  }

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newProduct.current_stock < 0) { alert("❌ สต๊อกห้ามติดลบ"); return; }
    const sku = generateSKU(newProduct)
    const { error } = await supabase.from('products').insert([{ ...newProduct, sku_15_digits: sku, current_stock: Number(newProduct.current_stock) }])
    if (!error) { alert("เพิ่มสำเร็จ!"); setIsAddModalOpen(false); fetchData(); }
  }

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editingProduct.current_stock < 0) { alert("❌ สต๊อกห้ามติดลบ"); return; }
    const sku = generateSKU(editingProduct)
    const { error } = await supabase.from('products').update({ ...editingProduct, sku_15_digits: sku, current_stock: Number(editingProduct.current_stock) }).eq('id', editingProduct.id)
    if (!error) { alert("บันทึกสำเร็จ!"); setIsEditModalOpen(false); fetchData(); }
  }

  const deleteProduct = async (id: string) => {
    if (confirm("ลบสินค้านี้?")) { await supabase.from('products').delete().eq('id', id); fetchData(); }
  }

  const addMaster = async (table: string, data: any) => {
    const { error } = await supabase.from(table).insert([data])
    if (!error) { setInputName(''); setInputPrefix(''); setInputUnit(''); fetchData(); }
  }

  const deleteMaster = async (table: string, id: string) => {
    if (confirm("ลบข้อมูลมาสเตอร์นี้?")) { await supabase.from(table).delete().eq('id', id); fetchData(); }
  }

  const groupedByUser = transactions.reduce((acc: any, t: any) => {
    const user = t.created_by || 'Unknown';
    if (!acc[user]) acc[user] = [];
    acc[user].push(t);
    return acc;
  }, {});

  const groupedInventory = products.reduce((acc: any, item: any) => {
    if (!acc[item.name]) acc[item.name] = { name: item.name, totalStock: 0, unit: item.unit, items: [] };
    acc[item.name].totalStock += item.current_stock;
    acc[item.name].items.push(item);
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-screen bg-gray-100 lg:flex-row overflow-hidden font-sans text-slate-900">
      <nav className="w-full lg:w-72 bg-slate-900 text-white p-6 flex lg:flex-col gap-2 shrink-0 z-20 shadow-2xl">
        <h1 className="hidden lg:block mb-10 text-2xl text-blue-400 font-black italic uppercase tracking-tighter">Umang Admin</h1>
        <div className="flex lg:flex-col flex-1 gap-2 overflow-x-auto">
          {[
            { id: 'dashboard', label: 'ภาพรวมระบบ', icon: LayoutDashboard },
            { id: 'inventory', label: 'สต๊อกสินค้า', icon: Package },
            { id: 'settings', label: 'ตั้งค่าระบบ', icon: Settings }
          ].map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex items-center gap-4 px-6 py-4 rounded-3xl text-sm font-bold shrink-0 ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white/5'}`}>
              <item.icon size={20} /> {item.label}
            </button>
          ))}
        </div>
        <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))} className="flex items-center gap-4 px-6 py-4 rounded-3xl text-sm font-bold text-red-400 mt-auto"><LogOut size={20}/> ออกจากระบบ</button>
      </nav>

      <main className="flex-1 overflow-y-auto p-4 lg:p-10 pb-24">
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in">
            <h2 className="text-3xl font-black uppercase italic tracking-tighter">Activity Feed</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(groupedByUser).map(([user, logs]: [string, any]) => (
                <div key={user} className="bg-white rounded-[2.5rem] border overflow-hidden h-fit transition-all hover:shadow-xl">
                  <div onClick={() => setExpandedUsers(prev => prev.includes(user) ? prev.filter(u => u !== user) : [...prev, user])} className="p-7 cursor-pointer bg-slate-900 text-white flex justify-between items-center">
                    <h4 className="font-black text-xl uppercase italic tracking-tight">{user}</h4>
                    {expandedUsers.includes(user) ? <ChevronUp size={24}/> : <ChevronDown size={24}/>}
                  </div>
                  {expandedUsers.includes(user) && (
                    <div className="p-4 bg-slate-50 space-y-4 max-h-[600px] overflow-y-auto">
                      {logs.map((log: any) => (
                        <div key={log.id} className="bg-white p-5 rounded-3xl border shadow-sm flex flex-col gap-3">
                          <div className="flex justify-between items-start">
                            <div><p className="text-xl font-black uppercase leading-none">{log.products?.name}</p><p className="text-[10px] font-bold text-slate-400 mt-2 italic">ขนาด: {log.products?.width}x{log.products?.height}x{log.products?.length} มม.</p></div>
                            <span className={`text-3xl font-black ${log.type === 'receive' ? 'text-green-600' : 'text-red-600'}`}>{log.type === 'receive' ? '+' : '-'} {log.amount}</span>
                          </div>
                          <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                            <TrendingUp size={16} className="text-blue-500" />
                            <p className="text-sm font-black text-slate-700 uppercase">สต๊อก: {log.old_stock || 0} {log.type === 'receive' ? '+' : '-'} {log.amount} = <span className="text-blue-600">{log.new_stock || 0}</span></p>
                          </div>
                          <p className="text-xs font-mono font-black text-blue-400 bg-blue-50/50 p-2 rounded-lg">{log.products?.sku_15_digits}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="space-y-8 animate-in fade-in">
            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
               <h2 className="text-3xl font-black uppercase italic tracking-tighter">สต๊อกสินค้า</h2>
               <div className="flex gap-3 w-full md:w-auto">
                  <div className="relative flex-1 md:w-64"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/><input type="text" placeholder="ค้นหา..." className="w-full bg-white border p-4 pl-12 rounded-2xl outline-none" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
                  <button className="bg-emerald-600 text-white px-6 py-4 rounded-2xl font-black uppercase text-xs flex items-center gap-2 shadow-lg"><FileSpreadsheet size={16}/> Import</button>
                  <button onClick={() => setIsAddModalOpen(true)} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs shadow-lg shadow-blue-500/20"><Plus className="inline mr-1"/> เพิ่มใหม่</button>
               </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.values(groupedInventory).filter((g: any) => g.name.toLowerCase().includes(searchQuery.toLowerCase())).map((group: any) => (
                <div key={group.name} className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden h-fit transition-all hover:border-blue-400">
                  <div onClick={() => setExpandedGroups(prev => prev.includes(group.name) ? prev.filter(n => n !== group.name) : [...prev, group.name])} className="p-7 cursor-pointer hover:bg-slate-50 flex justify-between items-center text-slate-800">
                    <div><h3 className="font-black uppercase text-xl truncate w-32 tracking-tighter">{group.name}</h3><p className="text-[10px] font-bold text-slate-400 uppercase mt-1 italic tracking-widest">Total {group.items.length} SKU</p></div>
                    <div className="text-right"><p className="text-4xl font-black text-slate-900 leading-none">{group.totalStock}</p><p className="text-[10px] font-black uppercase text-slate-400 mt-1">{group.unit}</p></div>
                  </div>
                  {expandedGroups.includes(group.name) && (
                    <div className="p-4 bg-slate-50 space-y-3">
                      {group.items.map((item: any) => (
                        <div key={item.id} className="bg-white p-5 rounded-3xl border border-slate-200 flex justify-between items-center shadow-sm">
                          <div>
                            <p className="text-lg font-mono font-black text-blue-600 tracking-wider italic">{item.sku_15_digits}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">ขนาด: {item.width} x {item.height} x {item.length} มม.</p>
                            <p className="font-black text-2xl text-slate-900 leading-none">{item.current_stock} <span className="text-xs opacity-30 uppercase">{item.unit}</span></p>
                          </div>
                          <div className="flex flex-col gap-2">
                             <button onClick={() => { setEditingProduct({...item}); setIsEditModalOpen(true); }} className="p-3 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all"><Edit3 size={18}/></button>
                             <button onClick={() => deleteProduct(item.id)} className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={18}/></button>
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

        {activeTab === 'settings' && (
          <div className="space-y-8 animate-in fade-in">
            <h2 className="text-3xl font-black uppercase italic tracking-tighter">System Settings</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-slate-800">
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                <h4 className="font-black uppercase text-sm mb-6 text-blue-600 tracking-widest">มาสเตอร์สินค้า (ชื่อ + ตัวย่อ)</h4>
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                  <input type="text" className="flex-[2] bg-slate-50 p-4 rounded-2xl outline-none border focus:border-blue-500 font-bold" placeholder="ชื่อสินค้าหลัก" value={inputName} onChange={e => setInputName(e.target.value)} />
                  <input type="text" className="flex-1 bg-slate-50 p-4 rounded-2xl outline-none border focus:border-blue-500 font-black uppercase text-blue-600" placeholder="ตัวย่อ" maxLength={3} value={inputPrefix} onChange={e => setInputPrefix(e.target.value)} />
                  <button onClick={() => addMaster('settings_product_master', {name: inputName, prefix: inputPrefix})} className="bg-blue-600 text-white p-4 rounded-2xl shadow-lg hover:bg-blue-700 transition-all active:scale-95"><Plus/></button>
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                  {masterProducts.map(item => (
                    <div key={item.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 font-bold">
                      <span>{item.name} <span className="text-blue-600 ml-2">[{item.prefix}]</span></span>
                      <button onClick={() => deleteMaster('settings_product_master', item.id)} className="text-red-400 p-2 hover:bg-red-50 rounded-lg"><Trash2 size={18}/></button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                <h4 className="font-black uppercase text-sm mb-6 text-blue-600 tracking-widest">จัดการหน่วยนับ</h4>
                <div className="flex gap-3 mb-6">
                  <input type="text" className="flex-1 bg-slate-50 p-4 rounded-2xl outline-none border focus:border-blue-500 font-bold" placeholder="หน่วยนับ..." value={inputUnit} onChange={e => setInputUnit(e.target.value)} />
                  <button onClick={() => addMaster('settings_units', {unit: inputUnit})} className="bg-blue-600 text-white p-4 rounded-2xl shadow-lg active:scale-95 transition-all"><Plus/></button>
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                  {masterUnits.map(item => (
                    <div key={item.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 font-black">
                      <span>{item.unit}</span>
                      <button onClick={() => deleteMaster('settings_units', item.id)} className="text-red-400 p-2 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={18}/></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL: ADD / EDIT PRODUCT */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[100] flex items-center justify-center p-4 text-slate-800">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black italic uppercase tracking-tighter">{isAddModalOpen ? 'เพิ่มสินค้าใหม่' : 'แก้ไขข้อมูล'}</h3>
              <button onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} className="p-2 bg-slate-100 rounded-full"><X/></button>
            </div>
            <form onSubmit={isAddModalOpen ? handleAddProduct : handleUpdateProduct} className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="col-span-full">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">ชื่อสินค้าหลัก</label>
                  <select required className="w-full bg-slate-50 p-4 rounded-2xl border" value={isAddModalOpen ? newProduct.name : editingProduct.name} onChange={e => handleNameSelect(e.target.value, isAddModalOpen)}>
                    <option value="">-- เลือกชื่อสินค้า --</option>
                    {masterProducts.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                  </select>
                </div>
                <div><label className="text-[10px] font-black uppercase text-slate-400 ml-2 font-bold">ตัวย่อ</label><input type="text" readOnly className="w-full bg-slate-200 p-4 rounded-2xl font-black text-blue-600 uppercase" value={isAddModalOpen ? newProduct.prefix : editingProduct.prefix} /></div>
                <div><label className="text-[10px] font-black uppercase text-slate-400 ml-2 italic">กว้าง (mm)</label><input type="number" required step="any" className="w-full bg-slate-50 p-4 rounded-2xl border" value={isAddModalOpen ? newProduct.width : editingProduct.width} onChange={e => isAddModalOpen ? setNewProduct({...newProduct, width: e.target.value}) : setEditingProduct({...editingProduct, width: e.target.value})} /></div>
                <div><label className="text-[10px] font-black uppercase text-slate-400 ml-2 italic text-orange-600 underline">หนา (mm)</label><input type="number" required step="any" className="w-full bg-orange-50 p-4 rounded-2xl border" value={isAddModalOpen ? newProduct.height : editingProduct.height} onChange={e => isAddModalOpen ? setNewProduct({...newProduct, height: e.target.value}) : setEditingProduct({...editingProduct, height: e.target.value})} /></div>
                <div><label className="text-[10px] font-black uppercase text-slate-400 ml-2 italic text-blue-600 underline">ยาว (mm)</label><input type="number" required step="any" className="w-full bg-blue-50/30 p-4 rounded-2xl border" value={isAddModalOpen ? newProduct.length : editingProduct.length} onChange={e => isAddModalOpen ? setNewProduct({...newProduct, length: e.target.value}) : setEditingProduct({...editingProduct, length: e.target.value})} /></div>
                <div><label className="text-[10px] font-black uppercase text-slate-400 ml-2">วันที่รับ (YYMMDD)</label><input type="text" required maxLength={6} className="w-full bg-slate-50 p-4 rounded-2xl border" value={isAddModalOpen ? newProduct.received_date : editingProduct.received_date} onChange={e => isAddModalOpen ? setNewProduct({...newProduct, received_date: e.target.value}) : setEditingProduct({...editingProduct, received_date: e.target.value})} /></div>
                <div><label className="text-[10px] font-black uppercase text-slate-400 ml-2">หน่วยนับ</label><select required className="w-full bg-slate-50 p-4 rounded-2xl border" value={isAddModalOpen ? newProduct.unit : editingProduct.unit} onChange={e => isAddModalOpen ? setNewProduct({...newProduct, unit: e.target.value}) : setEditingProduct({...editingProduct, unit: e.target.value})}>{masterUnits.map(m => <option key={m.id} value={m.unit}>{m.unit}</option>)}</select></div>
                <div className="bg-blue-50 rounded-2xl p-4 col-span-1 shadow-inner"><label className="text-[10px] font-black uppercase text-blue-400 block mb-1">สต๊อกเริ่มต้น</label><input type="number" required className="w-full bg-transparent outline-none font-black text-xl text-blue-600" value={isAddModalOpen ? newProduct.current_stock : editingProduct.current_stock} onChange={e => isAddModalOpen ? setNewProduct({...newProduct, current_stock: Number(e.target.value)}) : setEditingProduct({...editingProduct, current_stock: Number(e.target.value)})} /></div>
              </div>
              <div className="bg-slate-900 p-8 rounded-[2rem] text-center border-2 border-blue-500/30 shadow-2xl relative overflow-hidden">
                 <p className="relative text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2 italic">Preview SKU</p>
                 <p className="relative text-3xl font-mono font-black text-blue-100 tracking-widest uppercase italic leading-none">{generateSKU(isAddModalOpen ? newProduct : editingProduct)}</p>
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-6 rounded-3xl font-black text-xl uppercase italic shadow-xl active:scale-95 transition-all">บันทึกข้อมูลสินค้า</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
