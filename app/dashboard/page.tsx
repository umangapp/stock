'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function DashboardPage() {
  const [summary, setSummary] = useState({ totalItems: 0, lowStockCount: 0 })
  const [lowStockItems, setLowStockItems] = useState<any[]>([])
  const [recentLogs, setRecentLogs] = useState<any[]>([])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    // 1. ดึงข้อมูลสินค้าทั้งหมดเพื่อสรุปยอด
    const { data: products } = await supabase.from('products').select('*')
    if (products) {
      const lowStock = products.filter(item => item.current_stock <= item.min_stock)
      setSummary({
        totalItems: products.length,
        lowStockCount: lowStock.length
      })
      setLowStockItems(lowStock)
    }

    // 2. ดึงประวัติการทำรายการล่าสุด 5 รายการ 
    const { data: logs } = await supabase
      .from('transactions')
      .select('*, products(name)')
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (logs) setRecentLogs(logs)
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Dashboard ระบบสต็อก</h1>

      {/* Summary Cards  */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500">
          <p className="text-gray-500 text-sm">รายการสินค้าทั้งหมด</p>
          <p className="text-3xl font-bold">{summary.totalItems}</p>
        </div>
        <div className={`bg-white p-6 rounded-xl shadow-sm border-l-4 ${summary.lowStockCount > 0 ? 'border-red-500' : 'border-green-500'}`}>
          <p className="text-gray-500 text-sm">สินค้าที่ต้องเติม (Low Stock)</p>
          <p className="text-3xl font-bold text-red-600">{summary.lowStockCount}</p>
        </div>
      </div>

      {/* Low Stock Table */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
        <h2 className="text-lg font-bold mb-4 flex items-center">
          <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
          รายการสินค้าใกล้หมด
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-gray-400 text-sm border-b">
                <th className="pb-2">ชื่อสินค้า</th>
                <th className="pb-2">คงเหลือ</th>
                <th className="pb-2">ขั้นต่ำ</th>
                <th className="pb-2">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {lowStockItems.map(item => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="py-3 font-medium">{item.name}</td>
                  <td className="py-3">{item.current_stock} {item.unit}</td>
                  <td className="py-3 text-gray-400">{item.min_stock}</td>
                  <td className="py-3">
                    <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">ต้องเติมด่วน</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Updates  */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-bold mb-4">รายการเคลื่อนไหวล่าสุด</h2>
        <div className="space-y-4">
          {recentLogs.map(log => (
            <div key={log.id} className="flex justify-between items-center text-sm border-b pb-3">
              <div>
                <p className="font-bold">{log.products?.name}</p>
                <p className="text-gray-500 text-xs">{new Date(log.created_at).toLocaleString('th-TH')}</p>
              </div>
              <div className={`font-bold ${log.action_type === 'เพิ่ม' ? 'text-green-600' : 'text-red-600'}`}>
                {log.action_type === 'เพิ่ม' ? '+' : '-'}{log.quantity}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
