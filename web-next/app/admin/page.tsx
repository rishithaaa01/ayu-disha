'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { Users, Activity, ShieldCheck, CheckCircle, Clock, AlertTriangle, LogOut, RefreshCcw, BarChart2 } from 'lucide-react';

function StatCard({ title, value, subtitle, icon: Icon, color }: any) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl ${color}`}><Icon size={22}/></div>
      </div>
      <p className="text-3xl font-bold text-gray-800">{value ?? '—'}</p>
      <p className="text-sm font-semibold text-gray-600 mt-1">{title}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState('overview');

  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ['adminStats'],
    queryFn: () => api.get('/admin/stats').then(r => r.data),
    refetchInterval: 60000, retry: 1,
  });
  const { data: activity = [] } = useQuery({
    queryKey: ['adminActivity'],
    queryFn: () => api.get('/admin/activity').then(r => r.data),
    refetchInterval: 30000, retry: 1,
  });

  return (
    <div className="min-h-screen bg-[#F7F3EE]">
      <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-[#1B6CA8] p-2 rounded-xl"><Activity size={20} className="text-white"/></div>
          <div><h1 className="text-lg font-bold text-gray-800">Ayu Disha Admin</h1>
            <p className="text-xs text-gray-400">System Administration Panel</p></div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={()=>refetch()} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"><RefreshCcw size={18} className={isLoading?'animate-spin':''}/></button>
          <button onClick={()=>{logout();router.push('/login');}} className="flex items-center gap-2 text-red-500 hover:text-red-700 font-semibold text-sm"><LogOut size={16}/>Logout</button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800">System Dashboard</h2>
          <p className="text-gray-500 mt-1">Real-time overview of Ayu Disha platform activity</p>
        </div>

        <div className="flex border-b border-gray-200 mb-8">
          {['overview','users','reports'].map(t=>(
            <button key={t} onClick={()=>setActiveTab(t)} className={`px-6 py-3 text-sm font-semibold border-b-2 transition-all capitalize ${activeTab===t?'border-[#1B6CA8] text-[#1B6CA8]':'border-transparent text-gray-500 hover:text-gray-700'}`}>{t}</button>
          ))}
        </div>

        {activeTab==='overview' && (<>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            <StatCard title="Total Patients" value={isLoading?'...':stats?.total_patients?.toLocaleString()} subtitle="Registered on platform" icon={Users} color="bg-blue-100 text-blue-600"/>
            <StatCard title="Doctors" value={isLoading?'...':stats?.total_doctors} subtitle="Active clinicians" icon={Activity} color="bg-green-100 text-green-600"/>
            <StatCard title="ASHA Workers" value={isLoading?'...':stats?.total_asha_workers} subtitle="Community health workers" icon={ShieldCheck} color="bg-purple-100 text-purple-600"/>
            <StatCard title="Hospitals" value={isLoading?'...':stats?.total_hospitals} subtitle="Registered facilities" icon={BarChart2} color="bg-orange-100 text-orange-600"/>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            <StatCard title="Visits Today" value={isLoading?'...':stats?.visits_today} subtitle="Consultations completed" icon={CheckCircle} color="bg-teal-100 text-teal-600"/>
            <StatCard title="Pending Referrals" value={isLoading?'...':stats?.referrals_pending} subtitle="Awaiting acceptance" icon={Clock} color="bg-amber-100 text-amber-600"/>
            <StatCard title="High-Risk Households" value={isLoading?'...':stats?.high_risk_households} subtitle="Flagged by ASHA workers" icon={AlertTriangle} color="bg-red-100 text-red-600"/>
            <StatCard title="Active Consents" value={isLoading?'...':stats?.consents_active} subtitle="Patient data access grants" icon={ShieldCheck} color="bg-indigo-100 text-indigo-600"/>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-800">Recent Activity</h3>
              <span className="text-xs text-gray-400">Live feed</span>
            </div>
            <div className="divide-y divide-gray-50">
              {(activity as any[]).length===0
                ? <p className="p-8 text-center text-gray-400">No recent activity</p>
                : (activity as any[]).map((item:any,i:number)=>(
                <div key={i} className="px-6 py-4 flex items-start gap-4 hover:bg-gray-50 transition-colors">
                  <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${item.severity==='urgent'?'bg-red-500':item.severity==='warning'?'bg-amber-500':'bg-green-500'}`}/>
                  <div className="flex-1"><p className="text-sm text-gray-700">{item.message}</p><p className="text-xs text-gray-400 mt-0.5">{item.time}</p></div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${item.severity==='urgent'?'bg-red-100 text-red-600':item.severity==='warning'?'bg-amber-100 text-amber-600':'bg-green-100 text-green-600'}`}>{item.type}</span>
                </div>
              ))}
            </div>
          </div>
        </>)}

        {activeTab==='users' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
            <Users size={48} className="text-gray-300 mx-auto mb-4"/>
            <h3 className="text-lg font-bold text-gray-600">User Management</h3>
            <p className="text-gray-400 text-sm mt-2">Full user management coming in next release</p>
          </div>
        )}

        {activeTab==='reports' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
            <BarChart2 size={48} className="text-gray-300 mx-auto mb-4"/>
            <h3 className="text-lg font-bold text-gray-600">Analytics & Reports</h3>
            <p className="text-gray-400 text-sm mt-2">Advanced analytics coming in next release</p>
          </div>
        )}
      </div>
    </div>
  );
}
