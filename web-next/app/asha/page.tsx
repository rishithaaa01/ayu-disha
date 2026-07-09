'use client';
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import ashaApi from '@/lib/ashaApi';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import {
  Users, Activity, Home, ArrowUpRight, Plus, CheckCircle2,
  RefreshCcw, AlertTriangle, LogOut, Mic, Sparkles
} from 'lucide-react';

function MetricCard({ title, value, icon: Icon, color, alert, change }: any) {
  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-6 ${alert ? 'border-red-200' : 'border-gray-100'}`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl ${color}`}><Icon size={20} /></div>
        {alert && <span className="text-xs font-bold bg-red-100 text-red-600 px-2 py-1 rounded-full flex items-center gap-1"><AlertTriangle size={10}/>Alert</span>}
      </div>
      <p className="text-2xl font-bold text-gray-800">{value ?? '—'}</p>
      <p className="text-sm font-semibold text-gray-600 mt-1">{title}</p>
      {change && <p className="text-xs mt-1 font-medium text-green-600">{change}</p>}
    </div>
  );
}

export default function AshaPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('households');
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('All');
  const [successMessage, setSuccessMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [showHouseholdModal, setShowHouseholdModal] = useState(false);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);

  // Household form
  const [hhFamilyName, setHhFamilyName] = useState('');
  const [hhVillage, setHhVillage] = useState(user?.village || '');
  const [hhDistrict, setHhDistrict] = useState(user?.district || 'Chennai');
  const [hhMembers, setHhMembers] = useState([{ name: '', age: '', gender: 'female' }]);

  // Visit form
  const [visitHhId, setVisitHhId] = useState('');
  const [visitMemberName, setVisitMemberName] = useState('');
  const [visitType, setVisitType] = useState('Routine Checkup');
  const [visitSymptoms, setVisitSymptoms] = useState('');
  const [visitRisk, setVisitRisk] = useState('green');
  const [visitReasoning, setVisitReasoning] = useState('');
  const [visitPreferredHospital, setVisitPreferredHospital] = useState('');
  const [isAnalyzingRisk, setIsAnalyzingRisk] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Referral form
  const [refHhId, setRefHhId] = useState('');
  const [refHospital, setRefHospital] = useState('');
  const [refUrgency, setRefUrgency] = useState('Routine');
  const [refNotes, setRefNotes] = useState('');

  const { isRecording, audioBlob, startRecording, stopRecording, clearRecording } = useVoiceRecorder();

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({ queryKey: ['ashaStats'], queryFn: () => ashaApi.getStats(), retry: 1 });
  const { data: households = [], isLoading: hhLoading, refetch: refetchHh } = useQuery({ queryKey: ['ashaHouseholds'], queryFn: () => ashaApi.getHouseholds(), retry: 1 });
  const { data: referrals = [], refetch: refetchRef } = useQuery({ queryKey: ['ashaReferrals'], queryFn: () => ashaApi.getReferrals(), retry: 1 });
  const { data: hospitals = [] } = useQuery({ queryKey: ['hospitals'], queryFn: () => ashaApi.getHospitals(), retry: 1 });

  useEffect(() => {
    if (audioBlob) handleTranscribe();
  }, [audioBlob]);

  const handleTranscribe = async () => {
    if (!audioBlob) return;
    setIsTranscribing(true);
    try {
      const fd = new FormData(); fd.append('file', audioBlob, 'voice_note.webm');
      const res = await ashaApi.transcribe(fd);
      if (res.transcript) setVisitSymptoms((p: string) => p + (p ? ' ' : '') + res.transcript);
      clearRecording();
    } catch { setFormError('Transcription failed.'); }
    finally { setIsTranscribing(false); }
  };

  const handleAiRisk = async () => {
    if (!visitHhId) { setFormError('Select a household first.'); return; }
    if (!visitSymptoms.trim()) { setFormError('Enter symptoms first.'); return; }
    setIsAnalyzingRisk(true); setFormError('');
    try {
      const hh: any = (households as any[]).find((h: any) => h.id === visitHhId);
      const member = hh?.members?.find((m: any) => m.name === visitMemberName);
      const res = await ashaApi.classifyRisk({ member_name: visitMemberName, member_age: member?.age || 30, member_gender: member?.gender || 'female', visit_type: visitType, observations: { symptoms: visitSymptoms }, transcript: '' });
      setVisitRisk(res.risk_level?.toLowerCase() || 'green');
      setVisitReasoning(res.reasoning || '');
      setSuccessMessage(`AI: ${res.risk_level} risk — ${res.reasoning}`);
      setTimeout(() => setSuccessMessage(''), 6000);
    } catch { setFormError('AI classification failed.'); }
    finally { setIsAnalyzingRisk(false); }
  };

  const handleCreateHousehold = async (e: React.FormEvent) => {
    e.preventDefault(); setFormLoading(true); setFormError('');
    try {
      await ashaApi.registerHousehold({ family_name: hhFamilyName, village: hhVillage, block: '', district: hhDistrict, members: hhMembers.map(m => ({ ...m, age: parseInt(m.age) || 0 })) });
      setSuccessMessage('Household registered!'); setShowHouseholdModal(false);
      setHhFamilyName(''); setHhMembers([{ name: '', age: '', gender: 'female' }]);
      refetchHh(); refetchStats(); setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) { setFormError(err.response?.data?.detail || 'Failed.'); }
    finally { setFormLoading(false); }
  };

  const handleCreateVisit = async (e: React.FormEvent) => {
    e.preventDefault(); setFormLoading(true); setFormError('');
    try {
      await ashaApi.submitVisit({ household_id: visitHhId, member_id: visitMemberName || 'unknown', visit_type: visitType, observations: { symptoms: visitSymptoms, recorded_at: new Date().toISOString() }, voice_notes: '', risk_level: (visitRisk || 'WATCH').toUpperCase(), ai_reasoning: visitReasoning || '', ai_recommendation: '' });
      if ((visitRisk || '').toLowerCase() === 'red') {
        await ashaApi.sendReferral({ household_id: visitHhId, to_hospital_id: visitPreferredHospital || (hospitals as any[])[0]?.name || '', urgency: 'Today', ai_summary: visitReasoning || 'Urgent risk', notes: visitSymptoms }).catch(() => {});
      }
      setSuccessMessage('Visit logged!'); setShowVisitModal(false); setVisitSymptoms(''); setVisitReasoning('');
      refetchHh(); refetchStats(); setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: any) { setFormError(err.response?.data?.detail || 'Failed.'); }
    finally { setFormLoading(false); }
  };

  const handleCreateReferral = async (e: React.FormEvent) => {
    e.preventDefault(); setFormLoading(true); setFormError('');
    try {
      await ashaApi.sendReferral({ household_id: refHhId || 'AUTO_ASSIGNED', to_hospital_id: refHospital, urgency: refUrgency, ai_summary: refNotes || 'Patient referred for EMR consultation.', notes: refNotes });
      setSuccessMessage('Referral sent!'); setShowReferralModal(false); setRefNotes('');
      refetchRef(); refetchStats(); setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) { setFormError(err.response?.data?.detail || 'Failed.'); }
    finally { setFormLoading(false); }
  };

  const filteredHouseholds = (households as any[]).filter((h: any) => {
    if (riskFilter === 'Urgent' && h.risk_level !== 'red') return false;
    if (riskFilter === 'Watch' && h.risk_level !== 'amber') return false;
    if (riskFilter === 'Done' && h.risk_level !== 'green') return false;
    if (searchQuery.trim()) { const q = searchQuery.toLowerCase(); return h.family_name?.toLowerCase().includes(q) || h.village?.toLowerCase().includes(q); }
    return true;
  });

  const riskColor = (r: string) => r === 'red' ? 'bg-red-500' : r === 'amber' ? 'bg-amber-500' : 'bg-green-500';

  return (
    <div className="min-h-screen bg-[#F7F3EE]">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-[#1B6CA8] p-2.5 rounded-xl"><Home size={20} className="text-white"/></div>
          <div><h1 className="text-lg font-bold text-gray-800">Ayu Disha ASHA</h1>
            <p className="text-xs text-gray-400">Community Health Worker Dashboard</p></div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-gray-800">{user?.name || 'ASHA Worker'}</p>
            <p className="text-xs text-[#1B6CA8] font-semibold">{user?.village || user?.district || '—'}</p>
          </div>
          <button onClick={()=>{refetchStats();refetchHh();refetchRef();}} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"><RefreshCcw size={18}/></button>
          <button onClick={()=>{logout();router.push('/login');}} className="flex items-center gap-2 text-red-500 hover:text-red-700 font-semibold text-sm"><LogOut size={18}/><span className="hidden sm:inline">Logout</span></button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {successMessage && <div className="p-4 bg-green-50 border-l-4 border-green-500 text-green-700 rounded-xl text-sm font-semibold flex items-center gap-2"><CheckCircle2 size={16}/>{successMessage}</div>}

        {/* Welcome + Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Namaste, {user?.name || 'Health Worker'}</h2>
            <p className="text-gray-500 text-sm mt-1">Manage households, screen risk levels, and dispatch referrals.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={()=>setShowHouseholdModal(true)} className="bg-[#1B6CA8] hover:bg-[#155A8A] text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5"><Plus size={14}/>Register Household</button>
            <button onClick={()=>setShowVisitModal(true)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5"><Activity size={14}/>Log Field Visit</button>
            <button onClick={()=>setShowReferralModal(true)} className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5"><ArrowUpRight size={14}/>Send Referral</button>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard title="Total Households" value={stats?.total_households} icon={Home} color="bg-blue-50 text-blue-600"/>
          <MetricCard title="Visits This Month" value={stats?.visits_this_month} icon={Users} color="bg-green-50 text-green-600"/>
          <MetricCard title="Referrals Sent" value={stats?.referrals_sent_this_month} icon={ArrowUpRight} color="bg-purple-50 text-purple-600" change={`${stats?.referrals_seen_percentage ?? '—'}% seen by doctor`}/>
          <MetricCard title="Urgent Alerts" value={stats?.urgent_cases_detected} icon={AlertTriangle} color="bg-red-50 text-red-600" alert={stats?.urgent_cases_detected > 0}/>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4 flex items-center justify-between">
            <div className="flex gap-2">
              {['households','referrals'].map(t=>(
                <button key={t} onClick={()=>setActiveTab(t)} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab===t?'bg-[#1B6CA8] text-white':'text-gray-500 hover:text-gray-700'}`}>
                  {t==='households'?'Registered Households':'Referral Log'}
                </button>
              ))}
            </div>
          </div>
          <div className="p-6">
            {activeTab==='households' && (
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <input type="text" placeholder="Search family or village..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} className="w-full md:w-80 pl-4 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#1B6CA8]"/>
                  <div className="flex bg-white p-1 rounded-xl border border-gray-200 gap-1">
                    {['All','Urgent','Watch','Done'].map(tab=>(
                      <button key={tab} onClick={()=>setRiskFilter(tab)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${riskFilter===tab?'bg-[#1B6CA8] text-white':'text-gray-500'}`}>{tab}</button>
                    ))}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead><tr className="border-b border-gray-100 text-xs font-bold text-gray-400 uppercase">
                      <th className="pb-3 pl-2">Family</th><th className="pb-3">Village</th><th className="pb-3">Members</th><th className="pb-3">Risk</th><th className="pb-3">Last Visit</th><th className="pb-3">Actions</th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {hhLoading ? <tr><td colSpan={6} className="py-8 text-center text-gray-400">Loading...</td></tr>
                        : filteredHouseholds.length===0 ? <tr><td colSpan={6} className="py-8 text-center text-gray-400">No households found</td></tr>
                        : filteredHouseholds.map((h:any)=>(
                          <tr key={h.id} className="hover:bg-gray-50 transition-colors">
                            <td className="py-3 pl-2 font-semibold text-gray-800">{h.family_name}</td>
                            <td className="py-3 text-gray-500">{h.village}</td>
                            <td className="py-3 text-gray-700">{h.members?.length || 0}</td>
                            <td className="py-3"><span className={`inline-block w-2.5 h-2.5 rounded-full ${riskColor(h.risk_level)} mr-2`}/>{h.risk_level}</td>
                            <td className="py-3 text-gray-500 text-xs">{h.last_visit_date ? new Date(h.last_visit_date).toLocaleDateString() : 'Never'}</td>
                            <td className="py-3"><button onClick={()=>{setVisitHhId(h.id);setVisitMemberName('');setShowVisitModal(true);}} className="text-xs font-bold text-[#1B6CA8] hover:underline">Log Visit</button></td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {activeTab==='referrals' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead><tr className="border-b border-gray-100 text-xs font-bold text-gray-400 uppercase">
                    <th className="pb-3">Patient</th><th className="pb-3">Referred To</th><th className="pb-3">Urgency</th><th className="pb-3">Sent</th><th className="pb-3">Status</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {(referrals as any[]).length===0 ? <tr><td colSpan={5} className="py-8 text-center text-gray-400">No referrals yet</td></tr>
                      : (referrals as any[]).map((r:any)=>(
                        <tr key={r.id} className="hover:bg-gray-50">
                          <td className="py-3 font-semibold text-gray-800">{r.patient_name || '—'}</td>
                          <td className="py-3 text-gray-600">{r.referred_to || r.to_hospital_id}</td>
                          <td className="py-3 text-gray-600">{r.urgency}</td>
                          <td className="py-3 text-gray-500 text-xs">{r.sent_date || '—'}</td>
                          <td className="py-3"><span className={`text-xs font-bold px-2 py-1 rounded-full ${r.status==='seen'?'bg-green-100 text-green-700':r.status==='accepted'?'bg-blue-100 text-blue-700':'bg-gray-100 text-gray-600'}`}>{r.status}</span></td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* HOUSEHOLD MODAL */}
      {showHouseholdModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-bold text-gray-800">Register Household</h3>
              <button onClick={()=>setShowHouseholdModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button></div>
            {formError && <div className="mb-3 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-bold rounded">{formError}</div>}
            <form onSubmit={handleCreateHousehold} className="space-y-3">
              <input placeholder="Family Name *" value={hhFamilyName} onChange={e=>setHhFamilyName(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl text-sm outline-none" required/>
              <input placeholder="Village" value={hhVillage} onChange={e=>setHhVillage(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl text-sm outline-none"/>
              <input placeholder="District" value={hhDistrict} onChange={e=>setHhDistrict(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl text-sm outline-none"/>
              <p className="text-xs font-bold text-gray-500 uppercase mt-2">Members</p>
              {hhMembers.map((m,i)=>(
                <div key={i} className="flex gap-2 items-center">
                  <input placeholder="Name" value={m.name} onChange={e=>{const n=[...hhMembers];n[i].name=e.target.value;setHhMembers(n);}} className="flex-1 p-2 border border-gray-200 rounded-lg text-sm outline-none"/>
                  <input placeholder="Age" type="number" value={m.age} onChange={e=>{const n=[...hhMembers];n[i].age=e.target.value;setHhMembers(n);}} className="w-16 p-2 border border-gray-200 rounded-lg text-sm outline-none"/>
                  <select value={m.gender} onChange={e=>{const n=[...hhMembers];n[i].gender=e.target.value;setHhMembers(n);}} className="p-2 border border-gray-200 rounded-lg text-sm outline-none">
                    <option value="female">F</option><option value="male">M</option><option value="other">O</option>
                  </select>
                  {i>0 && <button type="button" onClick={()=>setHhMembers(hhMembers.filter((_,j)=>j!==i))} className="text-red-400 text-sm">✕</button>}
                </div>
              ))}
              <button type="button" onClick={()=>setHhMembers([...hhMembers,{name:'',age:'',gender:'female'}])} className="text-[#1B6CA8] text-sm font-bold hover:underline">+ Add Member</button>
              <button type="submit" disabled={formLoading} className="w-full bg-[#1B6CA8] text-white py-3 rounded-xl font-bold text-sm mt-2 disabled:opacity-50">{formLoading?'Saving...':'Register Household'}</button>
            </form>
          </div>
        </div>
      )}

      {/* VISIT MODAL */}
      {showVisitModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-bold text-gray-800">Log Field Visit</h3>
              <button onClick={()=>setShowVisitModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button></div>
            {formError && <div className="mb-3 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-bold rounded">{formError}</div>}
            <form onSubmit={handleCreateVisit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-bold text-gray-500 uppercase">Household</label>
                  <select value={visitHhId} onChange={e=>{setVisitHhId(e.target.value);setVisitMemberName('');}} className="w-full mt-1 p-3 bg-white border border-gray-300 rounded-xl text-sm outline-none" required>
                    <option value="">-- Select --</option>
                    {(households as any[]).map((h:any)=><option key={h.id} value={h.id}>{h.family_name}</option>)}
                  </select>
                </div>
                <div><label className="text-xs font-bold text-gray-500 uppercase">Patient / Member</label>
                  <select value={visitMemberName} onChange={e=>setVisitMemberName(e.target.value)} disabled={!visitHhId} className="w-full mt-1 p-3 bg-white border border-gray-300 rounded-xl text-sm outline-none" required>
                    <option value="">{visitHhId?'-- Select member --':'-- Select household first --'}</option>
                    {visitHhId && (households as any[]).find((h:any)=>h.id===visitHhId)?.members?.map((m:any,i:number)=>(
                      <option key={i} value={m.name}>{m.name}{m.age?` (${m.age}y`:''}{m.gender?`, ${m.gender}`:''}{m.age?')':''}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div><label className="text-xs font-bold text-gray-500 uppercase">Visit Type</label>
                <select value={visitType} onChange={e=>setVisitType(e.target.value)} className="w-full mt-1 p-3 bg-white border border-gray-300 rounded-xl text-sm outline-none">
                  {['Routine Checkup','Maternal Health','Child Health','Chronic Disease Follow-up','Emergency'].map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
              <div><label className="text-xs font-bold text-gray-500 uppercase">Symptoms / Observations</label>
                <textarea value={visitSymptoms} onChange={e=>setVisitSymptoms(e.target.value)} placeholder="Describe observations..." className="w-full mt-1 p-3 border border-gray-300 rounded-xl text-sm outline-none min-h-[80px]"/>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={isRecording?stopRecording:startRecording} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${isRecording?'bg-red-50 border-red-300 text-red-600':'bg-amber-50 border-amber-300 text-amber-700'}`}>
                  <Mic size={14}/>{isRecording?'Stop Recording':isTranscribing?'Transcribing...':'Dictate Voice Note'}
                </button>
                <button type="button" onClick={handleAiRisk} disabled={isAnalyzingRisk} className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-blue-50 border border-blue-200 text-blue-700 disabled:opacity-50">
                  <Sparkles size={14}/>{isAnalyzingRisk?'Analyzing...':'AI Risk Check'}
                </button>
              </div>
              {visitReasoning && <div className="p-3 bg-blue-50 rounded-xl text-xs text-blue-800 font-medium">AI: {visitReasoning}</div>}
              <div><label className="text-xs font-bold text-gray-500 uppercase">Preferred Hospital</label>
                <select value={visitPreferredHospital} onChange={e=>setVisitPreferredHospital(e.target.value)} className="w-full mt-1 p-3 bg-white border border-gray-300 rounded-xl text-sm outline-none">
                  <option value="">-- Auto assign --</option>
                  {(hospitals as any[]).map((h:any)=><option key={h.id} value={h.name}>{h.name}</option>)}
                </select>
              </div>
              <button type="submit" disabled={formLoading} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold text-sm disabled:opacity-50">{formLoading?'Logging...':'Log Field Visit'}</button>
            </form>
          </div>
        </div>
      )}

      {/* REFERRAL MODAL */}
      {showReferralModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-bold text-gray-800">Send Referral</h3>
              <button onClick={()=>setShowReferralModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button></div>
            {formError && <div className="mb-3 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-bold rounded">{formError}</div>}
            <form onSubmit={handleCreateReferral} className="space-y-3">
              <div><label className="text-xs font-bold text-gray-500 uppercase">Hospital *</label>
                <select value={refHospital} onChange={e=>setRefHospital(e.target.value)} className="w-full mt-1 p-3 bg-white border border-gray-300 rounded-xl text-sm outline-none" required>
                  <option value="">-- Select Hospital --</option>
                  {(hospitals as any[]).map((h:any)=><option key={h.id} value={h.name}>{h.name}</option>)}
                </select>
              </div>
              <div><label className="text-xs font-bold text-gray-500 uppercase">Urgency</label>
                <select value={refUrgency} onChange={e=>setRefUrgency(e.target.value)} className="w-full mt-1 p-3 bg-white border border-gray-300 rounded-xl text-sm outline-none">
                  {['Routine','Today','Immediate'].map(u=><option key={u}>{u}</option>)}
                </select>
              </div>
              <div><label className="text-xs font-bold text-gray-500 uppercase">Notes</label>
                <textarea value={refNotes} onChange={e=>setRefNotes(e.target.value)} placeholder="Reason for referral..." className="w-full mt-1 p-3 border border-gray-300 rounded-xl text-sm outline-none min-h-[80px]"/>
              </div>
              <button type="submit" disabled={formLoading} className="w-full bg-amber-600 text-white py-3 rounded-xl font-bold text-sm disabled:opacity-50">{formLoading?'Sending...':'Send Referral'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
