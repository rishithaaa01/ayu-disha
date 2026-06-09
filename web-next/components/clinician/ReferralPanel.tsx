'use client';

import { useState } from 'react';
import { ArrowUpRight, Hospital, Stethoscope, AlertTriangle, Loader2 } from 'lucide-react';
import { api } from '@/lib/clinicianApi';
import toast from 'react-hot-toast';

const SPECIALITIES = ['General Medicine', 'Cardiology', 'Neurology', 'Orthopaedics', 'Gynaecology', 'Paediatrics', 'Dermatology', 'Psychiatry', 'ENT', 'Ophthalmology', 'Nephrology', 'Endocrinology'];

export default function ReferralPanel({ patient, visitId }: { patient: any; visitId: string }) {
  const [toHospital, setToHospital] = useState('');
  const [speciality, setSpeciality] = useState('General Medicine');
  const [urgency, setUrgency] = useState('routine');
  const [reason, setReason] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!toHospital || !reason) { toast.error('Hospital and Reason are required'); return; }
    setIsSending(true);
    try {
      await api.sendReferral({ visit_id: visitId, patient_id: patient.profile?.id || patient.patient_id, to_hospital_id: toHospital, to_speciality: speciality, reason, urgency, summary: `Referral for ${speciality}. ${reason}` });
      toast.success('Referral sent successfully');
      setReason(''); setToHospital('');
    } catch { toast.error('Failed to send referral'); }
    finally { setIsSending(false); }
  };

  return (
    <div className="flex flex-col h-full bg-[#FAFAFA] p-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-[#1B6CA8] mb-2"><ArrowUpRight size={18} /><h3 className="font-bold text-lg uppercase tracking-wider">Refer Patient</h3></div>
        <p className="text-sm text-[#888]">Transfer care for <span className="font-bold text-[#333]">{patient.profile?.name || patient.patient_name}</span></p>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-8 mb-6">
        <div>
          <label className="text-[10px] font-bold text-[#888] uppercase tracking-widest block mb-3">1. Target Speciality</label>
          <div className="grid grid-cols-2 gap-2">
            {SPECIALITIES.map(s => (
              <button key={s} onClick={() => setSpeciality(s)}
                className={`p-3 rounded-xl border text-xs font-bold transition-all text-left flex items-center gap-2 ${speciality === s ? 'bg-[#1B6CA8] text-white border-[#1B6CA8]' : 'bg-white text-[#666] border-[#E2DDD8] hover:border-[#1B6CA8]'}`}>
                <Stethoscope size={14} /><span>{s}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-[#888] uppercase tracking-widest block mb-3">2. Target Hospital</label>
          <div className="relative">
            <Hospital size={16} className="absolute left-4 top-4 text-[#888]" />
            <input value={toHospital} onChange={e => setToHospital(e.target.value)} placeholder="Search facility name..."
              className="w-full pl-12 pr-4 py-4 bg-white border border-[#E2DDD8] rounded-xl text-sm focus:outline-none focus:border-[#1B6CA8]" />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-[#888] uppercase tracking-widest block mb-3">3. Clinical Indication</label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Why is this patient being referred?" rows={4}
            className="w-full p-4 bg-white border border-[#E2DDD8] rounded-2xl text-sm focus:outline-none focus:border-[#1B6CA8] resize-none" />
        </div>
      </div>

      <div className="bg-white border border-[#E2DDD8] rounded-2xl p-6 shadow-sm">
        <div className="flex gap-3 mb-4">
          {['routine', 'urgent', 'emergency'].map(u => (
            <button key={u} onClick={() => setUrgency(u)}
              className={`flex-1 py-3 rounded-lg text-xs font-bold uppercase border-2 transition-all ${urgency === u ? 'bg-amber-50 border-[#D35400] text-[#D35400]' : 'border-[#F7F3EE] text-[#888]'}`}>{u}</button>
          ))}
        </div>
        <button onClick={handleSend} disabled={!toHospital || !reason || isSending}
          className="w-full bg-[#1B6CA8] hover:bg-[#154360] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-all">
          {isSending ? <Loader2 size={20} className="animate-spin" /> : <><ArrowUpRight size={20} /><span>Send Formal Referral</span></>}
        </button>
        <div className="mt-3 flex items-center justify-center gap-2 text-amber-600">
          <AlertTriangle size={12} /><span className="text-[10px] italic font-medium">This will notify the receiving hospital.</span>
        </div>
      </div>
    </div>
  );
}
