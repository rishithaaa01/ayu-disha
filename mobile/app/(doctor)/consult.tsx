import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import api from '../../src/services/api';
import { ChevronLeft, CheckCircle, Save, Plus, X, Mic, AlertTriangle, Pill, FlaskConical, Navigation } from 'lucide-react-native';

const frequencies = [
  { id: '1-0-0', label: 'Morning Only (1-0-0)' },
  { id: '0-0-1', label: 'Night Only (0-0-1)' },
  { id: '1-0-1', label: 'Twice a day (1-0-1)' },
  { id: '1-1-1', label: 'Thrice a day (1-1-1)' },
  { id: 'SOS', label: 'As needed (SOS)' }
];

export default function ConsultationScreen() {
  const { encounterId } = useLocalSearchParams();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'notes' | 'rx' | 'labs' | 'refer'>('notes');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Notes State
  const [symptoms, setSymptoms] = useState('');
  const [findings, setFindings] = useState('');
  const [diagnosisInput, setDiagnosisInput] = useState('');
  const [diagnoses, setDiagnoses] = useState<string[]>([]);
  
  // Rx State
  const [medicines, setMedicines] = useState<any[]>([]);
  
  // Lab State
  const [labInput, setLabInput] = useState('');
  const [labOrders, setLabOrders] = useState<any[]>([]);
  const [labUrgency, setLabUrgency] = useState('routine');
  const [labNotes, setLabNotes] = useState('');

  // Refer State
  const [referHospital, setReferHospital] = useState('');
  const [referSpeciality, setReferSpeciality] = useState('');
  const [referReason, setReferReason] = useState('');

  const [visitData, setVisitData] = useState<any>(null);

  useEffect(() => {
    if (encounterId) fetchVisit();
  }, [encounterId]);

  const fetchVisit = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/clinician/visits/${encounterId}`);
      setVisitData(res.data);
      if (res.data.chief_complaint) setSymptoms(res.data.chief_complaint);
      if (res.data.notes) setFindings(res.data.notes);
      if (res.data.diagnosis) setDiagnoses(res.data.diagnosis);
      if (res.data.prescriptions) setMedicines(res.data.prescriptions);
      if (res.data.lab_orders) setLabOrders(res.data.lab_orders);
    } catch (err) {
      console.log('Failed to fetch visit', err);
    } finally {
      setLoading(false);
    }
  };

  // -- Notes Handlers
  const addDiagnosis = () => {
    if (diagnosisInput.trim()) {
      setDiagnoses([...diagnoses, diagnosisInput.trim()]);
      setDiagnosisInput('');
    }
  };

  // -- Rx Handlers
  const addMedicine = () => {
    setMedicines([...medicines, { 
      id: Date.now().toString(), 
      name: '', 
      dosage: '', 
      frequency: '1-0-1', 
      duration: '', 
      instructions: '' 
    }]);
  };
  const updateMedicine = (id: string, field: string, value: string) => {
    setMedicines(medicines.map(m => m.id === id ? { ...m, [field]: value } : m));
  };
  const removeMedicine = (id: string) => {
    setMedicines(medicines.filter(m => m.id !== id));
  };
  const savePrescription = async () => {
    const validMeds = medicines.filter(m => m.name.trim() !== '');
    if (validMeds.length === 0) return Alert.alert('Error', 'Add at least one medicine');
    setSaving(true);
    try {
      await api.post(`/clinician/visits/${encounterId}/prescribe`, { medicines: validMeds });
      Alert.alert('Success', 'Prescriptions saved!');
    } catch (err) {
      Alert.alert('Error', 'Failed to save prescriptions');
    } finally {
      setSaving(false);
    }
  };

  // -- Lab Handlers
  const addLabOrder = () => {
    if (labInput.trim()) {
      setLabOrders([...labOrders, {
        test_name: labInput.trim(),
        urgency: labUrgency,
        notes: labNotes
      }]);
      setLabInput('');
      setLabNotes('');
    }
  };
  const saveLabs = async () => {
    if (labOrders.length === 0) return Alert.alert('Error', 'Add at least one lab test');
    setSaving(true);
    try {
      await api.post(`/clinician/visits/${encounterId}/lab-order`, { orders: labOrders });
      Alert.alert('Success', 'Lab orders placed!');
    } catch (err) {
      Alert.alert('Error', 'Failed to save lab orders');
    } finally {
      setSaving(false);
    }
  };

  // -- Refer Handlers
  const saveReferral = async () => {
    if (!referHospital || !referSpeciality) return Alert.alert('Error', 'Hospital and Speciality required');
    setSaving(true);
    try {
      await api.post(`/clinician/visits/${encounterId}/refer`, {
        target_hospital: referHospital,
        target_speciality: referSpeciality,
        reason: referReason
      });
      Alert.alert('Success', 'Patient referred successfully!');
      router.back();
    } catch (err) {
      Alert.alert('Error', 'Failed to submit referral');
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    try {
      setSaving(true);
      await api.put(`/clinician/visits/${encounterId}`, {
        diagnosis: diagnoses,
        notes: findings,
        chief_complaint: symptoms,
      });
      await api.post(`/clinician/visits/${encounterId}/complete`);
      Alert.alert('Success', 'Consultation marked as complete');
      router.back();
    } catch (err) {
      Alert.alert('Error', 'Failed to complete consultation');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F7F3EE]">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        
        {/* Header */}
        <View className="flex-row items-center justify-between p-4 bg-white border-b border-slate-200 shadow-sm">
          <TouchableOpacity onPress={() => router.back()} className="p-2">
            <ChevronLeft size={24} color="#1B6CA8" />
          </TouchableOpacity>
          <View className="items-center">
            <Text className="text-lg font-bold text-gray-800">Consultation</Text>
            {visitData && <Text className="text-xs text-gray-500">{visitData.patient_name}</Text>}
          </View>
          <TouchableOpacity onPress={() => Alert.alert('Voice Note', 'Voice recording feature initialized')} className="p-2 bg-amber-50 rounded-full border border-amber-200">
            <Mic size={20} color="#d97706" />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View className="flex-row bg-white border-b border-gray-200">
          <TouchableOpacity onPress={() => setActiveTab('notes')} className={`flex-1 py-3 items-center border-b-2 ${activeTab === 'notes' ? 'border-[#1B6CA8]' : 'border-transparent'}`}>
            <Text className={`font-semibold text-xs ${activeTab === 'notes' ? 'text-[#1B6CA8]' : 'text-gray-500'}`}>NOTES</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('rx')} className={`flex-1 py-3 items-center border-b-2 ${activeTab === 'rx' ? 'border-[#1B6CA8]' : 'border-transparent'}`}>
            <Text className={`font-semibold text-xs ${activeTab === 'rx' ? 'text-[#1B6CA8]' : 'text-gray-500'}`}>RX</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('labs')} className={`flex-1 py-3 items-center border-b-2 ${activeTab === 'labs' ? 'border-[#1B6CA8]' : 'border-transparent'}`}>
            <Text className={`font-semibold text-xs ${activeTab === 'labs' ? 'text-[#1B6CA8]' : 'text-gray-500'}`}>LABS</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('refer')} className={`flex-1 py-3 items-center border-b-2 ${activeTab === 'refer' ? 'border-[#1B6CA8]' : 'border-transparent'}`}>
            <Text className={`font-semibold text-xs ${activeTab === 'refer' ? 'text-[#1B6CA8]' : 'text-gray-500'}`}>REFER</Text>
          </TouchableOpacity>
        </View>

        {loading && !visitData ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#1B6CA8" />
          </View>
        ) : (
          <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
            
            {/* NOTES TAB */}
            {activeTab === 'notes' && (
              <View className="space-y-4 mb-10">
                <View className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                  <Text className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Chief Complaint</Text>
                  <TextInput
                    className="bg-slate-50 p-4 rounded-xl text-slate-800 min-h-[100px]"
                    multiline
                    textAlignVertical="top"
                    placeholder="Patient symptoms..."
                    value={symptoms}
                    onChangeText={setSymptoms}
                  />
                </View>

                <View className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                  <Text className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Clinical Findings</Text>
                  <TextInput
                    className="bg-slate-50 p-4 rounded-xl text-slate-800 min-h-[100px]"
                    multiline
                    textAlignVertical="top"
                    placeholder="Examination findings..."
                    value={findings}
                    onChangeText={setFindings}
                  />
                </View>

                <View className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                  <Text className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Provisional Diagnosis</Text>
                  <View className="flex-row flex-wrap mb-3">
                    {diagnoses.map((d, idx) => (
                      <View key={idx} className="bg-blue-50 flex-row items-center rounded-full px-3 py-1 mr-2 mb-2 border border-blue-100">
                        <Text className="text-[#1B6CA8] font-bold text-xs mr-2">{d}</Text>
                        <TouchableOpacity onPress={() => setDiagnoses(diagnoses.filter((_, i) => i !== idx))}>
                          <X size={14} color="#1B6CA8" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                  <View className="flex-row items-center">
                    <TextInput
                      className="flex-1 bg-slate-50 p-3 rounded-xl text-slate-800 mr-2 border border-slate-200"
                      placeholder="Add diagnosis..."
                      value={diagnosisInput}
                      onChangeText={setDiagnosisInput}
                      onSubmitEditing={addDiagnosis}
                    />
                    <TouchableOpacity className="bg-[#1B6CA8] px-4 py-3 rounded-xl" onPress={addDiagnosis}>
                      <Text className="font-bold text-white">Add</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity 
                  className="bg-green-600 p-4 rounded-xl flex-row items-center justify-center shadow-lg mt-4"
                  onPress={handleComplete}
                  disabled={saving}
                >
                  {saving ? <ActivityIndicator color="white" /> : (
                    <>
                      <CheckCircle color="white" size={20} className="mr-2" />
                      <Text className="text-white font-bold text-lg">Complete Consultation</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* RX TAB */}
            {activeTab === 'rx' && (
              <View className="mb-10">
                {medicines.map((med, idx) => (
                  <View key={med.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-4">
                    <View className="flex-row justify-between items-center mb-4">
                      <View className="flex-row items-center">
                        <View className="bg-blue-50 w-6 h-6 rounded-full items-center justify-center mr-2">
                          <Text className="text-[#1B6CA8] font-bold text-xs">{idx + 1}</Text>
                        </View>
                        <Text className="font-bold text-slate-800">Medicine Entry</Text>
                      </View>
                      <TouchableOpacity onPress={() => removeMedicine(med.id)}>
                        <X size={20} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                    
                    <TextInput
                      placeholder="Medicine Name (e.g. Paracetamol 500mg)"
                      value={med.name}
                      onChangeText={(t) => updateMedicine(med.id, 'name', t)}
                      className="bg-slate-50 p-3 rounded-xl border border-slate-200 mb-2 font-semibold text-slate-800"
                    />
                    <View className="flex-row gap-2 mb-2">
                      <TextInput
                        placeholder="Dosage"
                        value={med.dosage}
                        onChangeText={(t) => updateMedicine(med.id, 'dosage', t)}
                        className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-800"
                      />
                      <TextInput
                        placeholder="Duration"
                        value={med.duration}
                        onChangeText={(t) => updateMedicine(med.id, 'duration', t)}
                        className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-800"
                      />
                    </View>
                    <TextInput
                      placeholder="Instructions (e.g. After food)"
                      value={med.instructions}
                      onChangeText={(t) => updateMedicine(med.id, 'instructions', t)}
                      className="bg-slate-50 p-3 rounded-xl border border-slate-200 mb-2 text-slate-800"
                    />
                  </View>
                ))}

                <TouchableOpacity 
                  onPress={addMedicine}
                  className="border-2 border-dashed border-[#1B6CA8] p-4 rounded-xl items-center flex-row justify-center mb-6 bg-blue-50"
                >
                  <Plus size={20} color="#1B6CA8" className="mr-2" />
                  <Text className="text-[#1B6CA8] font-bold">Add Medicine</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  className="bg-[#1B6CA8] p-4 rounded-xl flex-row items-center justify-center shadow-lg"
                  onPress={savePrescription}
                  disabled={saving || medicines.length === 0}
                >
                  {saving ? <ActivityIndicator color="white" /> : (
                    <>
                      <Save color="white" size={20} className="mr-2" />
                      <Text className="text-white font-bold text-lg">Save Prescriptions</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* LABS TAB */}
            {activeTab === 'labs' && (
              <View className="mb-10">
                <View className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-6">
                  <Text className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-3">Order Lab Test</Text>
                  <TextInput
                    placeholder="Test Name (e.g. Complete Blood Count)"
                    value={labInput}
                    onChangeText={setLabInput}
                    className="bg-slate-50 p-3 rounded-xl border border-slate-200 mb-3 text-slate-800 font-semibold"
                  />
                  <View className="flex-row gap-2 mb-3">
                    <TouchableOpacity onPress={() => setLabUrgency('routine')} className={`flex-1 p-2 rounded-lg items-center border ${labUrgency === 'routine' ? 'bg-blue-50 border-blue-400' : 'bg-white border-slate-200'}`}>
                      <Text className={`text-xs font-bold ${labUrgency === 'routine' ? 'text-blue-700' : 'text-slate-500'}`}>Routine</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setLabUrgency('urgent')} className={`flex-1 p-2 rounded-lg items-center border ${labUrgency === 'urgent' ? 'bg-amber-50 border-amber-400' : 'bg-white border-slate-200'}`}>
                      <Text className={`text-xs font-bold ${labUrgency === 'urgent' ? 'text-amber-700' : 'text-slate-500'}`}>Urgent</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setLabUrgency('emergency')} className={`flex-1 p-2 rounded-lg items-center border ${labUrgency === 'emergency' ? 'bg-red-50 border-red-400' : 'bg-white border-slate-200'}`}>
                      <Text className={`text-xs font-bold ${labUrgency === 'emergency' ? 'text-red-700' : 'text-slate-500'}`}>Emergency</Text>
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    placeholder="Clinical Notes for Lab (optional)"
                    value={labNotes}
                    onChangeText={setLabNotes}
                    className="bg-slate-50 p-3 rounded-xl border border-slate-200 mb-3 text-slate-800"
                  />
                  <TouchableOpacity onPress={addLabOrder} className="bg-teal-600 p-3 rounded-xl items-center">
                    <Text className="text-white font-bold text-sm">Add Test to Order</Text>
                  </TouchableOpacity>
                </View>

                {labOrders.length > 0 && (
                  <View className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-6">
                    <Text className="text-slate-800 font-bold mb-3">Selected Tests</Text>
                    {labOrders.map((order, idx) => (
                      <View key={idx} className="flex-row justify-between items-center bg-slate-50 p-3 rounded-xl mb-2 border border-slate-100">
                        <View className="flex-1">
                          <View className="flex-row items-center">
                            <Text className="font-bold text-slate-800 mr-2">{order.test_name}</Text>
                            <View className={`px-2 py-0.5 rounded-md ${order.urgency === 'urgent' ? 'bg-amber-100' : order.urgency === 'emergency' ? 'bg-red-100' : 'bg-blue-100'}`}>
                              <Text className={`text-[10px] font-bold uppercase ${order.urgency === 'urgent' ? 'text-amber-700' : order.urgency === 'emergency' ? 'text-red-700' : 'text-blue-700'}`}>{order.urgency}</Text>
                            </View>
                          </View>
                          {order.notes && <Text className="text-xs text-slate-500 mt-1">{order.notes}</Text>}
                        </View>
                        <TouchableOpacity onPress={() => setLabOrders(labOrders.filter((_, i) => i !== idx))}>
                          <X size={18} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                <TouchableOpacity 
                  className="bg-[#1B6CA8] p-4 rounded-xl flex-row items-center justify-center shadow-lg"
                  onPress={saveLabs}
                  disabled={saving || labOrders.length === 0}
                >
                  {saving ? <ActivityIndicator color="white" /> : (
                    <>
                      <FlaskConical color="white" size={20} className="mr-2" />
                      <Text className="text-white font-bold text-lg">Submit Lab Orders</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* REFER TAB */}
            {activeTab === 'refer' && (
              <View className="mb-10">
                <View className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-4">
                  <Text className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-4">Refer to Specialist</Text>
                  
                  <Text className="font-bold text-slate-700 text-xs mb-1">Target Hospital *</Text>
                  <TextInput
                    placeholder="e.g. District General Hospital"
                    value={referHospital}
                    onChangeText={setReferHospital}
                    className="bg-slate-50 p-3 rounded-xl border border-slate-200 mb-4 text-slate-800 font-semibold"
                  />

                  <Text className="font-bold text-slate-700 text-xs mb-1">Target Speciality *</Text>
                  <TextInput
                    placeholder="e.g. Cardiology"
                    value={referSpeciality}
                    onChangeText={setReferSpeciality}
                    className="bg-slate-50 p-3 rounded-xl border border-slate-200 mb-4 text-slate-800 font-semibold"
                  />

                  <Text className="font-bold text-slate-700 text-xs mb-1">Reason for Referral *</Text>
                  <TextInput
                    placeholder="Clinical reason..."
                    value={referReason}
                    onChangeText={setReferReason}
                    multiline
                    textAlignVertical="top"
                    className="bg-slate-50 p-3 rounded-xl border border-slate-200 min-h-[100px] mb-4 text-slate-800"
                  />
                </View>

                <TouchableOpacity 
                  className="bg-amber-600 p-4 rounded-xl flex-row items-center justify-center shadow-lg"
                  onPress={saveReferral}
                  disabled={saving}
                >
                  {saving ? <ActivityIndicator color="white" /> : (
                    <>
                      <Navigation color="white" size={20} className="mr-2" />
                      <Text className="text-white font-bold text-lg">Send Referral</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
