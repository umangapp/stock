'use client'
import { Info, Zap, Plus, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

export default function SystemSettingsTab({
  newVersionInput,
  setNewVersionInput,
  scanDelay,
  setScanDelay,
  updateSettings,
  inputName,
  setInputName,
  inputPrefix,
  setInputPrefix,
  masterProducts,
  fetchData,
  inputUnit,
  setInputUnit,
  masterUnits
}: any) {
  return (
    <div className="space-y-8 animate-in fade-in text-slate-800 no-print">
      <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900">System Settings</h2>
       
      <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-blue-500/20 shadow-xl text-white mb-8 space-y-8">
        <div className="space-y-4">
          <h4 className="font-black uppercase text-sm text-blue-400 tracking-widest flex items-center gap-2"><Info size={18}/> App Version</h4>
          <input type="text" className="w-full sm:w-64 bg-white/5 p-5 rounded-2xl border border-white/10 outline-none focus:border-blue-500 font-black text-xl" value={newVersionInput} onChange={e => setNewVersionInput(e.target.value)} />
        </div>

        <div className="space-y-5 border-t border-white/5 pt-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <h4 className="font-black uppercase text-sm text-blue-400 tracking-widest flex items-center gap-2">
              <Zap size={18}/> ความไวการสแกน
            </h4>
            <span className="bg-blue-600/30 text-blue-300 border border-blue-500/40 px-4 py-1.5 rounded-xl text-xs font-mono font-black shadow-inner">
              {(scanDelay / 1000).toFixed(1)} วินาที ({scanDelay.toLocaleString()} ms)
            </span>
          </div>

          <div className="space-y-3">
            <input 
              type="range" 
              min="300" 
              max="3000" 
              step="100" 
              className="w-full h-3 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500" 
              value={scanDelay} 
              onChange={e => setScanDelay(Number(e.target.value))} 
            />

            <div className="grid grid-cols-4 text-center text-[10px] font-black uppercase pt-2 border-t border-white/10">
              <div className="text-left flex flex-col items-start">
                <span className="text-emerald-400 font-black">🚀 0.3s</span>
                <span className="text-[9px] text-slate-500 font-bold">(เร็วสุด)</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-blue-300 font-black">1.0s</span>
                <span className="text-[9px] text-slate-500 font-bold">(แนะนำ)</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-amber-300 font-black">2.0s</span>
                <span className="text-[9px] text-slate-500 font-bold">(ทั่วไป)</span>
              </div>
              <div className="text-right flex flex-col items-end">
                <span className="text-rose-400 font-black">🛡️ 3.0s</span>
                <span className="text-[9px] text-slate-500 font-bold">(ช้าสุด / กันยิงซ้ำ)</span>
              </div>
            </div>
          </div>

          <button onClick={updateSettings} className="bg-blue-600 hover:bg-blue-500 text-white px-12 py-5 rounded-2xl font-black uppercase shadow-lg active:scale-95 transition-all">
            บันทึกตั้งค่า
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
            <h4 className="font-black uppercase text-sm mb-6 text-blue-600 tracking-widest">มาสเตอร์สินค้า (ตัวย่อ/Prefix)</h4>
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
               <input type="text" className="flex-[2] bg-slate-50 p-4 rounded-2xl border outline-none focus:border-blue-500 font-bold" placeholder="ชื่อสินค้าหลัก" value={inputName} onChange={e => setInputName(e.target.value)} />
               <input type="text" className="flex-1 bg-slate-50 p-4 rounded-2xl border outline-none focus:border-blue-500 font-black uppercase text-blue-600 text-center" placeholder="ตัวย่อ" maxLength={3} value={inputPrefix} onChange={e => setInputPrefix(e.target.value)} />
               <button onClick={() => { supabase.from('settings_product_master').insert([{name: inputName, prefix: inputPrefix}]).then(() => {setInputName(''); setInputPrefix(''); fetchData();}) }} className="bg-blue-600 text-white p-4 rounded-2xl shadow-lg active:scale-95"><Plus/></button>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-2 font-bold">{masterProducts.map((item: any) => (<div key={item.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm"><span>{item.name} <span className="text-blue-600 ml-2">[{item.prefix}]</span></span><button onClick={() => { if(confirm("ลบ?")) supabase.from('settings_product_master').delete().eq('id', item.id).then(()=>fetchData()) }} className="text-red-400 p-2"><Trash2 size={18}/></button></div>))}</div>
         </div>

         <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
            <h4 className="font-black uppercase text-sm mb-6 text-blue-600 tracking-widest">จัดการหน่วยนับ</h4>
            <div className="flex gap-3 mb-6">
               <input type="text" className="flex-1 bg-slate-50 p-4 rounded-2xl border outline-none focus:border-blue-500 font-bold" placeholder="หน่วยนับ..." value={inputUnit} onChange={e => setInputUnit(e.target.value)} />
               <button onClick={() => { supabase.from('settings_units').insert([{unit: inputUnit}]).then(() => {setInputUnit(''); fetchData();}) }} className="bg-blue-600 text-white p-4 rounded-2xl shadow-lg active:scale-95"><Plus/></button>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-2 font-black">{masterUnits.map((item: any) => (<div key={item.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm"><span>{item.unit}</span><button onClick={() => { if(confirm("ลบ?")) supabase.from('settings_units').delete().eq('id', item.id).then(()=>fetchData()) }} className="text-red-400 p-2"><Trash2 size={18}/></button></div>))}</div>
         </div>
      </div>
    </div>
  )
}
