import React from 'react';
import { ShieldCheck, ArrowRight, User, AlertTriangle } from 'lucide-react';

interface PatientHeaderProps {
  patient: any;
  onStartConsultation: () => void;
  status: 'in_queue' | 'active' | 'completed';
  isReferralRejected?: boolean;
  rejectionReason?: string;
}

export default function PatientHeader({ 
  patient, 
  onStartConsultation, 
  status, 
  isReferralRejected = false, 
  rejectionReason 
}: PatientHeaderProps) {
  const profile = patient?.profile || patient; // Handle both full record and queue entry formats

  return (
    <div className="bg-white border-b border-[#E2DDD8] px-4 sm:px-8 py-4 sm:py-6 sticky top-0 z-10 w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full">
        <div className="flex-1 min-w-0 w-full">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
            <h2 className="text-xl sm:text-2xl font-bold text-[#333] font-mukta break-words">{profile.name || profile.patient_name}</h2>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              <span className="bg-[#F7F3EE] text-[#666] px-2.5 py-1 rounded-lg text-xs font-bold uppercase">
                {profile.gender}
              </span>
              <span className="bg-[#F7F3EE] text-[#666] px-2.5 py-1 rounded-lg text-xs font-bold">
                {profile.age || profile.date_of_birth?.split('-')[0] ? new Date().getFullYear() - parseInt(profile.date_of_birth?.split('-')[0]) : ''} YRS
              </span>
              {profile.blood_group && (
                <span className="border border-red-200 text-red-600 px-2.5 py-1 rounded-lg text-xs font-bold uppercase">
                  {profile.blood_group}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 text-xs text-[#888]">
            <p className="font-mono">ABHA: {profile.abha_number || 'Not assigned'}</p>
            <div className="flex flex-wrap items-center gap-1 text-red-600 font-bold">
              <span className="uppercase text-[10px]">Allergies:</span>
              <div className="flex flex-wrap gap-1">
                {profile.allergies?.length > 0 ? (
                  profile.allergies.map((a: string) => (
                    <span key={a} className="bg-red-50 px-2 py-0.5 rounded text-[#D32F2F]">
                      {a}
                    </span>
                  ))
                ) : (
                  <span className="text-green-600">No known allergies</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
          {status === 'in_queue' && (
            <div className="flex flex-col items-stretch sm:items-end gap-1.5 w-full sm:w-auto">
              {isReferralRejected && (
                <div className="flex items-center gap-1.5 text-xs text-red-600 font-bold bg-red-50 px-3 py-2 rounded-xl border border-red-100 mb-1 animate-fadeIn">
                  <AlertTriangle size={16} className="shrink-0" />
                  <span>Referral Rejected {rejectionReason ? `(${rejectionReason})` : ''}. Ask patient to re-book.</span>
                </div>
              )}
              <button 
                onClick={onStartConsultation}
                disabled={isReferralRejected}
                className={`w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 min-h-[48px] ${
                  isReferralRejected 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none' 
                    : 'bg-[#D35400] hover:bg-[#A04000] text-white shadow-amber-900/10'
                }`}
              >
                <span>Start Consultation</span>
                <ArrowRight size={18} />
              </button>
            </div>
          )}
          {status === 'active' && (
            <div className="bg-green-100 text-green-700 px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 border border-green-200 min-h-[48px] w-full sm:w-auto">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
              <span>In Consultation</span>
            </div>
          )}
          {status === 'completed' && (
            <div className="bg-gray-100 text-gray-500 px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 border border-gray-200 min-h-[48px] w-full sm:w-auto">
              <ShieldCheck size={18} />
              <span>Session Completed</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

