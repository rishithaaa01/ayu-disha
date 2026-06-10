import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getMyStats } from '../../services/ashaApi';
import SyncIndicator from '../../components/SyncIndicator';
import { useAuthStore } from '../../store/authStore';

export default function AshaProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await getMyStats();
      setStats(data);
    } catch (e) {
      console.warn("Failed to load stats", e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: async () => {
        await useAuthStore.getState().logout();
        router.replace('/(auth)/welcome');
      }}
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Worker Profile</Text>
        <SyncIndicator />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
             <Text style={styles.avatarText}>
               {user?.name ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : '?'}
             </Text>
          </View>
          <View style={styles.profileMeta}>
             <Text style={styles.name}>{user?.name || '—'}</Text>
             <Text style={styles.metaRow}>Mobile: {user?.mobile || '—'}</Text>
             <Text style={styles.metaRow}>{user?.village ? `${user.village} • ` : ''}{user?.district || '—'}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Performance This Month</Text>

        {loading ? <ActivityIndicator size="large" color="#1B6CA8" /> : stats && (
          <View style={styles.statsGrid}>
             <View style={styles.statBox}>
                <Text style={styles.statNum}>{stats.total_households}</Text>
                <Text style={styles.statLabel}>Households</Text>
             </View>
             <View style={styles.statBox}>
                <Text style={styles.statNum}>{stats.visits_this_month}</Text>
                <Text style={styles.statLabel}>Visits Done</Text>
             </View>
             <View style={styles.statBox}>
                <Text style={styles.statNum}>{stats.referrals_sent_this_month}</Text>
                <Text style={styles.statLabel}>Referrals Sent</Text>
             </View>
             <View style={styles.statBox}>
                <Text style={[styles.statNum, {color: '#D32F2F'}]}>{stats.urgent_cases_detected}</Text>
                <Text style={styles.statLabel}>Urgent Found</Text>
             </View>
          </View>
        )}

        <View style={styles.syncCard}>
           <Text style={styles.syncTitle}>Offline Sync Status</Text>
           <Text style={styles.syncText}>Pending Offline Records: 0</Text>
           <Text style={styles.syncText}>Last synced: Just now</Text>
           <TouchableOpacity style={styles.syncBtn}>
              <Text style={styles.syncBtnText}>Force Manual Sync</Text>
           </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F3EE' },
  header: { backgroundColor: '#1B6CA8', padding: 16, paddingTop: 48, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  content: { padding: 16 },
  profileCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 24, elevation: 2 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#1B6CA8', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  avatarText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  profileMeta: { flex: 1 },
  name: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  metaRow: { fontSize: 13, color: '#666', marginTop: 2 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 16 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24 },
  statBox: { width: '48%', backgroundColor: '#fff', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12, elevation: 1 },
  statNum: { fontSize: 28, fontWeight: 'bold', color: '#1B6CA8' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 4, fontWeight: '600' },
  syncCard: { backgroundColor: '#E8F4FD', padding: 16, borderRadius: 12, marginBottom: 24 },
  syncTitle: { fontSize: 16, fontWeight: 'bold', color: '#1B6CA8', marginBottom: 8 },
  syncText: { fontSize: 14, color: '#666', marginBottom: 4 },
  syncBtn: { backgroundColor: '#fff', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 12, borderWidth: 1, borderColor: '#BBDEFB' },
  syncBtnText: { color: '#1B6CA8', fontWeight: 'bold' },
  logoutBtn: { backgroundColor: '#FFEBEE', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16, marginBottom: 40 },
  logoutText: { color: '#D32F2F', fontWeight: 'bold', fontSize: 16 }
});
