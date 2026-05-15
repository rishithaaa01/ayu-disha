import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';

interface ConsentCardProps {
  consent: any;
  onRevoke: (id: string) => void;
}

export default function ConsentCard({ consent, onRevoke }: ConsentCardProps) {
  // Use simple date string
  const grantedDateStr = typeof consent.created_at === 'string' ? consent.created_at.split('T')[0] : 'Unknown Date';
  
  const handleRevoke = () => {
    Alert.alert(
      "Revoke Access",
      `Are you sure you want to remove ${consent.granted_to_name}'s access to your records?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Revoke", style: "destructive", onPress: () => onRevoke(consent.id || consent._id) }
      ]
    );
  };

  const getDaysRemaining = () => {
    if (!consent.expires_at) return '';
    const expiry = new Date(consent.expires_at).getTime();
    const now = new Date().getTime();
    const diff = expiry - now;
    const days = Math.ceil(diff / (1000 * 3600 * 24));
    return days > 0 ? `in ${days} days` : 'expired';
  };

  return (
    <View style={styles.card}>
      <View style={styles.content}>
        <Text style={styles.doctorName}>{consent.granted_to_name}</Text>
        
        <View style={styles.detailRow}>
          <Text style={styles.label}>Access level:</Text>
          <Text style={styles.value}>
            {consent.data_scope === 'full' ? 'Full history' : 'This visit only'}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.label}>Granted on:</Text>
          <Text style={styles.value}>{grantedDateStr}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.label}>Expires:</Text>
          <Text style={styles.value}>{getDaysRemaining()}</Text>
        </View>
      </View>
      
      <TouchableOpacity style={styles.revokeButton} onPress={handleRevoke}>
        <Text style={styles.revokeText}>Revoke Access</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#eee',
    overflow: 'hidden',
  },
  content: {
    padding: 16,
  },
  doctorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  label: {
    width: 100,
    fontSize: 14,
    color: '#666',
  },
  value: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  revokeButton: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#FFCDD2',
  },
  revokeText: {
    color: '#D32F2F',
    fontWeight: 'bold',
    fontSize: 15,
  }
});
