// lib/skuHelper.ts
export const generateSKU = (p: {
  prefix?: string;
  width?: string | number;
  height?: string | number; // หนา
  length?: string | number;
  received_date?: string;
}) => {
  if (!p) return 'ERROR';

  const pre = (p.prefix || 'XXX').toUpperCase();
  const w = String(p.width || '').replace(/\./g, ''); 
  const h = String(p.height || '').replace(/\./g, '').slice(0, 2); // ลบจุด + ตัด 2 ตัวแรก
  const l = String(p.length || '').replace(/\./g, '').slice(0, 2); // ลบจุด + ตัด 2 ตัวแรก
  const dt = String(p.received_date || '').replace(/\s/g, '').slice(0, 6);

  const raw = pre + w + h + l + dt;
  return raw.padEnd(15, 'x').slice(0, 15);
};
