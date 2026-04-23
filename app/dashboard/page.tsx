'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { 
  LayoutDashboard, ClipboardList, Users, Download, Package, 
  Search, ChevronDown, ChevronUp, Edit3, X, Save, LogOut, Plus, Box, QrCode
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

  // --- ฟังก์ชันสร้าง SKU 15 หลัก (หัวใจของระบบ) ---
  const generateSKU = (p: any) => {
    const prefix = (p.prefix || 'XXX').toUpperCase().slice(0,3);
    const w = String(p.width || '0').slice(0,1);
    const l = String(p.length || '0').padStart(2, '0').slice(0,2);
    const h = String(p.height || '0').padStart(2, '0').slice(0,2);
    const weight = String(p.weight || '0').slice(0,1);
    const date = String(p.received_date || '000000').slice(0,6);
    return (prefix + w + l + h + weight + date).padEnd(15, 'x');
  }

  // --- ระบบ Import จาก Excel ---
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
            width: item['กว้าง (cm)'],
            length: item['ยาว (cm)'],
            height: item['สูง (cm)'],
            weight: item['น้ำหนัก (kg)'],
            received_date: item['วันที่รับ (YYMMDD)']
          };
          return {
            name: item['ชื่อสินค้า'],
            sku_15_digits: generateSKU(specs),
            unit: item['หน่วยนับ'] || 'เส้น',
            current_stock: Number(item['สต๊อกเริ่มต้น']) || 0,
            prefix: specs.prefix,
            width: specs.width, length: specs.length, height: specs.height, weight: specs.weight, received_date: specs.received_date
          }
        });

        const { error } = await supabase.from('products').insert(formatted);
        if (error) alert("Error: " + error.message);
        else { alert("✅ นำเข้าข้อมูลสำเร็จ!"); fetchData(); }
      } catch (err) { alert("❌ ไฟล์ไม่ถูกต้อง"); }
    };
    reader.readAsBinaryString(file);
  }

  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault();
    const sku = generateSKU(newProduct);
    const { error } = await supabase.from('products').insert([{
      ...newProduct,
      sku_15_digits: sku,
      current_stock: Number(newProduct.current_stock)
    }]);
    if (!error) { alert("✅ เพิ่มสินค้าสำเร็จ!"); setIsAddModalOpen(false); fetchData(); }
  };

  if (!isClient) return null;

  return (
    <div className="flex flex-col h-screen bg-gray-50 lg:flex-row overflow-hidden font-sans text-slate-900">
      {/* Sidebar (เหมือนเดิม) */}
      <nav className="w-full lg:w-72 bg-slate-900 text-white p-6 flex lg:flex-col gap-2 overflow-x-auto shrink-0 shadow-2xl z-20">
        <div className="hidden lg:block mb-10 px-2 text-center font-black">
          <h1 className="text-2xl text-blue-400 italic tracking-tighter uppercase">Umang Admin</h1>
        </div>
        <div className="flex lg:flex-col flex-1 gap-2">
          {[{ id: 'dashboard', label: 'ภาพรวมระบบ', icon: LayoutDashboard }, { id: 'inventory', label: 'สต๊อกสินค้า', icon: Package }, { id: 'history', label: 'รายงาน', icon: ClipboardList }, { id: 'users', label: 'ผู้ใช้งาน', icon: Users }].map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex items-center gap-4 px-6 py-4 rounded-[1.8rem] text-sm font-bold transition-all shrink-0 ${activeTab === item.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/30' : 'text-slate-400 hover:bg-white/5'}`}>
              <item.icon size={20} /> {item.label}
            </button>
          ))}
        </div>
        <button onClick={handleLogout} className="flex items-center gap-4 px-6 py-4 rounded-[1.8rem] text-sm font-bold text-red-400 hover:bg-red-500/10 mt-auto"><LogOut size={20} /> ออกจากระบบ</button>
      </nav>
// ในส่วนของ Sidebar (nav)
<div className="flex lg:flex-col flex-1 gap-2">
  {[
    { id: 'dashboard', label: 'ภาพรวมระบบ', icon: LayoutDashboard },
    { id: 'inventory', label: 'สต๊อกสินค้า', icon: Package },
    // เพิ่มบรรทัดนี้ครับ 👇
    { id: 'go_to_scan', label: 'เครื่องสแกนสินค้า', icon: QrCode }, 
    { id: 'history', label: 'รายงาน', icon: ClipboardList },
    { id: 'users', label: 'ผู้ใช้งาน', icon: Users },
  ].map((item) => (
    <button 
      key={item.id} 
      onClick={() => {
        if (item.id === 'go_to_scan') {
          router.push('/scan'); // ถ้ากดอันนี้ให้ไปหน้าสแกน
        } else {
          setActiveTab(item.id);
        }
      }} 
      className={`flex items-center gap-4 px-6 py-4 rounded-[1.8rem] text-sm font-bold transition-all shrink-0 ${activeTab === item.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/30' : 'text-slate-400 hover:bg-white/5'}`}
    >
      <item.icon size={20} /> {item.label}
    </button>
  ))}
</div>
      <main className="flex-1 overflow-y-auto p-4 lg:p-10 pb-24">
        {/* TAB: INVENTORY */}
        {activeTab === 'inventory' && (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
              <div>
                <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">คลังสินค้า</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">จัดการข้อมูลตามสเปกสินค้า</p>
              </div>
              <div className="flex flex-wrap gap-2 w-full md:w-auto">
                <button onClick={() => setIsAddModalOpen(true)} className="bg-blue-600 text-white px-6 py-4 rounded-[1.5rem] font-black uppercase text-[10px] flex items-center gap-2 shadow-lg shadow-blue-100"><Plus size={16}/> เพิ่มสินค้าใหม่</button>
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

      {/* --- MODAL: ADD / EDIT PRODUCT (ใช้ร่วมกันแบบจัดเต็ม) --- */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[4rem] overflow-hidden shadow-2xl p-10 animate-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black italic uppercase">{isAddModalOpen ? 'Add New Product' : 'Edit Product'}</h3>
              <button onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} className="p-2 bg-slate-50 rounded-full"><X/></button>
            </div>
            
            <form onSubmit={isAddModalOpen ? handleAddManual : async (e) => {
              e.preventDefault();
              const newSku = generateSKU(editingProduct);
              const { error } = await supabase.from('products').update({ ...editingProduct, sku_15_digits: newSku }).eq('id', editingProduct.id);
              if (!error) { alert("✅ บันทึกสำเร็จ\nSKU: " + newSku); setIsEditModalOpen(false); fetchData(); }
            }} className="space-y-6">
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="col-span-full">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">ชื่อสินค้าหลัก</label>
                  <input type="text" required className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold" 
                    value={isAddModalOpen ? newProduct.name : editingProduct.name} 
                    onChange={e => isAddModalOpen ? setNewProduct({...newProduct, name: e.target.value}) : setEditingProduct({...editingProduct, name: e.target.value})} 
                  />
                </div>
                
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">ตัวย่อ (Prefix)</label>
                  <input type="text" required maxLength={3} className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-black text-blue-600 uppercase" 
                    value={isAddModalOpen ? newProduct.prefix : editingProduct.prefix} 
                    onChange={e => isAddModalOpen ? setNewProduct({...newProduct, prefix: e.target.value}) : setEditingProduct({...editingProduct, prefix: e.target.value})} 
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">กว้าง (cm)</label>
                  <input type="number" required className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold" 
                    value={isAddModalOpen ? newProduct.width : editingProduct.width} 
                    onChange={e => isAddModalOpen ? setNewProduct({...newProduct, width: e.target.value}) : setEditingProduct({...editingProduct, width: e.target.value})} 
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">ยาว (cm)</label>
                  <input type="number" required className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold" 
                    value={isAddModalOpen ? newProduct.length : editingProduct.length} 
                    onChange={e => isAddModalOpen ? setNewProduct({...newProduct, length: e.target.value}) : setEditingProduct({...editingProduct, length: e.target.value})} 
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">สูง (cm)</label>
                  <input type="number" required className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold text-orange-600" 
                    value={isAddModalOpen ? newProduct.height : editingProduct.height} 
                    onChange={e => isAddModalOpen ? setNewProduct({...newProduct, height: e.target.value}) : setEditingProduct({...editingProduct, height: e.target.value})} 
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">น้ำหนัก (kg)</label>
                  <input type="number" step="0.1" required className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold text-orange-600" 
                    value={isAddModalOpen ? newProduct.weight : editingProduct.weight} 
                    onChange={e => isAddModalOpen ? setNewProduct({...newProduct, weight: e.target.value}) : setEditingProduct({...editingProduct, weight: e.target.value})} 
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">วันที่รับ (YYMMDD)</label>
                  <input type="text" required placeholder="เช่น 240606" className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold" 
                    value={isAddModalOpen ? newProduct.received_date : editingProduct.received_date} 
                    onChange={e => isAddModalOpen ? setNewProduct({...newProduct, received_date: e.target.value}) : setEditingProduct({...editingProduct, received_date: e.target.value})} 
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">หน่วยนับ</label>
                  <input type="text" required className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold" 
                    value={isAddModalOpen ? newProduct.unit : editingProduct.unit} 
                    onChange={e => isAddModalOpen ? setNewProduct({...newProduct, unit: e.target.value}) : setEditingProduct({...editingProduct, unit: e.target.value})} 
                  />
                </div>

                <div className="bg-blue-50 rounded-2xl p-4">
                  <label className="text-[10px] font-black uppercase text-blue-400 block mb-1">สต๊อกเริ่มต้น</label>
                  <input type="number" required className="w-full bg-transparent outline-none font-black text-xl text-blue-600" 
                    value={isAddModalOpen ? newProduct.current_stock : editingProduct.current_stock} 
                    onChange={e => isAddModalOpen ? setNewProduct({...newProduct, current_stock: Number(e.target.value)}) : setEditingProduct({...editingProduct, current_stock: Number(e.target.value)})} 
                  />
                </div>
              </div>

              <div className="bg-slate-900 p-6 rounded-[2rem] text-center">
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Preview SKU 15 Digits</p>
                 <p className="text-2xl font-mono font-black text-blue-400 tracking-widest uppercase">
                    {generateSKU(isAddModalOpen ? newProduct : editingProduct)}
                 </p>
              </div>

              <button type="submit" className="w-full bg-blue-600 text-white py-6 rounded-[2.5rem] font-black shadow-xl shadow-blue-200 uppercase tracking-tighter italic">
                 {isAddModalOpen ? 'บันทึกและสร้างสินค้าใหม่' : 'บันทึกการแก้ไขข้อมูล'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
