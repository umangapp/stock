// 🌟 🤖 ฟังก์ชันแยกสี SKU สำหรับหน้า Scan (อัปเกรดรองรับ X ใหญ่ + ปรับท้ายเป็นสีเทา)
const SKUColored = ({ sku, prefix, isDark = false }: { sku: string; prefix: string; isDark?: boolean }) => {
  if (!sku) return null;
  const preLen = prefix?.length || 2;
  
  // 🔒 เปลี่ยนเป็น /[xX]+$/ เพื่อดักจับทั้ง x เล็ก และ X ใหญ่ ไม่ให้ตำแหน่งตัวเลขเลื่อน
  const paddingMatch = sku.match(/[xX]+$/);
  const paddingLen = paddingMatch ? paddingMatch[0].length : 0;
  
  const p1 = sku.substring(0, preLen);
  const p4 = sku.substring(sku.length - paddingLen);
  const p3 = sku.substring(sku.length - paddingLen - 6, sku.length - paddingLen);
  const p2 = sku.substring(preLen, sku.length - paddingLen - 6);
  
  // 🔒 เปลี่ยนสีตัวเติมเต็ม X ให้เป็นสีเทา (text-slate-400 / text-slate-500) ตามสั่งครับ
  const colors = isDark 
    ? { pre: "text-blue-400", dim: "text-green-400", lot: "text-orange-400", pad: "text-slate-500" } 
    : { pre: "text-blue-600", dim: "text-green-600", lot: "text-orange-500", pad: "text-slate-400" };
    
  return (
    <span className="font-mono font-black tracking-widest uppercase italic">
      <span className={colors.pre}>{p1}</span>
      <span className={colors.dim}>{p2}</span>
      <span className={colors.lot}>{p3}</span>
      <span className={colors.pad}>{p4}</span>
    </span>
  );
};
