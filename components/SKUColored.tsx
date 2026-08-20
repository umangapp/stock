// components/SKUColored.tsx
import React from 'react';

interface Props {
  sku: string;
  prefix: string;
  isDark?: boolean;
}

export default function SKUColoredAdmin({ sku, prefix, isDark = false }: Props) {
  if (!sku) return <span className="text-slate-500 italic text-sm">พิมพ์หรือประกอบรหัส...</span>;
  const cleanSku = sku.trim();
  const preLen = prefix?.length || 2;
  const paddingMatch = cleanSku.match(/[xX]+$/);
  const paddingLen = paddingMatch ? paddingMatch[0].length : 0;
  const coreLen = cleanSku.length - paddingLen;
  
  if (coreLen < 8 + preLen) return <span className="font-mono font-black">{cleanSku}</span>;

  const p1 = cleanSku.substring(0, preLen);
  const p2 = cleanSku.substring(preLen, coreLen - 8); 
  const p3 = cleanSku.substring(coreLen - 8, coreLen - 2); 
  const p_num = cleanSku.substring(coreLen - 2, coreLen); 
  const p4 = cleanSku.substring(coreLen); 
  
  const colors = isDark 
    ? { pre: "text-blue-400", dim: "text-green-400", lot: "text-orange-400", num: "text-pink-400", pad: "text-slate-500" } 
    : { pre: "text-blue-600", dim: "text-green-600", lot: "text-orange-500", num: "text-pink-600", pad: "text-slate-400" };
    
  return (
    <span className="font-mono font-black tracking-[0.15em] uppercase italic tracking-normal text-lg sm:text-2xl break-all">
      <span className={colors.pre}>{p1}</span>
      <span className={colors.dim}>{p2}</span>
      <span className={colors.lot}>{p3}</span>
      <span className={colors.num}>{p_num}</span>
      <span className={colors.pad}>{p4}</span>
    </span>
  );
}
