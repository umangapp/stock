const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
        const rows = jsonData.slice(1)
        let hasValidationError = false;
        
        const importData = rows.map((row, index) => {
          // ถ้าไม่มีชื่อสินค้า (คอลัมน์ B) ให้ข้ามแถวนี้ไป
          if (!row[1]) return null
          if (hasValidationError) return null;
          
          const prefix = String(row[0] || 'XXX').trim().toUpperCase(); // คอลัมน์ A
          const productName = String(row[1]).trim(); // คอลัมน์ B
          
          const sizeStr = String(row[2] || '').toLowerCase().trim(); // คอลัมน์ C
          const sizeParts = sizeStr.split('x');
          const hVal = sizeParts[0] ? sizeParts[0].trim() : '';
          const wVal = sizeParts[1] ? sizeParts[1].trim() : '';
          const lVal = sizeParts[2] ? sizeParts[2].trim() : '';
          
          const formattedDate = parseExcelDate(row[3]); // คอลัมน์ D
          const runningVal = String(row[4] || '01').padStart(2, '0').slice(-2); // คอลัมน์ E
          const unitVal = String(row[5] || '').trim(); // คอลัมน์ F
          
          // คอลัมน์ G (น้ำหนัก)
          const weightVal = row[6] !== undefined && row[6] !== '' && row[6] !== null ? parseFloat(Number(row[6]).toFixed(2)) : null;
          
          // คอลัมน์ I (SKU)
          let manualSku = String(row[8] || '').trim().toUpperCase(); 
          
          // สั่ง Auto-Gen SKU ทันทีหากเว้นว่างช่อง SKU ไว้
          if (!manualSku) {
            const hClean = hVal.replace(/\./g, '');
            const wClean = wVal.replace(/\./g, '');
            const lClean = lVal.replace(/\./g, '');
            const lotFormatted = parseDateToYYMMDD(formattedDate);
            
            manualSku = `${prefix}${hClean}${wClean}${lClean}${lotFormatted}${runningVal}`;
          }

          if (manualSku.length < 8) {
            alert(`⚠️ ข้อผิดพลาดที่บรรทัด ${index + 2}: สินค้าชื่อ "${productName}" รหัส SKU สั้นเกินไป ยกเลิกการ Import ทันที`);
            hasValidationError = true; return null;
          }
          const paddingMatch = manualSku.match(/[X]+$/i);
          const coreSku = paddingMatch ? manualSku.slice(0, -paddingMatch[0].length) : manualSku;
          if (!/^\d{2}$/.test(coreSku.slice(-2))) {
            alert(`⚠️ ข้อผิดพลาดที่บรรทัด ${index + 2}: รหัส 2 หลักท้ายสุดของ SKU สินค้า "${productName}" ต้องเป็นตัวเลขเท่านั้น ยกเลิกการ Import ทันที`);
            hasValidationError = true; return null;
          }

          return { 
            name: productName, 
            prefix: prefix, 
            height: hVal ? parseFloat(hVal) : 0, 
            width: wVal ? parseFloat(wVal) : 0, 
            length: lVal ? parseFloat(lVal) : 0, 
            received_date: formattedDate, 
            unit: unitVal, 
            weight: unitVal.includes('กก') ? weightVal : null,
            current_stock: Number(row[7] || 0), // คอลัมน์ H
            sku_15_digits: manualSku,
            safety_stock: Number(row[9] || 0) // คอลัมน์ J
          }
        }).filter(Boolean)
        
        if (hasValidationError) return;
        
        if (importData.length > 0) {
          const { error } = await supabase.from('products').upsert(importData as any, { onConflict: 'sku_15_digits' })
          if (error) throw error
          alert(`✅ ประมวลผลและนำเข้าสต๊อกสินค้าสำเร็จ ${importData.length} รายการ`); fetchData()
        }
      } catch (err: any) { alert("❌ การนำเข้าผิดพลาด: " + err.message) }
      
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
    reader.readAsArrayBuffer(file)
  }
