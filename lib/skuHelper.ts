// lib/skuHelper.ts

/**
 * สูตรเจนรหัส SKU ฉบับปรับปรุง (พี่ตั้ม Version):
 * 1. ลบจุดทศนิยมออกทั้งหมด
 * 2. หนาเอาแค่ 2 ตัวหน้า
 * 3. เรียงลำดับ: ตัวย่อ + กว้าง + หนา + ยาว + วันที่
 * 4. เติม x ให้ครบ 15 หลัก
 */
export const generateSKU = (p: {
  prefix?: string;
  width?: string | number;
  height?: string | number; // ใน UI คือ 'หนา'
  length?: string | number;
  received_date?: string;
}) => {
  if (!p) return 'ERROR';

  // เตรียมค่าพื้นฐานและลบจุดทศนิยมออก
  const pre = (p.prefix || 'XXX').toUpperCase();
  const w = String(p.width || '').replace(/\./g, ''); 
  const hRaw = String(p.height || '').replace(/\./g, ''); // ลบจุดก่อนตัด
  const h = hRaw.slice(0, 2); // ✅ ตัดเอาแค่ 2 หลักแรกหลังจากลบจุดแล้ว
  const l = String(p.length || '').replace(/\./g, '');
  const dt = String(p.received_date || '').replace(/\s/g, '').slice(0, 6);

  // รวมร่างรหัสตามลำดับที่พี่ตั้มสั่ง
  const raw = pre + w + h + l + dt;

  // เติม x ให้ครบ 15 หลัก
  return raw.padEnd(15, 'x').slice(0, 15);
};
