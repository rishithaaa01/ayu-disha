import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getHouseholdDetails, classifyRisk } from '../../services/ashaApi';
import { openDatabase } from '../../database/database-sqlite';
import { transcribe } from '../../services/voiceService';

export default function HouseholdScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [household, setHousehold] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadHousehold();
  }, [id]);

  const [reprocessing, setReprocessing] = useState<string | null>(null);

  const loadHousehold = async () => {
    try {
      setLoading(true);
      const db = await openDatabase();
      
      // 1. Try local SQLite first
      const localData: any[] = await db.getAllAsync(
        'SELECT * FROM asha_households WHERE id = ?', 
        [id!]
      );

      if (localData.length > 0) {
        const h = localData[0];
        
        // Fetch local visit history for this household
        // We check BOTH the current ID and the likely local temp ID format
        const localVisits: any[] = await db.getAllAsync(
          'SELECT * FROM asha_visits WHERE household_id = ? OR household_id = ? ORDER BY created_at DESC',
          [id!, id!.replace('h_', '')] // Cover both formats
        );

        setHousehold({
          ...h,
          members: h.members_json ? JSON.parse(h.members_json) : [],
          visit_history: localVisits,
          open_issues: []
        });
      } else {
        // 2. Fallback to API if not found locally
        const data = await getHouseholdDetails(id!);
        setHousehold(data);
      }
    } catch (e) {
      console.warn('Failed to load household details:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleReprocess = async (visitId: number, audioUri: string, member: any, observations: any) => {
    if (!audioUri) {
      Alert.alert('Missing Audio', 'This visit record has no local audio file to analyze. Please try recording a NEW offline visit.');
      return;
    }
    
    setReprocessing(String(visitId));
    try {
      console.log(`Reprocessing visit: ${visitId} with audio: ${audioUri}`);
      
      // 1. Transcribe audio
      const transcript = await transcribe(audioUri);
      if (!transcript) throw new Error('Could not extract audio or reach transcription server.');
      
      // 2. Classify risk
      const result = await classifyRisk({
        member_name: member.name,
        member_age: member.age,
        member_gender: member.gender,
        visit_type: 'Routine',
        observations: observations,
        transcript: transcript
      });

      // 3. Update local SQLite
      const db = await openDatabase();
      await db.runAsync(`
        UPDATE asha_visits 
        SET voice_notes = ?, risk_level = ?, ai_reasoning = ?, ai_recommendation = ?, offline_audio_uri = NULL 
        WHERE id = ?
      `, [transcript, result.risk_level, result.reasoning, result.recommendation, visitId]);

      // 4. Update household risk locally too
      const risk = result.risk_level === 'URGENT' ? 'red' : (result.risk_level === 'WATCH' ? 'amber' : 'green');
      await db.runAsync(`UPDATE asha_households SET risk_level = ?, last_visit_date = ? WHERE id = ?`, 
        [risk, new Date().toISOString(), id!]);

      // 5. Refresh
      loadHousehold();
      alert('AI Analysis Complete!');
    } catch (e: any) {
      alert(`AI Analysis failed: ${e.message}`);
    } finally {
      setReprocessing(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1B6CA8" />
      </View>
    );
  }

  if (!household) {
    return (
      <View style={styles.center}>
        <Text>Household not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{marginTop: 16}}>
          <Text style={{color: '#1B6CA8'}}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const getRiskBanner = () => {
    const risk = household.risk_level || 'green';
    if (risk === 'red') return { color: '#D32F2F', bg: '#FFEBEE', text: 'URGENT — Visit today' };
    if (risk === 'amber') return { color: '#F57C00', bg: '#FFF3E0', text: 'WATCH — Visit this week' };
    return { color: '#388E3C', bg: '#E8F5E9', text: 'UP TO DATE' };
  };
  const banner = getRiskBanner();

  return (
    <View style={styles.container}>
      {/* 1. Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{household.family_name}</Text>
      </View>

      {/* 2. Risk Banner */}
      <View style={[styles.riskBanner, { backgroundColor: banner.bg }]}>
        <Ionicons name="warning" size={20} color={banner.color} />
        <Text style={[styles.riskBannerText, { color: banner.color }]}>{banner.text}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* 5. Open Issues */}
        {household.open_issues?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Open Issues</Text>
            {household.open_issues.map((i: string, idx: number) => (
              <View key={idx} style={styles.issueCard}>
                <Ionicons name="alert-circle" size={16} color="#E65100" />
                <Text style={styles.issueText}>{i}</Text>
                <TouchableOpacity style={styles.resolveBtn}>
                  <Text style={styles.resolveBtnText}>Resolve</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* 3. Members List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Family Members ({household.members?.length || 0})</Text>
          {household.members?.map((member: any, idx: number) => (
            <View key={idx} style={styles.memberCard}>
              <View style={styles.memberHeader}>
                <View style={styles.avatar}>
                  <Ionicons name="person" size={20} color="#1B6CA8" />
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{member.name}</Text>
                  <Text style={styles.memberMeta}>{member.age} yrs • {member.gender}</Text>
                  {member.details && <Text style={styles.memberCondition}>{member.details}</Text>}
                </View>
              </View>
              <TouchableOpacity 
                style={styles.startVisitBtn}
                onPress={() => router.push(`/(asha)/visit-flow?household_id=${household.id}&member_id=${member.patient_id || member.name}&member_name=${member.name}&member_age=${member.age}&member_gender=${member.gender}`)}
              >
                <Ionicons name="pulse" size={18} color="#fff" style={{marginRight: 6}} />
                <Text style={styles.startVisitText}>Start Visit</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* 4. Visit History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Visits</Text>
          {household.visit_history?.length === 0 ? (
            <Text style={styles.emptyText}>No previous visits recorded.</Text>
          ) : (
            household.visit_history?.map((visit: any, idx: number) => (
              <View key={idx} style={styles.visitHistoryCard}>
                <Text style={styles.visitDate}>{new Date(visit.created_at).toLocaleDateString()}</Text>
                <Text style={styles.visitType}>{visit.visit_type} Visit — {visit.risk_level.toUpperCase()} risk</Text>
                <Text style={styles.visitDetails}>{visit.ai_recommendation}</Text>
                
                {visit.voice_notes && (
                  <View style={styles.voiceNoteContainer}>
                    <Ionicons name="mic" size={14} color="#666" />
                    <Text style={styles.voiceNoteText}>{visit.voice_notes}</Text>
                  </View>
                )}

                {/* Debug: console.log(`Visit ${visit.id} URI: ${visit.offline_audio_uri}`) */}
                {(visit.offline_audio_uri || (visit.ai_reasoning && visit.ai_reasoning.includes("Offline mode"))) && (
                  <TouchableOpacity 
                    style={styles.reprocessBtn} 
                    onPress={() => {
                      console.log("Starting reprocess for visit:", visit.id);
                      handleReprocess(
                        visit.id, 
                        visit.offline_audio_uri, 
                        { name: visit.member_id, age: 0, gender: 'Unknown' },
                        visit.observations_json ? JSON.parse(visit.observations_json) : {}
                      );
                    }}
                    disabled={reprocessing === String(visit.id)}
                  >
                    {reprocessing === String(visit.id) ? (
                      <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <ActivityIndicator size="small" color="#fff" />
                        <Text style={[styles.reprocessBtnText, {marginLeft: 8}]}>Analyzing...</Text>
                      </View>
                    ) : (
                      <>
                        <Ionicons name="sparkles" size={16} color="#fff" style={{marginRight: 6}} />
                        <Text style={styles.reprocessBtnText}>Get AI Insights (Now Online)</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </View>
        
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#F7F3EE'
  },
  container: {
    flex: 1,
    backgroundColor: '#F7F3EE',
  },
  header: {
    backgroundColor: '#1B6CA8',
    padding: 16,
    paddingTop: 48,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    paddingRight: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  riskBanner: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  riskBannerText: {
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  issueCard: {
    backgroundColor: '#FFF3E0',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#F57C00',
  },
  issueText: {
    flex: 1,
    marginLeft: 8,
    color: '#E65100',
    fontWeight: '500',
  },
  resolveBtn: {
    backgroundColor: '#F57C00',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  resolveBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  memberCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  memberHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F4FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  memberMeta: {
    color: '#666',
    marginTop: 2,
  },
  memberCondition: {
    color: '#D32F2F',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  startVisitBtn: {
    backgroundColor: '#1B6CA8',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  startVisitText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  visitHistoryCard: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#B0BEC5',
  },
  visitDate: {
    fontSize: 12,
    color: '#666',
  },
  visitType: {
    fontWeight: 'bold',
    marginTop: 4,
    color: '#333',
  },
  visitDetails: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  emptyText: {
    color: '#999',
    fontStyle: 'italic',
  },
  voiceNoteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  voiceNoteText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginLeft: 6,
    flex: 1,
  },
  reprocessBtn: {
    backgroundColor: '#1E88E5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  reprocessBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  }
});
