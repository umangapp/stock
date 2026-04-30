// เพิ่มตัวแปร state ใน AdminDashboard
const [scanDelay, setScanDelay] = useState(1000)

// ในฟังก์ชัน fetchData เพิ่มการดึงค่า:
if (ver) { 
  setAppVersion(ver.version); 
  setNewVersionInput(ver.version);
  setScanDelay(ver.scan_delay || 1000); // ดึงค่าหน่วงเวลามาโชว์
}

// ในฟังก์ชัน updateVersion (หรือสร้างใหม่ชื่อ updateSettings)
const updateSettings = async () => {
  const { error } = await supabase.from('settings_app_config')
    .update({ 
      version: newVersionInput,
      scan_delay: scanDelay 
    }).eq('id', 1)
  if (!error) alert("✅ บันทึกการตั้งค่าระบบเรียบร้อย");
}

// UI ในหน้า Settings (เพิ่มช่องนี้เข้าไปข้างๆ หรือใต้เวอร์ชั่น)
<div className="bg-slate-900 p-8 rounded-[2.5rem] border border-blue-500/20 shadow-xl text-white mb-8">
  <h4 className="font-black uppercase text-sm mb-6 text-blue-400 tracking-widest flex items-center gap-2">
    <Zap size={18}/> ความไวการสแกน (Turbo Delay)
  </h4>
  <div className="flex flex-col sm:flex-row gap-4">
    <div className="flex-1">
      <input 
        type="range" min="500" max="3000" step="100"
        className="w-full h-2 bg-blue-900 rounded-lg appearance-none cursor-pointer"
        value={scanDelay} 
        onChange={e => setScanDelay(Number(e.target.value))} 
      />
      <div className="flex justify-between text-[10px] font-black text-slate-500 mt-2">
        <span>เร็ว (0.5s)</span>
        <span className="text-blue-400 text-lg">{scanDelay/1000} วินาที</span>
        <span>ช้า (3s)</span>
      </div>
    </div>
    <button onClick={updateSettings} className="bg-blue-600 text-white px-10 py-5 rounded-2xl font-black uppercase">บันทึกตั้งค่า</button>
  </div>
</div>
