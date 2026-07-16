import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/clinicianApi';
import PatientHeader from './PatientHeader';
import AISummaryCard from './AISummaryCard';
import LoadingSkeleton from './LoadingSkeleton';
import { 
  History, 
  Pill, 
  FlaskConical, 
  ShieldCheck, 
  ChevronDown, 
  ChevronUp,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useClinicianStore } from '../../../store/clinicianStore';
import { useRealTimeUpdates } from '../../../contexts/RealTimeUpdateContext';
import toast from 'react-hot-toast';

interface PatientRecordPanelProps {
  patientId: string;
  initialData: any; // Data from queue entry
}

export default function PatientRecordPanel({ patientId, initialData }: PatientRecordPanelProps) {
  const [activeTab, setActiveTab] = useState<'history' | 'meds' | 'labs' | 'consents'>('history');
  const { setActiveVisitId } = useClinicianStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { notifyConsultationStarted } = useRealTimeUpdates();

  // 1. Fetch Full Patient Record
  const { data: record, isLoading: recordLoading } = useQuery({
    queryKey: ['patient-record', patientId],
    queryFn: () => api.getPatientRecord(patientId),
  });

  // 2. Fetch AI Summary
  const { data: summaryData, isLoading: summaryLoading, refetch: refetchSummary } = useQuery({
    queryKey: ['patient-summary', patientId],
    queryFn: () => api.getPatientSummary(patientId),
  });

  const handleStartConsultation = async () => {
    try {
      console.log('[DEBUG] Starting consultation for patient:', patientId);
      
      const res = await api.startVisit({
        patient_id: patientId,
        chief_complaint: initialData.chief_complaint,
        referral_id: initialData.referral_id
      });
      
      console.log('[DEBUG] Consultation started, visit ID:', res.id);
      
      // Use the real-time update system
      notifyConsultationStarted();
      
      // Navigate to consultation screen
      setActiveVisitId(res.id);
      navigate(`/clinician/consultation/${res.id}`);
      
      console.log('[DEBUG] Successfully started consultation and updated counts');
    } catch (e) {
      console.error('[ERROR] Failed to start consultation:', e);
      alert("Failed to start consultation");
    }
  };

  if (recordLoading) return <div className="p-8"><LoadingSkeleton type="profile" /><div className="mt-8"><LoadingSkeleton type="card" count={3} /></div></div>;

  if (!record) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white border border-[#E2DDD8] rounded-2xl m-4 text-center shadow-sm">
        <AlertTriangle size={32} className="text-red-500 mb-2" />
        <p className="font-bold text-gray-700">Failed to load patient record</p>
        <p className="text-gray-400 text-sm mt-1">Please try again or check the patient's consent status.</p>
      </div>
    );
  }

  const tabs = [
    { id: 'history', label: 'History', icon: History },
    { id: 'meds', label: 'Medications', icon: Pill },
    { id: 'labs', label: 'Labs', icon: FlaskConical },
    { id: 'consents', label: 'Consents', icon: ShieldCheck },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      <PatientHeader 
        patient={record} 
        status="in_queue" 
        onStartConsultation={handleStartConsultation} 
        isReferralRejected={initialData?.referral_rejected}
        rejectionReason={initialData?.rejection_reason}
      />

      <div className="flex-1 overflow-y-auto custom-scrollbar pb-20">
        <AISummaryCard 
          summary={summaryData?.summary} 
          timestamp={summaryData?.generated_at ? format(new Date(summaryData.generated_at), 'hh:mm a') : null}
          isLoading={summaryLoading}
          onRefresh={refetchSummary}
        />

        {/* Tabs Bar */}
        <div className="flex px-8 border-b border-[#E2DDD8] sticky top-0 bg-white z-[5]">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition-all
                ${activeTab === tab.id 
                  ? 'border-[#1B6CA8] text-[#1B6CA8]' 
                  : 'border-transparent text-[#888] hover:text-[#555]'}
              `}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-8">
          {activeTab === 'history' && (
            <div className="space-y-6">
              {record.visits?.length > 0 ? (
                (record.visits || []).map((visit: any, idx: number) => (
                  <div key={visit.id} className="relative pl-8">
                    {/* Timeline Line */}
                    <div className="absolute left-3 top-2 bottom-0 w-0.5 bg-[#F7F3EE]" />
                    {/* Timeline Dot */}
                    <div className={`
                      absolute left-0 top-1 w-6 h-6 rounded-full border-4 border-white shadow-sm
                      ${idx === 0 ? 'bg-[#1B6CA8]' : 'bg-[#D5D8DC]'}
                    `} />
                    
                    <div className="bg-[#FDFEFE] border border-[#E2DDD8] rounded-xl p-5 hover:border-[#1B6CA8]/50 transition-colors">
                      <div className="flex justify-between mb-4">
                        <div>
                          <h5 className="font-bold text-[#333]">{format(new Date(visit.date), 'dd MMMM yyyy')}</h5>
                          <p className="text-xs text-[#1B6CA8] font-bold mt-1">{visit.hospital_name || 'General Clinic'}</p>
                        </div>
                        <span className="text-xs text-[#888] italic">seen by {visit.doctor_name || 'Dr. Iyer'}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-6 text-sm">
                        <div className="bg-[#FBFCFC] p-3 rounded-lg">
                          <p className="text-[10px] font-bold text-[#888] uppercase mb-1">Chief Complaint</p>
                          <p className="text-[#333] italic">"{visit.chief_complaint}"</p>
                        </div>
                        <div className="bg-[#FBFCFC] p-3 rounded-lg">
                          <p className="text-[10px] font-bold text-[#888] uppercase mb-1">Diagnoses</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {visit.diagnosis?.length > 0 ? (
                              visit.diagnosis.map((d: string) => (
                                <span key={d} className="bg-[#EBF5FB] text-[#1B6CA8] px-2 py-0.5 rounded text-[11px] font-bold">
                                  {d}
                                </span>
                              ))
                            ) : (
                              <span className="text-[#888] italic">No final diagnosis recorded</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Prescriptions Snippet */}
                      {visit.prescriptions?.length > 0 && (
                        <div className="mt-4 border-t border-[#F7F3EE] pt-4">
                           <p className="text-[10px] font-bold text-[#888] uppercase mb-2">Prescriptions</p>
                           <div className="space-y-1">
                             {visit.prescriptions.map((p: any, i: number) => (
                               <div key={i} className="flex text-xs text-[#555]">
                                 <span className="w-1/3 font-bold">• {p.name || p.medicine}</span>
                                 <span className="w-1/3">{p.dosage} — {p.frequency}</span>
                                 <span className="w-1/3 text-right text-[#888]">{p.duration}</span>
                               </div>
                             ))}
                           </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-[#888]">No previous visits found in digital record.</div>
              )}
            </div>
          )}

          {activeTab === 'meds' && (
            <div className="bg-white border border-[#E2DDD8] rounded-xl overflow-hidden">
              <div className="bg-[#F7F3EE] px-4 py-3 border-b border-[#E2DDD8]">
                <h5 className="text-xs font-bold text-[#666] uppercase tracking-wider">Current / Recent Medications</h5>
              </div>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-[#FBFCFC]">
                    <th className="px-5 py-4 font-bold text-[#888] border-b border-[#E2DDD8]">Medicine</th>
                    <th className="px-5 py-4 font-bold text-[#888] border-b border-[#E2DDD8]">Dosage</th>
                    <th className="px-5 py-4 font-bold text-[#888] border-b border-[#E2DDD8]">Frequency</th>
                    <th className="px-5 py-4 font-bold text-[#888] border-b border-[#E2DDD8]">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {record.current_medications?.length > 0 ? (
                    (record.current_medications || []).map((m: any, i: number) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-[#FBFCFC]'}>
                        <td className="px-5 py-4 font-bold text-[#333]">{m.name || m.medicine}</td>
                        <td className="px-5 py-4 text-[#666]">{m.dosage}</td>
                        <td className="px-5 py-4 text-[#666]">{m.frequency}</td>
                        <td className="px-5 py-4 text-[#666]">{m.duration}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-[#888]">No active medications found in history.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'labs' && (
            <div className="space-y-4">
              {record.lab_results?.length > 0 ? (
                (record.lab_results || []).map((lab: any) => (
                  <div key={lab._id || lab.id} className={`bg-white border rounded-2xl p-5 hover:shadow-sm transition-all ${
                    lab.ai_is_abnormal ? 'border-red-200' :
                    lab.status === 'resulted' ? 'border-green-200' : 'border-[#E2DDD8]'
                  }`}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h6 className="font-bold text-[#333]">{lab.test_name}</h6>
                          {lab.ai_is_abnormal && (
                            <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                              <AlertTriangle size={9} /> Abnormal
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-[#888] uppercase mt-0.5">
                          {format(new Date(lab.ordered_date), 'dd MMM yyyy')} · {lab.ordered_by}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {lab.pdf_url && (
                          <a
                            href={lab.pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => {
                              // Open PDF in new tab, preventing auth headers from being sent
                              e.preventDefault();
                              window.open(lab.pdf_url, '_blank', 'noopener,noreferrer');
                            }}
                            className="flex items-center gap-1 text-xs text-blue-600 font-semibold bg-blue-50 px-2.5 py-1 rounded-lg hover:bg-blue-100 transition-colors"
                          >
                            <span>PDF</span>
                          </a>
                        )}
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          lab.status === 'resulted' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {lab.status}
                        </span>
                      </div>
                    </div>

                    {lab.result && (
                      <div className="bg-[#F7F3EE] p-3 rounded-lg mb-3">
                        <p className="text-sm font-bold text-[#1B6CA8]">{lab.result}</p>
                        {lab.result_date && (
                          <p className="text-[10px] text-[#888] mt-0.5">
                            Reported: {format(new Date(lab.result_date), 'dd MMM yyyy')}
                            {lab.resulted_by && ` · by ${lab.resulted_by}`}
                          </p>
                        )}
                      </div>
                    )}

                    {!lab.result && (
                      <div className="bg-amber-50 rounded-lg px-3 py-2 mb-3">
                        <p className="text-xs text-amber-700 font-semibold">Processing — awaiting lab result</p>
                      </div>
                    )}

                    {lab.ai_summary && (
                      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-3">
                        <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-1">AI Summary</p>
                        <p className="text-xs text-gray-700 leading-relaxed">{lab.ai_summary}</p>
                        {lab.ai_recommendation && (
                          <p className="text-xs text-blue-700 font-semibold mt-1">→ {lab.ai_recommendation}</p>
                        )}
                      </div>
                    )}

                    {lab.ai_key_values?.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-gray-400 uppercase tracking-wider text-[10px] border-b border-gray-100">
                              <th className="text-left py-1.5 pr-3">Parameter</th>
                              <th className="text-left py-1.5 pr-3">Value</th>
                              <th className="text-left py-1.5 pr-3">Reference</th>
                              <th className="text-left py-1.5">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {lab.ai_key_values.map((kv: any, idx: number) => (
                              <tr key={idx}>
                                <td className="py-1.5 pr-3 font-medium text-gray-700">{kv.parameter}</td>
                                <td className="py-1.5 pr-3 font-bold text-gray-800">{kv.value}</td>
                                <td className="py-1.5 pr-3 text-gray-500">{kv.reference_range}</td>
                                <td className="py-1.5">
                                  <span className={`px-1.5 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                                    kv.status === 'normal' ? 'bg-green-100 text-green-700' :
                                    kv.status === 'critical' ? 'bg-red-100 text-red-700' :
                                    'bg-amber-100 text-amber-700'
                                  }`}>{kv.status}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-[#888]">No lab records available.</div>
              )}
            </div>
          )}

          {activeTab === 'consents' && (
            <div className="max-w-2xl">
              {record.consent_status === 'granted' ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-6 flex items-start gap-4">
                  <div className="bg-green-100 p-2 rounded-lg text-green-600">
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <h5 className="font-bold text-green-800">Full Access Granted</h5>
                    <p className="text-sm text-green-700 mt-1">
                      The patient has granted you access to their complete medical history. All historical visits, lab results, and prescriptions are visible.
                    </p>
                    {/* In a real app we'd show the expiry date here */}
                    <p className="text-[10px] text-green-600 font-bold uppercase mt-4">Security Level: High (ABHA Authenticated)</p>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 flex items-start gap-4">
                  <div className="bg-amber-100 p-2 rounded-lg text-amber-600">
                    <AlertTriangle size={24} />
                  </div>
                  <div>
                    <h5 className="font-bold text-amber-800">Limited Access</h5>
                    <p className="text-sm text-amber-700 mt-1">
                      You are currently viewing limited information. To see full medical history, ask the patient to "Grant Access" via their Ayu Disha mobile app and select your name or hospital.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
