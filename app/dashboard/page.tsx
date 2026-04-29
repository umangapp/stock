'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { generateSKU } from '@/lib/skuHelper'
import { 
  LayoutDashboard, Package, Users, Settings, LogOut, 
  ChevronDown, ChevronUp, Clock, TrendingUp, Edit3, Plus, Trash2, X
} from 'lucide-react'

export default function AdminDashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [transactions, setTransactions] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [masterProducts, setMasterProducts] = useState<any[]>([])
  const [masterUnits, setMasterUnits] = useState<any[]>([])
  const [expandedUsers, setExpandedUsers] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    const { data: t } = await supabase.from('transactions').select('*, products(*)').order('created_at', { ascending: false })
    const { data: p } = await supabase.from('products').select('*').order('name')
    const { data: mp } = await supabase.from('settings_product_master').select('*')
    const { data: mu } = await supabase.from('settings_units').select('*')
    if (t) setTransactions(t)
    if (p) setProducts(p)
    if (mp) setMasterProducts(mp)
    if (mu) setMasterUnits(mu)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const groupedByUser = transactions.reduce((acc: any, t: any) => {
    const user = t.created_by || 'Unknown';
    if (!acc[user]) acc[user] = [];
    acc[user].push(t);
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-screen bg-gray-100 lg:flex-row overflow-hidden font-sans text-slate-900">
      {/* SIDEBAR */}
      <nav className="w-full lg:w-72 bg-slate-900 text-white p-6 flex lg:flex-col gap-2 shrink-0">
        <h1 className="hidden lg:block mb-10 text-2xl text-blue-400 font-black italic uppercase">Umang Admin</h1>
        <div className="flex lg:flex-col flex-1 gap-2">
          {[{ id: 'dashboard', label: 'ภาพรวมระบบ', icon: LayoutDashboard }, { id: 'inventory', label: 'สต๊อกสินค้า', icon: Package }, { id: 'settings', label: 'ตั้งค่าระบบ', icon: Settings }].map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex items-center gap-4 px-6 py-4 rounded-3xl text-sm font-bold ${activeTab === item.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-white/5'}`}>
              <item.icon size={20} /> {item.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto p-4 lg:p-10">
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <h2 className="text-3xl font-black uppercase italic tracking-tighter">Activity Feed</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(groupedByUser).map(([user, logs]: [string, any]) => (
                <div key={user} className="bg-white rounded-[2.5rem] shadow-md border overflow-hidden h-fit transition-all hover:shadow-xl">
                  <div onClick={() => setExpandedUsers(prev => prev.includes(user) ? prev.filter(u => u !== user) : [...prev, user])} className="p-7 cursor-pointer bg-slate-900 text-white flex justify-between items-center">
                    <h4 className="font-black text-xl uppercase italic">{user}</h4>
                    {expandedUsers.includes(user) ? <ChevronUp size={24}/> : <ChevronDown size={24}/>}
                  </div>
                  {expandedUsers.includes(user) && (
                    <div className="p-4 bg-slate-50 space-y-4 max-h-[600px] overflow-y-auto">
                      {logs.map((log: any) => (
                        <div key={log.id} className="bg-white p-5 rounded-3xl border shadow-sm flex flex-col gap-3">
                          <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xl font-black uppercase leading-none">{log.products?.name}</p>
                                <p className="text-[10px] font-bold text-slate-400 mt-2 italic uppercase">ขนาด: {log.products?.width}x{log.products?.height}x{log.products?.length} มม.</p>
                            </div>
                            <span className={`text-3xl font-black ${log.type === 'receive' ? 'text-green-600' : 'text-red-600'}`}>{log.type === 'receive' ? '+' : '-'} {log.amount}</span>
                          </div>
                          {/* 🌟 แสดงการคำนวณสต๊อกใน Dashboard */}
                          <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                            <TrendingUp size={16} className="text-blue-500" />
                            <p className="text-sm font-black text-slate-700">
                               สต๊อก: {log.old_stock || 0} {log.type === 'receive' ? '+' : '-'} {log.amount} = <span className="text-blue-600">{log.new_stock || 0}</span>
                            </p>
                          </div>
                          <p className="text-xs font-mono font-black text-blue-400 bg-blue-50/50 p-2 rounded-lg">{log.products?.sku_15_digits}</p>
                          <div className="flex justify-end text-[10px] font-black text-slate-300 uppercase italic border-t pt-2"><Clock size={12} className="mr-1"/> {new Date(log.created_at).toLocaleString('th-TH')}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {/* ส่วน Inventory และ Settings ยังคงเหมือนเดิม (ประหยัดพื้นที่) */}
      </main>
    </div>
  )
}
