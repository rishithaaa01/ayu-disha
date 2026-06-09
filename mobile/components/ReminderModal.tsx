import React, { useState } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList,
  Platform,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ReminderModalProps {
  visible: boolean;
  onClose: () => void;
  medicines: any[];
}

export default function ReminderModal({ visible, onClose, medicines }: ReminderModalProps) {
  const [selectedMed, setSelectedMed] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState('09:00');

  const commonTimes = ['08:00', '09:00', '13:00', '14:00', '20:00', '21:00'];

  const handleSave = () => {
    if (!selectedMed) {
      Alert.alert("Selection Required", "Please select a medicine first.");
      return;
    }
    
    // Logic for saving reminder would go here
    Alert.alert(
      "Reminder Set! 🔔", 
      `We'll remind you to take ${selectedMed} at ${selectedTime} every day.`
    );
    onClose();
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Set Reminder</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>1. Select Medicine</Text>
            <FlatList
              data={medicines}
              keyExtractor={(item, index) => index.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[
                    styles.medChip, 
                    selectedMed === item.medicine && styles.activeMedChip
                  ]}
                  onPress={() => setSelectedMed(item.medicine)}
                >
                  <Text style={[
                    styles.medText,
                    selectedMed === item.medicine && styles.activeMedText
                  ]}>{item.medicine}</Text>
                </TouchableOpacity>
              )}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>2. Select Time</Text>
            <View style={styles.timeGrid}>
              {commonTimes.map(time => (
                <TouchableOpacity 
                  key={time}
                  style={[
                    styles.timeChip,
                    selectedTime === time && styles.activeTimeChip
                  ]}
                  onPress={() => setSelectedTime(time)}
                >
                  <Text style={[
                    styles.timeText,
                    selectedTime === time && styles.activeTimeText
                  ]}>{time}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Set Reminder</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: 450,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  medChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activeMedChip: {
    backgroundColor: '#1B6CA8',
    borderColor: '#1B6CA8',
  },
  medText: {
    color: '#4B5563',
    fontWeight: '500',
  },
  activeMedText: {
    color: '#FFF',
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeChip: {
    width: '30%',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activeTimeChip: {
    backgroundColor: '#EBF5FF',
    borderColor: '#1B6CA8',
  },
  timeText: {
    color: '#374151',
    fontWeight: 'bold',
  },
  activeTimeText: {
    color: '#1B6CA8',
  },
  saveBtn: {
    backgroundColor: '#F57F17',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
