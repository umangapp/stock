// 🌟 ฟังก์ชัน Import Excel แบบล็อกตำแหน่งคอลัมน์แม่นยำ ไม่ขึ้นกับหน่วยนับ
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
        
        if (!jsonData || jsonData.length < 2) {
          alert('⚠️ ไฟล์ Excel ไม่มีข้อมูล');
          return;
        }

        const headerRow = jsonData[0] || [];
        const rows = jsonData.slice(1);
        
        // 🌟 ตรวจสอบว่าไฟล์มีคอลัมน์ "ชื่อสินค้าหลัก" หรือไม่
        const col1Header = String(headerRow[1] || '').trim().toLowerCase();
        const col2Header = String(headerRow[2] || '').trim().toLowerCase();
        
        let hasNameCol = (col1Header.includes('ชื่อ') || col1Header.includes('name') || 
                          col2Header.includes('ขนาด') || col2Header.includes('size')) && 
                         !(col1Header.includes('ขนาด') || col1Header.includes('size'));

        const offset = hasNameCol ? 1 : 0;
        let hasValidationError = false;
        
        const importData = rows.map((row, index) => {
          if (!row[0]) return null;
          if (hasValidationError) return null;
          
          const prefix = String(row[0] || '').trim().toUpperCase(); 
          if (!prefix) return null;

          const masterItem = masterProducts.find((mp: any) => mp.prefix === prefix);
          
          let productName = '';
          if (hasNameCol && String(row[1] || '').trim()) {
            productName = String(row[1]).trim();
          } else if (masterItem) {
            productName = masterItem.name;
          } else {
            alert(`⚠️ ข้อผิดพลาดที่บรรทัด ${index + 2}: ไม่พบตัวย่อสินค้า "${prefix}" ในระบบมาสเตอร์! กรุณาเพิ่มมาสเตอร์สินค้าก่อนนำเข้า`);
            hasValidationError = true; 
            return null;
          }
          
          const sizeStr = String(row[1 + offset] || '').toLowerCase().trim(); 
          const sizeParts = sizeStr.split('x');
          const hVal = sizeParts[0] ? sizeParts[0].trim() : '';
          const wVal = sizeParts[1] ? sizeParts[1].trim() : '';
          const lVal = sizeParts[2] ? sizeParts[2].trim() : '';
          
          const formattedDate = parseExcelDate(row[2 + offset]); 
          const runningVal = String(row[3 + offset] || '01').padStart(2, '0').slice(-2); 
          const unitVal = String(row[4 + offset] || '').trim(); 
          
          // 🌟 อ่านคอลัมน์ตามลำดับจริงเสมอ
          const rawWeight = row[5 + offset];
          let weightVal = null;
          if (rawWeight !== undefined && rawWeight !== '' && rawWeight !== null && !isNaN(Number(rawWeight))) {
            weightVal = parseFloat(Number(rawWeight).toFixed(2));
          }

          const currentStock = Number(row[6 + offset] || 0); 
          let manualSku = String(row[7 + offset] || '').trim().toUpperCase();
          const safetyStock = Number(row[8 + offset] || 0); 

          if (!manualSku) {
            const hClean = hVal.replace(/\./g, '');
            const wClean = wVal.replace(/\./g, '').substring(0, 2);
            const lClean = lVal.replace(/\./g, '').substring(0, 2);
            const lotFormatted = parseDateToYYMMDD(formattedDate);
            
            let coreSku = `${prefix}${hClean}${wClean}${lClean}${lotFormatted}`;
            if (coreSku.length < 6) coreSku = coreSku.padEnd(6, 'X');
            manualSku = `${coreSku}${runningVal}`;
          }

          if (manualSku.length < 8) {
            alert(`⚠️ ข้อผิดพลาดที่บรรทัด ${index + 2}: สินค้าตัวย่อ "${prefix}" รหัส SKU สั้นเกินไป (${manualSku}) ยกเลิกการ Import ทันที`);
            hasValidationError = true; 
            return null;
          }

          const paddingMatch = manualSku.match(/[X]+$/i);
          const coreSku = paddingMatch ? manualSku.slice(0, -paddingMatch[0].length) : manualSku;
          if (!/^\d{2}$/.test(coreSku.slice(-2))) {
            alert(`⚠️ ข้อผิดพลาดที่บรรทัด ${index + 2}: รหัส 2 หลักหน้าชุด X ของ SKU สินค้า "${prefix}" ต้องเป็นตัวเลขเท่านั้น ยกเลิกการ Import ทันที`);
            hasValidationError = true; 
            return null;
          }

          return { 
            name: productName, 
            prefix: prefix, 
            height: hVal ? parseFloat(hVal) : 0, 
            width: wVal ? parseFloat(wVal) : 0, 
            length: lVal ? parseFloat(lVal) : 0, 
            received_date: formattedDate, 
            unit: unitVal, 
            weight: weightVal,
            current_stock: currentStock, 
            sku_15_digits: manualSku,
            safety_stock: safetyStock 
          }
        }).filter(Boolean)
        
        if (hasValidationError) return;
        
        if (importData.length > 0) {
          const { data: savedProducts, error } = await supabase.from('products').upsert(importData as any, { onConflict: 'sku_15_digits' }).select()
          if (error) throw error

          if (savedProducts && savedProducts.length > 0) {
            const importLogs = savedProducts.map((sp: any) => ({
              product_id: sp.id,
              type: 'import',
              amount: sp.current_stock,
              old_stock: 0,
              new_stock: sp.current_stock,
              created_by: activeUser || 'ADMIN (IMPORT)'
            }));
            await supabase.from('transactions').insert(importLogs);
          }

          alert(`✅ ประมวลผลและนำเข้าสต๊อกสินค้าสำเร็จ ${importData.length} รายการ`); 
          fetchData();
        }
      } catch (err: any) { alert("❌ การนำเข้าผิดพลาด: " + err.message) }
      
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
    reader.readAsArrayBuffer(file)
  }
