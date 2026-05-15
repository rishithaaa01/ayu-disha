import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { getMyStats, getHouseholds } from '../../services/ashaApi';
import SyncIndicator from '../../components/SyncIndicator';
import { openDatabase } from '../../database/database-sqlite';

export default function AshaHomeScreen() {
  const router = useRouter();
  const user = useAuthStore(state => state.user);
  const [stats, setStats] = useState<any>(null);
  const [urgentHouseholds, setUrgentHouseholds] = useState<any[]>([]);
  const [pendingOffline, setPendingOffline] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const loadData = async () => {
    try {
      // Load stats from backend
      const statsData = await getMyStats().catch(() => null);
      if (statsData) setStats(statsData);

      // Load urgent households from local SQLite (offline-first)
      const db = await openDatabase();
      const urgent = await db.getAllAsync<any>(
        `SELECT * FROM asha_households WHERE risk_level = 'red' ORDER BY last_visit_date ASC LIMIT 5`
      );
      setUrgentHouseholds(urgent || []);

      // Count pending offline visits
      const unsynced = await db.getAllAsync<any>(
        `SELECT COUNT(*) as count FROM asha_visits WHERE synced = 0`
      );
      setPendingOffline(unsynced?.[0]?.count || 0);
    } catch (e) {
      console.warn('Home: Failed to load data', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const initials = (name?: string) => {
    if (!name) return 'A';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()},</Text>
          <Text style={styles.name}>{user?.name || 'ASHA Worker'} 👋</Text>
        </View>
        <View style={styles.headerRight}>
          <SyncIndicator />
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(user?.name)}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >

        {/* Sync Alert Banner */}
        {pendingOffline > 0 && (
          <TouchableOpacity
            style={styles.syncBanner}
            onPress={() => router.push('/(asha)/village')}
          >
            <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
            <Text style={styles.syncBannerText}>
              {pendingOffline} offline visit{pendingOffline > 1 ? 's' : ''} waiting to sync • Tap to sync
            </Text>
          </TouchableOpacity>
        )}

        {/* Stats Row */}
        {loading ? (
          <ActivityIndicator size="large" color="#1B6CA8" style={{ marginVertical: 32 }} />
        ) : (
          <View style={styles.statsRow}>
            <StatCard icon="home-outline" label="Households" value={stats?.total_households ?? '--'} color="#1B6CA8" />
            <StatCard icon="clipboard-outline" label="Visits This Month" value={stats?.visits_this_month ?? '--'} color="#43A047" />
            <StatCard icon="alert-circle-outline" label="Urgent Cases" value={stats?.urgent_cases_detected ?? '--'} color="#D32F2F" />
            <StatCard icon="arrow-forward-circle-outline" label="Referrals Sent" value={stats?.referrals_sent_this_month ?? '--'} color="#F57C00" />
          </View>
        )}

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          <QuickAction
            icon="home-outline"
            label="My Village"
            color="#1B6CA8"
            onPress={() => router.push('/(asha)/village')}
          />
          <QuickAction
            icon="add-circle-outline"
            label="New Household"
            color="#43A047"
            onPress={() => router.push('/(asha)/add-household')}
          />
          <QuickAction
            icon="arrow-forward-circle-outline"
            label="Referrals"
            color="#F57C00"
            onPress={() => router.push('/(asha)/referrals')}
          />
        </View>

        {/* Urgent Cases */}
        {urgentHouseholds.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: '#D32F2F' }]}>
              🚨 Urgent — Needs Attention
            </Text>
            {urgentHouseholds.map((h: any) => (
              <TouchableOpacity
                key={h.id}
                style={styles.urgentCard}
                onPress={() => router.push(`/(asha)/household?id=${h.id}`)}
              >
                <View style={styles.urgentDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.urgentName}>{h.name || h.family_name}</Text>
                  <Text style={styles.urgentSub}>
                    Last visited: {h.last_visit_date
                      ? new Date(h.last_visit_date).toLocaleDateString('en-IN')
                      : 'Never'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#D32F2F" />
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Checklist Card */}
        <Text style={styles.sectionTitle}>Today's Checklist</Text>
        <View style={styles.checklistCard}>
          <CheckItem label="Visit all Red-flagged households" />
          <CheckItem label="Record voice notes for each visit" />
          <CheckItem label="Sync data before end of day" />
          <CheckItem label="Follow up on pending referrals" />
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ icon, label, value, color }: any) {
  return (
    <View style={[styles.statCard, { borderTopColor: color }]}>
      <Ionicons name={icon} size={22} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function QuickAction({ icon, label, color, onPress }: any) {
  return (
    <TouchableOpacity style={styles.actionBtn} onPress={onPress}>
      <View style={[styles.actionIcon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={28} color={color} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function CheckItem({ label }: { label: string }) {
  return (
    <View style={styles.checkItem}>
      <Ionicons name="checkbox-outline" size={20} color="#1B6CA8" />
      <Text style={styles.checkText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F8' },
  header: {
    backgroundColor: '#1B6CA8',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: { color: '#B3D4EE', fontSize: 14 },
  name: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#2196F3',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  content: { padding: 16 },

  syncBanner: {
    backgroundColor: '#F57C00',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 8,
  },
  syncBannerText: { color: '#fff', fontWeight: '600', flex: 1 },

  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
    borderTopWidth: 3,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  statValue: { fontSize: 28, fontWeight: 'bold', marginTop: 4 },
  statLabel: { fontSize: 11, color: '#666', marginTop: 2, textAlign: 'center', fontWeight: '600' },

  sectionTitle: { fontSize: 17, fontWeight: 'bold', color: '#333', marginBottom: 12 },

  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 28 },
  actionBtn: { alignItems: 'center', width: '31%' },
  actionIcon: { width: 60, height: 60, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  actionLabel: { fontSize: 12, color: '#444', fontWeight: '600', textAlign: 'center' },

  urgentCard: {
    backgroundColor: '#FFF3F3',
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#D32F2F',
    marginBottom: 10,
  },
  urgentDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#D32F2F', marginRight: 12 },
  urgentName: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  urgentSub: { fontSize: 12, color: '#888', marginTop: 2 },

  checklistCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 1,
  },
  checkItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  checkText: { fontSize: 14, color: '#444', flex: 1 },
});
