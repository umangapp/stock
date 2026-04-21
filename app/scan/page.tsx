{/* Number Input Group - แก้ไขเรื่องล้นขอบขวา */}
<div className="flex w-full items-stretch gap-2 h-16">
  <input 
    type="number" 
    inputMode="decimal" // ช่วยให้มือถือโชว์แป้นตัวเลขแบบมีจุดทศนิยม
    className={`flex-1 w-0 min-w-0 text-3xl font-black rounded-2xl bg-gray-50 border-2 text-center outline-none transition-all ${
      isStockShort 
        ? 'border-red-500 text-red-600 bg-red-50' 
        : 'border-transparent focus:border-blue-500'
    }`} 
    value={adjustment || ''} 
    onChange={(e) => {
      const val = parseInt(e.target.value);
      setAdjustment(isNaN(val) ? 0 : Math.max(0, val));
    }}
    placeholder="0"
  />
  
  {/* ปุ่มลบ ล็อคขนาดไม่ให้โดนเบียด */}
  <button 
    onClick={() => setAdjustment(prev => Math.max(0, prev - 1))} 
    className="w-16 flex-shrink-0 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400 active:bg-gray-200"
  >
    <Minus size={24} />
  </button>
</div>
