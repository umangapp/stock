'use client'
import { useState, useMemo } from 'react'
import { TrendingUp, PackageMinus, PackagePlus, AlertCircle, Award, Calendar } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

export default function ExecutiveReportTab({ transactions = [], products = [] }: { transactions: any[], products: any[] }) {
  const [period, setPeriod] = useState('1m')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // 1. กรองข้อมูล Transactions ตามช่วงเวลา
  const filteredTransactions = useMemo(() => {
    const now = new Date()
    let filterStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    let filterEnd = new Date()

    if (period === '1m') filterStart.setMonth(now.getMonth() - 1)
    else if (period === '3m') filterStart.setMonth(now.getMonth() - 3)
    else if (period === '6m') filterStart.setMonth(now.getMonth() - 6)
    else if (period === '12m') filterStart.setFullYear(now.getFullYear() - 1)
    else if (period === 'custom' && startDate && endDate) {
      filterStart = new Date(startDate)
      filterEnd = new Date(endDate)
      filterEnd.setHours(23, 59, 59, 999)
    }

    return transactions.filter(t => {
      const tDate = new Date(t.created_at)
      return tDate >= filterStart && tDate <= filterEnd
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) // เรียงใหม่สุดขึ้นก่อนสำหรับตาราง
  }, [transactions, period, startDate, endDate])

  // 2. คำนวณ KPI
  const kpi = useMemo(() => {
    const totalStock = products.reduce((sum, p) => sum + (Number(p.current_stock) || 0), 0)
    const lowStockCount = products.filter(p => (Number(p.current_stock) || 0) < (Number(p.safety_stock) || 0)).length
    
    let totalIn = 0
    let totalOut = 0
    const itemOutCount: Record<string, { name: string, count: number, prefix: string }> = {}

    filteredTransactions.forEach(t => {
      const amount = Number(t.amount) || 0
      if (t.type === 'receive' || t.type === 'import') {
        totalIn += amount
      } else if (t.type === 'issue') {
        totalOut += amount
        if (t.products) {
          const sku = t.products.sku_15_digits || 'Unknown'
          if (!itemOutCount[sku]) {
            itemOutCount[sku] = { name: t.products.name || sku, prefix: t.products.prefix || '', count: 0 }
          }
          itemOutCount[sku].count += amount
        }
      }
    })

    let topItem = { name: 'ไม่มีข้อมูล', prefix: '-', count: 0 }
    Object.values(itemOutCount).forEach(item => {
      if (item.count > topItem.count) topItem = item
    })

    return { totalStock, lowStockCount, totalIn, totalOut, topItem }
  }, [products, filteredTransactions])

  // 3. เตรียมข้อมูลสำหรับกราฟแท่งรายวัน
  const chartData = useMemo(() => {
    const grouped: Record<string, { dateStr: string, timestamp: number, ยอดรับเข้า: number, ยอดเบิกจ่าย: number }> = {}
    
    // เราจะใช้ filteredTransactions ในการรวมยอดรายวัน
    filteredTransactions.forEach(t => {
      const d = new Date(t.created_at)
      const dateStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`
      
      if (!grouped[dateStr]) {
        grouped[dateStr] = { 
          dateStr, 
          timestamp: new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(),
          ยอดรับเข้า: 0, 
          ยอดเบิกจ่าย: 0 
        }
      }
      
      const amount = Number(t.amount) || 0
      if (t.type === 'receive' || t.type === 'import') grouped[dateStr].ยอดรับเข้า += amount
      else if (t.type === 'issue') grouped[dateStr].ยอดเบิกจ่าย += amount
    })

    return Object.values(grouped).sort((a, b) => a.timestamp - b.timestamp)
  }, [filteredTransactions])

  // 4. สัดส่วนกลุ่มสินค้า
  const breakdown = useMemo(() => {
    const total = kpi.totalStock || 1
    const groups: Record<string, number> = {}
    products.forEach(p => {
      const prefix = p.prefix || 'OTHER'
      groups[prefix] = (groups[prefix] || 0) + (Number(p.current_stock) || 0)
    })
    
    return Object.entries(groups)
      .map(([prefix, count]) => ({ prefix, count, percent: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4)
  }, [products, kpi.totalStock])

  const colors = ['bg-amber-500', 'bg-blue-500', 'bg-emerald-500', 'bg-purple-500']

  return (
    <div className="space-y-6 animate-in fade-in no-print">
      {/* 1. Header & Filters */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-4">
        <div>
          <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900">ภาพรวมผู้บริหาร</h2>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Executive Dashboard</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-2xl border shadow-sm w-full xl:w-auto">
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100">
            <Calendar size={16} className="text-slate-400" />
            <select 
              className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              <option value="1m">1 เดือนย้อนหลัง</option>
              <option value="3m">3 เดือนย้อนหลัง</option>
              <option value="6m">6 เดือนย้อนหลัง</option>
              <option value="12m">1 ปีล่าสุด</option>
              <option value="custom">กำหนดเอง (Custom)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input 
              type="date" 
              className={`bg-slate-50 border border-slate-100 text-sm font-bold text-slate-700 px-3 py-2 rounded-xl outline-none transition-all ${period !== 'custom' ? 'opacity-50 cursor-not-allowed' : ''}`}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={period !== 'custom'}
            />
            <span className="text-slate-400 font-bold">-</span>
            <input 
              type="date" 
              className={`bg-slate-50 border border-slate-100 text-sm font-bold text-slate-700 px-3 py-2 rounded-xl outline-none transition-all ${period !== 'custom' ? 'opacity-50 cursor-not-allowed' : ''}`}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={period !== 'custom'}
            />
          </div>
        </div>
      </div>

      {/* 2. KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-[2rem] border shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <p className="text-sm font-bold text-slate-500">ปริมาณสต๊อกรวม</p>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><TrendingUp size={18}/></div>
          </div>
          <div>
            <h3 className="text-3xl font-black text-slate-900">{kpi.totalStock.toLocaleString()}</h3>
            <p className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded inline-block mt-2">ยอดสต๊อกคงเหลือปัจจุบัน</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-[2rem] border shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <p className="text-sm font-bold text-slate-500">ยอดเบิกจ่าย (Out)</p>
            <div className="p-2 bg-red-50 text-red-600 rounded-xl"><PackageMinus size={18}/></div>
          </div>
          <div>
            <h3 className="text-3xl font-black text-slate-900">{kpi.totalOut.toLocaleString()}</h3>
            <p className="text-[10px] font-bold text-slate-400 mt-2">ตามช่วงเวลาที่กรอง</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-[2rem] border shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <p className="text-sm font-bold text-slate-500">ยอดรับเข้า (In)</p>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><PackagePlus size={18}/></div>
          </div>
          <div>
            <h3 className="text-3xl font-black text-slate-900">{kpi.totalIn.toLocaleString()}</h3>
            <p className="text-[10px] font-bold text-slate-400 mt-2">ตามช่วงเวลาที่กรอง</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-[2rem] border shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <p className="text-sm font-bold text-slate-500">จุดวิกฤต (Low Stock)</p>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl"><AlertCircle size={18}/></div>
          </div>
          <div>
            <h3 className="text-3xl font-black text-red-600 animate-pulse">{kpi.lowStockCount}</h3>
            <p className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded inline-block mt-2 border border-red-100">รายการที่ต่ำกว่า Safety</p>
          </div>
        </div>

        <div className="bg-emerald-700 p-5 rounded-[2rem] shadow-md flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 transition-transform"><Award size={80} /></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <p className="text-sm font-bold text-emerald-100">สินค้าเบิกจ่ายสูงสุด</p>
              <div className="p-2 bg-emerald-600 text-white rounded-xl"><Award size={18}/></div>
            </div>
            <h3 className="text-2xl font-black text-white leading-tight truncate" title={kpi.topItem.name}>{kpi.topItem.name}</h3>
            <p className="text-emerald-200 text-xs font-bold mt-1">กลุ่ม {kpi.topItem.prefix}</p>
            <p className="text-[10px] font-black text-emerald-900 bg-emerald-400 px-2 py-1 rounded inline-block mt-3 shadow-sm">เบิกออก {kpi.topItem.count.toLocaleString()} ครั้ง</p>
          </div>
        </div>
      </div>

      {/* 3. Charts & Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* กราฟแท่งรายวัน */}
        <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm lg:col-span-2">
          <div className="mb-6">
            <h3 className="text-lg font-black text-slate-800">แนวโน้มความเคลื่อนไหว (Movement Trend)</h3>
            <p className="text-xs font-bold text-slate-400">แสดงยอดรับเข้าและเบิกจ่าย แยกตามวัน</p>
          </div>
          <div className="h-72 w-full mt-4">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="dateStr" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)', fontWeight: 'bold' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', paddingTop: '20px' }} />
                  <Bar dataKey="ยอดเบิกจ่าย" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="ยอดรับเข้า" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-300 font-bold text-sm">ไม่มีข้อมูลการเคลื่อนไหวในช่วงเวลานี้</div>
            )}
          </div>
        </div>

        {/* สัดส่วนสต๊อก */}
        <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm h-full">
          <div className="mb-6">
            <h3 className="text-lg font-black text-slate-800">สัดส่วนสต๊อก (Stock Breakdown)</h3>
            <p className="text-xs font-bold text-slate-400">แยกตามกลุ่ม Prefix สูงสุด</p>
          </div>
          
          <div className="space-y-6 mt-4">
            {breakdown.map((item, index) => (
              <div key={item.prefix}>
                <div className="flex justify-between text-sm font-bold mb-2">
                  <span className="text-slate-700 flex items-center gap-2"><div className={`w-2.5 h-2.5 rounded-full ${colors[index % colors.length]}`}></div> กลุ่ม {item.prefix}</span>
                  <span className="text-slate-500">{item.percent}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5">
                  <div className={`${colors[index % colors.length]} h-2.5 rounded-full`} style={{ width: `${item.percent}%` }}></div>
                </div>
              </div>
            ))}
            {breakdown.length === 0 && <p className="text-xs font-bold text-slate-400">ไม่มีข้อมูลสต๊อก</p>}
          </div>
        </div>
      </div>

      {/* 4. ตารางรายละเอียดการเข้า-ออก */}
      <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm">
        <div className="mb-6">
          <h3 className="text-lg font-black text-slate-800">รายงานการเข้า-ออก (Transaction Logs)</h3>
          <p className="text-xs font-bold text-slate-400">รายละเอียดสินค้าที่มีความเคลื่อนไหวตามช่วงเวลาที่กรอง</p>
        </div>
        <div className="overflow-x-auto max-h-[400px]">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 rounded-tl-xl">วันที่ / เวลา</th>
                <th className="px-4 py-3">ประเภท</th>
                <th className="px-4 py-3">รหัส SKU</th>
                <th className="px-4 py-3">ชื่อสินค้า</th>
                <th className="px-4 py-3 text-right">จำนวน</th>
                <th className="px-4 py-3 rounded-tr-xl">ผู้ทำรายการ</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((t, idx) => (
                  <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-slate-600 font-medium">
                      {new Date(t.created_at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="px-4 py-3">
                      {t.type === 'issue' ? (
                        <span className="bg-red-100 text-red-600 px-2 py-1 rounded text-[10px] font-black tracking-wide">เบิกออก</span>
                      ) : (
                        <span className="bg-emerald-100 text-emerald-600 px-2 py-1 rounded text-[10px] font-black tracking-wide">รับเข้า</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500 text-xs">{t.products?.sku_15_digits || '-'}</td>
                    <td className="px-4 py-3 font-bold text-slate-700">{t.products?.name || '-'}</td>
                    <td className="px-4 py-3 text-right font-black text-slate-900">{Number(t.amount).toLocaleString()}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{t.created_by || '-'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400 font-bold">
                    ไม่มีรายการเคลื่อนไหวในช่วงเวลานี้
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
