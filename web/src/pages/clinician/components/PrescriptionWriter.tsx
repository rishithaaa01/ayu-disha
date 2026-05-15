import React, { useState, useEffect } from 'react';
import { Pill, Plus, X, AlertTriangle, ShieldCheck, Printer, Save, Loader2 } from 'lucide-react';
import api from '../../../services/clinicianApi';
import { format } from 'date-fns';

interface MedicineItem {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  interaction?: {
    has_interaction: boolean;
    has_allergy_risk: boolean;
    severity: string;
    warning: string | null;
    recommendation: string | null;
  };
}

interface PrescriptionWriterProps {
  patient: any;
  visitId: string;
  onSaved: () => void;
}

export default function PrescriptionWriter({ patient, visitId, onSaved }: PrescriptionWriterProps) {
  const [medicines, setMedicines] = useState<MedicineItem[]>([
    { id: '1', name: '', dosage: '', frequency: 'BD', duration: '', instructions: '' }
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [checkingInteractions, setCheckingInteractions] = useState<string[]>([]);
  
  const frequencies = [
    { id: 'OD', label: 'Once Daily (OD)' },
    { id: 'BD', label: 'Twice Daily (BD)' },
    { id: 'TDS', label: 'Thrice Daily (TDS)' },
    { id: 'QID', label: 'Four Times Daily (QID)' },
    { id: 'HS', label: 'At Bedtime (HS)' },
    { id: 'SOS', label: 'As Needed (SOS)' },
  ];

  const commonMeds = [
    'Paracetamol 500mg', 'Metformin 500mg', 'Amlodipine 5mg', 'Atorvastatin 10mg',
    'Pantoprazole 40mg', 'Amoxicillin 500mg', 'Azithromycin 500mg', 'Cetirizine 10mg',
    'Losartan 50mg', 'Glimepiride 1mg', 'Telmisartan 40mg', 'Omeprazole 20mg'
  ];

  const addMedicine = () => {
    setMedicines([...medicines, { id: Date.now().toString(), name: '', dosage: '', frequency: 'BD', duration: '', instructions: '' }]);
  };

  const removeMedicine = (id: string) => {
    setMedicines(medicines.filter(m => m.id !== id));
  };

  const updateMedicine = (id: string, field: keyof MedicineItem, value: string) => {
    setMedicines(medicines.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const checkInteraction = async (med: MedicineItem) => {
    if (!med.name || med.name.length < 3) return;
    
    setCheckingInteractions(prev => [...prev, med.id]);
    try {
      // Get other meds in this prescription + current patient meds
      const otherMeds = medicines.filter(m => m.id !== med.id && m.name).map(m => m.name);
      
      const res = await api.checkInteraction({
        new_medicine: med.name,
        current_medicines: [...otherMeds, ...(patient.current_medications?.map((m: any) => m.name || m.medicine) || [])],
        patient_allergies: patient.profile?.allergies || patient.allergies || []
      });
      
      setMedicines(prev => prev.map(m => m.id === med.id ? { ...m, interaction: res } : m));
    } catch (e) {
      console.error(e);
    } finally {
      setCheckingInteractions(prev => prev.filter(i => i !== med.id));
    }
  };

  const handleSave = async () => {
    if (medicines.some(m => !m.name)) {
      alert("Please fill in all medicine names.");
      return;
    }

    setIsSaving(true);
    try {
      await api.savePrescription({
        visit_id: visitId,
        patient_id: patient.profile?.id || patient.patient_id,
        medicines: medicines.map(({ id, interaction, ...m }) => m)
      });
      onSaved();
    } catch (e) {
      alert("Failed to save prescription.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#FAFAFA]">
      <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="text-xl font-bold text-[#333]">Write Prescription</h3>
            <p className="text-sm text-[#888] mt-1">Visit Date: {format(new Date(), 'dd MMM yyyy')}</p>
          </div>
          <button className="flex items-center gap-2 text-[#1B6CA8] font-bold text-sm bg-blue-50 px-4 py-2 rounded-lg">
            <Printer size={16} />
            Print Rx
          </button>
        </div>

        {/* Medicines List */}
        <div className="space-y-4 mb-8">
          {medicines.map((med, idx) => (
            <div key={med.id} className="bg-white border border-[#E2DDD8] rounded-2xl p-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-[#1B6CA8]" />
              
              <div className="flex justify-between items-start mb-6">
                 <div className="flex items-center gap-2 text-[#1B6CA8]">
                   <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center text-[10px] font-bold">
                     {idx + 1}
                   </div>
                   <h4 className="font-bold text-xs uppercase tracking-wider">Medicine Entry</h4>
                 </div>
                 <button onClick={() => removeMedicine(med.id)} className="text-[#888] hover:text-red-500">
                   <X size={18} />
                 </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[#888] uppercase">Medicine Name</label>
                  <div className="relative">
                    <input
                      type="text"
                      list="med-suggestions"
                      placeholder="E.g. Paracetamol 500mg"
                      value={med.name}
                      onChange={(e) => updateMedicine(med.id, 'name', e.target.value)}
                      onBlur={() => checkInteraction(med)}
                      className={`
                        w-full border-b-2 bg-transparent py-2 text-sm font-bold focus:outline-none transition-colors
                        ${med.interaction?.has_allergy_risk ? 'border-red-400 text-red-600' : 'border-[#F1F1F1] focus:border-[#1B6CA8]'}
                      `}
                    />
                    <datalist id="med-suggestions">
                      {commonMeds.map(m => <option key={m} value={m} />)}
                    </datalist>
                    {checkingInteractions.includes(med.id) && (
                      <Loader2 size={14} className="animate-spin absolute right-0 top-3 text-[#1B6CA8]" />
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[#888] uppercase">Dosage</label>
                  <input
                    type="text"
                    placeholder="E.g. 1 Tablet"
                    value={med.dosage}
                    onChange={(e) => updateMedicine(med.id, 'dosage', e.target.value)}
                    className="w-full border-b-2 border-[#F1F1F1] bg-transparent py-2 text-sm font-medium focus:outline-none focus:border-[#1B6CA8] transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[#888] uppercase">Frequency</label>
                  <select
                    value={med.frequency}
                    onChange={(e) => updateMedicine(med.id, 'frequency', e.target.value)}
                    className="w-full border-b-2 border-[#F1F1F1] bg-transparent py-2 text-sm font-medium focus:outline-none focus:border-[#1B6CA8] transition-colors cursor-pointer"
                  >
                    {frequencies.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[#888] uppercase">Duration</label>
                  <input
                    type="text"
                    placeholder="E.g. 5 Days"
                    value={med.duration}
                    onChange={(e) => updateMedicine(med.id, 'duration', e.target.value)}
                    className="w-full border-b-2 border-[#F1F1F1] bg-transparent py-2 text-sm font-medium focus:outline-none focus:border-[#1B6CA8] transition-colors"
                  />
                </div>

                <div className="lg:col-span-2 space-y-1.5">
                  <label className="text-[10px] font-bold text-[#888] uppercase">Special Instructions</label>
                  <input
                    type="text"
                    placeholder="E.g. After food"
                    value={med.instructions}
                    onChange={(e) => updateMedicine(med.id, 'instructions', e.target.value)}
                    className="w-full border-b-2 border-[#F1F1F1] bg-transparent py-2 text-sm font-medium focus:outline-none focus:border-[#1B6CA8] transition-colors"
                  />
                </div>
              </div>

              {/* Interaction Warnings */}
              {med.interaction && (med.interaction.has_interaction || med.interaction.has_allergy_risk) && (
                <div className={`
                  mt-6 p-4 rounded-xl border flex gap-3
                  ${med.interaction.severity === 'severe' || med.interaction.has_allergy_risk ? 'bg-red-50 border-red-100 text-red-700' : 'bg-amber-50 border-amber-100 text-amber-700'}
                `}>
                  <AlertTriangle size={20} className="shrink-0" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide">
                      {med.interaction.has_allergy_risk ? 'ALLERGY RISK DETECTED' : `${med.interaction.severity} Interaction Warning`}
                    </p>
                    <p className="text-sm mt-1">{med.interaction.warning}</p>
                    {med.interaction.recommendation && (
                       <p className="text-xs mt-2 italic font-medium opacity-80">
                         Recommendation: {med.interaction.recommendation}
                       </p>
                    )}
                  </div>
                </div>
              )}
              {med.interaction && !med.interaction.has_interaction && !med.interaction.has_allergy_risk && med.name && (
                <div className="mt-4 flex items-center gap-1.5 text-green-600 text-[10px] font-bold uppercase">
                  <ShieldCheck size={14} />
                  Safe to prescribe
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={addMedicine}
          className="w-full py-4 border-2 border-dashed border-[#E2DDD8] rounded-2xl flex items-center justify-center gap-2 text-[#666] font-bold hover:bg-white hover:border-[#1B6CA8] hover:text-[#1B6CA8] transition-all mb-12"
        >
          <Plus size={20} />
          Add Another Medicine
        </button>
      </div>

      {/* Sticky Bottom Actions */}
      <div className="bg-white border-t border-[#E2DDD8] p-6 flex items-center justify-between sticky bottom-0">
        <div className="flex items-center gap-1.5 text-[#1B6CA8] px-3 py-1 bg-blue-50 rounded-full">
          <Pill size={14} />
          <span className="text-xs font-bold">{medicines.length} Medicines added</span>
        </div>
        
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-[#1B6CA8] hover:bg-[#154360] text-white px-10 py-4 rounded-2xl font-bold flex items-center gap-2 shadow-xl shadow-blue-900/10 transition-all disabled:opacity-50 active:scale-95"
        >
          {isSaving ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <>
              <Save size={20} />
              <span>Save & Notify Patient</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
