import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/clinicianApi';
import { useClinicianStore } from '../../store/clinicianStore';
import QueueCard from './components/QueueCard';
import LoadingSkeleton from './components/LoadingSkeleton';
import PatientRecordPanel from './components/PatientRecordPanel';
import { Stethoscope, Filter, RefreshCcw, ChevronLeft } from 'lucide-react';
import toast from 'react-hot-toast';

export default function QueueScreen() {
  const [searchParams] = useSearchParams();
  const targetPatientId = searchParams.get('patient_id');
  const targetReferralId = searchParams.get('referral_id');

  const [filter, setFilter] = useState<'all' | 'urgent' | 'watch' | 'low'>('all');
  const { setQueue, activePatient, setActivePatient } = useClinicianStore();

  // 1. Fetch Queue with React Query (includes 30s auto-refetch)
  const { data: queueData, isLoading, isFetching } = useQuery({
    queryKey: ['queue'],
    queryFn: api.getQueue,
    refetchInterval: 30000, // Polling every 30 seconds
  });

  useEffect(() => {
    if (queueData) {
      setQueue(queueData);
    }
  }, [queueData, setQueue]);

  // Synchronize activePatient strictly with targetPatientId or clear stale activePatient
  useEffect(() => {
    if (targetPatientId) {
      // 1. Check if patient exists in queueData
      const match = queueData?.find((p: any) =>
        p.patient_id === targetPatientId || p._id === targetPatientId || p.id === targetPatientId
      );

      if (match) {
        setActivePatient({
          ...match,
          referral_id: targetReferralId || match.referral_id || match.id
        });
      } else {
        // 2. Patient not in current queue list yet — fetch record directly from backend
        api.getPatientRecord(targetPatientId).then((data) => {
          if (data) {
            const prof = data.profile || data;
            setActivePatient({
              patient_id: prof.id || prof._id || targetPatientId,
              _id: prof.id || prof._id || targetPatientId,
              name: prof.name,
              age: prof.age,
              gender: prof.gender,
              mobile: prof.mobile,
              blood_group: prof.blood_group,
              referral_id: targetReferralId,
              chief_complaint: prof.chief_complaint || 'Referral consultation',
              profile: prof,
              vitals: data.vitals,
              medical_history: data.medical_history,
            });
          }
        }).catch(err => {
          console.error('[ERROR] Failed to load patient record for ID:', targetPatientId, err);
          toast.error('Unable to load requested patient record.');
        });
      }
    }
  }, [targetPatientId, targetReferralId, queueData]);

  // 2. Filtering Logic
  const filteredQueue = queueData?.filter((p: any) => 
    filter === 'all' ? true : p.risk_tag === filter
  ) || [];

  const stats = {
    urgent: queueData?.filter((p: any) => p.risk_tag === 'urgent').length || 0,
    watch: queueData?.filter((p: any) => p.risk_tag === 'watch').length || 0,
    low: queueData?.filter((p: any) => p.risk_tag === 'low').length || 0,
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full min-w-0 h-full">
      {/* LEFT COLUMN: QUEUE PANEL */}
      <div className={`w-full lg:w-[360px] xl:w-[380px] lg:shrink-0 flex flex-col ${activePatient ? 'hidden lg:flex' : 'flex'}`}>
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xl font-bold text-[#333]">OPD Queue</h2>
            <div className="flex items-center gap-1.5 text-[10px] text-[#888] font-medium uppercase tracking-wider">
              {isFetching ? (
                <RefreshCcw size={10} className="animate-spin text-[#1B6CA8]" />
              ) : (
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              )}
              {isFetching ? 'Updating...' : 'Live'}
            </div>
          </div>
          <p className="text-sm text-[#666]">{filteredQueue.length} patient{filteredQueue.length !== 1 ? 's' : ''} {filter === 'all' ? 'waiting' : `(${filter})`}</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2.5 mb-4">
          <div className="bg-red-50 p-2.5 sm:p-3 rounded-xl border border-red-100">
            <p className="text-[10px] font-bold text-red-600 uppercase">Urgent</p>
            <p className="text-lg sm:text-xl font-bold text-red-700">{stats.urgent}</p>
          </div>
          <div className="bg-amber-50 p-2.5 sm:p-3 rounded-xl border border-amber-100">
            <p className="text-[10px] font-bold text-amber-600 uppercase">Watch</p>
            <p className="text-lg sm:text-xl font-bold text-amber-700">{stats.watch}</p>
          </div>
          <div className="bg-blue-50 p-2.5 sm:p-3 rounded-xl border border-blue-100">
            <p className="text-[10px] font-bold text-blue-600 uppercase">Low</p>
            <p className="text-lg sm:text-xl font-bold text-blue-700">{stats.low}</p>
          </div>
        </div>

        {/* Tabs/Filters */}
        <div className="flex border-b border-[#E2DDD8] mb-4">
          {['all', 'urgent', 'watch', 'low'].map((f: any) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`
                flex-1 pb-2.5 text-xs font-bold uppercase tracking-wider transition-all
                ${filter === f ? 'text-[#1B6CA8] border-b-2 border-[#1B6CA8]' : 'text-[#888] hover:text-[#555]'}
              `}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Scrollable List */}
        <div className="flex-1 min-h-[300px] overflow-y-auto pr-1 space-y-3 custom-scrollbar">
          {isLoading ? (
            <LoadingSkeleton type="card" count={4} />
          ) : filteredQueue.length === 0 ? (
            <div className="bg-white/50 border border-dashed border-[#E2DDD8] rounded-xl p-8 text-center text-[#888]">
              <Filter size={24} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No patients in this category</p>
            </div>
          ) : (
            filteredQueue.map((patient: any, idx: number) => (
              <QueueCard
                key={patient._id}
                patient={patient}
                position={idx + 1}
                isSelected={activePatient?.patient_id === patient.patient_id}
                onClick={() => setActivePatient(patient)}
              />
            ))
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: PATIENT DETAIL */}
      <div className={`flex-1 bg-white rounded-2xl border border-[#E2DDD8] shadow-sm overflow-hidden flex-col ${activePatient ? 'flex' : 'hidden lg:flex'}`}>
        {activePatient && (
          <div className="lg:hidden p-3 bg-gray-50 border-b border-[#E2DDD8] flex items-center">
            <button
              onClick={() => setActivePatient(null)}
              className="flex items-center gap-1.5 text-sm font-bold text-[#1B6CA8]"
            >
              <ChevronLeft size={18} />
              <span>Back to Queue</span>
            </button>
          </div>
        )}

        {!activePatient ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12 text-center min-h-[300px]">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#F7F3EE] rounded-full flex items-center justify-center mb-4 sm:mb-6 text-[#1B6CA8]/30">
              <Stethoscope size={36} />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-[#333] mb-2 font-mukta">Ready for Consultation</h3>
            <p className="text-[#666] max-w-xs text-xs sm:text-sm">
              Select a patient from the queue to view their medical history and begin the consultation.
            </p>
          </div>
        ) : (
          <PatientRecordPanel 
            key={activePatient.patient_id || activePatient._id || activePatient.id}
            patientId={activePatient.patient_id || activePatient._id || activePatient.id} 
            initialData={activePatient}
          />
        )}
      </div>
    </div>
  );
}
