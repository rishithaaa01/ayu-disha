import RiskBadge from './RiskBadge';
import { Clock, AlertCircle, User } from 'lucide-react';

export default function QueueCard({ patient, isSelected, onClick, position }: {
  patient: any; isSelected: boolean; onClick: () => void; position: number;
}) {
  const borderColors: Record<string, string> = { urgent: 'border-l-red-500', watch: 'border-l-amber-500', low: 'border-l-green-500' };
  return (
    <div onClick={onClick}
      className={`bg-white rounded-xl border-l-[6px] border border-y-[#E2DDD8] border-r-[#E2DDD8] p-4 mb-3 cursor-pointer transition-all duration-200 hover:shadow-md ${borderColors[patient.risk_tag]} ${isSelected ? 'bg-[#E8F4FD] border-y-[#1B6CA8] border-r-[#1B6CA8]' : 'hover:bg-[#F7F3EE]'}`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-[#F7F3EE] flex items-center justify-center text-[10px] font-bold text-[#666]">#{position}</div>
          <h3 className="font-bold text-[#333]">{patient.patient_name}</h3>
        </div>
        <RiskBadge risk={patient.risk_tag} />
      </div>
      <div className="flex gap-2 text-xs text-[#666] mb-3">
        <span>{patient.age} years</span><span>•</span><span className="capitalize">{patient.gender}</span>
      </div>
      <p className="text-sm text-[#555] italic line-clamp-1 mb-4">"{patient.chief_complaint}"</p>
      <div className="flex items-center justify-between pt-3 border-t border-[#E2DDD8]/50">
        <div className="flex items-center gap-1.5">
          <Clock size={14} className="text-[#888]" />
          <span className="text-xs font-medium text-[#888]">Waiting {patient.wait_time} min</span>
        </div>
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase ${patient.appointment_type === 'referred' ? 'bg-blue-50 text-[#1B6CA8]' : 'bg-gray-50 text-[#888]'}`}>
          {patient.appointment_type === 'referred' ? <AlertCircle size={14} className="text-[#1B6CA8]" /> : <User size={14} className="text-[#666]" />}
          {patient.appointment_type === 'referred' ? `via ${patient.referred_by || 'ASHA'}` : patient.appointment_type}
        </div>
      </div>
    </div>
  );
}
