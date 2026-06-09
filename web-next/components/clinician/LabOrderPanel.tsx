'use client';

import { useState } from 'react';
import { FlaskConical, Plus, X, Search, Check, Loader2 } from 'lucide-react';
import { api } from '@/lib/clinicianApi';
import toast from 'react-hot-toast';

const COMMON_TESTS = ['CBC', 'Blood Sugar Fasting', 'HbA1c', 'LFT', 'KFT', 'Lipid Profile', 'Thyroid (TSH)', 'Urine Routine', 'ECG', 'Chest X-Ray', 'Electrolytes'];

export default function LabOrderPanel({ patient, visitId }: { patient: any; visitId: string }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [custom, setCustom] = useState('');
  const [urgency, setUrgency] = useState('routine');
  const [isOrdering, setIsOrdering] = useState(false);

  const toggle = (t: string) => setSelected(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]);
  const addCustom = () => { if (custom && !selected.includes(custom)) { setSelected(p => [...p, custom]); setCustom(''); } };

  const handleOrder = async () => {
    if (!selected.length) return;
    setIsOrdering(true);
    try {
      await api.orderLabs({ visit_id: visitId, patient_id: patient.profile?.id || patient.patient_id, tests: selected, urgency });
      toast.success(`${selected.length} tests ordered`);
      setSelected([]);
    } catch { toast.error('Failed to order tests'); }
    finally { setIsOrdering(false); }
  };

  return (
    <div className="flex flex-col h-full bg-[#FAFAFA] p-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-[#1B6CA8] mb-2"><FlaskConical size={18} /><h3 className="font-bold text-lg uppercase tracking-wider">Laboratory Investigations</h3></div>
        <p className="text-sm text-[#888]">For <span className="font-bold text-[#333]">{patient.profile?.name || patient.patient_name}</span></p>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar mb-6">
        <p className="text-[10px] font-bold text-[#888] uppercase tracking-widest mb-4">Quick Selection</p>
        <div className="grid grid-cols-2 gap-3 mb-8">
          {COMMON_TESTS.map(t => (
            <button key={t} onClick={() => toggle(t)}
              className={`p-4 rounded-xl border text-sm font-bold transition-all text-left flex items-center justify-between ${selected.includes(t) ? 'bg-[#1B6CA8] text-white border-[#1B6CA8]' : 'bg-white text-[#666] border-[#E2DDD8] hover:border-[#1B6CA8]'}`}>
              <span>{t}</span>{selected.includes(t) && <Check size={14} />}
            </button>
          ))}
        </div>

        <div className="flex gap-2 mb-6">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-3.5 text-[#888]" />
            <input value={custom} onChange={e => setCustom(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCustom()}
              placeholder="Custom test name..." className="w-full pl-10 pr-4 py-3 bg-white border border-[#E2DDD8] rounded-xl text-sm focus:outline-none focus:border-[#1B6CA8]" />
          </div>
          <button onClick={addCustom} className="p-3 bg-[#F7F3EE] text-[#1B6CA8] rounded-xl hover:bg-[#EBF5FB]"><Plus size={24} /></button>
        </div>

        {selected.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selected.map(t => (
              <div key={t} className="bg-white border border-[#1B6CA8] text-[#1B6CA8] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2">
                <span>{t}</span><button onClick={() => toggle(t)}><X size={14} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white border border-[#E2DDD8] rounded-2xl p-6 shadow-sm">
        <div className="flex gap-3 mb-4">
          {['routine', 'urgent', 'emergency'].map(u => (
            <button key={u} onClick={() => setUrgency(u)}
              className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase border-2 transition-all ${urgency === u ? 'bg-blue-50 border-[#1B6CA8] text-[#1B6CA8]' : 'border-[#F7F3EE] text-[#888]'}`}>{u}</button>
          ))}
        </div>
        <button onClick={handleOrder} disabled={!selected.length || isOrdering}
          className="w-full bg-[#1B6CA8] hover:bg-[#154360] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-all">
          {isOrdering ? <Loader2 size={20} className="animate-spin" /> : <><Check size={20} /><span>Order {selected.length} Tests</span></>}
        </button>
      </div>
    </div>
  );
}
