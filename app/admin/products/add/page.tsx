// ค้นหาฟังก์ชัน useEffect เดิมแล้วแทนที่ด้วยตัวนี้ครับ
useEffect(() => {
  if (prefix.length >= 2 && width && length && height && receiveDate) {
    // กว้าง และ ยาว: ถ้า < 10 ใช้ 1 หลัก, ถ้า >= 10 ใช้ 2 หลักแรก
    const formatWL = (val: string) => {
      const num = Math.floor(parseFloat(val)) || 0;
      const str = num.toString();
      return num >= 10 ? str.substring(0, 2) : str;
    };

    // สูง: ใช้ 2 หลักแรกเสมอ (เช่น 1800 -> 18)
    const formatH = (val: string) => {
      const clean = val.replace('.', '');
      return clean.substring(0, 2).padStart(2, '0');
    };

    // วันที่: รองรับทั้งแบบ 240606 และ 2025-08-05
    let datePart = receiveDate.replace(/-/g, ''); // เอาขีดออก
    if (datePart.length === 8) datePart = datePart.substring(2); // ถ้าเป็น 20250805 ให้ตัดเหลือ 250805
    if (datePart.length > 6) datePart = datePart.substring(0, 6);

    const wPart = formatWL(width);
    const lPart = formatWL(length);
    const hPart = formatH(height);

    const baseSku = `${prefix.toUpperCase()}${wPart}${lPart}${hPart}${datePart}`;
    // เติม x ให้ครบ 15 หลัก
    setSkuPreview(baseSku.padEnd(15, 'x'));
  } else {
    setSkuPreview('รอข้อมูลครบ...');
  }
}, [prefix, width, length, height, receiveDate]);
