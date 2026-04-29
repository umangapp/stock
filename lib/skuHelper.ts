// lib/skuHelper.ts

/**
 * สูตรเจนรหัส SKU ฉบับสมบูรณ์ (พี่ตั้ม Version - Final):
 * 1. ลบจุดทศนิยมออกทั้งหมด (Width, Thickness, Length)
 * 2. "หนา" ตัดเอาแค่ 2 ตัวหน้า
 * 3. "ยาว" ตัดเอาแค่ 2 ตัวหน้า
 * 4. เรียงลำดับ: ตัวย่อ + กว้าง + หนา + ยาว + วันที่
 * 5. เติม x ให้ครบ 15 หลัก
 */
export const generateSKU = (p: {
  prefix?: string;
  width?: string | number;
  height?: string | number; // ใน UI คือ 'หนา'
  length?: string | number;
  received_date?: string;
}) => {
  if (!p) return 'ERROR';

  // 1. เตรียมค่าและลบจุดทศนิยมออกให้หมด
  const pre = (p.prefix || 'XXX').toUpperCase();
  const w = String(p.width || '').replace(/\./g, ''); 
  
  // 2. หนา (Thickness) -> ลบจุด + ตัด 2 ตัวแรก
  const hRaw = String(p.height || '').replace(/\./g, '');
  const h = hRaw.slice(0, 2); 

  // 3. ยาว (Length) -> ลบจุด + ตัด 2 ตัวแรก (จุดที่แก้ไข)
  const lRaw = String(p.length || '').replace(/\./g, '');
  const l = lRaw.slice(0, 2);

  // 4. วันที่ 6 หลัก
  const dt = String(p.received_date || '').replace(/\s/g, '').slice(0, 6);

  // 5. รวมร่าง: ตัวย่อ + กว้าง + หนา + ยาว + วันที่
  const raw = pre + w + h + l + dt;

  // 6. ตบท้ายด้วย x ให้ครบ 15 หลักพอดี
  return raw.padEnd(15, 'x').slice(0, 15);
};
