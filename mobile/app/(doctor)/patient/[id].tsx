import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import clinicianApi from '../../../services/clinicianApi';
import AISummaryCard from '../../../components/AISummaryCard';
import VisitCard from '../../../components/VisitCard'; // Reusing phase 2/3 component
import MedicineCard from '../../../components/MedicineCard';
import { useClinicianStore } from '../../../store/clinicianStore';

export default function PatientDetail() {
  const { id } = useLocalSearchParams();
  const [record, setRecord] = useState<any>(null);
  const [summary, setSummary] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'history' | 'meds' | 'labs'>('history');
  
  const { setActiveVisitId, activePatient } = useClinicianStore();

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [recordData, summaryData] = await Promise.all([
        clinicianApi.getPatientRecord(id as string),
        clinicianApi.getPatientSummary(id as string)
      ]);
      setRecord(recordData);
      setSummary(summaryData.summary);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const startConsultation = async () => {
    try {
      const visit = await clinicianApi.startVisit({
        patient_id: id as string,
        chief_complaint: activePatient?.chief_complaint || 'General Checkup',
        referral_id: activePatient?.referral_id
      });
      setActiveVisitId(visit.id);
      router.push(`/(doctor)/consultation/${visit.id}`);
    } catch (e) {
      console.error(e);
    }
  };

  if (isLoading) return (
    <View style={styles.loader}>
      <ActivityIndicator size="large" color="#1B6CA8" />
    </View>
  );

  const profile = record?.profile;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.appBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.appBarTitle}>Patient Record</Text>
        <TouchableOpacity onPress={fetchData}>
          <Ionicons name="refresh" size={20} color="#1B6CA8" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Patient Profile Header */}
        <View style={styles.profileSection}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{profile.name}</Text>
            <View style={styles.genderBadge}>
              <Text style={styles.genderText}>{profile.gender.charAt(0)}</Text>
            </View>
          </View>
          
          <View style={styles.idRow}>
            <Text style={styles.idLabel}>ABHA:</Text>
            <Text style={styles.idValue}>{profile.abha_number || 'Not assigned'}</Text>
          </View>

          <View style={styles.basicsContainer}>
            <View style={styles.basicItem}>
              <Text style={styles.basicLabel}>AGE</Text>
              <Text style={styles.basicValue}>{new Date().getFullYear() - parseInt(profile.date_of_birth.split('-')[0])}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.basicItem}>
              <Text style={styles.basicLabel}>BLOOD</Text>
              <Text style={styles.basicValue}>{profile.blood_group || '--'}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.basicItem}>
              <Text style={styles.basicLabel}>ALLERGIES</Text>
              <Text style={[styles.basicValue, { color: profile.allergies?.length > 0 ? '#EF4444' : '#22C55E' }]}>
                {profile.allergies?.length || 0}
              </Text>
            </View>
          </View>
        </View>

        {/* ASHA Field Referral Section (Connection 1) */}
        {record?.active_referral && (
          <View style={styles.referralCard}>
            <View style={styles.referralHeader}>
              <Ionicons name="link" size={18} color="#D35400" />
              <Text style={styles.referralTitle}>🔗 ASHA Field Referral</Text>
            </View>
            <View style={styles.referralInfoRow}>
              <Text style={styles.referralSub}>Referred by: {record.active_referral.from_worker_name || 'Unknown'}</Text>
              <Text style={styles.referralSub}>Sent: {new Date(record.active_referral.created_at).toLocaleDateString()}</Text>
            </View>
            
            <Text style={styles.fieldFindingsTitle}>Field Findings:</Text>
            <View style={styles.findingsGrid}>
              {Object.entries(record.active_referral.asha_observations || {}).map(([key, val]: any) => (
                <View key={key} style={styles.findingItem}>
                  <Text style={styles.findingLabel}>• {key.replace(/_/g, ' ')}: </Text>
                  <Text style={styles.findingValue}>{String(val)}</Text>
                </View>
              ))}
            </View>
            
            <View style={styles.ashaNoteBox}>
              <Text style={styles.ashaNoteText}>
                "ASHA Note: {record.active_referral.ai_summary || record.active_referral.notes || 'Patient needs immediate review.'}"
              </Text>
            </View>
          </View>
        )}

        {/* Consent Banner (Connection 6) */}
        {record?.consent_status !== 'granted' && (
          <View style={styles.consentBanner}>
            <Ionicons name="alert-circle" size={20} color="#92400E" />
            <Text style={styles.consentBannerText}>
              No consent on record. Viewing limited info.
            </Text>
            <TouchableOpacity onPress={fetchData} style={styles.refreshBadge}>
              <Text style={styles.refreshBadgeText}>REFRESH</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* AI Summary */}
        <AISummaryCard summary={summary} />

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {['history', 'meds', 'labs'].map((tab) => (
            <TouchableOpacity 
              key={tab} 
              onPress={() => setActiveTab(tab as any)}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'history' && (
            <View>
              {/* ASHA Field Visits (Connection 7) */}
              {record.asha_visit_history?.length > 0 && (
                <View style={styles.ashaHistorySection}>
                  <Text style={styles.subSectionTitle}>ASHA Field History</Text>
                  {record.asha_visit_history.map((av: any) => (
                    <View key={av.id} style={[styles.ashaHistoryCard, { borderLeftColor: av.risk_level === 'red' ? '#EF4444' : av.risk_level === 'amber' ? '#F59E0B' : '#22C55E' }]}>
                      <View style={styles.ashaHistoryHeader}>
                        <Text style={styles.ashaHistoryDate}>{new Date(av.created_at).toLocaleDateString()}</Text>
                        <View style={[styles.riskSmallBadge, { backgroundColor: av.risk_level === 'red' ? '#FEE2E2' : av.risk_level === 'amber' ? '#FEF3C7' : '#DCFCE7' }]}>
                          <Text style={[styles.riskSmallText, { color: av.risk_level === 'red' ? '#B91C1C' : av.risk_level === 'amber' ? '#92400E' : '#166534' }]}>
                            {av.risk_level.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.ashaHistoryBy}>By: {av.worker_name || 'ASHA Worker'}</Text>
                      <Text style={styles.ashaHistoryFindings}>{av.ai_reasoning || 'Regular field visit.'}</Text>
                    </View>
                  ))}
                  <View style={styles.historyDivider} />
                </View>
              )}

              {record.visits?.length > 0 ? (
                record.visits.map((visit: any) => <VisitCard key={visit.id} visit={visit} />)
              ) : <Text style={styles.emptyText}>No previous visits</Text>}
            </View>
          )}

          {activeTab === 'meds' && (
            record.current_medications?.length > 0 ? (
              record.current_medications.map((med: any, i: number) => <MedicineCard key={i} medicine={med} />)
            ) : <Text style={styles.emptyText}>No active medications</Text>
          )}

          {activeTab === 'labs' && (
            <Text style={styles.emptyText}>Lab Results coming soon</Text>
          )}
        </View>
      </ScrollView>

      {/* Action Button */}
      <View style={styles.actionContainer}>
        <TouchableOpacity style={styles.consultButton} onPress={startConsultation}>
          <Ionicons name="stethoscope" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.consultButtonText}>START CONSULTATION</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  appBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  profileSection: {
    marginBottom: 20,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  name: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: 'Mukta_800ExtraBold',
  },
  genderBadge: {
    backgroundColor: '#F1F5F9',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  idRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 20,
  },
  idLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  idValue: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  basicsContainer: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  basicItem: {
    alignItems: 'center',
  },
  basicLabel: {
    fontSize: 9,
    color: '#94A3B8',
    fontWeight: '800',
    marginBottom: 4,
  },
  basicValue: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '700',
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#1B6CA8',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  activeTabText: {
    color: '#1B6CA8',
  },
  tabContent: {
    minHeight: 200,
  },
  emptyText: {
    textAlign: 'center',
    color: '#94A3B8',
    marginTop: 40,
    fontSize: 14,
  },
  actionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  consultButton: {
    backgroundColor: '#D35400',
    padding: 18,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D35400',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  consultButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  // Referral Card Styles
  referralCard: {
    backgroundColor: '#FFF8E7',
    borderWidth: 1,
    borderColor: '#F39C12',
    borderLeftWidth: 5,
    borderLeftColor: '#E8813A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  referralHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  referralTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#D35400',
  },
  referralInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  referralSub: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '600',
  },
  fieldFindingsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
  },
  findingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  findingItem: {
    flexDirection: 'row',
  },
  findingLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  findingValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  ashaNoteBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F39C1233',
  },
  ashaNoteText: {
    fontSize: 13,
    color: '#4B5563',
    fontStyle: 'italic',
  },
  // Consent Banner
  consentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  consentBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
    marginLeft: 8,
  },
  refreshBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  refreshBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
  },
  // History Section
  ashaHistorySection: {
    marginBottom: 24,
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  ashaHistoryCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  ashaHistoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  ashaHistoryDate: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '700',
  },
  riskSmallBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  riskSmallText: {
    fontSize: 9,
    fontWeight: '800',
  },
  ashaHistoryBy: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  ashaHistoryFindings: {
    fontSize: 13,
    color: '#64748B',
  },
  historyDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginTop: 12,
  }
});
