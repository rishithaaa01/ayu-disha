import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, SafeAreaView, RefreshControl } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import { Colors } from '../../constants/colors';

export default function PHOHomeScreen() {
  const { user, logout } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('surveillance');
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [diseaseData, setDiseaseData] = useState<any[]>([]);
  const [ashaPerformance, setAshaPerformance] = useState<any[]>([]);
  const [healthAlerts, setHealthAlerts] = useState<any[]>([]);

  const loadData = async () => {
    try {
      const [statsRes, diseasesRes, ashaRes, alertsRes] = await Promise.all([
        api.get('/pho/stats'),
        api.get('/pho/disease-surveillance'),
        api.get('/pho/asha-performance'),
        api.get('/pho/alerts')
      ]);
      setStats(statsRes.data);
      setDiseaseData(diseasesRes.data || []);
      setAshaPerformance(ashaRes.data || []);
      setHealthAlerts(alertsRes.data || []);
    } catch (err) {
      console.error('Failed to load PHO data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Refresh every 2 minutes
    const interval = setInterval(loadData, 120000);
    return () => clearInterval(interval);
  }, []);

  // Reload data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleLogout = () => {
    logout();
    router.replace('/(auth)/welcome');
  };

  const StatCard = ({ title, value, icon, color, alert }: any) => (
    <View style={[styles.statCard, alert && styles.statCardAlert]}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value ?? '—'}</Text>
        <Text style={styles.statTitle}>{title}</Text>
        {alert && (
          <View style={styles.alertBadge}>
            <Ionicons name="warning" size={10} color={Colors.error} />
            <Text style={styles.alertText}>Alert</Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.headerIcon, { backgroundColor: '#2C8C68' }]}>
            <Ionicons name="map" size={24} color={Colors.white} />
          </View>
          <View>
            <Text style={styles.headerTitle}>PHO Dashboard</Text>
            <Text style={styles.headerSubtitle}>{user?.name}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color={Colors.error} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#2C8C68']} />}
      >
        {/* Key Metrics */}
        <View style={styles.statsGrid}>
          {isLoading ? (
            <ActivityIndicator size="large" color="#2C8C68" style={{ marginVertical: 40 }} />
          ) : (
            <>
              <StatCard title="Population Covered" value={stats?.total_population_covered?.toLocaleString()} icon="people" color="#1B6CA8" />
              <StatCard title="ASHA Workers" value={stats?.active_asha_workers} icon="shield-checkmark" color="#2C8C68" />
              <StatCard title="High-Risk Households" value={stats?.high_risk_households} icon="warning" color="#EF4444" alert={stats?.high_risk_households > 30} />
              <StatCard title="Disease Alerts" value={stats?.disease_alerts} icon="pulse" color="#F59E0B" alert={stats?.disease_alerts > 0} />
            </>
          )}
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {['surveillance', 'asha', 'alerts'].map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        {activeTab === 'surveillance' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Disease Surveillance</Text>
            {diseaseData.length === 0 ? (
              <Text style={styles.emptyText}>No disease data available</Text>
            ) : (
              diseaseData.map((d: any, i: number) => (
                <View key={i} style={styles.diseaseItem}>
                  <View style={styles.diseaseLeft}>
                    <Text style={styles.diseaseName}>{d.name}</Text>
                    <Text style={styles.diseaseMeta}>{d.district}</Text>
                  </View>
                  <View style={styles.diseaseRight}>
                    <Text style={[styles.diseaseCases, d.cases > 100 ? { color: Colors.error } : d.cases > 20 ? { color: Colors.warning } : { color: Colors.success }]}>
                      {d.cases}
                    </Text>
                    <View style={[styles.trendBadge, { backgroundColor: d.trend === 'up' ? '#FEE2E2' : d.trend === 'down' ? '#D1FAE5' : '#F3F4F6' }]}>
                      <Text style={[styles.trendText, { color: d.trend === 'up' ? '#991B1B' : d.trend === 'down' ? '#065F46' : '#6B7280' }]}>
                        {d.trend === 'up' ? '↑' : d.trend === 'down' ? '↓' : '→'}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'asha' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>ASHA Worker Performance</Text>
            {ashaPerformance.length === 0 ? (
              <Text style={styles.emptyText}>No ASHA workers found</Text>
            ) : (
              ashaPerformance.map((worker: any, i: number) => (
                <View key={i} style={styles.workerItem}>
                  <View style={styles.workerLeft}>
                    <Text style={styles.workerName}>{worker.name}</Text>
                    <Text style={styles.workerMeta}>{worker.village} · {worker.visits} visits · {worker.referrals} referrals</Text>
                  </View>
                  <Text style={[styles.workerScore, { color: worker.score >= 90 ? Colors.success : worker.score >= 80 ? Colors.warning : Colors.error }]}>
                    {worker.score}/100
                  </Text>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'alerts' && (
          <View style={styles.section}>
            {healthAlerts.length === 0 ? (
              <View style={styles.card}>
                <Ionicons name="checkmark-circle" size={48} color={Colors.success} style={{ alignSelf: 'center', marginBottom: 12 }} />
                <Text style={styles.emptyTitle}>No Active Alerts</Text>
                <Text style={styles.emptyText}>All households and referrals are under control</Text>
              </View>
            ) : (
              healthAlerts.map((alert: any, i: number) => (
                <View key={i} style={[styles.alertCard, alert.severity === 'high' ? styles.alertCardHigh : styles.alertCardMedium]}>
                  <View style={styles.alertHeader}>
                    <View style={[styles.alertIcon, { backgroundColor: alert.severity === 'high' ? '#FEE2E2' : '#FEF3C7' }]}>
                      <Ionicons name="warning" size={18} color={alert.severity === 'high' ? '#991B1B' : '#92400E'} />
                    </View>
                    <View style={styles.alertInfo}>
                      <Text style={styles.alertTitle}>{alert.title}</Text>
                      <Text style={styles.alertMeta}>{alert.district} · {alert.time}</Text>
                    </View>
                    <View style={[styles.severityBadge, { backgroundColor: alert.severity === 'high' ? '#FEE2E2' : '#FEF3C7' }]}>
                      <Text style={[styles.severityText, { color: alert.severity === 'high' ? '#991B1B' : '#92400E' }]}>
                        {alert.severity.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.alertDesc}>{alert.desc}</Text>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: '#2C8C68', padding: 20, paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.white },
  headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  logoutButton: { padding: 8 },
  content: { flex: 1 },
  statsGrid: { padding: 16, gap: 12 },
  statCard: { backgroundColor: Colors.white, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  statCardAlert: { borderLeftWidth: 4, borderLeftColor: Colors.error },
  statIcon: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  statContent: { flex: 1 },
  statValue: { fontSize: 24, fontWeight: 'bold', color: Colors.textDark },
  statTitle: { fontSize: 12, fontWeight: '600', color: Colors.textMuted, marginTop: 2 },
  alertBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  alertText: { fontSize: 10, fontWeight: 'bold', color: Colors.error },
  tabs: { flexDirection: 'row', padding: 16, gap: 8 },
  tab: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: Colors.white, alignItems: 'center' },
  tabActive: { backgroundColor: '#2C8C68' },
  tabText: { fontSize: 13, fontWeight: '600', color: Colors.textDark },
  tabTextActive: { color: Colors.white },
  section: { padding: 16, gap: 12 },
  card: { backgroundColor: Colors.white, borderRadius: 16, padding: 16, marginHorizontal: 16, marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.textDark, marginBottom: 16 },
  emptyText: { textAlign: 'center', color: Colors.textMuted, fontSize: 14, paddingVertical: 20 },
  emptyTitle: { textAlign: 'center', color: Colors.textDark, fontSize: 16, fontWeight: '600', marginBottom: 8 },
  diseaseItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  diseaseLeft: { flex: 1 },
  diseaseName: { fontSize: 14, fontWeight: '600', color: Colors.textDark },
  diseaseMeta: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  diseaseRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  diseaseCases: { fontSize: 16, fontWeight: 'bold' },
  trendBadge: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  trendText: { fontSize: 11, fontWeight: 'bold' },
  workerItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  workerLeft: { flex: 1 },
  workerName: { fontSize: 14, fontWeight: '600', color: Colors.textDark },
  workerMeta: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  workerScore: { fontSize: 16, fontWeight: 'bold' },
  alertCard: { backgroundColor: Colors.white, borderRadius: 16, padding: 16, borderWidth: 2 },
  alertCardHigh: { borderColor: '#FEE2E2' },
  alertCardMedium: { borderColor: '#FEF3C7' },
  alertHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 12 },
  alertIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  alertInfo: { flex: 1 },
  alertTitle: { fontSize: 14, fontWeight: 'bold', color: Colors.textDark },
  alertMeta: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  severityBadge: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  severityText: { fontSize: 9, fontWeight: 'bold' },
  alertDesc: { fontSize: 13, color: Colors.textDark, lineHeight: 18 },
});
