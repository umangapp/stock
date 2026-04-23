// ในไฟล์ app/scan/page.tsx เพิ่มระบบ Auto Logout เหมือนกันครับ

// 1. เพิ่มฟังก์ชัน Logout ในหน้าสแกน
const handleLogout = useCallback(async () => {
  await supabase.auth.signOut()
  window.location.href = '/login'
}, [])

// 2. เพิ่ม useEffect สำหรับ Auto Logout 15 นาที (ก๊อปจากข้างบนมาใส่ได้เลย)
useEffect(() => {
  let timer: NodeJS.Timeout;
  const resetTimer = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      handleLogout();
    }, 15 * 60 * 1000);
  };
  window.addEventListener('mousemove', resetTimer);
  window.addEventListener('keypress', resetTimer);
  resetTimer();
  return () => { if (timer) clearTimeout(timer); window.removeEventListener('mousemove', resetTimer); window.removeEventListener('keypress', resetTimer); };
}, [handleLogout]);

// 3. ปรับ Header ให้มีปุ่ม Logout
<header className="p-4 flex justify-between items-center bg-black/20 border-b border-white/5">
  <h1 className="text-xs font-bold tracking-widest flex items-center gap-2 uppercase">
    <Camera size={16} className="text-blue-400" /> Stock System
  </h1>
  <div className="flex items-center gap-2">
    <span className="text-[10px] font-black bg-blue-600 px-2 py-1 rounded text-white italic uppercase">{userName}</span>
    <button onClick={handleLogout} className="p-2 bg-red-500/20 text-red-400 rounded-full">
      <LogOut size={18} />
    </button>
  </div>
</header>

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
