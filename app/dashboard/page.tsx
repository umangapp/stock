'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { Plus, Package, LayoutDashboard, Edit2, RefreshCw } from 'lucide-react'

export default function DashboardPage() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setProducts(data)
    setLoading(false)
  }

  return (
    <div className="p-4 max-w-5xl mx-auto bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <LayoutDashboard className="text-blue-600" />
            Dashboard ระบบสต๊อก
          </h1>
          <p className="text-sm text-gray-500">จัดการข้อมูลและดูสถานะสินค้า Umang BKK</p>
        </div>
        <Link 
          href="/admin/products/add" 
          className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all active:scale-95"
        >
          <Plus size={20} />
          เพิ่มสินค้าใหม่
        </Link>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
          <h2 className="font-bold text-gray-700 flex items-center gap-2">
            <Package size={18} />
            รายการสินค้าทั้งหมด
          </h2>
          <button onClick={fetchProducts} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-blue-600">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-6 py-4 font-semibold">สินค้า / รหัส SKU</th>
                <th className="px-6 py-4 font-semibold text-center">สต๊อกคงเหลือ</th>
                <th className="px-6 py-4 font-semibold text-center">หน่วย</th>
                <th className="px-6 py-4 font-semibold text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && products.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-20 text-gray-400 font-medium">กำลังโหลดข้อมูล...</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-20 text-gray-400 font-medium">ไม่พบข้อมูลสินค้า</td></tr>
              ) : (
                products.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-800 group-hover:text-blue-700 transition-colors">{item.name}</div>
                      <div className="text-xs font-mono text-gray-400 mt-0.5">{item.sku_15_digits}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block min-w-[3rem] px-3 py-1 rounded-full font-bold text-sm ${
                        item.current_stock <= 5 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                      }`}>
                        {item.current_stock}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-gray-600 font-medium">{item.unit}</td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        href={`/admin/products/edit/${item.id}`}
                        className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-blue-600 hover:text-white transition-all font-bold text-sm"
                      >
                        <Edit2 size={14} />
                        แก้ไข
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
