import React from 'react';
import RiskBadge from './RiskBadge';
import { User, Clock, AlertCircle, XCircle, RefreshCw } from 'lucide-react';

interface QueueCardProps {
  patient: {
    _id: string;
    patient_name: string;
    age: number;
    gender: string;
    chief_complaint: string;
    wait_time: number;
    risk_tag: 'urgent' | 'watch' | 'low';
    appointment_type: string;
    referred_by?: string;
    referral_rejected?: boolean;
    rejection_reason?: string;
  };
  isSelected: boolean;
  onClick: () => void;
  position: number;
}

export default function QueueCard({ patient, isSelected, onClick, position }: QueueCardProps) {
  const isRejected = patient.referral_rejected;

  const borderColors = {
    urgent: 'border-l-red-500',
    watch: 'border-l-amber-500',
    low: 'border-l-green-500'
  };

  const getAppointmentIcon = () => {
    if (isRejected) return <XCircle size={14} className="text-red-500" />;
    if (patient.appointment_type === 'referred') return <AlertCircle size={14} className="text-[#1B6CA8]" />;
    return <User size={14} className="text-[#666]" />;
  };

  return (
    <div
      onClick={onClick}
      className={`
        bg-white rounded-xl border-l-[6px] border border-y-[#E2DDD8] border-r-[#E2DDD8] 
        p-4 mb-3 cursor-pointer transition-all duration-200 hover:shadow-md
        ${isRejected ? 'border-l-red-400' : borderColors[patient.risk_tag]}
        ${isSelected
          ? isRejected ? 'bg-red-50 border-y-red-300 border-r-red-300' : 'bg-[#E8F4FD] border-y-[#1B6CA8] border-r-[#1B6CA8]'
          : isRejected ? 'bg-red-50/50' : 'hover:bg-[#F7F3EE]'
        }
      `}
    >
      {/* Rejected banner */}
      {isRejected && (
        <div className="flex items-center gap-2 bg-red-100 text-red-700 rounded-lg px-3 py-2 mb-3 text-xs font-bold">
          <XCircle size={14} />
          <span>Referral Rejected</span>
          {patient.rejection_reason && (
            <span className="font-normal text-red-600 truncate">— {patient.rejection_reason}</span>
          )}
        </div>
      )}

      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-[#F7F3EE] flex items-center justify-center text-[10px] font-bold text-[#666]">
            #{position}
          </div>
          <h3 className={`font-bold ${isRejected ? 'text-red-700' : 'text-[#333]'}`}>{patient.patient_name}</h3>
        </div>
        {!isRejected && <RiskBadge risk={patient.risk_tag} />}
      </div>

      <div className="flex gap-2 text-xs text-[#666] mb-3">
        <span>{patient.age} years</span>
        <span>•</span>
        <span className="capitalize">{patient.gender}</span>
      </div>

      <p className="text-sm text-[#555] italic line-clamp-1 mb-4">
        "{patient.chief_complaint}"
      </p>

      {/* Re-book message for rejected */}
      {isRejected && (
        <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mb-3 border border-amber-100">
          <RefreshCw size={12} />
          <span>Please ask the patient to re-book a consultation</span>
        </div>
      )}

      <div className="flex items-center justify-between mt-auto pt-3 border-t border-[#E2DDD8]/50">
        <div className="flex items-center gap-1.5">
          <Clock size={14} className="text-[#888]" />
          <span className="text-xs font-medium text-[#888]">
            Waiting {patient.wait_time} min
          </span>
        </div>

        <div className={`
          flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-tight
          ${isRejected ? 'bg-red-50 text-red-600' : patient.appointment_type === 'referred' ? 'bg-blue-50 text-[#1B6CA8]' : 'bg-gray-50 text-[#888]'}
        `}>
          {getAppointmentIcon()}
          {isRejected ? 'Rejected' : patient.appointment_type === 'referred' ? `via ${patient.referred_by || 'ASHA'}` : patient.appointment_type}
        </div>
      </div>
    </div>
  );
}
