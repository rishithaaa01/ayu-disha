import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FlaskConical, Plus, X, Search, Check, Loader2, ClipboardList, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../../../services/clinicianApi';
import generalApi from '../../../services/api';
import toast from 'react-hot-toast';

interface LabOrderPanelProps {
  patient: any;
  visitId: string;
}

export default function LabOrderPanel({ patient, visitId }: LabOrderPanelProps) {
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [customTest, setCustomTest] = useState('');
  const [urgency, setUrgency] = useState('routine');
  const [isOrdering, setIsOrdering] = useState(false);
  const [enteringResultId, setEnteringResultId] = useState<string | null>(null);
  const [resultText, setResultText] = useState('');
  const queryClient = useQueryClient();

  const patientId = patient?.profile?.id || patient?.patient_id;

  // Fetch pending lab orders for this patient
  const { data: labOrders = [], refetch: refetchLabs } = useQuery({
    queryKey: ['pending-labs', patientId],
    queryFn: () => generalApi.get(`/patients/me/lab-results`).then(r => r.data),
    enabled: false, // Doctor fetches via clinician route below
  });

  // Fetch via clinician patient record
  const pendingLabs = (patient?.lab_results || []).filter((l: any) => l.status === 'pending');

  const updateResultMutation = useMutation({
    mutationFn: ({ labId, result }: { labId: string; result: string }) =>
      api.default?.patch
        ? api.default.patch(`/clinician/lab-orders/${labId}/result`, { result })
        : fetch(`${import.meta.env.VITE_API_URL || 'https://ayu-disha.onrender.com/api'}/clinician/lab-orders/${labId}/result`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ result })
          }).then(r => r.json()),
    onSuccess: () => {
      toast.success('Lab result saved — patient notified');
      setEnteringResultId(null);
      setResultText('');
      queryClient.invalidateQueries({ queryKey: ['patient-record', patientId] });
    },
    onError: () => toast.error('Failed to save result'),
  });

  const commonTests = [
    'CBC', 'Blood Sugar Fasting', 'HbA1c', 'LFT', 'KFT', 'Lipid Profile',
    'Thyroid (TSH)', 'Urine Routine', 'ECG', 'Chest X-Ray', 'Electrolytes'
  ];

  const toggleTest = (test: string) => {
    setSelectedTests(prev =>
      prev.includes(test) ? prev.filter(t => t !== test) : [...prev, test]
    );
  };

  const addCustomTest = () => {
    if (customTest && !selectedTests.includes(customTest)) {
      setSelectedTests([...selectedTests, customTest]);
      setCustomTest('');
    }
  };

  const handleOrder = async () => {
    if (selectedTests.length === 0) return;
    setIsOrdering(true);
    try {
      await api.orderLabs({
        visit_id: visitId,
        patient_id: patientId,
        tests: selectedTests,
        urgency
      });
      toast.success(`${selectedTests.length} tests ordered successfully`);
      setSelectedTests([]);
      queryClient.invalidateQueries({ queryKey: ['patient-record', patientId] });
    } catch (e) {
      toast.error('Failed to order lab tests');
    } finally {
      setIsOrdering(false);
    }
  };

  return (
    <div className="p-8 bg-[#FAFAFA]">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-[#1B6CA8] mb-2">
          <FlaskConical size={18} />
          <h3 className="font-bold text-lg uppercase tracking-wider font-mukta">Laboratory Investigations</h3>
        </div>
        <p className="text-sm text-[#888]">Select tests for <span className="text-[#333] font-bold">{patient?.profile?.name || patient?.patient_name}</span></p>
      </div>

      {/* Pending Results Section */}
      {pendingLabs.length > 0 && (
        <div className="mb-8 bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 flex items-center gap-2 border-b border-amber-200">
            <ClipboardList size={16} className="text-amber-600" />
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
              Pending Results ({pendingLabs.length})
            </span>
          </div>
          <div className="divide-y divide-amber-100">
            {pendingLabs.map((lab: any) => (
              <div key={lab._id} className="px-5 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{lab.test_name}</p>
                    <p className="text-xs text-gray-400">Ordered {new Date(lab.ordered_date).toLocaleDateString('en-IN')}</p>
                  </div>
                  <button
                    onClick={() => {
                      setEnteringResultId(enteringResultId === lab._id ? null : lab._id);
                      setResultText('');
                    }}
                    className="text-xs font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                  >
                    {enteringResultId === lab._id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    Enter Result
                  </button>
                </div>
                {enteringResultId === lab._id && (
                  <div className="mt-3 space-y-2">
                    <input
                      type="text"
                      value={resultText}
                      onChange={e => setResultText(e.target.value)}
                      placeholder="e.g. HbA1c: 7.2% — Slightly above normal"
                      className="w-full border border-amber-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateResultMutation.mutate({ labId: lab._id, result: resultText })}
                        disabled={!resultText.trim() || updateResultMutation.isPending}
                        className="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        {updateResultMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                        Save Result
                      </button>
                      <button
                        onClick={() => setEnteringResultId(null)}
                        className="px-4 bg-white border border-amber-200 text-amber-700 py-2 rounded-xl text-xs font-bold hover:bg-amber-50 transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 mb-8">
        <h4 className="text-[10px] font-bold text-[#888] uppercase tracking-widest mb-4">Quick Selection</h4>
        <div className="grid grid-cols-2 gap-3 mb-8">
          {commonTests.map(test => (
            <button
              key={test}
              onClick={() => toggleTest(test)}
              className={`
                p-4 rounded-xl border text-sm font-bold transition-all text-left flex items-center justify-between
                ${selectedTests.includes(test) ? 'bg-[#1B6CA8] text-white border-[#1B6CA8]' : 'bg-white text-[#666] border-[#E2DDD8] hover:border-[#1B6CA8]'}
              `}
            >
              <span>{test}</span>
              {selectedTests.includes(test) && <Check size={14} />}
            </button>
          ))}
        </div>

        <h4 className="text-[10px] font-bold text-[#888] uppercase tracking-widest mb-4">Other / Custom Test</h4>
        <div className="flex gap-2">
          <div className="flex-1 relative">
             <Search size={16} className="absolute left-3 top-3.5 text-[#888]" />
             <input
               type="text"
               value={customTest}
               onChange={(e) => setCustomTest(e.target.value)}
               placeholder="Type test name..."
               className="w-full pl-10 pr-4 py-3 bg-white border border-[#E2DDD8] rounded-xl text-sm focus:outline-none focus:border-[#1B6CA8]"
               onKeyDown={(e) => e.key === 'Enter' && addCustomTest()}
             />
          </div>
          <button 
            onClick={addCustomTest}
            className="p-3 bg-[#F7F3EE] text-[#1B6CA8] rounded-xl hover:bg-[#EBF5FB] transition-colors"
          >
            <Plus size={24} />
          </button>
        </div>

        {selectedTests.length > 0 && (
          <div className="mt-8">
            <h4 className="text-[10px] font-bold text-[#888] uppercase tracking-widest mb-4">Selected Investigations</h4>
            <div className="flex flex-wrap gap-2">
              {selectedTests.map(test => (
                <div key={test} className="bg-white border border-[#1B6CA8] text-[#1B6CA8] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2">
                  <span>{test}</span>
                  <button onClick={() => toggleTest(test)}><X size={14} /></button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white border border-[#E2DDD8] rounded-2xl p-6 shadow-sm">
        <label className="text-[10px] font-bold text-[#888] uppercase tracking-widest block mb-3">Order Urgency</label>
        <div className="flex gap-3 mb-6">
          {['routine', 'urgent', 'emergency'].map(u => (
            <button
              key={u}
              onClick={() => setUrgency(u)}
              className={`
                flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider border-2 transition-all
                ${urgency === u ? 'bg-blue-50 border-[#1B6CA8] text-[#1B6CA8]' : 'bg-transparent border-[#F7F3EE] text-[#888]'}
              `}
            >
              {u}
            </button>
          ))}
        </div>

        <button
          onClick={handleOrder}
          disabled={selectedTests.length === 0 || isOrdering}
          className="w-full bg-[#1B6CA8] hover:bg-[#154360] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-900/10 transition-all disabled:opacity-50"
        >
          {isOrdering ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <>
              <Check size={20} />
              <span>Order {selectedTests.length} Tests</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
