import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { getReferrals } from '../../services/ashaApi';
import SyncIndicator from '../../components/SyncIndicator';

export default function ReferralsScreen() {
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await getReferrals();
      setReferrals(data);
    } catch (e) {
      console.warn("Failed to load referrals", e);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'pending') return { bg: '#E0E0E0', text: '#666', label: 'Awaiting' };
    if (status === 'accepted') return { bg: '#E8F4FD', text: '#1B6CA8', label: 'Accepted' };
    if (status === 'seen') return { bg: '#E8F5E9', text: '#388E3C', label: 'Doctor seen patient' };
    return { bg: '#FFF3E0', text: '#F57C00', label: status };
  };

  const ReferralCard = ({ refData }: { refData: any }) => {
    const [expanded, setExpanded] = React.useState(false);
    const badge = getStatusBadge(refData.status);
    const isSeen = refData.status === 'seen';

    return (
      <TouchableOpacity 
        style={[styles.card, isSeen && { borderColor: '#A5D6A7', borderWidth: 1 }]} 
        activeOpacity={0.8}
        onPress={() => setExpanded(!expanded)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.patientName}>{refData.patient_name || "Patient"}</Text>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
          </View>
        </View>
        <Text style={styles.refInfo}>Referred to: {refData.referred_to || refData.to_hospital_id}</Text>
        <Text style={styles.refInfo}>Sent: {refData.sent_date || new Date().toLocaleDateString()}</Text>
        
        {(isSeen && expanded) && (
          <View style={styles.outcomeContainer}>
            <View style={styles.divider} />
            
            <Text style={styles.outcomeLabel}>Diagnosis:</Text>
            {refData.outcome?.diagnosis?.length > 0 ? refData.outcome.diagnosis.map((d: string, i: number) => (
              <Text key={i} style={styles.outcomeValue}>• {d}</Text>
            )) : <Text style={styles.outcomeValue}>• General checkup</Text>}

            <Text style={[styles.outcomeLabel, { marginTop: 12 }]}>Prescribed:</Text>
            {refData.outcome?.prescriptions?.length > 0 ? refData.outcome.prescriptions.map((p: any, i: number) => (
              <Text key={i} style={styles.outcomeValue}>• {p.name} ({p.dosage})</Text>
            )) : <Text style={styles.outcomeValue}>• No medications</Text>}

            {refData.outcome?.follow_up_date && (
              <View style={styles.followUpBox}>
                <Ionicons name="calendar-outline" size={14} color="#388E3C" />
                <Text style={styles.followUpText}>
                  Follow-up: {new Date(refData.outcome.follow_up_date).toLocaleDateString()}
                </Text>
              </View>
            )}
          </View>
        )}
        
        {isSeen && !expanded && (
          <Text style={styles.expandHint}>Tap to see outcome data</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Referrals</Text>
        <SyncIndicator />
      </View>

        <ScrollView 
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={loadData} color="#1B6CA8" />
          }
        >
          
          <View style={styles.impactCard}>
            <Text style={styles.impactText}>This month: {referrals.length || 0} referrals sent</Text>
            <Text style={styles.impactHighlight}>
              {referrals.filter(r => r.status === 'seen').length} patients seen by doctor
            </Text>
          </View>

          {loading && referrals.length === 0 ? <ActivityIndicator size="large" color="#1B6CA8" style={{marginTop: 40}} /> : (
            referrals.map((ref) => (
              <ReferralCard key={ref.id || ref._id} refData={ref} />
            ))
          )}
        </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F3EE' },
  header: { backgroundColor: '#1B6CA8', padding: 16, paddingTop: 48, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  content: { padding: 16 },
  impactCard: { backgroundColor: '#E8F4FD', padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#BBDEFB' },
  impactText: { fontSize: 14, color: '#333' },
  impactHighlight: { fontSize: 14, fontWeight: 'bold', color: '#1B6CA8', marginTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  patientName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  badgeText: { fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
  refInfo: { fontSize: 13, color: '#666', marginBottom: 2 },
  outcomeContainer: { marginTop: 12, padding: 12, backgroundColor: '#FAFAFA', borderRadius: 8 },
  divider: { height: 1, backgroundColor: '#EEE', marginBottom: 12 },
  outcomeLabel: { fontSize: 12, fontWeight: 'bold', color: '#388E3C', marginBottom: 4, textTransform: 'uppercase' },
  outcomeValue: { fontSize: 14, color: '#333', marginBottom: 2 },
  followUpBox: { flexDirection: 'row', alignItems: 'center', marginTop: 12, backgroundColor: '#E8F5E9', padding: 8, borderRadius: 4 },
  followUpText: { fontSize: 12, fontWeight: 'bold', color: '#388E3C', marginLeft: 6 },
  expandHint: { fontSize: 11, color: '#1B6CA8', marginTop: 12, textAlign: 'center', fontStyle: 'italic' }
});
