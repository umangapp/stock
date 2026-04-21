// --- ส่วน Logic การจัดกลุ่มข้อมูล (วางไว้ก่อน return) ---
const groupedInventory = products.reduce((acc: any, item: any) => {
  if (!acc[item.name]) {
    acc[item.name] = {
      name: item.name,
      totalStock: 0,
      unit: item.unit,
      items: []
    };
  }
  acc[item.name].totalStock += item.current_stock;
  acc[item.name].items.push(item);
  return acc;
}, {});

const inventoryList = Object.values(groupedInventory);

// --- ส่วนการแสดงผล (JSX) ใน Tab Inventory ---
{activeTab === 'inventory' && (
  <div className="space-y-6 animate-in slide-in-from-right-5 duration-500">
    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
      <div>
        <h2 className="text-2xl font-black text-slate-800 italic uppercase">สรุปสต๊อกตามชื่อสินค้า</h2>
        <p className="text-xs text-slate-400 font-bold">รวมยอดสินค้าชื่อเดียวกัน และกดดูรายละเอียดรหัสภายในได้</p>
      </div>
      <div className="relative w-full md:w-96">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
        <input 
          type="text" 
          placeholder="ค้นหาชื่อสินค้า..." 
          className="w-full pl-12 pr-4 py-3 bg-white rounded-2xl border border-slate-100 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none text-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
    </div>

    <div className="grid gap-4">
      {inventoryList
        .filter((group: any) => group.name.includes(searchQuery))
        .map((group: any) => (
        <div key={group.name} className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden transition-all hover:shadow-md">
          {/* Main Row: แสดงชื่อสินค้าและยอดรวม */}
          <div className="p-6 flex items-center justify-between bg-white">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                <Package size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800 uppercase leading-none mb-1">{group.name}</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  มีทั้งหมด {group.items.length} รายการรหัส
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-slate-400 font-black uppercase mb-1">สต๊อกรวม</p>
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-black ${group.totalStock < 10 ? 'text-red-500' : 'text-slate-800'}`}>
                  {group.totalStock}
                </span>
                <span className="text-xs font-bold text-slate-400">{group.unit}</span>
              </div>
            </div>
          </div>

          {/* Drill Down Area: รายละเอียดรหัสสินค้าด้านใน */}
          <div className="bg-slate-50/50 border-t border-slate-50 p-4">
            <div className="space-y-2">
              <p className="px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">รายละเอียดรหัสสินค้า (Drill Down)</p>
              {group.items.map((item: any) => (
                <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between shadow-sm hover:border-blue-200 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="text-[10px] bg-slate-100 px-2 py-1 rounded font-mono font-bold text-slate-500">
                      {item.sku_15_digits}
                    </div>
                    <span className="text-xs font-bold text-slate-600">{item.prefix || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <span className={`text-sm font-black ${item.current_stock < 5 ? 'text-red-500' : 'text-slate-700'}`}>
                        {item.current_stock}
                      </span>
                      <span className="ml-1 text-[10px] text-slate-400 uppercase font-bold">{item.unit}</span>
                    </div>
                    <div className="flex gap-1">
                      <button className="p-2 text-slate-300 hover:text-blue-500 transition-colors"><QrCode size={14}/></button>
                      <button className="p-2 text-slate-300 hover:text-green-500 transition-colors"><Printer size={14}/></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
)}
