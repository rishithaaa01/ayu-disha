import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import clinicianApi from '../../../services/clinicianApi';
import { useClinicianStore } from '../../../store/clinicianStore';
import VoiceNoteModal from '../../../components/VoiceNoteModal';
import PrescriptionEditor from '../../../components/PrescriptionEditor';

export default function ConsultationScreen() {
  const { id } = useLocalSearchParams();
  const { activePatient, setActiveVisitId } = useClinicianStore();
  
  const [symptoms, setSymptoms] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [differential, setDifferential] = useState<any[]>([]);
  const [isVoiceVisible, setIsVoiceVisible] = useState(false);
  const [isPrescriptionVisible, setIsPrescriptionVisible] = useState(false);
  const [medicines, setMedicines] = useState<any[]>([]);

  // 1. Differential Diagnosis logic
  useEffect(() => {
    if (symptoms.length > 10) {
      const timer = setTimeout(async () => {
        try {
          const res = await clinicianApi.getDifferential(symptoms, activePatient?.patient_id);
          setDifferential(res.diagnoses || []);
        } catch (e) { console.error(e); }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [symptoms]);

  const handleVoiceResult = (data: any) => {
    if (data.chief_complaint) setSymptoms(prev => prev + (prev ? ', ' : '') + data.chief_complaint);
    if (data.diagnosis && data.diagnosis.length > 0) setDiagnosis(prev => prev + (prev ? ', ' : '') + data.diagnosis.join(', '));
  };

  const handleComplete = async () => {
    if (!diagnosis) {
      Alert.alert("Missing Info", "Please provide a provisional diagnosis.");
      return;
    }

    try {
      await clinicianApi.updateVisit(id as string, {
        diagnosis: [diagnosis],
        chief_complaint: symptoms,
      });
      
      if (medicines.length > 0) {
        await clinicianApi.savePrescription({
          visit_id: id as string,
          patient_id: activePatient?.patient_id,
          medicines: medicines
        });
      }

      await clinicianApi.completeVisit(id as string);
      Alert.alert("Consultation Complete", "Visit records saved and synced.");
      setActiveVisitId(null);
      router.replace('/(doctor)/home');
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Could not save consultation.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <View style={styles.appBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.appBarTitle}>Active Consultation</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Section 1: Symptoms */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>CHIEF COMPLAINT & SYMPTOMS</Text>
            <TextInput
              multiline
              value={symptoms}
              onChangeText={setSymptoms}
              placeholder="Recording symptoms triggers AI differential..."
              style={styles.textArea}
            />
            <TouchableOpacity 
              style={styles.voiceBtn} 
              onPress={() => setIsVoiceVisible(true)}
            >
              <Ionicons name="mic" size={18} color="#D35400" />
              <Text style={styles.voiceBtnText}>DICTATE NOTES</Text>
            </TouchableOpacity>
          </View>

          {/* Section 2: AI Differential */}
          {differential.length > 0 && (
            <View style={styles.differentialContainer}>
              <View style={styles.diffHeader}>
                <Ionicons name="sparkles" size={14} color="#1B6CA8" />
                <Text style={styles.diffTitle}>AI DIFFERENTIAL SUGGESTIONS</Text>
              </View>
              {differential.map((d, i) => (
                <TouchableOpacity 
                  key={i} 
                  style={styles.diffItem}
                  onPress={() => setDiagnosis(d.name)}
                >
                  <Text style={styles.diffName}>{d.name}</Text>
                  <Text style={styles.diffConf}>{d.confidence} Confidence</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Section 3: Provisional Diagnosis */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>PROVISIONAL DIAGNOSIS</Text>
            <TextInput
              value={diagnosis}
              onChangeText={setDiagnosis}
              placeholder="E.g. Upper Respiratory Infection"
              style={styles.input}
            />
          </View>

          {/* Section 4: Prescriptions Tool */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>PLAN & TREATMENT</Text>
            <TouchableOpacity 
              style={styles.toolBtn} 
              onPress={() => setIsPrescriptionVisible(true)}
            >
              <View style={styles.toolLeft}>
                <Ionicons name="medkit" size={20} color="#1B6CA8" />
                <Text style={styles.toolText}>Prescription {medicines.length > 0 ? `(${medicines.length} items)` : ''}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Complete Button */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.completeButton} onPress={handleComplete}>
            <Ionicons name="checkmark-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.completeButtonText}>COMPLETE CONSULTATION</Text>
          </TouchableOpacity>
        </View>

        <VoiceNoteModal 
          visible={isVoiceVisible} 
          visitId={id as string}
          onClose={() => setIsVoiceVisible(false)}
          onResult={handleVoiceResult}
        />

        <Modal 
          visible={isPrescriptionVisible} 
          animationType="slide"
          onRequestClose={() => setIsPrescriptionVisible(false)}
        >
          <SafeAreaView style={{ flex: 1 }}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setIsPrescriptionVisible(false)}>
                <Ionicons name="chevron-down" size={28} color="#64748B" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Manage Prescriptions</Text>
              <View style={{ width: 28 }} />
            </View>
            <PrescriptionEditor 
              patient={activePatient} 
              visitId={id as string}
              onSave={(meds) => {
                setMedicines(meds);
                setIsPrescriptionVisible(false);
              }}
            />
          </SafeAreaView>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Inline imports/helper for Modal
import { Modal } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  appBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  appBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  textArea: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: '#1E293B',
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1E293B',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  voiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#FDBA74',
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
  },
  voiceBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#D35400',
    letterSpacing: 1,
  },
  differentialContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
  },
  diffHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  diffTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1B6CA8',
    letterSpacing: 1,
  },
  diffItem: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  diffName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  diffConf: {
    fontSize: 10,
    fontWeight: '700',
    color: '#22C55E',
  },
  toolBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  toolLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toolText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  completeButton: {
    backgroundColor: '#22C55E',
    padding: 18,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
});
