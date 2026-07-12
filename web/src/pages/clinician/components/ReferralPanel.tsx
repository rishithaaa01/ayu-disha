import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Search, Check, Loader2, Hospital, Stethoscope, AlertTriangle, X } from 'lucide-react';
import api from '../../../services/clinicianApi';
import generalApi from '../../../services/api';
import toast from 'react-hot-toast';

interface ReferralPanelProps {
  patient: any;
  visitId: string;
  symptoms?: string;
  diagnoses?: string[];
}

export default function ReferralPanel({ patient, visitId, symptoms, diagnoses }: ReferralPanelProps) {
  const [toHospital, setToHospital] = useState('');
  const [hospitalSearch, setHospitalSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [speciality, setSpeciality] = useState('General Medicine');
  const [urgency, setUrgency] = useState('routine');
  const [reason, setReason] = useState('');
  const [isSending, setIsSending] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch all registered hospitals
  const { data: hospitals = [] } = useQuery({
    queryKey: ['hospitals'],
    queryFn: () => generalApi.get('/auth/hospitals').then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });

  // Filter hospitals based on search input
  const filteredHospitals = hospitals.filter((h: any) =>
    h.name.toLowerCase().includes(hospitalSearch.toLowerCase())
  );

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Auto-detect severe indications and pre-fill referral
  useEffect(() => {
    if (!reason && symptoms) {
      const query = symptoms.toLowerCase();
      const isSevere =
        query.includes('chest pain') ||
        query.includes('heart attack') ||
        query.includes('stroke') ||
        query.includes('paralysis') ||
        query.includes('bleeding') ||
        query.includes('unconscious') ||
        query.includes('seizure') ||
        query.includes('difficulty breathing') ||
        query.includes('breathlessness') ||
        diagnoses?.some(d => {
          const dl = d.toLowerCase();
          return dl.includes('infarction') || dl.includes('stroke') || dl.includes('hemorrhage') || dl.includes('cardiac');
        });

      if (isSevere) {
        setUrgency('urgent');
        let targetSpeciality = 'General Medicine';
        if (query.includes('chest') || query.includes('heart') || query.includes('cardiac')) {
          targetSpeciality = 'Cardiology';
        } else if (query.includes('stroke') || query.includes('paralysis') || query.includes('neurolog')) {
          targetSpeciality = 'Neurology';
        }
        setSpeciality(targetSpeciality);
        setReason(`Urgent referral recommended due to severe symptoms detected in consultation: "${symptoms}"`);
        toast('🚨 Severe symptoms detected. Urgent specialist referral pre-filled.', { id: 'severe-alert', duration: 5000 });
      }
    }
  }, [symptoms, diagnoses]);

  const specialities = [
    'General Medicine', 'Cardiology', 'Neurology', 'Orthopaedics',
    'Gynaecology', 'Paediatrics', 'Dermatology', 'Psychiatry',
    'ENT', 'Ophthalmology', 'Nephrology', 'Endocrinology'
  ];

  const handleSelectHospital = (name: string) => {
    setToHospital(name);
    setHospitalSearch(name);
    setShowDropdown(false);
  };

  const handleClearHospital = () => {
    setToHospital('');
    setHospitalSearch('');
  };

  const handleSend = async () => {
    if (!toHospital || !reason) {
      toast.error('Hospital and Reason are required');
      return;
    }
    setIsSending(true);
    try {
      await api.sendReferral({
        visit_id: visitId,
        patient_id: patient.profile?.id || patient.patient_id,
        to_hospital_id: toHospital,
        to_speciality: speciality,
        reason: reason,
        urgency: urgency,
        summary: `Referral for ${speciality}. ${reason}`
      });
      toast.success('Referral sent successfully');
      setReason('');
      setToHospital('');
      setHospitalSearch('');
    } catch (e) {
      toast.error('Failed to send referral');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="p-8 bg-[#FAFAFA]">      <div className="mb-8">
        <div className="flex items-center gap-2 text-[#1B6CA8] mb-2">
          <ArrowUpRight size={18} />
          <h3 className="font-bold text-lg uppercase tracking-wider font-mukta">Internal / External Referral</h3>
        </div>
        <p className="text-sm text-[#888]">Transfer care for <span className="text-[#333] font-bold">{patient.profile?.name || patient.patient_name}</span> to a specialist or another facility.</p>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-8 mb-8">
        {/* Speciality Selection */}
        <div className="space-y-4">
          <label className="text-[10px] font-bold text-[#888] uppercase tracking-widest block font-sans">1. Select Target Speciality</label>
          <div className="grid grid-cols-2 gap-2">
            {specialities.map(s => (
              <button
                key={s}
                onClick={() => setSpeciality(s)}
                className={`
                  p-3 rounded-xl border text-xs font-bold transition-all text-left flex items-center gap-2
                  ${speciality === s ? 'bg-[#1B6CA8] text-white border-[#1B6CA8]' : 'bg-white text-[#666] border-[#E2DDD8] hover:border-[#1B6CA8]'}
                `}
              >
                <Stethoscope size={14} />
                <span>{s}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Hospital Search */}
        <div className="space-y-4">
          <label className="text-[10px] font-bold text-[#888] uppercase tracking-widest block font-sans">2. Target Hospital / Unit</label>
          <div className="relative" ref={dropdownRef}>
            <Hospital size={16} className="absolute left-4 top-4 text-[#888] z-10" />
            <input
              type="text"
              value={hospitalSearch}
              onChange={(e) => {
                setHospitalSearch(e.target.value);
                setToHospital('');
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Type to search registered hospitals..."
              className="w-full pl-12 pr-10 py-4 bg-white border border-[#E2DDD8] rounded-xl text-sm font-medium focus:outline-none focus:border-[#1B6CA8]"
            />
            {hospitalSearch && (
              <button
                onClick={handleClearHospital}
                className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
              >
                <X size={15} />
              </button>
            )}
            {/* Selected indicator */}
            {toHospital && (
              <div className="absolute right-10 top-4">
                <Check size={15} className="text-green-500" />
              </div>
            )}
            {/* Dropdown */}
            {showDropdown && hospitalSearch && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-[#E2DDD8] rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                {filteredHospitals.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-400 italic">No matching hospitals found</div>
                ) : (
                  filteredHospitals.map((h: any) => (
                    <button
                      key={h.id}
                      onClick={() => handleSelectHospital(h.name)}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-blue-50 flex items-center justify-between group transition-colors"
                    >
                      <div>
                        <p className="font-semibold text-gray-800 group-hover:text-[#1B6CA8]">{h.name}</p>
                        <p className="text-xs text-gray-400">{h.district} · {h.type === 'govt' ? 'Government' : h.type === 'private' ? 'Private' : 'NGO'}</p>
                      </div>
                      {toHospital === h.name && <Check size={14} className="text-[#1B6CA8]" />}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          {toHospital && (
            <p className="text-xs text-green-600 font-semibold px-1 flex items-center gap-1">
              <Check size={12} /> Selected: {toHospital}
            </p>
          )}
        </div>

        {/* Reason */}
        <div className="space-y-4">
          <label className="text-[10px] font-bold text-[#888] uppercase tracking-widest block font-sans">3. Clinical Indication</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why is this patient being referred?"
            rows={4}
            className="w-full p-4 bg-white border border-[#E2DDD8] rounded-2xl text-sm font-medium focus:outline-none focus:border-[#1B6CA8] resize-none"
          />
        </div>
      </div>

      {/* Urgency & Send */}
      <div className="bg-white border border-[#E2DDD8] rounded-2xl p-6 shadow-sm">
        <label className="text-[10px] font-bold text-[#888] uppercase tracking-widest block mb-4">Referral Urgency</label>
        <div className="flex gap-3 mb-6">
          {['routine', 'urgent', 'emergency'].map(u => (
            <button
              key={u}
              onClick={() => setUrgency(u)}
              className={`
                flex-1 py-3 rounded-lg text-xs font-bold uppercase tracking-wider border-2 transition-all
                ${urgency === u ? 'bg-amber-50 border-[#D35400] text-[#D35400]' : 'bg-transparent border-[#F7F3EE] text-[#888]'}
              `}
            >
              {u}
            </button>
          ))}
        </div>

        <button
          onClick={handleSend}
          disabled={!toHospital || !reason || isSending}
          className="w-full bg-[#1B6CA8] hover:bg-[#154360] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-900/10 transition-all disabled:opacity-50"
        >
          {isSending ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <>
              <ArrowUpRight size={20} />
              <span>Send Formal Referral</span>
            </>
          )}
        </button>

        <div className="mt-4 flex items-center justify-center gap-2 text-amber-600">
           <AlertTriangle size={12} />
           <span className="text-[10px] italic font-medium">This will notify the receiving hospital.</span>
        </div>
      </div>
    </div>
  );
}
