import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';

interface MedicineCardProps {
  medicine: any;
  reminderEnabled: boolean;
  onReminderToggle: (value: boolean) => void;
  isNew?: boolean;
}

export default function MedicineCard({ medicine, reminderEnabled, onReminderToggle, isNew }: MedicineCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={{flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8}}>
          <Text style={styles.medicineName}>{medicine.name || medicine.medicine}</Text>
          {isNew && (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>NEW</Text>
            </View>
          )}
        </View>
        <Switch
          value={reminderEnabled}
          onValueChange={onReminderToggle}
          trackColor={{ false: "#ccc", true: "#FFECB3" }}
          thumbColor={reminderEnabled ? "#D84315" : "#f4f3f4"}
        />
      </View>
      <Text style={styles.dosage}>{medicine.dosage} | {medicine.frequency}</Text>
      
      <View style={styles.footerRow}>
        <Text style={styles.duration}>Duration: {medicine.duration}</Text>
        <Text style={styles.prescribedBy}>By: {medicine.prescribed_by}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#eee',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  medicineName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  dosage: {
    fontSize: 14,
    color: '#555',
    marginBottom: 12,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  duration: {
    fontSize: 12,
    color: '#777',
  },
  prescribedBy: {
    fontSize: 12,
    color: '#777',
  },
  newBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  newBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1976D2',
  }
});
