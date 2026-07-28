import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, SafeAreaView, RefreshControl } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import { Colors } from '../../constants/colors';

export default function AdminHomeScreen() {
  const { user, logout } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);

  const loadData = async () => {
    try {
      const [statsRes, activityRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/activity')
      ]);
      setStats(statsRes.data);
      setActivity(activityRes.data || []);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Refresh every 60 seconds
    const interval = setInterval(loadData, 60000);
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

  const StatCard = ({ title, value, icon, color, subtitle }: any) => (
    <View style={[styles.statCard, { borderLeftColor: color, borderLeftWidth: 4 }]}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value ?? '—'}</Text>
        <Text style={styles.statTitle}>{title}</Text>
        {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  );

  const MenuItem = ({ title, icon, onPress, badge }: any) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuLeft}>
        <View style={styles.menuIcon}>
          <Ionicons name={icon} size={22} color={Colors.primary} />
        </View>
        <Text style={styles.menuTitle}>{title}</Text>
      </View>
      <View style={styles.menuRight}>
        {badge !== undefined && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIcon}>
            <Ionicons name="shield-checkmark" size={24} color={Colors.white} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Admin Panel</Text>
            <Text style={styles.headerSubtitle}>{user?.name}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color={Colors.error} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.primary]} />}
      >
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {isLoading ? (
            <ActivityIndicator size="large" color={Colors.primary} style={{ marginVertical: 40 }} />
          ) : (
            <>
              <StatCard title="Total Patients" value={stats?.total_patients?.toLocaleString()} icon="people" color="#1B6CA8" subtitle="Registered" />
              <StatCard title="Doctors" value={stats?.total_doctors} icon="medical" color="#2C8C68" subtitle="Active clinicians" />
              <StatCard title="ASHA Workers" value={stats?.total_asha_workers} icon="home" color="#9333EA" subtitle="Community workers" />
              <StatCard title="Hospitals" value={stats?.total_hospitals} icon="business" color="#F97316" subtitle="Facilities" />
              <StatCard title="Visits Today" value={stats?.visits_today} icon="checkmark-circle" color="#14B8A6" subtitle="Completed" />
              <StatCard title="Pending Referrals" value={stats?.referrals_pending} icon="time" color="#F59E0B" subtitle="Awaiting" />
            </>
          )}
        </View>

        {/* Management Menu */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Management</Text>
          <View style={styles.menu}>
            <MenuItem title="Manage Hospitals" icon="business" onPress={() => router.push('/(admin)/hospitals')} badge={stats?.total_hospitals} />
            <MenuItem title="User Management" icon="people" onPress={() => router.push('/(admin)/users')} />
            <MenuItem title="Activity Logs" icon="list" onPress={() => {}} badge={activity.length} />
            <MenuItem title="Reports" icon="bar-chart" onPress={() => {}} />
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.activityList}>
            {activity.length === 0 ? (
              <Text style={styles.emptyText}>No recent activity</Text>
            ) : (
              activity.slice(0, 10).map((item: any, i: number) => (
                <View key={i} style={styles.activityItem}>
                  <View style={[styles.activityDot, { backgroundColor: item.severity === 'urgent' ? Colors.error : item.severity === 'warning' ? Colors.warning : Colors.success }]} />
                  <View style={styles.activityContent}>
                    <Text style={styles.activityMessage}>{item.message}</Text>
                    <Text style={styles.activityTime}>{item.time}</Text>
                  </View>
                  <View style={[styles.activityBadge, { backgroundColor: item.severity === 'urgent' ? '#FEE2E2' : item.severity === 'warning' ? '#FEF3C7' : '#D1FAE5' }]}>
                    <Text style={[styles.activityBadgeText, { color: item.severity === 'urgent' ? '#991B1B' : item.severity === 'warning' ? '#92400E' : '#065F46' }]}>{item.type?.toUpperCase()}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.primary,
    padding: 20,
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.white,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  logoutButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  statsGrid: {
    padding: 16,
    gap: 12,
  },
  statCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.textDark,
  },
  statTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
    marginTop: 2,
  },
  statSubtitle: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textDark,
    marginBottom: 12,
  },
  menu: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textDark,
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: Colors.white,
  },
  activityList: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  activityContent: {
    flex: 1,
  },
  activityMessage: {
    fontSize: 13,
    color: Colors.textDark,
    lineHeight: 18,
  },
  activityTime: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
  },
  activityBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  activityBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.textMuted,
    fontSize: 14,
    paddingVertical: 20,
  },
});
