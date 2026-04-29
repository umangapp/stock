// --- มองหาจุดที่แสดง Activity Feed (Tab Dashboard) ---
// แก้ไขส่วน .map((log: any) => ( ... )) ในช่อง Activity Feed ให้เป็นโค้ดชุดนี้

{logs.map((log: any) => (
  <div key={log.id} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col gap-4 text-slate-900">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-2xl font-black uppercase leading-none">{log.products?.name}</p>
        {/* 🌟 แสดงขนาดใต้สินค้าใน Dashboard */}
        <p className="text-[10px] font-bold text-slate-400 italic mt-2 uppercase">
          ขนาด: {log.products?.width}x{log.products?.height}x{log.products?.length} มม.
        </p>
      </div>
      <span className={`text-4xl font-black ${log.type === 'receive' ? 'text-green-600' : 'text-red-600'}`}>
        {log.type === 'receive' ? '+' : '-'} {log.amount}
      </span>
    </div>
    
    <div className="space-y-3">
      {/* 🌟 แสดงการคำนวณสต๊อก 15 + 5 = 20 */}
      <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
        <TrendingUp size={16} className="text-blue-500" />
        <p className="text-sm font-black text-slate-700 uppercase">
          ยอดสต๊อก: {log.old_stock || 0} {log.type === 'receive' ? '+' : '-'} {log.amount} = <span className="text-blue-600 font-black">{log.new_stock || 0}</span>
        </p>
      </div>
      
      <p className="text-lg font-mono font-black text-blue-700 tracking-widest uppercase bg-blue-50 p-2 rounded-lg border border-blue-100">
        {log.products?.sku_15_digits}
      </p>
      
      <div className="flex justify-between text-lg font-black text-slate-800 uppercase tracking-tighter">
          <span>{new Date(log.created_at).toLocaleDateString('th-TH')}</span>
          <span className="flex items-center gap-1"><Clock size={18}/> {new Date(log.created_at).toLocaleTimeString('th-TH')}</span>
      </div>
    </div>
  </div>
))}
