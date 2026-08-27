'use client'
import { useState } from 'react'
import { Search, Calendar, User, RotateCcw, Clock } from 'lucide-react'
import SKUColoredAdmin from '@/components/SKUColored'

export default function HistoryReportTab({ transactions, userProfiles }: any) {
  const [reportSearchSku, setReportSearchSku] = useState('')
  const [reportSearchDate, setReportSearchDate] = useState('')
  const [reportSearchUser, setReportSearchUser] = useState('')
  const [reportSearchType, setReportSearchType] = useState('all')

  const filteredReports = transactions.filter((log: any) => {
    const matchesSku = !reportSearchSku || 
      (log.products?.sku_15_digits || '').toLowerCase().includes(reportSearchSku.toLowerCase()) ||
      (log.products?.name || '').toLowerCase().includes(reportSearchSku.toLowerCase()) ||
      (log.products?.prefix || '').toLowerCase().includes(reportSearchSku.toLowerCase());

    const logDateStr = log.created_at ? new Date(log.created_at).toISOString().split('T')[0] : '';
    const matchesDate = !reportSearchDate || logDateStr === reportSearchDate;

    const matchesUser = !reportSearchUser || 
      (log.created_by || '').toLowerCase() === reportSearchUser.toLowerCase();

    const matchesType = reportSearchType === 'all' || log.type === reportSearchType;

    return matchesSku && matchesDate && matchesUser && matchesType;
  });

  return (
    <div className="space-y-6 animate-in fade-in text-slate-800 no-print">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900">รายงานประวัติการทำงาน</h2>
          <p className="text-xs text-slate-400 font-bold mt-1">ประวัติการสแกนเข้า สแกนออก และการ Import สต๊อกของผู้ใช้งานทั้งหมด</p>
        </div>
        <span className="bg-blue-50 text-blue-600 border border-blue-200 px-4 py-2 rounded-2xl text-xs font-black">
          แสดงผล {filteredReports.length} / {transactions.length} รายการ
        </span>
      </div>

      <div className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
            <input 
              type="text" 
              placeholder="ค้นหา SKU หรือ สินค้า..." 
              className="w-full bg-slate-50 border border-slate-200 p-3 pl-10 rounded-xl outline-none focus:border-blue-500 text-xs font-bold"
              value={reportSearchSku}
              onChange={(e) => setReportSearchSku(e.target.value)}
            />
          </div>

          <div className="relative">
            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16}/>
            <input 
              type="date" 
              className="w-full bg-slate-50 border border-slate-200 p-3 pl-10 rounded-xl outline-none focus:border-blue-500 text-xs font-bold text-slate-700"
              value={reportSearchDate}
              onChange={(e) => setReportSearchDate(e.target.value)}
            />
          </div>

          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16}/>
            <select 
              className="w-full bg-slate-50 border border-slate-200 p-3 pl-10 rounded-xl outline-none focus:border-blue-500 text-xs font-bold text-slate-700 appearance-none cursor-pointer"
              value={reportSearchUser}
              onChange={(e) => setReportSearchUser(e.target.value)}
            >
              <option value="">-- ผู้ดำเนินการทั้งหมด --</option>
              {userProfiles.map((u: any) => (
                <option key={u.id} value={u.full_name}>{u.full_name}</option>
              ))}
            </select>
          </div>

          <div>
            <select 
              className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl outline-none focus:border-blue-500 text-xs font-bold text-slate-700 appearance-none cursor-pointer"
              value={reportSearchType}
              onChange={(e) => setReportSearchType(e.target.value)}
            >
              <option value="all">-- ประเภททั้งหมด --</option>
              <option value="receive">สแกนนำเข้า (+)</option>
              <option value="issue">สแกนเบิกจ่าย (-)</option>
              <option value="import">IMPORT สต๊อก</option>
            </select>
          </div>
        </div>

        {(reportSearchSku || reportSearchDate || reportSearchUser || reportSearchType !== 'all') && (
          <div className="flex justify-end pt-1">
            <button 
              onClick={() => {
                setReportSearchSku('');
                setReportSearchDate('');
                setReportSearchUser('');
                setReportSearchType('all');
              }}
              className="text-xs font-black text-rose-500 hover:text-rose-600 flex items-center gap-1 active:scale-95 transition-all"
            >
              <RotateCcw size={14}/> ล้างตัวกรองทั้งหมด
            </button>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                <th className="p-4">วัน-เวลาที่ทำรายการ</th>
                <th className="p-4 text-center">ประเภท</th>
                <th className="p-4">สินค้า / SKU</th>
                <th className="p-4 text-center">จำนวน</th>
                <th className="p-4 text-center">สต๊อก (เดิม → ใหม่)</th>
                <th className="p-4 text-right">ผู้ดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 italic">ไม่พบข้อมูลประวัติที่ตรงตามเงื่อนไขการค้นหา</td>
                </tr>
              ) : (
                filteredReports.map((log: any) => {
                  const isReceive = log.type === 'receive';
                  const isImport = log.type === 'import';
                  const isIssue = log.type === 'issue';

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-all">
                      <td className="p-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Clock size={12} className="text-blue-500" />
                          <span>{new Date(log.created_at).toLocaleDateString('th-TH')} {new Date(log.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</span>
                        </div>
                      </td>
                      <td className="p-4 text-center whitespace-nowrap">
                        <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                          isReceive ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                          isImport ? 'bg-blue-50 text-blue-600 border-blue-200' :
                          'bg-rose-50 text-rose-600 border-rose-200'
                        }`}>
                          {isReceive ? 'นำเข้า (+)' : isImport ? 'IMPORT' : 'เบิกจ่าย (-)'}
                        </span>
                      </td>
                      <td className="p-4">
                        <p className="font-black text-slate-900 uppercase text-sm leading-tight">{log.products?.name}</p>
                        <SKUColoredAdmin sku={log.products?.sku_15_digits} prefix={log.products?.prefix} />
                      </td>
                      <td className="p-4 text-center whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-xl font-black text-sm ${
                          isIssue ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {isIssue ? '-' : '+'}{log.amount} {!log.products?.weight && log.products?.unit}
                        </span>
                      </td>
                      <td className="p-4 text-center font-mono font-black text-blue-600 whitespace-nowrap">
                        {log.old_stock ?? 0} → {log.new_stock ?? log.amount}
                      </td>
                      <td className="p-4 text-right whitespace-nowrap">
                        <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-xl text-[10px] font-black uppercase">
                          {log.created_by || 'SYSTEM'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
