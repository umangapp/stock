'use client'
import { useState } from 'react'
import { ChevronDown, ChevronUp, Clock } from 'lucide-react'
import SKUColoredAdmin from '@/components/SKUColored'

export default function ActivityFeedTab({ transactions }: any) {
  const [expandedUsers, setExpandedUsers] = useState<string[]>([])

  const groupedByUser = transactions.reduce((acc: any, t: any) => {
    const user = t.created_by || 'Unknown';
    if (!acc[user]) acc[user] = [];
    acc[user].push(t);
    return acc;
  }, {});

  return (
    <div className="space-y-8 animate-in fade-in no-print">
      <h2 className="text-3xl font-black uppercase italic tracking-tighter">Activity Feed</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(groupedByUser).map(([user, logs]: [string, any]) => (
          <div key={user} className="bg-white rounded-[2.5rem] border overflow-hidden h-fit shadow-sm border-slate-200">
            <div onClick={() => setExpandedUsers(prev => prev.includes(user) ? prev.filter(u => u !== user) : [...prev, user])} className="p-7 cursor-pointer bg-slate-900 text-white flex justify-between items-center">
              <h4 className="font-black text-xl uppercase italic">{user}</h4>
              {expandedUsers.includes(user) ? <ChevronUp size={24}/> : <ChevronDown size={24}/>}
            </div>
            {expandedUsers.includes(user) && (
              <div className="p-4 bg-slate-50 space-y-4 max-h-[600px] overflow-y-auto text-slate-900">
                {logs.map((log: any) => (
                  <div key={log.id} className="bg-white p-5 rounded-3xl border shadow-sm flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                          <p className="text-xl font-black uppercase leading-none">{log.products?.name}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-2 leading-none">
                              <p className="text-[14px] font-black text-slate-600 uppercase tracking-tight">ขนาด: {log.products?.height}x{log.products?.width}x{log.products?.length}</p>
                              <span className="text-[13px] font-black text-slate-800 uppercase bg-slate-100 px-2 py-0.5 rounded border border-slate-200">Lot: {log.products?.received_date}</span>
                          </div>
                      </div>
                      <span className={`text-3xl font-black ${log.type === 'receive' || log.type === 'import' ? 'text-green-600' : 'text-red-600'}`}>
                        {log.type === 'receive' || log.type === 'import' ? '+' : '-'} {log.amount}
                      </span>
                    </div>
                    
                    <div className="bg-blue-50/50 p-2 rounded-lg">
                      <SKUColoredAdmin sku={log.products?.sku_15_digits} prefix={log.products?.prefix} />
                    </div>
                    
                    <p className="text-[12px] font-black text-blue-600 mt-1 italic leading-none">
                      STOCK: {log.old_stock ?? 0} → {log.new_stock ?? log.amount}
                    </p>

                    <div className="pt-2.5 mt-0.5 border-t border-slate-100 flex justify-between items-center text-[11px] font-bold text-slate-400">
                      <div className="flex items-center gap-1">
                        <Clock size={12} className="text-slate-400" />
                        <span>{new Date(log.created_at).toLocaleDateString('th-TH')} | {new Date(log.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</span>
                      </div>
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${log.type === 'receive' ? 'text-emerald-600 bg-emerald-50 border border-emerald-100' : log.type === 'import' ? 'text-blue-600 bg-blue-50 border border-blue-100' : 'text-red-600 bg-red-50 border border-red-100'}`}>
                        {log.type === 'receive' ? 'สแกนเข้าคลัง' : log.type === 'import' ? 'IMPORT สต๊อก' : 'สแกนจ่ายออก'}
                      </span>
                    </div>
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
