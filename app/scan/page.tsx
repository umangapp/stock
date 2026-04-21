{/* 2. ส่วนระบุจำนวนสินค้า (ปุ่มด่วน + ช่องกรอกเอง) */}
{mode !== 'none' && (
  <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
    
    {/* ส่วนปุ่มด่วนและช่องกรอก */}
    <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-bold text-gray-500 uppercase">ระบุจำนวน ({product.unit})</label>
        <button onClick={() => setAdjustment(0)} className="text-blue-600 text-xs font-bold underline">ล้างค่า</button>
      </div>

      <div className="flex gap-3">
        {/* ช่องกรอกตัวเลขโดยตรง */}
        <input 
          type="number" 
          min="0"
          className="flex-1 text-3xl font-black p-4 rounded-2xl bg-gray-50 border-2 border-gray-100 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all text-center"
          value={adjustment === 0 ? '' : adjustment}
          onChange={(e) => setAdjustment(Math.max(0, parseInt(e.target.value) || 0))}
          placeholder="0"
        />
        
        {/* ปุ่มลบทีละ 1 (กรณีพิมพ์เกินหรือกดเกิน) */}
        <button 
          onClick={() => setAdjustment(prev => Math.max(0, prev - 1))}
          className="bg-gray-100 text-gray-600 w-16 rounded-2xl flex items-center justify-center active:scale-90 transition-all"
        >
          <Minus size={24} />
        </button>
      </div>

      {/* ปุ่มกดด่วน (บวกเพิ่มจากค่าปัจจุบัน) */}
      <div className="grid grid-cols-4 gap-2">
        {[1, 5, 10, 50].map(num => (
          <button 
            key={num} 
            onClick={() => setAdjustment(prev => prev + num)} 
            className={`p-3 rounded-xl font-bold active:scale-90 transition-all ${
              mode === 'receive' 
                ? 'bg-green-50 text-green-700 border border-green-100' 
                : 'bg-red-50 text-red-700 border border-red-100'
            }`}
          >
            {mode === 'receive' ? '+' : '-'}{num}
          </button>
        ))}
      </div>
    </div>

    {/* ส่วนสรุปผลการคำนวณ */}
    <div className={`p-5 rounded-3xl border-2 border-dashed transition-colors ${
      mode === 'receive' ? 'bg-green-50/50 border-green-200' : 'bg-red-50/50 border-red-200'
    }`}>
      <div className="text-gray-600 font-medium flex justify-between items-center mb-1">
        <span>สต๊อกเดิม: {product.current_stock}</span>
        <span className="text-xs font-bold px-2 py-1 bg-white rounded-lg shadow-sm border">
          {mode === 'receive' ? 'เพิ่มเข้า' : 'หักออก'}
        </span>
      </div>
      <div className="text-xl font-bold text-gray-800">
        ปรับสต๊อกใหม่ = {product.current_stock} {mode === 'receive' ? '+' : '-'} {adjustment} = 
        <span className={`ml-2 text-3xl font-black ${mode === 'receive' ? 'text-green-600' : 'text-red-600'}`}>
          {mode === 'receive' ? product.current_stock + adjustment : product.current_stock - adjustment}
        </span>
      </div>
    </div>

    {/* ช่องหมายเหตุ (เหมือนเดิม) */}
    <div>
      <label className="text-xs font-bold text-gray-400 ml-1 uppercase tracking-wider">หมายเหตุ (ถ้ามี)</label>
      <textarea 
        className="w-full border p-4 rounded-2xl mt-1 outline-none focus:ring-4 focus:ring-blue-50 border-gray-200" 
        rows={2} 
        value={note} 
        onChange={(e) => setNote(e.target.value)} 
        placeholder="ระบุหมายเหตุการทำรายการ..." 
      />
    </div>

    <div className="flex gap-3">
       <button onClick={() => setMode('none')} className="flex-1 bg-white border border-gray-200 text-gray-500 py-5 rounded-2xl font-bold active:bg-gray-50">ยกเลิก</button>
       <button 
         onClick={handleSaveRequest} 
         disabled={adjustment === 0}
         className={`flex-[2] py-5 rounded-2xl font-bold shadow-xl transition-all active:scale-95 ${
           adjustment === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 text-white shadow-blue-200'
         }`}
       >
         บันทึกรายการ
       </button>
    </div>
  </div>
)}
