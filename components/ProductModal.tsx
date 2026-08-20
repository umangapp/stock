// components/ProductModal.tsx
import React from 'react';
import { X } from 'lucide-react';
import SKUColoredAdmin from './SKUColored';
import { formatToDateInput, formatFromDateInput, buildSKUFromFields, validateSKU } from '@/lib/productUtils';

interface ProductModalProps {
  isOpen: boolean;
  isEditModal: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  productData: any;
  setProductData: (data: any) => void;
  masterProducts: any[];
  masterUnits: any[];
}

export default function ProductModal({
  isOpen, isEditModal, onClose, onSubmit, productData, setProductData, masterProducts, masterUnits
}: ProductModalProps) {
  if (!isOpen) return null;

  const handleNameSelect = (name: string) => {
    const matched = masterProducts.find(m => m.name === name);
    const newPrefix = matched ? matched.prefix : '';
    const updated = { ...productData, name, prefix: newPrefix };
    const newSKU = buildSKUFromFields(newPrefix, updated.height, updated.width, updated.length, updated.received_date, updated.running, updated.sku_15_digits);
    setProductData({ ...updated, sku_15_digits: newSKU });
  };

  const updateProductAndSKU = (field: string, value: any) => {
    const updated = { ...productData, [field]: value };
    const newSKU = buildSKUFromFields(updated.prefix, updated.height, updated.width, updated.length, updated.received_date, updated.running, updated.sku_15_digits);
    setProductData({ ...updated, sku_15_digits: newSKU });
  };

  const isSkuValid = validateSKU(productData.sku_15_digits);

  return (
    <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[100] flex items-center justify-center p-4 text-slate-800 no-print">
      <div className="bg-white w-full max-w-3xl rounded-[3rem] shadow-2xl p-8 max-h-[90vh] overflow-y-auto text-slate-900">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-black italic uppercase tracking-tighter leading-none">
            {isEditModal ? 'แก้ไขข้อมูล' : 'เพิ่มสินค้าใหม่'}
          </h3>
          <button onClick={onClose} className="p-2 bg-slate-100 rounded-full text-slate-400 hover:bg-slate-200">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="col-span-full">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2">ชื่อสินค้าหลัก</label>
              <select required className="w-full bg-slate-50 p-4 rounded-2xl border shadow-sm font-bold" 
                value={productData.name} onChange={e => handleNameSelect(e.target.value)}>
                <option value="">-- เลือกชื่อสินค้า --</option>
                {masterProducts.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
              </select>
            </div>
            
            <div className="col-span-full bg-slate-900 p-5 rounded-3xl border border-white/5 text-white">
              <div className="flex justify-between items-center mb-2 px-2">
                <label className="text-[11px] font-black uppercase text-blue-400 block">รหัส SKU คิวอาร์โค้ด</label>
                <span className="text-[10px] text-amber-400 font-bold bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">✏️ คลิกพิมพ์แก้ไขได้</span>
              </div>
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl text-center min-h-[64px] flex flex-col items-center justify-center shadow-inner gap-2 focus-within:border-blue-500/50 transition-all">
                <SKUColoredAdmin sku={productData.sku_15_digits} prefix={productData.prefix} isDark={true} />
                <input type="text" maxLength={50} 
                  className="w-full bg-transparent border-t border-white/10 pt-2 font-mono font-bold text-xs text-center text-blue-300 outline-none focus:text-white" 
                  placeholder="พิมพ์เพื่อกำหนดรหัส SKU เองที่นี่..." 
                  value={productData.sku_15_digits} 
                  onChange={e => setProductData({ ...productData, sku_15_digits: e.target.value.replace(/\s+/g, '').toUpperCase() })} 
                />
              </div>
              <div className="flex justify-between items-center mt-3 px-2">
                <p className={`text-xs font-black uppercase tracking-wider ${isSkuValid ? 'text-emerald-500' : 'text-red-500 animate-pulse'}`}>
                  ความยาว: {(productData.sku_15_digits || '').length} หลัก
                </p>
                <p className="text-[10px] text-slate-400 italic text-right">2 หลักท้ายสุด (หน้าชุด X) ต้องเป็นเลข</p>
              </div>
            </div>
            
            <div className="col-span-2 md:col-span-1"><label className="text-[10px] font-black uppercase text-slate-400 ml-2 font-bold">ตัวย่อ</label>
              <input type="text" readOnly className="w-full bg-slate-200 p-4 rounded-2xl font-black text-blue-600 text-center" value={productData.prefix} />
            </div>
            
            <div className="col-span-2 md:col-span-1"><label className="text-[10px] font-black uppercase text-slate-400 ml-2 font-bold">หนา</label>
              <input type="number" required step="any" className="w-full bg-slate-50 p-4 rounded-2xl border font-black shadow-sm" value={productData.height} onChange={e => updateProductAndSKU('height', e.target.value)} />
            </div>
            
            <div className="col-span-2 md:col-span-1"><label className="text-[10px] font-black uppercase text-slate-400 ml-2 font-bold">กว้าง</label>
              <input type="number" required step="any" className="w-full bg-slate-50 p-4 rounded-2xl border font-black shadow-sm" value={productData.width} onChange={e => updateProductAndSKU('width', e.target.value)} />
            </div>
            
            <div className="col-span-2 md:col-span-1"><label className="text-[10px] font-black uppercase text-slate-400 ml-2 font-bold">ยาว</label>
              <input type="number" required step="any" className="w-full bg-slate-50 p-4 rounded-2xl border font-black shadow-sm" value={productData.length} onChange={e => updateProductAndSKU('length', e.target.value)} />
            </div>
            
            <div className="col-span-2 md:col-span-2 relative"><label className="text-[10px] font-black uppercase text-slate-400 ml-2 font-bold">วันที่รับ (Lot Date)</label>
              <input type="date" required className="w-full bg-slate-50 p-4 rounded-2xl border font-black text-center shadow-sm text-slate-700 uppercase outline-none focus:border-blue-500 cursor-pointer" 
                value={formatToDateInput(productData.received_date)} onChange={e => updateProductAndSKU('received_date', formatFromDateInput(e.target.value))} />
            </div>

            <div className="col-span-2 md:col-span-1"><label className="text-[10px] font-black uppercase text-blue-600 ml-2 font-bold">Running</label>
              <input type="text" required maxLength={2} className="w-full bg-blue-50/60 p-4 rounded-2xl border border-blue-200 font-black text-blue-700 text-center" 
                value={productData.running || '01'} onChange={e => updateProductAndSKU('running', e.target.value.replace(/\D/g, ''))} />
            </div>

            <div className="col-span-2 md:col-span-1"><label className="text-[10px] font-black uppercase text-slate-400 ml-2 font-bold">หน่วยนับ</label>
              <select required className="w-full bg-slate-50 p-4 rounded-2xl border font-bold" value={productData.unit} onChange={e => setProductData({...productData, unit: e.target.value})}>
                <option value="">-- เลือกหน่วยนับ --</option>
                {masterUnits.map(m => <option key={m.id} value={m.unit}>{m.unit}</option>)}
              </select>
            </div>

{/* น้ำหนัก (แสดงเฉพาะเมื่อเลือกหน่วยนับ กก.) */}
{productData.unit?.includes('กก') && (
  <div className="col-span-full md:col-span-2 animate-in fade-in">
    <label className="text-[10px] font-black uppercase text-amber-600 ml-2 font-bold">น้ำหนัก (กก.)</label>
    <input 
      type="number" 
      step="0.01" 
      min="0.01" 
      max="999999" 
      className="w-full bg-amber-50/60 p-4 rounded-2xl border border-amber-300 font-black text-amber-700 text-center outline-none focus:border-amber-500 shadow-sm" 
      placeholder="เช่น 1000.35" 
      value={productData.weight || ''} 
      onChange={e => setProductData({ ...productData, weight: e.target.value })} 
    />
  </div>
)}

{/* SAFETY STOCK (จุดแจ้งเตือน) */}
<div className="col-span-2 bg-red-50 rounded-2xl p-4 border border-red-100">
  <label className="text-[10px] font-black uppercase text-red-500 block mb-1 font-bold">SAFETY STOCK (จุดแจ้งเตือน)</label>
  <input 
    type="number" 
    required 
    min="0" 
    className="w-full bg-transparent font-black text-2xl text-red-600 outline-none" 
    value={productData.safety_stock === 0 && productData._isSfFocused ? '' : productData.safety_stock} 
    onChange={e => setProductData({...productData, safety_stock: e.target.value === '' ? 0 : Number(e.target.value)})}
    onFocus={() => setProductData({ ...productData, _isSfFocused: true })} 
    onBlur={() => setProductData({ ...productData, _isSfFocused: false })} 
  />
</div>

{/* สต๊อกเริ่มต้น */}
<div className="col-span-2 bg-blue-50 rounded-2xl p-4 border border-blue-100">
  <label className="text-[10px] font-black uppercase text-blue-500 block mb-1 font-bold">สต๊อกเริ่มต้น</label>
  <input 
    type="number" 
    required 
    min="0" 
    className="w-full bg-transparent font-black text-2xl text-blue-600 outline-none" 
    value={productData.current_stock === 0 && productData._isStFocused ? '' : productData.current_stock} 
    onChange={e => setProductData({...productData, current_stock: e.target.value === '' ? 0 : Number(e.target.value)})}
    onFocus={() => setProductData({ ...productData, _isStFocused: true })} 
    onBlur={() => setProductData({ ...productData, _isStFocused: false })} 
  />
</div>

            <div className="col-span-2 bg-blue-50 rounded-2xl p-4 border border-blue-100"><label className="text-[10px] font-black uppercase text-blue-500 block mb-1">สต๊อกเริ่มต้น</label>
              <input type="number" required min="0" className="w-full bg-transparent font-black text-2xl text-blue-600 outline-none" 
                value={productData.current_stock === 0 && productData._isStFocused ? '' : productData.current_stock} 
                onChange={e => setProductData({...productData, current_stock: e.target.value === '' ? 0 : Number(e.target.value)})}
                onFocus={() => setProductData({ ...productData, _isStFocused: true })} onBlur={() => setProductData({ ...productData, _isStFocused: false })} />
            </div>
          </div>
          
          <button type="submit" disabled={!isSkuValid} className={`w-full py-6 rounded-3xl font-black text-xl uppercase italic shadow-xl transition-all ${isSkuValid ? 'bg-blue-600 text-white active:scale-95' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
            {isSkuValid ? 'บันทึกข้อมูลสินค้า' : '❌ รหัส SKU ไม่ถูกต้องตามโครงสร้าง'}
          </button>
        </form>
      </div>
    </div>
  );
}
