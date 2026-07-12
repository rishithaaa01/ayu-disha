import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/clinicianApi';
import { useClinicianStore } from '../../store/clinicianStore';
import { useDifferential } from '../../hooks/useDifferential';
import PatientHeader from './components/PatientHeader';
import AISummaryCard from './components/AISummaryCard';
import VoiceNoteRecorder from './components/VoiceNoteRecorder';
import PrescriptionWriter from './components/PrescriptionWriter';
import DifferentialPanel from './components/DifferentialPanel';
import LabOrderPanel from './components/LabOrderPanel';
import ReferralPanel from './components/ReferralPanel';
import LoadingSkeleton from './components/LoadingSkeleton';
import { 
  Mic, 
  Save, 
  CheckCircle, 
  ChevronLeft, 
  Sparkles, 
  Pill, 
  FlaskConical, 
  ArrowUpRight, 
  History,
  Layout,
  Hospital,
  User,
  Calendar,
  FileText
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function ConsultationScreen() {
  const { visitId } = useParams<{ visitId: string }>();
  const navigate = useNavigate();
  const { activePatient, setActiveVisitId } = useClinicianStore();
  
  // Form State
  const [symptoms, setSymptoms] = useState('');
  const [findings, setFindings] = useState('');
  const [diagnosis, setDiagnosis] = useState<string[]>([]);
  const [diagInput, setDiagInput] = useState('');
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  
  // Tabs State
  const [activeTab, setActiveTab] = useState<'differential' | 'prescription' | 'labs' | 'referral' | 'history'>('differential');

  // AI Hooks
  const { diagnoses: aiDiagnoses, isLoading: aiLoading } = useDifferential(symptoms, activePatient?.patient_id);

  const { data: patientRecord, isLoading: recordLoading } = useQuery({
    queryKey: ['patient-record', activePatient?.patient_id],
    queryFn: () => api.getPatientRecord(activePatient?.patient_id),
    enabled: !!activePatient?.patient_id
  });

  const { data: summaryData, isLoading: summaryLoading, refetch: refetchSummary } = useQuery({
    queryKey: ['patient-summary', activePatient?.patient_id],
    queryFn: () => api.getPatientSummary(activePatient?.patient_id),
    enabled: !!activePatient?.patient_id,
    retry: false,
  });

  // Recover from page refresh — fetch visit by visitId to get patient_id
  const { data: visitData } = useQuery({
    queryKey: ['visit-recovery', visitId],
    queryFn: async () => {
      const res = await import('axios').then(m =>
        m.default.get(
          `${import.meta.env.VITE_API_URL || 'https://ayu-disha.onrender.com/api'}/clinician/visits/${visitId}`,
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        )
      );
      return res.data;
    },
    enabled: !!visitId && !activePatient,
    retry: false,
  });

  useEffect(() => {
    if (visitData && !activePatient) {
      setActiveVisitId(visitId!);
    }
  }, [visitData, activePatient]);

  const resolvedPatientId = activePatient?.patient_id || visitData?.patient_id;

  const { data: recoveredRecord, isLoading: recoveryLoading } = useQuery({
    queryKey: ['patient-record', resolvedPatientId],
    queryFn: () => api.getPatientRecord(resolvedPatientId),
    enabled: !!resolvedPatientId && !activePatient,
  });

  const effectiveRecord = patientRecord || recoveredRecord;
  const effectiveLoading = recordLoading || recoveryLoading;

  const handleComplete = async () => {
    if (diagnosis.length === 0) {
      toast.error('Please record at least one diagnosis.');
      return;
    }

    try {
      await api.updateVisit(visitId!, {
        diagnosis,
        notes: findings,
        chief_complaint: symptoms,
      });
      await api.completeVisit(visitId!);
      toast.success('Consultation completed and saved!');
      setActiveVisitId(null);
      navigate('/clinician/queue');
    } catch (e) {
      toast.error('Failed to complete consultation');
    }
  };

  const handleVoiceExtraction = (data: any) => {
    if (data.chief_complaint) setSymptoms(prev => prev + (prev ? ', ' : '') + data.chief_complaint);
    if (data.examination_findings) setFindings(prev => prev + (prev ? '\n' : '') + data.examination_findings);
    if (data.diagnosis && data.diagnosis.length > 0) setDiagnosis(prev => Array.from(new Set([...prev, ...data.diagnosis])));
    toast.success('Information extracted from voice note!');
  };

  if (effectiveLoading || (!activePatient && !resolvedPatientId)) return <div className="p-12"><LoadingSkeleton type="profile" /></div>;

  const headerTabs = [
    { id: 'differential', label: 'AI Differential', icon: Sparkles },
    { id: 'prescription', label: 'Prescription', icon: Pill },
    { id: 'labs', label: 'Lab Orders', icon: FlaskConical },
    { id: 'referral', label: 'Refer Patient', icon: ArrowUpRight },
    { id: 'history', label: 'Full History', icon: History },
  ];

  return (
    <div className="flex flex-col h-screen bg-[#F7F3EE] overflow-hidden -m-8">
      {/* Patient Header */}
      <PatientHeader 
        patient={effectiveRecord} 
        status="active" 
        onStartConsultation={() => {}} 
      />

      {/* Main Split View */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT PANEL: Documentation (45%) */}
        <div className="w-[45%] h-full flex flex-col border-r border-[#E2DDD8] bg-[#F7F3EE]">
          <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
            
            {/* AI Pre-Consultation Summary */}
            <AISummaryCard
              summary={summaryData?.summary ?? null}
              timestamp={summaryData?.generated_at ? new Date(summaryData.generated_at).toLocaleTimeString() : null}
              isLoading={summaryLoading}
              onRefresh={() => refetchSummary()}
              consent={summaryData?.consent}
            />

            {/* Symptoms / Chief Complaint */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-[#888] uppercase tracking-widest">1. Chief Complaint & Symptoms</label>
              <textarea
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                placeholder="Type patient symptoms here... AI differential updates live."
                className="w-full p-6 bg-white border border-[#E2DDD8] rounded-[24px] text-lg font-medium shadow-sm focus:outline-none focus:border-[#1B6CA8] transition-all min-h-[120px]"
              />
            </div>

            {/* Examination Findings */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-[#888] uppercase tracking-widest">2. Examination Findings</label>
              <textarea
                value={findings}
                onChange={(e) => setFindings(e.target.value)}
                placeholder="Record clinical examination findings..."
                className="w-full p-6 bg-white border border-[#E2DDD8] rounded-[24px] text-base font-medium shadow-sm focus:outline-none focus:border-[#1B6CA8] transition-all min-h-[140px]"
              />
            </div>

            {/* Diagnosis Tags */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-[#888] uppercase tracking-widest">3. Provisional Diagnosis</label>
              <div className="flex flex-wrap gap-2 mb-3">
                 {diagnosis.map(d => (
                   <span key={d} className="bg-[#1B6CA8] text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm">
                     {d}
                     <button onClick={() => setDiagnosis(diagnosis.filter(item => item !== d))}><X size={14} /></button>
                   </span>
                 ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={diagInput}
                  onChange={(e) => setDiagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && diagInput) {
                      setDiagnosis(Array.from(new Set([...diagnosis, diagInput])));
                      setDiagInput('');
                    }
                  }}
                  placeholder="Type diagnosis and press Enter..."
                  className="flex-1 p-4 bg-white border border-[#E2DDD8] rounded-2xl text-sm font-bold focus:outline-none focus:border-[#1B6CA8]"
                />
              </div>
            </div>

            {/* Voice Command Button */}
            <button 
              onClick={() => setShowVoiceRecorder(true)}
              className="w-full py-4 bg-amber-50 border-2 border-dashed border-[#D35400] text-[#D35400] rounded-[24px] flex items-center justify-center gap-3 font-bold hover:bg-amber-100 transition-all text-lg mb-8"
            >
              <Mic size={24} />
              <span>Dictate Voice Note</span>
            </button>
          </div>

          {/* Footer Actions */}
          <div className="p-8 bg-white border-t border-[#E2DDD8] flex items-center justify-between">
            <button 
              onClick={() => navigate('/clinician/queue')}
              className="flex items-center gap-2 text-[#888] font-bold hover:text-[#555]"
            >
              <ChevronLeft size={20} />
              <span>Back to Queue</span>
            </button>
            <button 
              onClick={handleComplete}
              className="bg-green-600 hover:bg-green-700 text-white px-10 py-5 rounded-[24px] font-bold text-lg flex items-center gap-3 shadow-xl shadow-green-900/10 transition-all active:scale-95"
            >
              <CheckCircle size={24} />
              <span>Complete Consultation</span>
            </button>
          </div>
        </div>

        {/* RIGHT PANEL: Clinical Decision Support (55%) */}
        <div className="flex-1 h-full flex flex-col bg-white">
          <div className="flex border-b border-[#E2DDD8]">
            {headerTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  flex-1 flex flex-col items-center gap-1.5 py-4 text-[10px] font-bold uppercase tracking-widest border-b-4 transition-all
                  ${activeTab === tab.id 
                    ? 'text-[#1B6CA8] border-[#1B6CA8] bg-blue-50/30' 
                    : 'text-[#888] border-transparent hover:bg-[#FAFAFA]'}
                `}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
             {activeTab === 'differential' && (
               <DifferentialPanel diagnoses={aiDiagnoses} isLoading={aiLoading} symptoms={symptoms} />
             )}
             {activeTab === 'prescription' && (
                <PrescriptionWriter patient={effectiveRecord} visitId={visitId!} onSaved={() => setActiveTab('labs')} />
             )}
             {activeTab === 'labs' && (
               <LabOrderPanel patient={effectiveRecord} visitId={visitId!} />
             )}
              {activeTab === 'referral' && (
                <ReferralPanel patient={effectiveRecord} visitId={visitId!} symptoms={symptoms} diagnoses={diagnosis} />
              )}
             {activeTab === 'history' && (
               <div className="h-full overflow-y-auto p-4 bg-[#F7F3EE]">
                 {effectiveRecord?.consent_status !== 'granted' ? (
                   <div className="bg-white rounded-2xl border border-[#E2DDD8] p-8 text-center">
                     <FileText size={40} className="text-gray-300 mx-auto mb-3" />
                     <p className="font-bold text-gray-600">Consent Required for Full History</p>
                     <p className="text-gray-400 text-sm mt-1">Ask the patient to grant access via their Ayu Disha app using your registered email or mobile number.</p>
                   </div>
                 ) : effectiveRecord?.visits?.length === 0 ? (
                   <div className="bg-white rounded-2xl border border-[#E2DDD8] p-8 text-center">
                     <FileText size={40} className="text-gray-300 mx-auto mb-3" />
                     <p className="text-gray-400 text-sm">No previous visits found in digital record.</p>
                   </div>
                 ) : (
                   <div className="space-y-3">
                     {(effectiveRecord?.visits || []).map((visit: any) => (
                       <div key={visit._id} className="bg-white rounded-2xl border border-[#E2DDD8] p-5">
                         <div className="flex items-start justify-between mb-2">
                           <div className="flex items-center gap-2">
                             <Hospital size={15} className="text-[#1B6CA8] shrink-0" />
                             <span className="font-semibold text-gray-800 text-sm">
                               {visit.hospital_name || visit.hospital_id || 'Unknown Hospital'}
                             </span>
                           </div>
                           <span className="text-xs text-gray-400 flex items-center gap-1">
                             <Calendar size={11} />
                             {new Date(visit.date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                           </span>
                         </div>
                         <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                           <User size={11} />
                           <span>{visit.doctor_name || 'Pending Assignment'}</span>
                         </div>
                         {visit.chief_complaint && (
                           <p className="text-xs text-gray-600 mb-2 bg-gray-50 rounded-lg px-3 py-2">
                             {visit.chief_complaint}
                           </p>
                         )}
                         {visit.diagnosis?.length > 0 && (
                           <div className="flex flex-wrap gap-1.5 mb-2">
                             {visit.diagnosis.map((d: string, i: number) => (
                               <span key={i} className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{d}</span>
                             ))}
                           </div>
                         )}
                         {visit.prescriptions?.length > 0 && (
                           <div className="mt-2">
                             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Prescriptions</p>
                             <div className="space-y-1">
                               {visit.prescriptions.map((rx: any, i: number) => (
                                 <div key={i} className="bg-purple-50 rounded-lg px-3 py-2 text-xs">
                                   <span className="font-bold text-purple-800">{rx.medicine || rx.name}</span>
                                   <span className="text-purple-500 ml-2">{rx.dosage} · {rx.frequency} · {rx.duration}</span>
                                 </div>
                               ))}
                             </div>
                           </div>
                         )}
                       </div>
                     ))}
                   </div>
                 )}
               </div>
             )}
          </div>
        </div>
      </div>

      {showVoiceRecorder && (
        <VoiceNoteRecorder 
          visitId={visitId!} 
          onExtractionComplete={handleVoiceExtraction}
          onClose={() => setShowVoiceRecorder(false)} 
        />
      )}
    </div>
  );
}

// Inline component for X icon since it was used in tags
function X({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}
