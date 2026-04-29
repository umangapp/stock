// lib/skuHelper.ts

/**
 * สูตรเจนรหัส SKU ตามโจทย์พี่ตั้ม:
 * [ตัวย่อ] + [กว้าง] + [หนา 2 ตัวหน้า] + [ยาว] + [วันที่ YYMMDD] + [เติม x ให้ครบ 15 หลัก]
 */
export const generateSKU = (p: {
  prefix?: string;
  width?: string | number;
  height?: string | number; // ในระบบคือหนา
  length?: string | number;
  received_date?: string;
}) => {
  if (!p) return 'ERROR';

  const pre = (p.prefix || 'XXX').toUpperCase();
  const w = String(p.width || '');
  const h = String(p.height || '').slice(0, 2); // หนาเอาแค่ 2 ตัวหน้า
  const l = String(p.length || '');
  const dt = String(p.received_date || '').replace(/\s/g, '').slice(0, 6);

  // รวมร่างรหัสตามลำดับ
  const raw = pre + w + h + l + dt;

  // เติม x ให้ครบ 15 หลัก
  return raw.padEnd(15, 'x').slice(0, 15);
};
