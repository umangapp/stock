'use client'
import { useState } from 'react'
import { TrendingUp, PackageMinus, PackagePlus, AlertCircle, Award, Calendar } from 'lucide-react'

export default function ExecutiveReportTab() {
  const [period, setPeriod] = useState('1m')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

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
            <h3 className="text-3xl font-black text-slate-900">45,230</h3>
            <p className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded inline-block mt-2">รวมทุกหน่วยนับ</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-[2rem] border shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <p className="text-sm font-bold text-slate-500">ยอดเบิกจ่าย (Out)</p>
            <div className="p-2 bg-red-50 text-red-600 rounded-xl"><PackageMinus size={18}/></div>
          </div>
          <div>
            <h3 className="text-3xl font-black text-slate-900">1,420</h3>
            <p className="text-[10px] font-bold text-slate-400 mt-2">รายการที่เบิกในช่วงเวลานี้</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-[2rem] border shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <p className="text-sm font-bold text-slate-500">ยอดรับเข้า (In)</p>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><PackagePlus size={18}/></div>
          </div>
          <div>
            <h3 className="text-3xl font-black text-slate-900">2,150</h3>
            <p className="text-[10px] font-bold text-slate-400 mt-2">รายการที่รับในช่วงเวลานี้</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-[2rem] border shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <p className="text-sm font-bold text-slate-500">จุดวิกฤต (Low Stock)</p>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl"><AlertCircle size={18}/></div>
          </div>
          <div>
            <h3 className="text-3xl font-black text-red-600 animate-pulse">12</h3>
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
            <h3 className="text-2xl font-black text-white leading-tight">กระดาษหลอดย่น</h3>
            <p className="text-emerald-200 text-xs font-bold mt-1">CT 4x6x1000</p>
            <p className="text-[10px] font-black text-emerald-900 bg-emerald-400 px-2 py-1 rounded inline-block mt-3 shadow-sm">เบิกออก 450 เส้น</p>
          </div>
        </div>
      </div>

      {/* 3. Charts & Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-black text-slate-800">แนวโน้มความเคลื่อนไหว (Movement Trend)</h3>
              <p className="text-xs font-bold text-slate-400">แสดงปริมาณรับเข้า และ เบิกจ่าย</p>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button className="px-3 py-1.5 text-xs font-bold bg-white shadow-sm rounded-lg text-slate-800">ยอดเบิกจ่าย</button>
              <button className="px-3 py-1.5 text-xs font-bold text-slate-500 rounded-lg hover:text-slate-700">ยอดรับเข้า</button>
            </div>
          </div>
          <div className="h-64 flex items-end justify-between gap-2 border-b border-slate-100 pb-2 pt-4">
            {[40, 70, 45, 90, 65, 30, 85, 100, 50, 75, 40, 60, 80, 55].map((h, i) => (
              <div key={i} className="w-full bg-emerald-100 hover:bg-emerald-500 transition-all rounded-t-md relative group cursor-pointer" style={{ height: `${h}%` }}>
                <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded pointer-events-none z-10">
                  {h * 10}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-3 text-[10px] font-bold text-slate-400">
            <span>เริ่มต้น</span>
            <span>กลางรอบ</span>
            <span>สิ้นสุด</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm h-full">
          <div className="mb-6">
            <h3 className="text-lg font-black text-slate-800">สัดส่วนสต๊อก (Stock Breakdown)</h3>
            <p className="text-xs font-bold text-slate-400">แยกตามกลุ่มสินค้า</p>
          </div>
          
          <div className="space-y-6 mt-4">
            <div>
              <div className="flex justify-between text-sm font-bold mb-2">
                <span className="text-slate-700 flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div> กระดาษหลอดย่น (CT)</span>
                <span className="text-slate-500">52%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5">
                <div className="bg-amber-500 h-2.5 rounded-full" style={{ width: '52%' }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm font-bold mb-2">
                <span className="text-slate-700 flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div> กระดาษฉนวน (PP)</span>
                <span className="text-slate-500">28%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5">
                <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: '28%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm font-bold mb-2">
                <span className="text-slate-700 flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div> ไม้รอง (WD)</span>
                <span className="text-slate-500">12%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5">
                <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: '12%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm font-bold mb-2">
                <span className="text-slate-700 flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-purple-500"></div> อื่นๆ (Others)</span>
                <span className="text-slate-500">8%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5">
                <div className="bg-purple-500 h-2.5 rounded-full" style={{ width: '8%' }}></div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
