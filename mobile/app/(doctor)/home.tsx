import React, { useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  RefreshControl, 
  SafeAreaView, 
  StatusBar,
  TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useClinicianStore } from '../../store/clinicianStore';
import clinicianApi from '../../services/clinicianApi';
import QueueCard from '../../components/QueueCard';
import { useAuthStore } from '../../store/authStore';

export default function DoctorDashboard() {
  const { queue, setQueue, isRefreshing, setRefreshing, setActivePatient } = useClinicianStore();
  const doctor = useAuthStore((state) => state.user);

  const fetchQueue = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await clinicianApi.getQueue();
      setQueue(data);
    } catch (e) {
      console.error("Queue fetch error:", e);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
    
    // Set up 30-second polling
    const interval = setInterval(fetchQueue, 30000);
    return () => clearInterval(interval);
  }, []);

  const stats = {
    urgent: queue.filter(p => p.risk_tag === 'urgent').length,
    watch: queue.filter(p => p.risk_tag === 'watch').length,
    low: queue.filter(p => p.risk_tag === 'low').length,
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.welcomeText}>Namaste, Doctor</Text>
          <Text style={styles.nameText}>{doctor?.name || '—'}</Text>
        </View>
        <TouchableOpacity style={styles.notifButton}>
          <Ionicons name="notifications-outline" size={24} color="#1B6CA8" />
          <View style={styles.notifDot} />
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={[styles.statBox, { backgroundColor: '#FEF2F2' }]}>
          <Text style={[styles.statValue, { color: '#B91C1C' }]}>{stats.urgent}</Text>
          <Text style={[styles.statLabel, { color: '#EF4444' }]}>URGENT</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: '#FFFBEB' }]}>
          <Text style={[styles.statValue, { color: '#92400E' }]}>{stats.watch}</Text>
          <Text style={[styles.statLabel, { color: '#F59E0B' }]}>WATCH</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: '#F0FDF4' }]}>
          <Text style={[styles.statValue, { color: '#166534' }]}>{stats.low}</Text>
          <Text style={[styles.statLabel, { color: '#22C55E' }]}>LOW</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>OPD Waiting List</Text>
        <Text style={styles.countText}>{queue.length} Total</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <FlatList
        data={queue}
        keyExtractor={(item) => item._id}
        renderItem={({ item, index }) => (
          <QueueCard 
            patient={item} 
            position={index + 1} 
            onPress={() => {
              setActivePatient(item);
              router.push(`/(doctor)/patient/${item.patient_id}`);
            }}
          />
        )}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={fetchQueue} tintColor="#1B6CA8" />
        }
        ListEmptyComponent={
          !isRefreshing ? (
            <View style={styles.emptyState}>
              <Ionicons name="bed-outline" size={64} color="#E5E7EB" />
              <Text style={styles.emptyText}>Queue is empty</Text>
              <Text style={styles.emptySubtext}>New referrals will appear here</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 20,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  nameText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: 'Mukta_800ExtraBold',
  },
  notifButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifDot: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#fff',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  statBox: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
  },
  countText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 300,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#CBD5E1',
    marginTop: 4,
  },
});
