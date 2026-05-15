import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  ScrollView,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import clinicianApi from '../services/clinicianApi';

interface PrescriptionEditorProps {
  patient: any;
  visitId: string;
  onSave: (medicines: any[]) => void;
}

export default function PrescriptionEditor({ patient, visitId, onSave }: PrescriptionEditorProps) {
  const [medicines, setMedicines] = useState<any[]>([
    { id: '1', name: '', dosage: '', frequency: 'BD', duration: '', instructions: '' }
  ]);
  const [isChecking, setIsChecking] = useState<string | null>(null);

  const addMedicine = () => {
    setMedicines([...medicines, { id: Date.now().toString(), name: '', dosage: '', frequency: 'BD', duration: '', instructions: '' }]);
  };

  const removeMedicine = (id: string) => {
    setMedicines(medicines.filter(m => m.id !== id));
  };

  const updateMedicine = (id: string, field: string, value: string) => {
    setMedicines(medicines.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const checkInteraction = async (med: any) => {
    if (!med.name || med.name.length < 3) return;
    
    setIsChecking(med.id);
    try {
      const otherMeds = medicines.filter(m => m.id !== med.id && m.name).map(m => m.name);
      const res = await clinicianApi.checkInteraction({
        new_medicine: med.name,
        current_medicines: [...otherMeds, ...(patient.current_medications?.map((m: any) => m.name || m.medicine) || [])],
        patient_allergies: patient.profile?.allergies || patient.allergies || []
      });
      
      if (res.has_interaction || res.has_allergy_risk) {
        Alert.alert(
          res.has_allergy_risk ? "ALLERGY ALERT" : `${res.severity.toUpperCase()} INTERACTION`,
          `${res.warning}\n\nRecommendation: ${res.recommendation}`,
          [{ text: "Keep Anyway", style: "destructive" }, { text: "Change Medicine", onPress: () => updateMedicine(med.id, 'name', '') }]
        );
      }
      
      setMedicines(prev => prev.map(m => m.id === med.id ? { ...m, interaction: res } : m));
    } catch (e) {
      console.error(e);
    } finally {
      setIsChecking(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>PRESCRIPTION WRITER</Text>
        <TouchableOpacity onPress={addMedicine}>
          <Ionicons name="add-circle" size={24} color="#1B6CA8" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {medicines.map((med, idx) => (
          <View key={med.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.medNum}>#{idx + 1}</Text>
              <TouchableOpacity onPress={() => removeMedicine(med.id)}>
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>

            <TextInput
              placeholder="Medicine Name (e.g. Paracetamol)"
              value={med.name}
              onChangeText={(val) => updateMedicine(med.id, 'name', val)}
              onBlur={() => checkInteraction(med)}
              style={styles.input}
            />

            <View style={styles.row}>
              <TextInput
                placeholder="Dosage"
                value={med.dosage}
                onChangeText={(val) => updateMedicine(med.id, 'dosage', val)}
                style={[styles.input, { flex: 1, marginRight: 8 }]}
              />
              <TextInput
                placeholder="Freq (e.g. BD)"
                value={med.frequency}
                onChangeText={(val) => updateMedicine(med.id, 'frequency', val)}
                style={[styles.input, { flex: 1, marginRight: 8 }]}
              />
              <TextInput
                placeholder="Duration"
                value={med.duration}
                onChangeText={(val) => updateMedicine(med.id, 'duration', val)}
                style={[styles.input, { flex: 1 }]}
              />
            </View>

            <TextInput
              placeholder="Instructions (e.g. After food)"
              value={med.instructions}
              onChangeText={(val) => updateMedicine(med.id, 'instructions', val)}
              style={styles.input}
            />
            
            {med.interaction && !med.interaction.has_interaction && !med.interaction.has_allergy_risk && (
              <View style={styles.safeRow}>
                <Ionicons name="checkmark-circle" size={12} color="#22C55E" />
                <Text style={styles.safeText}>SAFE TO PRESCRIBE</Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity 
        style={styles.saveButton} 
        onPress={() => onSave(medicines.filter(m => m.name))}
      >
        <Text style={styles.saveButtonText}>CONFIRM PRESCRIPTION</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    height: 500,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1,
  },
  list: {
    flex: 1,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  medNum: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '600',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  row: {
    flexDirection: 'row',
  },
  safeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  safeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#22C55E',
  },
  saveButton: {
    backgroundColor: '#1B6CA8',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
