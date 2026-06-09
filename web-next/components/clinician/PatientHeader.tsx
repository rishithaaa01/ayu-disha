import { ShieldCheck, ArrowRight } from 'lucide-react';

export default function PatientHeader({ patient, onStartConsultation, status }: {
  patient: any; onStartConsultation: () => void; status: 'in_queue' | 'active' | 'completed';
}) {
  const profile = patient?.profile || patient;
  const age = profile?.date_of_birth
    ? new Date().getFullYear() - parseInt(profile.date_of_birth.split('-')[0])
    : profile?.age;

  return (
    <div className="bg-white border-b border-[#E2DDD8] px-8 py-6 sticky top-0 z-10">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl font-bold text-[#333]">{profile?.name || profile?.patient_name}</h2>
            <div className="flex gap-2">
              <span className="bg-[#F7F3EE] text-[#666] px-2.5 py-0.5 rounded text-xs font-bold uppercase">{profile?.gender}</span>
              {age && <span className="bg-[#F7F3EE] text-[#666] px-2.5 py-0.5 rounded text-xs font-bold">{age} YRS</span>}
              {profile?.blood_group && <span className="border border-red-200 text-red-600 px-2.5 py-0.5 rounded text-xs font-bold uppercase">{profile.blood_group}</span>}
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-[#888]">
            <p className="font-mono">ABHA: {profile?.abha_number || '00-0000-0000-0000'}</p>
            <div className="flex items-center gap-1 font-bold">
              <span className="uppercase text-[10px]">Allergies:</span>
              {profile?.allergies?.length > 0
                ? profile.allergies.map((a: string) => <span key={a} className="bg-red-50 px-2 py-0.5 rounded text-[#D32F2F] ml-1">{a}</span>)
                : <span className="text-green-600 ml-1">None</span>}
            </div>
          </div>
        </div>
        <div>
          {status === 'in_queue' && (
            <button onClick={onStartConsultation}
              className="bg-[#D35400] hover:bg-[#A04000] text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95">
              <span>Start Consultation</span><ArrowRight size={18} />
            </button>
          )}
          {status === 'active' && (
            <div className="bg-green-100 text-green-700 px-4 py-2 rounded-xl font-bold flex items-center gap-2 border border-green-200">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /><span>In Consultation</span>
            </div>
          )}
          {status === 'completed' && (
            <div className="bg-gray-100 text-gray-500 px-4 py-2 rounded-xl font-bold flex items-center gap-2 border border-gray-200">
              <ShieldCheck size={18} /><span>Session Completed</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
