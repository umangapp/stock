import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4 text-center">
      <h1 className="text-3xl font-bold text-blue-800 mb-2">ระบบสต๊อก Umang BKK</h1>
      <p className="text-gray-500 mb-8 font-medium">ยินดีต้อนรับสู่ระบบจัดการคลังสินค้า</p>
      
      <div className="space-y-4 w-full max-w-xs">
        <Link href="/login" 
          className="block w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all text-lg">
          เข้าสู่ระบบ (Login)
        </Link>
        <p className="text-xs text-gray-400 uppercase tracking-widest">Warehouse Management System</p>
      </div>
    </div>
  )
}
