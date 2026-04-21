import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4 text-center">
      <h1 className="text-3xl font-bold text-blue-800 mb-4">
        ระบบจัดการสต๊อก Umang BKK
      </h1>
      <p className="text-gray-600 mb-8">
        Warehouse Stock Management System v1.0
      </p>
      <div className="space-y-4 w-full max-w-xs">
        <Link href="/login" 
          className="block w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 shadow-lg">
          เข้าสู่ระบบ (Login)
        </Link>
      </div>
    </div>
  )
}
