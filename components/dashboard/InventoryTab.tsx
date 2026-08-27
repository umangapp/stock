'use client'
import { useState } from 'react'
import { Search, FileSpreadsheet, Plus, AlertTriangle, ChevronDown, ChevronUp, Edit3, Trash2 } from 'lucide-react'
import SKUColoredAdmin from '@/components/SKUColored'

export default function InventoryTab({
  products,
  searchQuery,
  setSearchQuery,
  showLowStockOnly,
  setShowLowStockOnly,
  handleImportClick,
  setNewProduct,
  setIsAddModalOpen,
  setEditingProduct,
  setIsEditModalOpen,
  deleteProduct
}: any) {
  const [expandedL1, setExpandedL1] = useState<string[]>([])
  const [expandedL2, setExpandedL2] = useState<string[]>([])
  const [expandedL3, setExpandedL3] = useState<string[]>([])

  const grouped3LayerInventory = products
    .filter((p: any) => !showLowStockOnly || p.current_stock <= (p.safety_stock || 0))
    .filter((p: any) => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.prefix.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.sku_15_digits || '').toLowerCase().includes(searchQuery.toLowerCase())
    )
    .reduce((acc: any, item: any) => {
      const isLowStock = item.current_stock <= (item.safety_stock || 0);
      if (!acc[item.name]) acc[item.name] = { name: item.name, prefix: item.prefix || 'XXX', totalStock: 0, unit: item.unit, hasLowStock: false, heights: {} };
      acc[item.name].totalStock += item.current_stock;
      if (isLowStock) acc[item.name].hasLowStock = true;

      if (!acc[item.name].heights[item.height]) acc[item.name].heights[item.height] = { height: item.height, totalStock: 0, hasLowStock: false, lots: {} };
      acc[item.name].heights[item.height].totalStock += item.current_stock;
      if (isLowStock) acc[item.name].heights[item.height].hasLowStock = true;

      if (!acc[item.name].heights[item.height].lots[item.received_date]) acc[item.name].heights[item.height].lots[item.received_date] = { lot: item.received_date, totalStock: 0, hasLowStock: false, items: [] };
      acc[item.name].heights[item.height].lots[item.received_date].totalStock += item.current_stock;
      if (isLowStock) acc[item.name].heights[item.height].lots[item.received_date].hasLowStock = true;

      acc[item.name].heights[item.height].lots[item.received_date].items.push(item);
      return acc;
  }, {});

  return (
    <div className="space-y-8 animate-in fade-in no-print">
      <div className="flex flex-col xl:flex-row justify-between items-end gap-4">
         <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900">สต๊อกสินค้า</h2>
         
         <div className="flex flex-wrap gap-3 w-full xl:w-auto">
            <button 
              onClick={() => setShowLowStockOnly(!showLowStockOnly)}
              className={`px-5 py-4 rounded-2xl font-black uppercase text-xs flex items-center gap-2 shadow-sm active:scale-95 transition-all border ${showLowStockOnly ? 'bg-red-600 text-white border-red-700 shadow-red-600/30' : 'bg-white text-slate-500 border-slate-200 hover:bg-red-50'}`}
            >
              <AlertTriangle size={16} className={showLowStockOnly ? 'animate-pulse' : ''} />
              {showLowStockOnly ? 'แสดงทั้งหมด' : 'สินค้าใกล้หมด'}
            </button>
            
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
              <input type="text" placeholder="ค้นหาชื่อ, ตัวย่อ หรือ SKU..." className="w-full bg-white border p-4 pl-12 rounded-2xl outline-none shadow-sm focus:border-blue-500 font-bold" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            
            <button onClick={handleImportClick} className="bg-emerald-600 text-white px-6 py-4 rounded-2xl font-black uppercase text-xs flex items-center gap-2 shadow-lg active:scale-95 transition-all"><FileSpreadsheet size={16}/> Import</button>
            <button onClick={() => { 
              setNewProduct({ name: '', prefix: '', height: '', width: '', length: '', received_date: '', unit: '', current_stock: 0, safety_stock: 0, running: '01', weight: '', sku_15_digits: '' }); 
              setIsAddModalOpen(true); 
            }} className="bg-blue-600 text-white px-6 py-4 rounded-2xl font-black uppercase text-xs shadow-lg active:scale-95 transition-all"><Plus className="inline mr-1"/> เพิ่มใหม่</button>
         </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {Object.values(grouped3LayerInventory).sort((a: any, b: any) => a.prefix.localeCompare(b.prefix)).map((l1: any) => (
          <div key={l1.name} className={`bg-white rounded-[2.5rem] border shadow-sm overflow-hidden h-fit transition-all ${l1.hasLowStock ? 'border-red-400 ring-4 ring-red-500/10' : 'border-slate-200'}`}>
            <div onClick={() => setExpandedL1(prev => prev.includes(l1.name) ? prev.filter(n => n !== l1.name) : [...prev, l1.name])} className="p-6 cursor-pointer hover:bg-slate-50 flex justify-between items-center text-slate-800">
              <div className="flex-1 pr-4">
                <div className="flex items-center gap-3">
                  <h3 className="font-black uppercase text-xl tracking-tighter break-words"><span className="text-blue-600 mr-2">{l1.prefix}:</span>{l1.name}</h3>
                  {l1.hasLowStock && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse flex items-center gap-1"><AlertTriangle size={10}/> LOW STOCK</span>}
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 italic tracking-widest">{Object.keys(l1.heights).length} ความหนา (Thickness)</p>
              </div>
              <div className="text-right shrink-0 flex items-center gap-4">
                <div>
                  <p className={`text-4xl font-black leading-none ${l1.hasLowStock ? 'text-red-600' : 'text-slate-900'}`}>{l1.totalStock}</p>
                  <p className="text-[10px] font-black uppercase text-slate-400 mt-1">{l1.unit}</p>
                </div>
                <div className="text-slate-300">{expandedL1.includes(l1.name) ? <ChevronUp/> : <ChevronDown/>}</div>
              </div>
            </div>

            {expandedL1.includes(l1.name) && (
              <div className="p-4 bg-slate-50/80 space-y-3 border-t border-slate-100">
                {Object.values(l1.heights).sort((a: any, b: any) => parseFloat(a.height) - parseFloat(b.height)).map((l2: any) => (
                  <div key={l2.height} className={`bg-white rounded-[2rem] border shadow-sm overflow-hidden transition-all ${l2.hasLowStock ? 'border-red-300' : 'border-slate-200'}`}>
                     <div onClick={() => setExpandedL2(prev => prev.includes(`${l1.name}-${l2.height}`) ? prev.filter(n => n !== `${l1.name}-${l2.height}`) : [...prev, `${l1.name}-${l2.height}`])} className="p-5 cursor-pointer hover:bg-slate-50 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="bg-blue-100 text-blue-700 text-xs font-black px-3 py-1 rounded-xl">หนา {l2.height} มม.</span>
                          {l2.hasLowStock && <AlertTriangle size={14} className="text-red-500"/>}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`font-black text-lg ${l2.hasLowStock ? 'text-red-600' : 'text-slate-700'}`}>{l2.totalStock} <span className="text-[10px] text-slate-400">{l1.unit}</span></span>
                          <div className="text-slate-300">{expandedL2.includes(`${l1.name}-${l2.height}`) ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}</div>
                        </div>
                     </div>

                     {expandedL2.includes(`${l1.name}-${l2.height}`) && (
                        <div className="p-3 bg-slate-50 space-y-2 border-t border-slate-100">
                          {Object.values(l2.lots).sort((a: any, b: any) => a.lot.localeCompare(b.lot)).map((l3: any) => (
                             <div key={l3.lot} className={`bg-white rounded-3xl border transition-all ${l3.hasLowStock ? 'border-red-300' : 'border-slate-200'}`}>
                                <div onClick={() => setExpandedL3(prev => prev.includes(`${l1.name}-${l2.height}-${l3.lot}`) ? prev.filter(n => n !== `${l1.name}-${l2.height}-${l3.lot}`) : [...prev, `${l1.name}-${l2.height}-${l3.lot}`])} className="p-4 cursor-pointer hover:bg-slate-50 flex justify-between items-center">
                                   <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                                      <span className="uppercase text-[11px] tracking-widest text-slate-400">LOT:</span> {l3.lot}
                                   </div>
                                   <div className="flex items-center gap-3">
                                      <span className={`font-black ${l3.hasLowStock ? 'text-red-500' : 'text-slate-600'}`}>{l3.totalStock}</span>
                                      <div className="text-slate-300">{expandedL3.includes(`${l1.name}-${l2.height}-${l3.lot}`) ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}</div>
                                   </div>
                                </div>

                                {expandedL3.includes(`${l1.name}-${l2.height}-${l3.lot}`) && (
                                   <div className="p-2 space-y-2 border-t border-slate-100 bg-slate-50/50">
                                      {l3.items
                                         .sort((a: any, b: any) => (a.sku_15_digits || '').localeCompare(b.sku_15_digits || ''))
                                         .map((item: any) => {
                                           const isItemLow = item.current_stock <= (item.safety_stock || 0);
                                           return (
                                           <div key={item.id} className={`bg-white p-4 rounded-[1.5rem] border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${isItemLow ? 'border-red-300 shadow-sm shadow-red-100' : 'border-slate-100'}`}>
                                            <div className="flex-1">
                                              <div className="mb-1"><SKUColoredAdmin sku={item.sku_15_digits} prefix={item.prefix} /></div>
                                              <div className="flex flex-wrap items-center gap-2 mt-2">
                                                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase">ขนาด {item.height}x{item.width}x{item.length}</span>
                                                  {item.weight && <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded uppercase border border-amber-200">น้ำหนัก: {item.weight} กก.</span>}
                                                  <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${isItemLow ? 'bg-red-100 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                    {isItemLow ? `⚠️ ต่ำกว่า Safety (${item.safety_stock})` : `Safety: ${item.safety_stock || 0}`}
                                                  </span>
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-3 w-full sm:w-auto justify-between">
                                               <p className={`font-black text-2xl leading-none ${isItemLow ? 'text-red-600' : 'text-slate-900'}`}>{item.current_stock}</p>
                                               <div className="flex gap-2 shrink-0">
                                                  <button onClick={() => { 
                                                    const sku = item.sku_15_digits || '';
                                                    const paddingMatch = sku.match(/[xX]+$/);
                                                    const coreSku = paddingMatch ? sku.slice(0, -paddingMatch[0].length) : sku;
                                                    const extractedRun = coreSku.length >= 2 ? coreSku.slice(-2) : '01';
                                                    
                                                    setEditingProduct({ ...item, running: extractedRun, weight: item.weight || '' }); 
                                                    setIsEditModalOpen(true); 
                                                  }} className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all"><Edit3 size={16}/></button>
                                                  <button onClick={() => deleteProduct(item.id)} className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16}/></button>
                                               </div>
                                            </div>
                                          </div>
                                        )
                                      })}
                                   </div>
                                )}
                             </div>
                          ))}
                        </div>
                     )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
