import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, ActivityIndicator, RefreshControl, TextInput, Alert, Modal
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../../services/api';
import { Colors } from '../../constants/colors';
import * as Speech from 'expo-speech';

export default function PatientProfileScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [visits, setVisits] = useState<any[]>([]);
  const [healthSummary, setHealthSummary] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [showSymptomModal, setShowSymptomModal] = useState(false);
  const [symptomText, setSymptomText] = useState('');
  const [analyzingSymptom, setAnalyzingSymptom] = useState(false);
  const [symptomResult, setSymptomResult] = useState<any>(null);

  const loadData = async () => {
    try {
      const [profileRes, visitsRes] = await Promise.all([
        api.get('/patients/me'),
        api.get('/patients/me/visits')
      ]);
      setProfile(profileRes.data);
      setVisits(visitsRes.data || []);
      await loadHealthSummary();
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadHealthSummary = async () => {
    setSummaryLoading(true);
    try {
      const res = await api.get('/patients/me/health-summary');
      setHealthSummary(res.data.summary);
    } catch (err) {
      console.error('Failed to load health summary:', err);
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const speakSummary = () => {
    if (healthSummary) {
      Speech.speak(healthSummary, { language: 'en-IN', rate: 0.9 });
    }
  };

  const analyzeSymptoms = async () => {
    if (!symptomText.trim()) {
      Alert.alert('Required', 'Please describe your symptoms');
      return;
    }

    setAnalyzingSymptom(true);
    setSymptomResult(null);
    try {
      const res = await api.post('/patients/me/symptoms', {
        transcript: symptomText,
        preferred_hospital_id: profile?.hospital || 'Govt General Hospital Chennai'
      });
      setSymptomResult(res.data);
      loadHealthSummary(); // Refresh summary after logging
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to analyze symptoms');
    } finally {
      setAnalyzingSymptom(false);
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk?.toUpperCase()) {
      case 'SEVERE': return '#DC2626';
      case 'URGENT': return '#EF4444';
      case 'WATCH': return '#F59E0B';
      case 'LOW': return '#10B981';
      default: return Colors.textMuted;
    }
  };

  const SymptomLoggerModal = () => (
    <Modal visible={showSymptomModal} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Log Symptoms</Text>
            <TouchableOpacity onPress={() => {
              setShowSymptomModal(false);
              setSymptomText('');
              setSymptomResult(null);
            }}>
              <Ionicons name="close" size={24} color={Colors.textDark} />
            </TouchableOpacity>
          </View>

          {!symptomResult ? (
            <View style={styles.modalContent}>
              <Text style={styles.modalLabel}>Describe your symptoms</Text>
              <TextInput
                style={styles.symptomInput}
                placeholder="E.g., I have fever, headache, and body pain..."
                value={symptomText}
                onChangeText={setSymptomText}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={[styles.analyzeButton, analyzingSymptom && styles.analyzeButtonDisabled]}
                onPress={analyzeSymptoms}
                disabled={analyzingSymptom}
              >
                {analyzingSymptom ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <>
                    <MaterialCommunityIcons name="sparkles" size={20} color={Colors.white} />
                    <Text style={styles.analyzeButtonText}>Analyze with AI</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.modalContent}>
              <View style={[styles.resultCard, { backgroundColor: getRiskColor(symptomResult.risk_level) + '10' }]}>
                <View style={styles.resultHeader}>
                  <MaterialCommunityIcons
                    name={symptomResult.risk_level === 'SEVERE' || symptomResult.risk_level === 'URGENT' ? 'alert' : 'check-circle'}
                    size={32}
                    color={getRiskColor(symptomResult.risk_level)}
                  />
                  <Text style={[styles.resultRisk, { color: getRiskColor(symptomResult.risk_level) }]}>
                    {symptomResult.risk_level}
                  </Text>
                </View>

                <View style={styles.resultSection}>
                  <Text style={styles.resultSectionTitle}>Analysis:</Text>
                  <Text style={styles.resultText}>{symptomResult.reasoning}</Text>
                </View>

                {symptomResult.recommendation && (
                  <View style={styles.resultSection}>
                    <Text style={styles.resultSectionTitle}>Recommendation:</Text>
                    <Text style={styles.resultText}>{symptomResult.recommendation}</Text>
                  </View>
                )}

                {symptomResult.refer_to_doctor && (
                  <View style={styles.referralBanner}>
                    <Ionicons name="information-circle" size={20} color={Colors.primary} />
                    <Text style={styles.referralText}>
                      Auto-referral created for {symptomResult.target_speciality || 'General Medicine'}
                    </Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={styles.doneButton}
                onPress={() => {
                  setShowSymptomModal(false);
                  setSymptomText('');
                  setSymptomResult(null);
                }}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person" size={40} color={Colors.white} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile?.name}</Text>
            {profile?.abha_number && (
              <Text style={styles.profileAbha}>ABHA: {profile.abha_number}</Text>
            )}
            {profile?.blood_group && (
              <View style={styles.bloodGroupBadge}>
                <Text style={styles.bloodGroupText}>{profile.blood_group}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Allergies */}
        {profile?.allergies?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Allergies</Text>
            <View style={styles.tagsRow}>
              {profile.allergies.map((allergy: string, index: number) => (
                <View key={index} style={styles.allergyTag}>
                  <Ionicons name="alert-circle" size={14} color="#DC2626" />
                  <Text style={styles.allergyText}>{allergy}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* AI Health Summary */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MaterialCommunityIcons name="sparkles" size={20} color={Colors.primary} />
              <Text style={styles.sectionTitle}>AI Health Summary</Text>
            </View>
            <TouchableOpacity onPress={loadHealthSummary}>
              <Ionicons name="refresh" size={18} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.summaryCard}>
            {summaryLoading ? (
              <View>
                <View style={[styles.skeletonLine, { width: '100%' }]} />
                <View style={[styles.skeletonLine, { width: '90%' }]} />
                <View style={[styles.skeletonLine, { width: '70%' }]} />
              </View>
            ) : (
              <>
                <Text style={styles.summaryText}>
                  {healthSummary || 'No health summary available. Add more medical records to generate insights.'}
                </Text>
                {healthSummary && (
                  <TouchableOpacity style={styles.speakButton} onPress={speakSummary}>
                    <Ionicons name="volume-high" size={18} color={Colors.primary} />
                    <Text style={styles.speakText}>Read Aloud</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={styles.actionCard} onPress={() => setShowSymptomModal(true)}>
              <MaterialCommunityIcons name="stethoscope" size={28} color={Colors.primary} />
              <Text style={styles.actionLabel}>Log Symptoms</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(patient)/records')}>
              <MaterialCommunityIcons name="folder-text" size={28} color={Colors.primary} />
              <Text style={styles.actionLabel}>Medical Records</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(patient)/medicines')}>
              <MaterialCommunityIcons name="pill" size={28} color={Colors.primary} />
              <Text style={styles.actionLabel}>Medicines</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(patient)/tests')}>
              <MaterialCommunityIcons name="flask" size={28} color={Colors.primary} />
              <Text style={styles.actionLabel}>Lab Tests</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Visits */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Visits</Text>
            <TouchableOpacity onPress={() => router.push('/(patient)/records')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {visits.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No visits recorded yet</Text>
            </View>
          ) : (
            visits.slice(0, 3).map((visit) => (
              <View key={visit._id} style={styles.visitCard}>
                <View style={styles.visitHeader}>
                  <Text style={styles.visitHospital}>{visit.hospital_name}</Text>
                  <Text style={styles.visitDate}>
                    {new Date(visit.date).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={styles.visitDoctor}>{visit.doctor_name}</Text>
                {visit.diagnosis?.length > 0 && (
                  <View style={styles.diagnosisRow}>
                    {visit.diagnosis.map((diag: string, idx: number) => (
                      <View key={idx} style={styles.diagnosisTag}>
                        <Text style={styles.diagnosisText}>{diag}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <SymptomLoggerModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.textDark },
  content: { flex: 1 },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    padding: 20,
    margin: 16,
    borderRadius: 16,
  },
  avatarContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 22, fontWeight: 'bold', color: Colors.white, marginBottom: 4 },
  profileAbha: { fontSize: 13, color: Colors.white + 'CC', marginBottom: 8 },
  bloodGroupBadge: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  bloodGroupText: { color: Colors.white, fontSize: 12, fontWeight: 'bold' },
  section: { paddingHorizontal: 16, marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.textDark, marginBottom: 12 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  allergyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  allergyText: { fontSize: 13, color: '#DC2626', fontWeight: '600' },
  summaryCard: {
    backgroundColor: '#E8F4FD',
    borderRadius: 12,
    padding: 16,
  },
  summaryText: { fontSize: 14, color: Colors.textDark, lineHeight: 22 },
  speakButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  speakText: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  skeletonLine: {
    height: 14,
    backgroundColor: Colors.white + '60',
    borderRadius: 4,
    marginVertical: 4,
  },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard: {
    width: '48%',
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionLabel: { fontSize: 13, fontWeight: '600', color: Colors.textDark, textAlign: 'center' },
  viewAllText: { fontSize: 14, fontWeight: '600', color: Colors.primary },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: Colors.white,
    borderRadius: 12,
  },
  emptyText: { fontSize: 14, color: Colors.textMuted, marginTop: 8 },
  visitCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  visitHospital: { fontSize: 16, fontWeight: 'bold', color: Colors.textDark, flex: 1 },
  visitDate: { fontSize: 12, color: Colors.textMuted },
  visitDoctor: { fontSize: 14, color: Colors.textMuted, marginBottom: 8 },
  diagnosisRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  diagnosisTag: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  diagnosisText: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.textDark },
  modalContent: { padding: 20 },
  modalLabel: { fontSize: 14, fontWeight: '600', color: Colors.textDark, marginBottom: 8 },
  symptomInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    backgroundColor: Colors.background,
    minHeight: 150,
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  analyzeButtonDisabled: { opacity: 0.6 },
  analyzeButtonText: { color: Colors.white, fontSize: 16, fontWeight: 'bold' },
  resultCard: {
    borderRadius: 16,
    padding: 20,
  },
  resultHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  resultRisk: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  resultSection: { marginBottom: 16 },
  resultSectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: Colors.textDark,
    marginBottom: 6,
  },
  resultText: {
    fontSize: 14,
    color: Colors.textDark,
    lineHeight: 20,
  },
  referralBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primaryLight,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  referralText: {
    flex: 1,
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  doneButton: {
    backgroundColor: Colors.textDark,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  doneButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
