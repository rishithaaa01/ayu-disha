import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import patientApi from '../../services/patientApi';
import HealthCard from '../../components/HealthCard';
import LoadingSkeleton from '../../components/LoadingSkeleton';

export default function HomeScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [recentVisit, setRecentVisit] = useState<any>(null);
  const [healthSummary, setHealthSummary] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      setError('');
      const profData = await patientApi.getMyProfile();
      setProfile(profData);
      
      const visits = await patientApi.getMyVisits();
      if (visits && visits.length > 0) {
        setRecentVisit(visits[0]); // first is most recent since backend sorts
      }

      await fetchSummary();
    } catch (err: any) {
      console.error(err);
      setError('Failed to load data. Please ensure you are logged in offline via Dummy User.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const resp = await patientApi.getHealthSummary();
      setHealthSummary(resp.summary);
    } catch (err) {
      console.warn("Could not fetch AI summary", err);
      // Fallback
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Reload data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const speakSummaryText = () => {
    if (healthSummary) {
      Speech.speak(healthSummary, { language: 'en-IN', rate: 0.95 });
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logoText}>Ayu Disha</Text>
        <TouchableOpacity>
          <Ionicons name="notifications-outline" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Health Card */}
        {loading ? (
          <LoadingSkeleton height={140} borderRadius={12} style={{ marginBottom: 16 }} />
        ) : profile ? (
          <HealthCard
            name={profile.name}
            abhaNumber={profile.abha_number}
            bloodGroup={profile.blood_group}
            allergies={profile.allergies}
            lastVisit={recentVisit ? {
              hospitalName: recentVisit.hospital_name,
              date: typeof recentVisit.date === 'string' ? recentVisit.date.split('T')[0] : 'Recent'
            } : undefined}
          />
        ) : null}

        {/* AI Health Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <MaterialCommunityIcons name="sparkles" size={20} color="#1B6CA8" />
            <Text style={styles.summaryTitle}>Your Health Today</Text>
            <TouchableOpacity onPress={fetchSummary} style={styles.refreshIcon}>
              <Ionicons name="refresh" size={18} color="#1B6CA8" />
            </TouchableOpacity>
          </View>
          
          {loading ? (
            <View>
              <LoadingSkeleton height={16} width="100%" style={{ marginVertical: 4 }} />
              <LoadingSkeleton height={16} width="90%" style={{ marginVertical: 4 }} />
              <LoadingSkeleton height={16} width="70%" style={{ marginVertical: 4 }} />
            </View>
          ) : (
            <>
              <Text style={styles.summaryText}>
                {healthSummary || "No health summary available. Add more data to generate insights."}
              </Text>
              {healthSummary ? (
                <TouchableOpacity style={styles.speakConfig} onPress={speakSummaryText}>
                  <Ionicons name="volume-high" size={20} color="#1B6CA8" />
                  <Text style={styles.speakText}>Read Aloud</Text>
                </TouchableOpacity>
              ) : null}
            </>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(patient)/book-appointment')}>
            <MaterialCommunityIcons name="calendar-plus" size={32} color="#1B6CA8" />
            <Text style={styles.actionLabel}>Book Appointment</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(patient)/appointments')}>
            <MaterialCommunityIcons name="calendar-check" size={32} color="#1B6CA8" />
            <Text style={styles.actionLabel}>My Appointments</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(patient)/records')}>
            <MaterialCommunityIcons name="folder-text" size={32} color="#1B6CA8" />
            <Text style={styles.actionLabel}>My Records</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(patient)/medicines')}>
            <MaterialCommunityIcons name="pill" size={32} color="#1B6CA8" />
            <Text style={styles.actionLabel}>Medicines</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(patient)/tests')}>
            <FontAwesome5 name="flask" size={28} color="#1B6CA8" />
            <Text style={styles.actionLabel}>Lab Tests</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(patient)/consents')}>
            <MaterialCommunityIcons name="shield-check" size={32} color="#1B6CA8" />
            <Text style={styles.actionLabel}>Consents</Text>
          </TouchableOpacity>
        </View>

        {/* Upcoming Follow Up or Recent Visit */}
        {recentVisit && recentVisit.follow_up_date && new Date(recentVisit.follow_up_date) > new Date() && (
          <View style={styles.followUpBanner}>
            <Text style={styles.followUpTitle}>
              Follow-up due: {typeof recentVisit.follow_up_date === 'string' ? recentVisit.follow_up_date.split('T')[0] : 'Upcoming'}
            </Text>
            <Text style={styles.followUpSubtitle}>At {recentVisit.hospital_name}</Text>
          </View>
        )}

        {/* Recent Visit Card Summary */}
        {recentVisit && (
          <View style={styles.recentVisitWrapper}>
            <Text style={styles.sectionTitle}>Last Visit</Text>
            <View style={styles.miniVisitCard}>
              <Text style={styles.vHospital}>{recentVisit.hospital_name}</Text>
              <Text style={styles.vDoctor}>{recentVisit.doctor_name}</Text>
              <Text style={styles.vDate}>{typeof recentVisit.date === 'string' ? recentVisit.date.split('T')[0] : ''}</Text>
              <View style={styles.vTags}>
                {recentVisit.diagnosis?.map((d: string, i: number) => (
                  <View key={i} style={styles.vTag}><Text style={styles.vTagText}>{d}</Text></View>
                ))}
              </View>
            </View>
            <TouchableOpacity onPress={() => router.push('/(patient)/records')}>
              <Text style={styles.viewAllText}>View all visits</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{height: 40}} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    backgroundColor: '#1B6CA8',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoText: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 16,
  },
  errorBox: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#D32F2F',
    fontWeight: '500',
  },
  summaryCard: {
    backgroundColor: '#E8F4FD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1B6CA8',
    marginLeft: 6,
    flex: 1,
  },
  refreshIcon: {
    padding: 4,
  },
  summaryText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
  },
  speakConfig: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: '#D1E6FA',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  speakText: {
    color: '#1B6CA8',
    fontWeight: '600',
    marginLeft: 4,
    fontSize: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  actionBtn: {
    width: '48%',
    backgroundColor: '#FFF',
    paddingVertical: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#eee',
  },
  actionLabel: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  followUpBanner: {
    backgroundColor: '#FFF8E1',
    padding: 16,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FFB300',
    marginBottom: 20,
  },
  followUpTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F57F17',
  },
  followUpSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  recentVisitWrapper: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  miniVisitCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  vHospital: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  vDoctor: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  vDate: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
  },
  vTags: {
    flexDirection: 'row',
    marginTop: 10,
    flexWrap: 'wrap',
  },
  vTag: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
  },
  vTagText: {
    fontSize: 12,
    color: '#555',
  },
  viewAllText: {
    color: '#1B6CA8',
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
  }
});
