import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import RiskBadge from './RiskBadge';

interface QueueCardProps {
  patient: any;
  position: number;
  onPress: () => void;
}

export default function QueueCard({ patient, position, onPress }: QueueCardProps) {
  const isReferred = patient.appointment_type === 'referred';

  return (
    <TouchableOpacity 
      activeOpacity={0.7} 
      onPress={onPress}
      style={[
        styles.container,
        { borderLeftColor: patient.risk_tag === 'urgent' ? '#EF4444' : patient.risk_tag === 'watch' ? '#F59E0B' : '#22C55E' }
      ]}
    >
      <View style={styles.header}>
        <View style={styles.infoRow}>
          <View style={styles.positionBadge}>
            <Text style={styles.positionText}>#{position}</Text>
          </View>
          <Text style={styles.name}>{patient.patient_name}</Text>
        </View>
        <RiskBadge risk={patient.risk_tag} />
      </View>

      <View style={styles.detailsRow}>
        <Text style={styles.detailText}>{patient.age}Y • {patient.gender.toUpperCase()}</Text>
      </View>

      <Text style={styles.complaint} numberOfLines={1}>
        "{patient.chief_complaint}"
      </Text>

      <View style={styles.footer}>
        <View style={styles.timeRow}>
          <Ionicons name="time-outline" size={14} color="#888" />
          <Text style={styles.timeText}>{patient.wait_time} min waiting</Text>
        </View>

        <View style={[styles.typeBadge, isReferred && styles.referredBadge]}>
          <Ionicons 
            name={isReferred ? "arrow-redo" : "walk"} 
            size={12} 
            color={isReferred ? "#1B6CA8" : "#888"} 
          />
          <Text style={[styles.typeText, isReferred && styles.referredText]}>
            {isReferred ? `via ${patient.referred_by || 'ASHA'}` : patient.appointment_type.toUpperCase()}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8EDF2',
    borderLeftWidth: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  positionBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  positionText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6B7280',
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  detailsRow: {
    marginBottom: 8,
  },
  detailText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  complaint: {
    fontSize: 14,
    color: '#4B5563',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F9FAFB',
  },
  referredBadge: {
    backgroundColor: '#EFF6FF',
  },
  typeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  referredText: {
    color: '#1B6CA8',
  },
});
