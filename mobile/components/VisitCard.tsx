import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface VisitCardProps {
  visit: any;
  expanded: boolean;
  onToggle: () => void;
}

export default function VisitCard({ visit, expanded, onToggle }: VisitCardProps) {
  // Use simple date string if we can't use date-fns yet
  const dateStr = typeof visit.date === 'string' ? visit.date.split('T')[0] : 'Unknown Date';

  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={onToggle} activeOpacity={0.7} style={styles.header}>
        <View style={styles.dateContainer}>
          <Text style={styles.dateText}>{dateStr}</Text>
        </View>
        <View style={styles.infoContainer}>
          <Text style={styles.hospitalName}>{visit.hospital_name}</Text>
          <Text style={styles.doctorName}>{visit.doctor_name}</Text>
          <Text style={styles.chiefComplaint} numberOfLines={1}>{visit.chief_complaint}</Text>
          
          <View style={styles.tagRow}>
            {visit.diagnosis && visit.diagnosis.map((d: string, i: number) => (
              <View key={i} style={styles.tag}>
                <Text style={styles.tagText}>{d}</Text>
              </View>
            ))}
          </View>
        </View>
      </TouchableOpacity>
      
      {expanded && (
        <View style={styles.expandedContent}>
          <Text style={styles.sectionTitle}>Prescriptions</Text>
          {visit.prescriptions && visit.prescriptions.map((p: any, i: number) => (
            <View key={i} style={styles.prescriptionRow}>
              <Text style={styles.medName}>{p.medicine}</Text>
              <Text style={styles.medDetails}>{p.dosage} | {p.frequency}</Text>
            </View>
          ))}
          {visit.follow_up_date && (
            <Text style={styles.followUp}>Follow up: {String(visit.follow_up_date).split('T')[0]}</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#eee',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    padding: 12,
  },
  dateContainer: {
    width: 60,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  dateText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1B6CA8',
  },
  infoContainer: {
    flex: 1,
    paddingLeft: 8,
  },
  hospitalName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  doctorName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  chiefComplaint: {
    fontSize: 14,
    marginTop: 4,
    fontStyle: 'italic',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  tag: {
    backgroundColor: '#E8F4FD',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 12,
    color: '#1B6CA8',
  },
  expandedContent: {
    padding: 12,
    backgroundColor: '#FAFAFA',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  prescriptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  medName: {
    fontWeight: '500',
    flex: 1,
  },
  medDetails: {
    fontSize: 12,
    color: '#666',
    flex: 1,
    textAlign: 'right',
  },
  followUp: {
    marginTop: 12,
    fontSize: 13,
    color: '#D84315',
    fontWeight: '500',
  }
});
