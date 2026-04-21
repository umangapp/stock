// ค้นหา useEffect ตัวที่คำนวณ SKU ในหน้า Edit แล้วแทนที่ด้วยตัวนี้ครับ
useEffect(() => {
  if (prefix.length >= 2 && width && length && height && receiveDate) {
    // กว้าง/ยาว: ถ้า 1-9 ใช้หลักเดียว, ถ้า 10+ ใช้ 2 หลักแรก
    const formatWL = (val: string) => {
      const num = Math.floor(parseFloat(val)) || 0;
      return num >= 10 ? num.toString().substring(0, 2) : num.toString();
    };

    // สูง: 2 หลักแรก
    const formatH = (val: string) => {
      const clean = val.replace('.', '');
      return clean.substring(0, 2).padStart(2, '0');
    };

    // วันที่: ตัดเหลือ 6 หลัก (250805)
    let datePart = receiveDate.replace(/-/g, '');
    if (datePart.length === 8) datePart = datePart.substring(2);
    if (datePart.length > 6) datePart = datePart.substring(0, 6);

    const baseSku = `${prefix.toUpperCase()}${formatWL(width)}${formatWL(length)}${formatH(height)}${datePart}`;
    setSkuPreview(baseSku.padEnd(15, 'x'));
  }
}, [prefix, width, length, height, receiveDate]);
