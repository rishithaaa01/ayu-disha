import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput, Alert
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useClinicianStore } from '../../../store/clinicianStore';
import clinicianApi from '../../../services/clinicianApi';
import api from '../../../services/api';
import { Colors } from '../../../constants/colors';

export default function PatientDetailScreen() {
  const { id: patient_id } = useLocalSearchParams();
  const activePatient = useClinicianStore((state) => state.activePatient);
  const [patient, setPatient] = useState<any>(null);
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // AI Features
  const [aiSummary, setAiSummary] = useState<any>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [differential, setDifferential] = useState<any[]>([]);
  const [differentialLoading, setDifferentialLoading] = useState(false);
  const [symptoms, setSymptoms] = useState('');
  const [activeTab, setActiveTab] = useState<'summary' | 'history' | 'differential'>('summary');

  const loadData = async () => {
    try {
      const recordRes = await clinicianApi.getPatientRecord(patient_id as string);
      setPatient(recordRes.profile);
      setVisits(recordRes.visits || []);
      
      // Extract symptoms from active patient or recent visit
      if (activePatient?.chief_complaint) {
        setSymptoms(activePatient.chief_complaint);
      } else if (recordRes.visits?.[0]?.chief_complaint) {
        setSymptoms(recordRes.visits[0].chief_complaint);
      }
      
      // Load AI summary
      await loadAISummary();
    } catch (err) {
      console.error('Failed to load patient:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadAISummary = async () => {
    setSummaryLoading(true);
    try {
      const res = await api.get(`/clinician/patient-summary/${patient_id}`);
      setAiSummary(res.data);
    } catch (err) {
      console.error('Failed to load AI summary:', err);
    } finally {
      setSummaryLoading(false);
    }
  };

  const loadDifferentialDiagnosis = async () => {
    if (!symptoms.trim()) {
      Alert.alert('Required', 'Please enter symptoms first');
      return;
    }

    setDifferentialLoading(true);
    try {
      const res = await api.get(`/clinician/differential`, {
        params: {
          symptoms: symptoms.trim(),
          patient_id: patient_id
        }
      });
      setDifferential(res.data.diagnoses || []);
    } catch (err: any) {
      console.error('Failed to load differential:', err);
      Alert.alert('Error', err.response?.data?.detail || 'Failed to generate differential diagnosis');
    } finally {
      setDifferentialLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [patient_id]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const startConsultation = async () => {
    try {
      const visit = await clinicianApi.startVisit({
        patient_id: patient_id as string,
        chief_complaint: symptoms || activePatient?.chief_complaint || 'General Checkup',
        referral_id: activePatient?.referral_id
      });
      router.push(`/(doctor)/consultation/${visit.id}`);
    } catch (err) {
      console.error('Failed to start consultation:', err);
      Alert.alert('Error', 'Failed to start consultation');
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence?.toLowerCase()) {
      case 'high': return '#10B981';
      case 'medium': return '#F59E0B';
      case 'low': return '#6B7280';
      default: return Colors.textMuted;
    }
  };

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
        <Text style={styles.headerTitle}>Patient Record</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Patient Info Card */}
      <View style={styles.patientCard}>
        <View style={styles.patientAvatar}>
          <Ionicons name="person" size={32} color={Colors.white} />
        </View>
        <View style={styles.patientInfo}>
          <Text style={styles.patientName}>{patient?.name}</Text>
          {patient?.abha_number && (
            <Text style={styles.patientAbha}>ABHA: {patient.abha_number}</Text>
          )}
          <View style={styles.patientMeta}>
            {patient?.blood_group && (
              <View style={styles.bloodBadge}>
                <Text style={styles.bloodText}>{patient.blood_group}</Text>
              </View>
            )}
            {patient?.allergies?.length > 0 && (
              <View style={styles.allergyBadge}>
                <Ionicons name="alert-circle" size={12} color="#DC2626" />
                <Text style={styles.allergyBadgeText}>{patient.allergies.length} Allergies</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'summary' && styles.tabActive]}
          onPress={() => setActiveTab('summary')}
        >
          <MaterialCommunityIcons
            name="sparkles"
            size={18}
            color={activeTab === 'summary' ? Colors.primary : Colors.textMuted}
          />
          <Text style={[styles.tabText, activeTab === 'summary' && styles.tabTextActive]}>
            AI Summary
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
        >
          <Ionicons
            name="document-text-outline"
            size={18}
            color={activeTab === 'history' ? Colors.primary : Colors.textMuted}
          />
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
            History
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'differential' && styles.tabActive]}
          onPress={() => setActiveTab('differential')}
        >
          <MaterialCommunityIcons
            name="stethoscope"
            size={18}
            color={activeTab === 'differential' ? Colors.primary : Colors.textMuted}
          />
          <Text style={[styles.tabText, activeTab === 'differential' && styles.tabTextActive]}>
            Differential
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* AI Summary Tab */}
        {activeTab === 'summary' && (
          <View style={styles.tabContent}>
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <MaterialCommunityIcons name="sparkles" size={20} color={Colors.primary} />
                  <Text style={styles.summaryTitle}>AI Pre-Consultation Summary</Text>
                </View>
                <TouchableOpacity onPress={loadAISummary}>
                  <Ionicons name="refresh" size={18} color={Colors.primary} />
                </TouchableOpacity>
              </View>

              {summaryLoading ? (
                <View>
                  <View style={[styles.skeletonLine, { width: '100%' }]} />
                  <View style={[styles.skeletonLine, { width: '90%' }]} />
                  <View style={[styles.skeletonLine, { width: '70%' }]} />
                </View>
              ) : aiSummary?.summary ? (
                <>
                  <Text style={styles.summaryText}>{aiSummary.summary}</Text>
                  {aiSummary.consent !== undefined && (
                    <View style={[styles.consentBadge, { backgroundColor: aiSummary.consent ? '#D1FAE5' : '#FEF3C7' }]}>
                      <Ionicons
                        name={aiSummary.consent ? 'shield-checkmark' : 'shield-outline'}
                        size={14}
                        color={aiSummary.consent ? '#059669' : '#D97706'}
                      />
                      <Text style={[styles.consentText, { color: aiSummary.consent ? '#059669' : '#D97706' }]}>
                        {aiSummary.consent ? 'Full History Access' : 'Limited - No Consent'}
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                <Text style={styles.emptyText}>Could not generate summary. Try refreshing.</Text>
              )}

              <View style={styles.disclaimerBox}>
                <Ionicons name="information-circle-outline" size={14} color={Colors.textMuted} />
                <Text style={styles.disclaimerText}>
                  AI suggestion only. Always verify clinically.
                </Text>
              </View>
            </View>

            {/* Allergies Section */}
            {patient?.allergies?.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Allergies</Text>
                <View style={styles.allergyList}>
                  {patient.allergies.map((allergy: string, idx: number) => (
                    <View key={idx} style={styles.allergyItem}>
                      <Ionicons name="alert-circle" size={16} color="#DC2626" />
                      <Text style={styles.allergyItemText}>{allergy}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Visit History</Text>
            {visits.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="document-text-outline" size={48} color={Colors.textMuted} />
                <Text style={styles.emptyText}>No visit history available</Text>
              </View>
            ) : (
              visits.map((visit, idx) => (
                <View key={idx} style={styles.visitCard}>
                  <View style={styles.visitHeader}>
                    <Text style={styles.visitDate}>
                      {new Date(visit.date).toLocaleDateString()}
                    </Text>
                    {visit.risk_tag && (
                      <View style={[styles.riskBadge, { backgroundColor: visit.risk_tag === 'urgent' ? '#FEE2E2' : visit.risk_tag === 'watch' ? '#FEF3C7' : '#D1FAE5' }]}>
                        <Text style={[styles.riskText, { color: visit.risk_tag === 'urgent' ? '#DC2626' : visit.risk_tag === 'watch' ? '#D97706' : '#059669' }]}>
                          {visit.risk_tag.toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.visitHospital}>{visit.hospital_name}</Text>
                  <Text style={styles.visitDoctor}>{visit.doctor_name}</Text>
                  {visit.chief_complaint && (
                    <Text style={styles.visitComplaint}>{visit.chief_complaint}</Text>
                  )}
                  {visit.diagnosis?.length > 0 && (
                    <View style={styles.diagnosisRow}>
                      {visit.diagnosis.map((diag: string, i: number) => (
                        <View key={i} style={styles.diagnosisTag}>
                          <Text style={styles.diagnosisText}>{diag}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {/* Differential Diagnosis Tab */}
        {activeTab === 'differential' && (
          <View style={styles.tabContent}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Enter Symptoms</Text>
              <TextInput
                style={styles.symptomsInput}
                placeholder="E.g., fever, cough, headache..."
                value={symptoms}
                onChangeText={setSymptoms}
                multiline
                numberOfLines={3}
              />
              <TouchableOpacity
                style={styles.analyzeButton}
                onPress={loadDifferentialDiagnosis}
                disabled={differentialLoading}
              >
                {differentialLoading ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <>
                    <MaterialCommunityIcons name="sparkles" size={20} color={Colors.white} />
                    <Text style={styles.analyzeButtonText}>Generate Differential</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {differential.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>AI Differential Diagnosis</Text>
                {differential.map((diag, idx) => (
                  <View key={idx} style={styles.differentialCard}>
                    <View style={styles.differentialHeader}>
                      <Text style={styles.differentialName}>{diag.name}</Text>
                      <View style={[styles.confidenceBadge, { backgroundColor: getConfidenceColor(diag.confidence) + '20' }]}>
                        <Text style={[styles.confidenceText, { color: getConfidenceColor(diag.confidence) }]}>
                          {diag.confidence}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.differentialReasoning}>{diag.reasoning}</Text>
                    {diag.suggested_tests?.length > 0 && (
                      <View style={styles.testsSection}>
                        <Text style={styles.testsLabel}>Suggested Tests:</Text>
                        <View style={styles.testsRow}>
                          {diag.suggested_tests.map((test: string, i: number) => (
                            <View key={i} style={styles.testTag}>
                              <Ionicons name="flask-outline" size={12} color={Colors.primary} />
                              <Text style={styles.testText}>{test}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}

            {differential.length === 0 && !differentialLoading && (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="stethoscope" size={48} color={Colors.textMuted} />
                <Text style={styles.emptyText}>Enter symptoms and generate differential</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Start Consultation Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.consultButton} onPress={startConsultation}>
          <MaterialCommunityIcons name="clipboard-pulse" size={20} color={Colors.white} />
          <Text style={styles.consultButtonText}>Start Consultation</Text>
        </TouchableOpacity>
      </View>
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
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  patientAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  patientInfo: { flex: 1 },
  patientName: { fontSize: 18, fontWeight: 'bold', color: Colors.textDark },
  patientAbha: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  patientMeta: { flexDirection: 'row', gap: 8, marginTop: 8 },
  bloodBadge: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bloodText: { color: Colors.white, fontSize: 11, fontWeight: 'bold' },
  allergyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  allergyBadgeText: { fontSize: 11, color: '#DC2626', fontWeight: '600' },
  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  tabActive: { backgroundColor: Colors.primaryLight },
  tabText: { fontSize: 12, fontWeight: '600', color: Colors.textMuted },
  tabTextActive: { color: Colors.primary },
  content: { flex: 1 },
  tabContent: { padding: 16 },
  summaryCard: {
    backgroundColor: '#E8F4FD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryTitle: { fontSize: 14, fontWeight: 'bold', color: Colors.textDark },
  summaryText: { fontSize: 14, color: Colors.textDark, lineHeight: 20, marginBottom: 12 },
  consentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  consentText: { fontSize: 11, fontWeight: 'bold' },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.white + '40',
  },
  disclaimerText: { fontSize: 10, color: Colors.textMuted, fontStyle: 'italic', flex: 1 },
  skeletonLine: {
    height: 14,
    backgroundColor: Colors.white + '60',
    borderRadius: 4,
    marginVertical: 4,
  },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.textDark, marginBottom: 12 },
  allergyList: { gap: 8 },
  allergyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
  },
  allergyItemText: { fontSize: 14, color: '#DC2626', fontWeight: '600' },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: Colors.white,
    borderRadius: 12,
  },
  emptyText: { fontSize: 14, color: Colors.textMuted, marginTop: 8, textAlign: 'center' },
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
    marginBottom: 8,
  },
  visitDate: { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  riskBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  riskText: { fontSize: 10, fontWeight: 'bold' },
  visitHospital: { fontSize: 15, fontWeight: 'bold', color: Colors.textDark, marginBottom: 2 },
  visitDoctor: { fontSize: 13, color: Colors.textMuted, marginBottom: 8 },
  visitComplaint: { fontSize: 13, color: Colors.textDark, fontStyle: 'italic', marginBottom: 8 },
  diagnosisRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  diagnosisTag: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  diagnosisText: { fontSize: 11, color: Colors.primary, fontWeight: '600' },
  symptomsInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    backgroundColor: Colors.white,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    padding: 14,
    borderRadius: 12,
  },
  analyzeButtonText: { color: Colors.white, fontSize: 14, fontWeight: 'bold' },
  differentialCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  differentialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  differentialName: { fontSize: 16, fontWeight: 'bold', color: Colors.textDark, flex: 1 },
  confidenceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceText: { fontSize: 11, fontWeight: 'bold' },
  differentialReasoning: {
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 20,
    marginBottom: 12,
  },
  testsSection: { marginTop: 8 },
  testsLabel: { fontSize: 11, fontWeight: 'bold', color: Colors.textMuted, marginBottom: 8 },
  testsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  testTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.background,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  testText: { fontSize: 11, color: Colors.textDark, fontWeight: '600' },
  footer: {
    padding: 16,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  consultButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 12,
  },
  consultButtonText: { color: Colors.white, fontSize: 16, fontWeight: 'bold' },
});
