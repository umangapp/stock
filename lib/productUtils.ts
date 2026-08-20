// lib/productUtils.ts

export const formatToDateInput = (dateStr: string) => {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const parts = dateStr.split(/[\/\-]/);
  if (parts.length === 3) {
    if (parts[2].length === 4) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
  }
  if (/^\d{6}$/.test(dateStr)) {
    const y = dateStr.substring(0, 2);
    const m = dateStr.substring(2, 4);
    const d = dateStr.substring(4, 6);
    return `20${y}-${m}-${d}`;
  }
  return '';
};

export const formatFromDateInput = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parts[0].length === 4 ? parts[0].substring(2) : parts[0]; // 2026 -> 26
    const month = parts[1].padStart(2, '0');                               // 08
    const day = parts[2].padStart(2, '0');                                 // 12
    return `${year}${month}${day}`;                                         // ได้ 260812
  }
  return dateStr;
};

export const parseDateToYYMMDD = (dateStr: string): string => {
  if (!dateStr) return '';
  const clean = dateStr.trim();
  if (/^\d{6}$/.test(clean)) return clean;
  const parts = clean.split(/[\/\-]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) return `${parts[0].substring(2)}${parts[1].padStart(2, '0')}${parts[2].padStart(2, '0')}`;
    let year = parts[2].trim();
    if (year.length === 4) year = year.substring(2);
    return `${year}${parts[1].padStart(2, '0')}${parts[0].padStart(2, '0')}`;
  }
  return clean.replace(/\D/g, '').substring(0, 6);
};

export const parseExcelDate = (dateVal: any): string => {
  if (!dateVal) return '';
  if (dateVal instanceof Date) {
    const year = String(dateVal.getFullYear()).substring(2);
    const month = String(dateVal.getMonth() + 1).padStart(2, '0');
    const day = String(dateVal.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }
  let dateStr = String(dateVal).trim();
  if (dateStr.includes('GMT') || dateStr.includes('Z') || dateStr.length > 20) {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const year = String(d.getFullYear()).substring(2);
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}${month}${day}`;
    }
  }
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      let year = parts[2].trim();
      if (year.length === 4) { year = year.substring(2); }
      return `${year}${month}${day}`;
    }
  }
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      let year = parts[0].trim();
      const month = parts[1].padStart(2, '0');
      const day = parts[2].padStart(2, '0');
      if (year.length === 4) { year = year.substring(2); }
      return `${year}${month}${day}`;
    }
  }
  if (/^\d+$/.test(dateStr) && dateStr.length === 5) {
    const serial = Number(dateStr);
    const utc_days  = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;                                        
    const date_info = new Date(utc_value * 1000);
    const year = String(date_info.getFullYear()).substring(2);
    const month = String(date_info.getMonth() + 1).padStart(2, '0');
    const day = String(date_info.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }
  return dateStr;
};

// 🌟 สูตรสร้างรหัส SKU จากช่องต่างๆ
export const buildSKUFromFields = (prefix: string, height: any, width: any, length: any, dateStr: string, running: string, currentSKU: string = '') => {
  const pre = prefix || '';

  // ฟังก์ชันช่วยแปลงค่าขนาด (ถ้าใส่ 0 หรือเว้นว่างไว้ จะส่งค่าเป็น '')
  const processDimension = (val: any, maxLen?: number) => {
    if (val === '' || val === null || val === undefined) return '';
    if (Number(val) === 0) return ''; // 👈 ถ้าค่าเป็น 0 ไม่ต้องใส่ลงใน SKU
    const cleaned = String(val).replace(/\./g, '').trim();
    if (cleaned === '0') return '';
    return maxLen ? cleaned.substring(0, maxLen) : cleaned;
  };

  const h = processDimension(height);
  const w = processDimension(width, 2);
  const l = processDimension(length, 2);
  
  const lot = parseDateToYYMMDD(dateStr);
  const run = running ? String(running).padStart(2, '0').slice(-2) : '01';
  
  const generatedCore = `${pre}${h}${w}${l}${lot}${run}`.toUpperCase();
  const existingPadMatch = currentSKU.match(/[xX]+$/);
  const existingPad = existingPadMatch ? existingPadMatch[0].toUpperCase() : '';
  return `${generatedCore}${existingPad}`;
};

export const validateSKU = (sku: string) => {
  if (!sku || sku.length < 8) return false;
  const paddingMatch = sku.match(/[xX]+$/);
  const coreSku = paddingMatch ? sku.slice(0, -paddingMatch[0].length) : sku;
  const twoDigits = coreSku.slice(-2);
  return /^\d{2}$/.test(twoDigits); 
};
