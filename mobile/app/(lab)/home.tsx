import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, SafeAreaView, RefreshControl } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import { Colors } from '../../constants/colors';

export default function LabHomeScreen() {
  const { user, logout } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const [pendingTests, setPendingTests] = useState<any[]>([]);
  const [completedTests, setCompletedTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTests = async () => {
    try {
      const [pendingRes, completedRes] = await Promise.all([
        api.get('/lab/pending'),
        api.get('/lab/completed')
      ]);
      setPendingTests(pendingRes.data || []);
      setCompletedTests(completedRes.data || []);
    } catch (err) {
      console.error('Failed to load lab tests:', err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadTests();
  }, []);

  // Reload data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadTests();
    }, [])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTests();
    setRefreshing(false);
  };

  const handleLogout = () => {
    logout();
    router.replace('/(auth)/welcome');
  };

  const StatCard = ({ title, value, icon, color }: any) => (
    <View style={[styles.statCard, { borderLeftColor: color, borderLeftWidth: 4 }]}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value ?? '—'}</Text>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
    </View>
  );

  const TestCard = ({ test }: any) => {
    const urgencyColor = test.urgency === 'urgent' ? '#EF4444' : test.urgency === 'high' ? '#F59E0B' : '#6B7280';
    return (
      <View style={styles.testCard}>
        <View style={styles.testHeader}>
          <View style={styles.testLeft}>
            <Text style={styles.patientName}>{test.patient_name || 'Unknown Patient'}</Text>
            <Text style={styles.testType}>{test.test_type || 'Lab Test'}</Text>
            <Text style={styles.testMeta}>
              Ordered: {test.ordered_date || 'N/A'} · {test.ordered_by || 'Doctor'}
            </Text>
          </View>
          <View style={[styles.urgencyBadge, { backgroundColor: urgencyColor + '20' }]}>
            <Text style={[styles.urgencyText, { color: urgencyColor }]}>
              {test.urgency?.toUpperCase() || 'NORMAL'}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#1B6CA8' }]}
          onPress={() => {
            // Navigate to test upload screen
            router.push(`/(lab)/test/${test.id}`);
          }}
        >
          <Ionicons name="cloud-upload" size={16} color={Colors.white} />
          <Text style={styles.actionButtonText}>Upload Results</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const CompletedTestCard = ({ test }: any) => (
    <View style={styles.testCard}>
      <View style={styles.testHeader}>
        <View style={styles.testLeft}>
          <View style={styles.completedBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            <Text style={styles.completedText}>Completed</Text>
          </View>
          <Text style={styles.patientName}>{test.patient_name || 'Unknown Patient'}</Text>
          <Text style={styles.testType}>{test.test_type || 'Lab Test'}</Text>
          <Text style={styles.testMeta}>
            Completed: {test.completed_date || 'N/A'} · By: {test.completed_by || user?.name}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIcon}>
            <Ionicons name="flask" size={24} color={Colors.white} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Lab Dashboard</Text>
            <Text style={styles.headerSubtitle}>{user?.name}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.primary]} />}
      >
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard title="Pending Tests" value={pendingTests.length} icon="time" color="#F59E0B" />
          <StatCard title="Completed Today" value={completedTests.filter((t: any) => t.today).length} icon="checkmark-circle" color="#10B981" />
          <StatCard title="Total Completed" value={completedTests.length} icon="flask" color="#1B6CA8" />
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
            onPress={() => setActiveTab('pending')}
          >
            <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
              Pending {pendingTests.length > 0 && `(${pendingTests.length})`}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'completed' && styles.tabActive]}
            onPress={() => setActiveTab('completed')}
          >
            <Text style={[styles.tabText, activeTab === 'completed' && styles.tabTextActive]}>
              Completed
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginVertical: 40 }} />
        ) : (
          <View style={styles.testsContainer}>
            {activeTab === 'pending' && (
              <>
                {pendingTests.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="checkmark-done-circle" size={64} color={Colors.success} />
                    <Text style={styles.emptyTitle}>All Caught Up!</Text>
                    <Text style={styles.emptyText}>No pending lab tests at the moment</Text>
                  </View>
                ) : (
                  pendingTests.map((test, i) => <TestCard key={i} test={test} />)
                )}
              </>
            )}

            {activeTab === 'completed' && (
              <>
                {completedTests.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="document-text" size={64} color={Colors.textMuted} />
                    <Text style={styles.emptyTitle}>No Completed Tests</Text>
                    <Text style={styles.emptyText}>Your completed tests will appear here</Text>
                  </View>
                ) : (
                  completedTests.map((test, i) => <CompletedTestCard key={i} test={test} />)
                )}
              </>
            )}
          </View>
        )}
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
  tabs: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 0,
    gap: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.white,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textDark,
  },
  tabTextActive: {
    color: Colors.white,
  },
  testsContainer: {
    padding: 16,
    paddingTop: 0,
    gap: 12,
  },
  testCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  testHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  testLeft: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textDark,
    marginBottom: 4,
  },
  testType: {
    fontSize: 14,
    color: Colors.textDark,
    marginBottom: 4,
  },
  testMeta: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  urgencyBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  urgencyText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  actionButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  completedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: Colors.white,
    borderRadius: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textDark,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
