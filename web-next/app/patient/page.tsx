'use client';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import patientApi from '@/lib/patientApi';
import api from '@/lib/api';
import { Activity, FileText, FlaskConical, Pill, Shield, LogOut, RefreshCcw, AlertTriangle, Sparkles, ChevronRight } from 'lucide-react';

export default function PatientPage() {
  const router = useRouter();
  const { user, logout, refreshUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => { refreshUser(); }, []);

  const { data: profile } = useQuery({ queryKey: ['patientProfile'], queryFn: () => patientApi.getMyProfile(), retry: 1 });
  const { data: visits = [] } = useQuery({ queryKey: ['patientVisits'], queryFn: () => patientApi.getMyVisits(), retry: 1 });
  const { data: prescriptions = [] } = useQuery({ queryKey: ['patientPrescriptions'], queryFn: () => patientApi.getMyPrescriptions(), retry: 1 });
  const { data: labs = [] } = useQuery({ queryKey: ['patientLabs'], queryFn: () => patientApi.getMyLabResults(), retry: 1 });
  const { data: consents = [] } = useQuery({ queryKey: ['patientConsents'], queryFn: () => patientApi.getMyConsents(), retry: 1 });
  const { data: healthSummary } = useQuery({ queryKey: ['healthSummary'], queryFn: () => patientApi.getHealthSummary(), retry: 1 });

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'records', label: 'Health Records', icon: FileText },
    { id: 'medicines', label: 'Medicines', icon: Pill },
    { id: 'tests', label: 'Lab Tests', icon: FlaskConical },
    { id: 'consents', label: 'Consents', icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-[#F7F3EE]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-[#D35400] p-2.5 rounded-xl"><Activity size={20} className="text-white"/></div>
          <div><h1 className="text-lg font-bold text-gray-800">My Health Portal</h1>
            <p className="text-xs text-gray-400">Ayu Disha Patient Dashboard</p></div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-gray-800">{user?.name || profile?.name || '—'}</p>
            <p className="text-xs text-[#D35400] font-semibold">{profile?.abha_number || 'ABHA not assigned'}</p>
          </div>
          <button onClick={()=>{logout();router.push('/login');}} className="flex items-center gap-2 text-red-500 hover:text-red-700 font-semibold text-sm"><LogOut size={18}/><span className="hidden sm:inline">Logout</span></button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-6">
        {/* Profile card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6 flex flex-col md:flex-row gap-6 items-start">
          <div className="w-16 h-16 rounded-full bg-[#D35400] flex items-center justify-center text-white text-2xl font-bold shrink-0">
            {(user?.name || profile?.name || 'P').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-800">{user?.name || profile?.name || '—'}</h2>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
              <span>DOB: {profile?.date_of_birth || '—'}</span>
              <span>Blood: <strong className="text-red-600">{profile?.blood_group || '—'}</strong></span>
              <span>Gender: {profile?.gender || '—'}</span>
              {profile?.allergies?.length > 0 && <span className="text-red-600 font-bold">⚠ Allergies: {profile.allergies.join(', ')}</span>}
            </div>
          </div>
        </div>

        {/* AI Health Summary */}
        {healthSummary?.summary && (
          <div className="bg-gradient-to-r from-[#1B6CA8]/5 to-blue-50 border border-blue-100 rounded-2xl p-5 mb-6 flex gap-3">
            <Sparkles size={20} className="text-[#1B6CA8] shrink-0 mt-0.5" fill="#1B6CA8"/>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#1B6CA8] mb-1">AI Health Summary</p>
              <p className="text-sm text-gray-700 leading-relaxed">{healthSummary.summary}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${activeTab===t.id?'border-[#1B6CA8] text-[#1B6CA8]':'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <t.icon size={16}/>{t.label}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {activeTab==='overview' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label:'Total Visits', value:(visits as any[]).length, color:'text-blue-600', bg:'bg-blue-50' },
              { label:'Active Medicines', value:(prescriptions as any[]).length, color:'text-green-600', bg:'bg-green-50' },
              { label:'Lab Tests', value:(labs as any[]).length, color:'text-purple-600', bg:'bg-purple-50' },
              { label:'Active Consents', value:(consents as any[]).length, color:'text-orange-600', bg:'bg-orange-50' },
            ].map(c=>(
              <div key={c.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <p className={`text-3xl font-bold ${c.color}`}>{c.value}</p>
                <p className="text-sm text-gray-500 mt-1">{c.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* HEALTH RECORDS */}
        {activeTab==='records' && (
          <div className="space-y-3">
            {(visits as any[]).length===0 ? <p className="text-center text-gray-400 py-12">No visit records found.</p>
              : (visits as any[]).map((v:any,i:number)=>(
              <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-bold text-gray-800">{v.chief_complaint || 'General Visit'}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{v.hospital_name || v.hospital_id || '—'} · {v.doctor_name || '—'}</p>
                  </div>
                  <span className="text-xs text-gray-400">{v.date ? new Date(v.date).toLocaleDateString() : '—'}</span>
                </div>
                {v.diagnosis?.length>0 && <div className="flex flex-wrap gap-2 mt-2">{v.diagnosis.map((d:string,j:number)=><span key={j} className="bg-blue-50 text-blue-700 text-xs font-bold px-2 py-1 rounded-full">{d}</span>)}</div>}
              </div>
            ))}
          </div>
        )}

        {/* MEDICINES */}
        {activeTab==='medicines' && (
          <div className="space-y-3">
            {(prescriptions as any[]).length===0 ? <p className="text-center text-gray-400 py-12">No prescriptions found.</p>
              : (prescriptions as any[]).map((p:any,i:number)=>(
              <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex justify-between items-center">
                <div>
                  <p className="font-bold text-gray-800">{p.medicine || p.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{p.dosage} · {p.frequency} · {p.duration}</p>
                  <p className="text-xs text-gray-400 mt-1">By {p.prescribed_by || '—'} on {p.prescribed_date ? new Date(p.prescribed_date).toLocaleDateString() : '—'}</p>
                </div>
                <span className="text-xs font-bold px-3 py-1 bg-green-50 text-green-700 rounded-full">Active</span>
              </div>
            ))}
          </div>
        )}

        {/* LAB TESTS */}
        {activeTab==='tests' && (
          <div className="space-y-3">
            {(labs as any[]).length===0 ? <p className="text-center text-gray-400 py-12">No lab tests found.</p>
              : (labs as any[]).map((l:any,i:number)=>(
              <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex justify-between items-center mb-1">
                  <p className="font-bold text-gray-800">{l.test_name}</p>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${l.status==='resulted'?'bg-green-100 text-green-700':l.status==='pending'?'bg-amber-100 text-amber-700':'bg-gray-100 text-gray-600'}`}>{l.status}</span>
                </div>
                {l.result && <p className="text-sm text-gray-700 mt-1">{l.result}</p>}
                <p className="text-xs text-gray-400 mt-1">Ordered by {l.ordered_by || '—'} · {l.ordered_date ? new Date(l.ordered_date).toLocaleDateString() : '—'}</p>
              </div>
            ))}
          </div>
        )}

        {/* CONSENTS */}
        {activeTab==='consents' && (
          <div className="space-y-3">
            {(consents as any[]).length===0
              ? <div className="text-center py-12"><Shield size={48} className="text-gray-300 mx-auto mb-3"/><p className="text-gray-400 font-semibold">No active consents</p><p className="text-gray-300 text-sm mt-1">Your data is private. No one currently has access.</p></div>
              : (consents as any[]).map((c:any,i:number)=>(
              <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex justify-between items-center">
                <div>
                  <p className="font-bold text-gray-800">{c.granted_to_name || 'Doctor'}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Scope: {c.data_scope} · Expires: {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : '—'}</p>
                </div>
                <button onClick={()=>patientApi.revokeConsent(c._id||c.id)} className="text-xs font-bold text-red-500 hover:underline">Revoke</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
