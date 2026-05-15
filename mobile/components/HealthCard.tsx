import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface HealthCardProps {
  name: string;
  abhaNumber?: string;
  bloodGroup?: string;
  allergies?: string[];
  lastVisit?: {
    hospitalName: string;
    date: string;
  };
}

export default function HealthCard({ name, abhaNumber, bloodGroup, allergies, lastVisit }: HealthCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.greeting}>Namaste, {name}</Text>
      {abhaNumber && <Text style={styles.abha}>ABHA: {abhaNumber}</Text>}
      
      <View style={styles.badgesRow}>
        {bloodGroup && (
          <View style={[styles.badge, styles.bloodBadge]}>
            <Text style={styles.badgeText}>{bloodGroup}</Text>
          </View>
        )}
        {allergies && allergies.length > 0 && (
          <View style={[styles.badge, styles.allergyBadge]}>
            <Text style={styles.badgeText}>{allergies.join(', ')}</Text>
          </View>
        )}
      </View>

      {lastVisit && (
        <Text style={styles.lastVisit}>
          Last visited: {lastVisit.hospitalName} — {lastVisit.date}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#F7F3EE',
    padding: 16,
    borderRadius: 12,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  greeting: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  abha: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  badgesRow: {
    flexDirection: 'row',
    marginTop: 12,
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    marginRight: 8,
  },
  bloodBadge: {
    backgroundColor: '#FFCDD2',
  },
  allergyBadge: {
    backgroundColor: '#FFECB3',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  lastVisit: {
    fontSize: 13,
    color: '#555',
  },
});
