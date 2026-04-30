// lib/skuHelper.ts
export const generateSKU = (p: {
  prefix?: string;
  height?: string | number; // หนา (ช่องที่ 1)
  width?: string | number;  // กว้าง (ช่องที่ 2)
  length?: string | number; // ยาว (ช่องที่ 3)
  received_date?: string;
}) => {
  if (!p) return 'ERROR';

  const pre = (p.prefix || 'XXX').toUpperCase();
  
  // 🌟 หนา (ช่องที่ 1): ลบจุดออก และไม่จำกัดจำนวนหลัก
  const h = String(p.height || '').replace(/\./g, ''); 
  
  // 🌟 กว้าง (ช่องที่ 2): ลบจุดออก และเอาแค่ 2 หลักแรก
  const w = String(p.width || '').replace(/\./g, '').slice(0, 2); 
  
  // 🌟 ยาว (ช่องที่ 3): ลบจุดออก และเอาแค่ 2 หลักแรก
  const l = String(p.length || '').replace(/\./g, '').slice(0, 2);
  
  const dt = String(p.received_date || '').replace(/\s/g, '').slice(0, 6);

  // รหัสรวม: ตัวย่อ + หนา(เต็ม) + กว้าง(2) + ยาว(2) + วันที่(6)
  const raw = pre + h + w + l + dt;
  
  // เติม x ให้ครบ 15 หลัก
  return raw.padEnd(15, 'x').slice(0, 15);
};
