'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Camera, LogOut, LayoutDashboard } from 'lucide-react'
import Link from 'next/link'

export default function HomePage() {
  const [userName, setUserName] = useState('GUEST')
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  // 1. ฟังก์ชัน Logout
  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }, [])

  // 2. ระบบ Auto Logout 15 นาที
  useEffect(() => {
    let timer: NodeJS.Timeout;
    const timeLimit = 15 * 60 * 1000; // 15 นาที

    const resetTimer = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        // ถ้าล็อกอินอยู่ค่อยสั่ง Logout
        if (isLoggedIn) {
          handleLogout();
        }
      }, timeLimit);
    };

    // เช็กสถานะ User
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setIsLoggedIn(true)
        setUserName(session.user.email?.split('@')[0].toUpperCase() || 'USER')
      }
    }
    checkUser()

    // จับเหตุการณ์การใช้งาน
    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keypress', resetTimer);
    window.addEventListener('touchstart', resetTimer);

    resetTimer();

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keypress', resetTimer);
      window.removeEventListener('touchstart', resetTimer);
    };
  }, [handleLogout, isLoggedIn]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans">
      
      {/* 3. Header พร้อมปุ่ม Logout (จะแสดงเมื่อล็อกอินแล้ว) */}
      {isLoggedIn && (
        <header className="p-4 flex justify-between items-center bg-slate-900 text-white shadow-lg">
          <h1 className="text-xs font-bold tracking-widest flex items-center gap-2 uppercase">
            <Camera size={16} className="text-blue-400" /> Stock System
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black bg-blue-600 px-3 py-1 rounded-full italic uppercase">
              {userName}
            </span>
            <button 
              onClick={handleLogout} 
              className="p-2 bg-red-500/20 text-red-400 rounded-full hover:bg-red-500 hover:text-white transition-all"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>
      )}

      {/* Main Landing Page */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
        <div className="bg-white p-10 rounded-[3rem] shadow-2xl w-full max-w-sm border border-gray-100">
          <div className="w-20 h-20 bg-blue-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-blue-600">
            <PackageIcon size={40} />
          </div>
          
          <h1 className="text-3xl font-black text-slate-800 mb-2 italic uppercase tracking-tighter">
            Umang BKK
          </h1>
          <p className="text-gray-400 mb-10 font-bold uppercase text-[10px] tracking-[0.2em]">
            Warehouse Management System
          </p>
          
          <div className="space-y-4">
            {!isLoggedIn ? (
              <Link href="/login" 
                className="block w-full bg-blue-600 text-white py-5 rounded-[1.5rem] font-black shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all text-lg uppercase">
                เข้าสู่ระบบ (Login)
              </Link>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                <Link href="/scan" 
                  className="block w-full bg-blue-600 text-white py-4 rounded-[1.5rem] font-black shadow-lg hover:bg-blue-700 transition-all uppercase text-sm">
                  ไปหน้าสแกนสินค้า
                </Link>
                <Link href="/dashboard" 
                  className="block w-full bg-slate-800 text-white py-4 rounded-[1.5rem] font-black shadow-lg hover:bg-slate-900 transition-all uppercase text-sm">
                  ไปหน้า Dashboard
                </Link>
              </div>
            )}
            <p className="text-[9px] text-gray-300 font-bold uppercase tracking-widest pt-4">
              v 3.0 • Secure Access
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ไอคอนเสริมสำหรับหน้าแรก
function PackageIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m7.5 4.27 9 5.15" /><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" />
    </svg>
  );
}
