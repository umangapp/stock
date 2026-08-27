'use client'
import { useState, useEffect } from 'react'
import { Search, Calendar, User, RotateCcw, Clock, ChevronLeft, ChevronRight } from 'lucide-react'
import SKUColoredAdmin from '@/components/SKUColored'

export default function HistoryReportTab({ transactions, userProfiles }: any) {
  const [reportSearchSku, setReportSearchSku] = useState('')
  const [reportStartDate, setReportStartDate] = useState('')
  const [reportEndDate, setReportEndDate] = useState('')
  const [reportSearchUser, setReportSearchUser] = useState('')
  const [reportSearchType, setReportSearchType] = useState('all')

  // 🌟 State สำหรับการแบ่งหน้า (Pagination)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50

  // 🌟 ฟังก์ชันแปลง YYYY-MM-DD เป็น วัน/เดือน/ปี (DD/MM/YYYY)
  const formatDateToThai = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  // รีเซ็ตไปหน้า 1 เมื่อมีการเปลี่ยนตัวกรองค้นหา
  useEffect(() => {
    setCurrentPage(1);
  }, [reportSearchSku, reportStartDate, reportEndDate, reportSearchUser, reportSearchType]);

  const handleClearFilters = () => {
    setReportSearchSku('');
    setReportStartDate('');
    setReportEndDate('');
    setReportSearchUser('');
    setReportSearchType('all');
    setCurrentPage(1);
  };

  const isFiltered = Boolean(
    reportSearchSku || reportStartDate || reportEndDate || reportSearchUser || reportSearchType !== 'all'
  );

  // 1. กรองข้อมูลทั้งหมดตามเงื่อนไข
  const filteredReports = transactions.filter((log: any) => {
    const matchesSku = !reportSearchSku || 
      (log.products?.sku_15_digits || '').toLowerCase().includes(reportSearchSku.toLowerCase()) ||
      (log.products?.name || '').toLowerCase().includes(reportSearchSku.toLowerCase()) ||
      (log.products?.prefix || '').toLowerCase().includes(reportSearchSku.toLowerCase());

    const logDateStr = log.created_at ? new Date(log.created_at).toISOString().split('T')[0] : '';
    const matchesStart = !reportStartDate || logDateStr >= reportStartDate;
    const matchesEnd = !reportEndDate || logDateStr <= reportEndDate;

    const matchesUser = !reportSearchUser || 
      (log.created_by || '').toLowerCase() === reportSearchUser.toLowerCase();

    const matchesType = reportSearchType === 'all' || log.type === reportSearchType;

    return matchesSku && matchesStart && matchesEnd && matchesUser && matchesType;
  });

  // 2. คำนวณการแบ่งหน้า
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedReports = filteredReports.slice(startIndex, endIndex);

  // 🌟 Component ปุ่มสลับหน้า (Pagination Controls)
  const renderPaginationControls = () => {
    if (totalPages <= 1) return null;

    const maxVisibleButtons = 5;
    let startPage = Math.max(1, safeCurrentPage - 2);
    let endPage = Math.min(totalPages, startPage + maxVisibleButtons - 1);

    if (endPage - startPage + 1 < maxVisibleButtons) {
      startPage = Math.max(1, endPage - maxVisibleButtons + 1);
    }

    const pageNumbers = [];
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="flex items-center gap-1.5">
        {/* ปุ่มหน้าก่อนหน้า */}
        <button
          onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
          disabled={safeCurrentPage === 1}
          className="p-2 rounded-xl border bg-white border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-white text-xs font-bold transition-all shadow-sm"
          title="หน้าก่อนหน้า"
        >
          <ChevronLeft size={16} />
        </button>

        {/* ปุ่มหน้า 1 ถ้ากรณีอยู่ไกล */}
        {startPage > 1 && (
          <>
            <button
              onClick={() => setCurrentPage(1)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all shadow-sm"
            >
              1
            </button>
            {startPage > 2 && <span className="text-xs text-slate-400 px-0.5">...</span>}
          </>
        )}

        {/* ปุ่มตัวเลขหน้า */}
        {pageNumbers.map((page) => (
          <button
            key={page}
            onClick={() => setCurrentPage(page)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
              safeCurrentPage === page
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 shadow-sm'
            }`}
          >
            {page}
          </button>
        ))}

        {/* ปุ่มหน้าสุดท้าย ถ้ากรณีอยู่ไกล */}
        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="text-xs text-slate-400 px-0.5">...</span>}
            <button
              onClick={() => setCurrentPage(totalPages)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all shadow-sm"
            >
              {totalPages}
            </button>
          </>
        )}

        {/* ปุ่มหน้าถัดไป */}
        <button
          onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
          disabled={safeCurrentPage === totalPages}
          className="p-2 rounded-xl border bg-white border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-white text-xs font-bold transition-all shadow-sm"
          title="หน้าถัดไป"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in text-slate-800 no-print">
      
      {/* 🌟 Header + สรุปจำนวน + Pagination มุมขวาบน */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900">รายงานประวัติการทำงาน</h2>
          <p className="text-xs text-slate-400 font-bold mt-1">ประวัติการสแกนเข้า สแกนออก และการ Import สต๊อกของผู้ใช้งานทั้งหมด</p>
        </div>

        {/* ฝั่งมุมขวาบน */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 self-end sm:self-auto">
          <span className="bg-blue-50 text-blue-600 border border-blue-200 px-4 py-2 rounded-2xl text-xs font-black shadow-sm">
            แสดงผล {filteredReports.length > 0 ? startIndex + 1 : 0} - {Math.min(endIndex, filteredReports.length)} จาก {filteredReports.length} รายการ
          </span>
          {renderPaginationControls()}
        </div>
      </div>

      {/* แผงปุ่มค้นหาและ Filter */}
      <div className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          
          {/* 1. ค้นหา SKU / ชื่อสินค้า */}
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

          {/* 2. ตั้งแต่วันที่ */}
          <div className="relative min-h-[42px]">
            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" size={16}/>
            <input 
              type="date" 
              title="ตั้งแต่วันที่"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
              value={reportStartDate}
              onChange={(e) => setReportStartDate(e.target.value)}
            />
            <div className="w-full h-full bg-slate-50 border border-slate-200 p-3 pl-10 rounded-xl text-xs font-bold text-slate-700 flex items-center">
              {reportStartDate ? (
                <span className="text-slate-900 font-black">{formatDateToThai(reportStartDate)}</span>
              ) : (
                <span className="text-slate-400 font-bold">เริ่มต้น (วัน/เดือน/ปี)</span>
              )}
            </div>
          </div>

          {/* 3. ถึงวันที่ */}
          <div className="relative min-h-[42px]">
            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" size={16}/>
            <input 
              type="date" 
              title="ถึงวันที่"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
              value={reportEndDate}
              onChange={(e) => setReportEndDate(e.target.value)}
            />
            <div className="w-full h-full bg-slate-50 border border-slate-200 p-3 pl-10 rounded-xl text-xs font-bold text-slate-700 flex items-center">
              {reportEndDate ? (
                <span className="text-slate-900 font-black">{formatDateToThai(reportEndDate)}</span>
              ) : (
                <span className="text-slate-400 font-bold">ถึงวันที่ (วัน/เดือน/ปี)</span>
              )}
            </div>
          </div>

          {/* 4. ผู้ดำเนินการ */}
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

          {/* 5. ประเภทธุรกรรม */}
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

        {/* แถบแสดงสถานะช่วงวันที่ + ปุ่มเคลียร์ทุกช่อง */}
        <div className="flex justify-between items-center pt-2 border-t border-slate-100">
          <div className="text-[11px] text-slate-400 font-bold">
            {(reportStartDate || reportEndDate) && (
              <span>ช่วงวันที่: <strong className="text-slate-700">{formatDateToThai(reportStartDate) || 'เริ่มต้น'}</strong> ถึง <strong className="text-slate-700">{formatDateToThai(reportEndDate) || 'ปัจจุบัน'}</strong></span>
            )}
          </div>
          <button 
            onClick={handleClearFilters}
            disabled={!isFiltered}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-sm ${
              isFiltered 
                ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 active:scale-95 cursor-pointer' 
                : 'bg-slate-100 text-slate-300 border border-slate-200 cursor-not-allowed opacity-50'
            }`}
          >
            <RotateCcw size={14}/> เคลียร์ช่องค้นหาทั้งหมด
          </button>
        </div>
      </div>

      {/* ตารางแสดงผลประวัติ */}
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
              {paginatedReports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 italic">ไม่พบข้อมูลประวัติที่ตรงตามเงื่อนไขการค้นหา</td>
                </tr>
              ) : (
                paginatedReports.map((log: any) => {
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

        {/* 🌟 Pagination Controls มุมขวาล่างใต้ตาราง */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-6 mt-2 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-400">
              หน้า <strong className="text-slate-700">{safeCurrentPage}</strong> จาก <strong className="text-slate-700">{totalPages}</strong> (แสดงผล {startIndex + 1} - {Math.min(endIndex, filteredReports.length)} จาก {filteredReports.length} รายการ)
            </span>
            {renderPaginationControls()}
          </div>
        )}
      </div>

    </div>
  )
}
