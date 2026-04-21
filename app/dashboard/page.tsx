'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { Plus, Package, History, LayoutDashboard } from 'lucide-react'

export default function DashboardPage() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .order('name', { ascending: true })
    if (data) setProducts(data)
    setLoading(false)
  }

  return (
    <div className="p-4 max-w-4xl mx-auto bg-gray-50 min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <LayoutDashboard className="text-blue-600" />
            Dashboard สต๊อกสินค้า
          </h1>
          <p className="text-sm text-gray-500">ภาพรวมสินค้าทั้งหมดในคลัง Umang BKK</p>
        </div>

        {/* ปุ่มเพิ่มสินค้าที่ต้องการ */}
        <Link 
          href="/admin/products/add" 
          className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all active:scale-95"
        >
          <Plus size={20} />
          เพิ่มสินค้าใหม่
        </Link>
      </div>

      {/* สรุปภาพรวมแบบการ์ด (Stats) */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-xs uppercase font-semibold">สินค้าทั้งหมด</p>
          <p className="text-2xl font-bold text-blue-600">{products.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-xs uppercase font-semibold">สต๊อกรวมทุกรายการ</p>
          <p className="text-2xl font-bold text-green-600">
            {products.reduce((acc, curr) => acc + curr.current_stock, 0)}
          </p>
        </div>
      </div>

      {/* ตารางรายการสินค้า */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
          <h2 className="font-bold text-gray-700 flex items-center gap-2">
            <Package size={18} />
            รายการสินค้าในคลัง
          </h2>
          <button onClick={fetchProducts} className="text-xs text-blue-600 hover:underline">รีเฟรชข้อมูล</button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 font-semibold">ชื่อสินค้า / รหัส</th>
                <th className="px-4 py-3 font-semibold text-center">คงเหลือ</th>
                <th className="px-4 py-3 font-semibold text-right">หน่วย</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={3} className="text-center py-10 text-gray-400">กำลังโหลดข้อมูล...</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={3} className="text-center py-10 text-gray-400">ยังไม่มีสินค้าในระบบ</td></tr>
              ) : (
                products.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50 transition-colors">
                    <td className="px-4 py-4">
                      <div className="font-bold text-gray-800">{item.name}</div>
                      <div className="text-xs text-gray-400">{item.sku_15_digits}</div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full font-bold ${
                        item.current_stock <= 5 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                      }`}>
                        {item.current_stock}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right text-gray-500">{item.unit}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ปุ่มทางลัดอื่นๆ ด้านล่าง */}
      <div className="mt-8 grid grid-cols-2 gap-4">
        <Link href="/scan" className="flex items-center justify-center gap-2 bg-white border-2 border-gray-200 p-4 rounded-xl font-bold text-gray-700 hover:border-blue-300">
          <History size={18} />
          หน้าสแกนสินค้า
        </Link>
        <Link href="/" className="flex items-center justify-center gap-2 bg-white border-2 border-gray-200 p-4 rounded-xl font-bold text-gray-700 hover:border-blue-300">
          ไปหน้าหลัก
        </Link>
      </div>
    </div>
  )
}
