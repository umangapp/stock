'use client'
import { CheckCircle2 } from 'lucide-react'

export default function UserManagementTab({
  userProfiles,
  handleUpdateUserRole,
  handleUpdateUserName
}: any) {
  return (
    <div className="space-y-8 animate-in fade-in text-slate-800 no-print">
      <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900">จัดการผู้ใช้งาน (Users)</h2>
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {userProfiles.map((user: any) => (
              <div key={user.id} className={`p-6 rounded-[2rem] border shadow-sm flex flex-col gap-4 transition-all ${user.role === 'admin' ? 'bg-amber-50/50 border-amber-200' : 'bg-slate-50 border-slate-100'}`}>
                 <div className="flex justify-between items-start">
                   <div>
                     <p className="text-[10px] font-black uppercase text-slate-400 mb-1">รหัสพนักงาน</p>
                     <p className="text-xs font-mono text-slate-500 truncate w-48 sm:w-auto">{user.id}</p>
                   </div>
                   <div className="flex flex-col items-end">
                      <select 
                        className={`text-xs font-black uppercase p-2 rounded-xl outline-none shadow-sm cursor-pointer border ${user.role === 'admin' ? 'bg-amber-500 text-white border-amber-600' : 'bg-slate-200 text-slate-600 border-slate-300'}`}
                        value={user.role || 'staff'}
                        onChange={(e) => handleUpdateUserRole(user.id, e.target.value)}
                      >
                        <option value="admin">ADMIN</option>
                        <option value="staff">STAFF</option>
                      </select>
                   </div>
                 </div>
                 <div className="border-t border-slate-200/50 pt-4 mt-2">
                   <div className="flex gap-2">
                      <input 
                        type="text" 
                        className="flex-1 bg-white border p-4 rounded-2xl font-black text-slate-900 outline-none focus:border-blue-500" 
                        defaultValue={user.full_name} 
                        onBlur={(e) => { if (e.target.value !== user.full_name) handleUpdateUserName(user.id, e.target.value) }}
                        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                      />
                      <button className="bg-blue-100 text-blue-600 p-4 rounded-2xl shadow-sm"><CheckCircle2 size={20} /></button>
                   </div>
                 </div>
              </div>
            ))}
         </div>
      </div>
    </div>
  )
}
