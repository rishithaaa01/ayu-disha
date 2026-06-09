'use client';

import { useState } from 'react';
import { Pill, Plus, X, AlertTriangle, ShieldCheck, Save, Loader2 } from 'lucide-react';
import { api } from '@/lib/clinicianApi';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const FREQUENCIES = ['OD', 'BD', 'TDS', 'QID', 'HS', 'SOS'];
const COMMON_MEDS = ['Paracetamol 500mg', 'Metformin 500mg', 'Amlodipine 5mg', 'Atorvastatin 10mg', 'Pantoprazole 40mg', 'Amoxicillin 500mg', 'Azithromycin 500mg', 'Cetirizine 10mg'];

interface Med { id: string; name: string; dosage: string; frequency: string; duration: string; instructions: string; interaction?: any; }

export default function PrescriptionWriter({ patient, visitId, onSaved }: { patient: any; visitId: string; onSaved: () => void; }) {
  const [meds, setMeds] = useState<Med[]>([{ id: '1', name: '', dosage: '', frequency: 'BD', duration: '', instructions: '' }]);
  const [isSaving, setIsSaving] = useState(false);
  const [checking, setChecking] = useState<string[]>([]);

  const update = (id: string, field: keyof Med, value: string) => setMeds(p => p.map(m => m.id === id ? { ...m, [field]: value } : m));
  const remove = (id: string) => setMeds(p => p.filter(m => m.id !== id));
  const add = () => setMeds(p => [...p, { id: Date.now().toString(), name: '', dosage: '', frequency: 'BD', duration: '', instructions: '' }]);

  const checkInteraction = async (med: Med) => {
    if (!med.name || med.name.length < 3) return;
    setChecking(p => [...p, med.id]);
    try {
      const others = meds.filter(m => m.id !== med.id && m.name).map(m => m.name);
      const res = await api.checkInteraction({ new_medicine: med.name, current_medicines: [...others, ...(patient.current_medications?.map((m: any) => m.name || m.medicine) || [])], patient_allergies: patient.profile?.allergies || patient.allergies || [] });
      setMeds(p => p.map(m => m.id === med.id ? { ...m, interaction: res } : m));
    } catch { /* silent */ }
    finally { setChecking(p => p.filter(i => i !== med.id)); }
  };

  const handleSave = async () => {
    if (meds.some(m => !m.name)) { toast.error('Fill in all medicine names'); return; }
    setIsSaving(true);
    try {
      await api.savePrescription({ visit_id: visitId, patient_id: patient.profile?.id || patient.patient_id, medicines: meds.map(({ id, interaction, ...m }) => m) });
      toast.success('Prescription saved!');
      onSaved();
    } catch { toast.error('Failed to save prescription'); }
    finally { setIsSaving(false); }
  };

  return (
    <div className="flex flex-col h-full bg-[#FAFAFA]">
      <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
        <div className="flex justify-between items-center mb-8">
          <div><h3 className="text-xl font-bold text-[#333]">Write Prescription</h3><p className="text-sm text-[#888] mt-1">{format(new Date(), 'dd MMM yyyy')}</p></div>
        </div>

        <div className="space-y-4 mb-8">
          {meds.map((med, idx) => (
            <div key={med.id} className="bg-white border border-[#E2DDD8] rounded-2xl p-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-[#1B6CA8]" />
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-2 text-[#1B6CA8]">
                  <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center text-[10px] font-bold">{idx + 1}</div>
                  <h4 className="font-bold text-xs uppercase tracking-wider">Medicine Entry</h4>
                </div>
                <button onClick={() => remove(med.id)} className="text-[#888] hover:text-red-500"><X size={18} /></button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[#888] uppercase">Medicine Name</label>
                  <div className="relative">
                    <input type="text" list="med-list" placeholder="E.g. Paracetamol 500mg" value={med.name}
                      onChange={e => update(med.id, 'name', e.target.value)} onBlur={() => checkInteraction(med)}
                      className={`w-full border-b-2 bg-transparent py-2 text-sm font-bold focus:outline-none transition-colors ${med.interaction?.has_allergy_risk ? 'border-red-400 text-red-600' : 'border-[#F1F1F1] focus:border-[#1B6CA8]'}`} />
                    <datalist id="med-list">{COMMON_MEDS.map(m => <option key={m} value={m} />)}</datalist>
                    {checking.includes(med.id) && <Loader2 size={14} className="animate-spin absolute right-0 top-3 text-[#1B6CA8]" />}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[#888] uppercase">Dosage</label>
                  <input placeholder="E.g. 1 Tablet" value={med.dosage} onChange={e => update(med.id, 'dosage', e.target.value)}
                    className="w-full border-b-2 border-[#F1F1F1] bg-transparent py-2 text-sm focus:outline-none focus:border-[#1B6CA8]" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[#888] uppercase">Frequency</label>
                  <select value={med.frequency} onChange={e => update(med.id, 'frequency', e.target.value)}
                    className="w-full border-b-2 border-[#F1F1F1] bg-transparent py-2 text-sm focus:outline-none focus:border-[#1B6CA8] cursor-pointer">
                    {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[#888] uppercase">Duration</label>
                  <input placeholder="E.g. 5 Days" value={med.duration} onChange={e => update(med.id, 'duration', e.target.value)}
                    className="w-full border-b-2 border-[#F1F1F1] bg-transparent py-2 text-sm focus:outline-none focus:border-[#1B6CA8]" />
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-[10px] font-bold text-[#888] uppercase">Instructions</label>
                  <input placeholder="E.g. After food" value={med.instructions} onChange={e => update(med.id, 'instructions', e.target.value)}
                    className="w-full border-b-2 border-[#F1F1F1] bg-transparent py-2 text-sm focus:outline-none focus:border-[#1B6CA8]" />
                </div>
              </div>

              {med.interaction && (med.interaction.has_interaction || med.interaction.has_allergy_risk) && (
                <div className={`mt-6 p-4 rounded-xl border flex gap-3 ${med.interaction.has_allergy_risk ? 'bg-red-50 border-red-100 text-red-700' : 'bg-amber-50 border-amber-100 text-amber-700'}`}>
                  <AlertTriangle size={20} className="shrink-0" />
                  <div>
                    <p className="text-xs font-bold uppercase">{med.interaction.has_allergy_risk ? 'ALLERGY RISK' : `${med.interaction.severity} Interaction`}</p>
                    <p className="text-sm mt-1">{med.interaction.warning}</p>
                  </div>
                </div>
              )}
              {med.interaction && !med.interaction.has_interaction && !med.interaction.has_allergy_risk && med.name && (
                <div className="mt-4 flex items-center gap-1.5 text-green-600 text-[10px] font-bold uppercase"><ShieldCheck size={14} />Safe to prescribe</div>
              )}
            </div>
          ))}
        </div>

        <button onClick={add} className="w-full py-4 border-2 border-dashed border-[#E2DDD8] rounded-2xl flex items-center justify-center gap-2 text-[#666] font-bold hover:bg-white hover:border-[#1B6CA8] hover:text-[#1B6CA8] transition-all mb-12">
          <Plus size={20} />Add Another Medicine
        </button>
      </div>

      <div className="bg-white border-t border-[#E2DDD8] p-6 flex items-center justify-between sticky bottom-0">
        <div className="flex items-center gap-1.5 text-[#1B6CA8] px-3 py-1 bg-blue-50 rounded-full">
          <Pill size={14} /><span className="text-xs font-bold">{meds.length} Medicines</span>
        </div>
        <button onClick={handleSave} disabled={isSaving}
          className="bg-[#1B6CA8] hover:bg-[#154360] text-white px-10 py-4 rounded-2xl font-bold flex items-center gap-2 shadow-xl transition-all disabled:opacity-50 active:scale-95">
          {isSaving ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20} /><span>Save & Notify Patient</span></>}
        </button>
      </div>
    </div>
  );
}
