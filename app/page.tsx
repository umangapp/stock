import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4 text-center">
      <h1 className="text-3xl font-bold text-blue-800 mb-4">ระบบสต๊อก Umang BKK</h1>
      <Link href="/login" className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold">
        เข้าสู่ระบบ
      </Link>
    </div>
  )
}
