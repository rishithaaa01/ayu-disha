import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import patientApi from '../../services/patientApi';
import LabCard from '../../components/LabCard';
import LoadingSkeleton from '../../components/LoadingSkeleton';

export default function TestsScreen() {
  const [labs, setLabs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All'); // All | Pending | Resulted

  useEffect(() => {
    loadLabs();
  }, []);

  const loadLabs = async () => {
    try {
      const data = await patientApi.getMyLabResults();
      setLabs(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredLabs = () => {
    if (filter === 'All') return labs;
    if (filter === 'Pending') return labs.filter(l => l.status === 'pending' || l.status === 'collected');
    if (filter === 'Resulted') return labs.filter(l => l.status === 'resulted');
    return labs;
  };

  const isRecent = (dateStr: string) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    return diffHours < 24;
  };

  const hasNewOrder = labs.some(l => l.status === 'pending' && isRecent(l.ordered_date));

  const filteredLabs = getFilteredLabs();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Lab Tests</Text>
      </View>

      <View style={styles.tabsRow}>
        {['All', 'Pending', 'Resulted'].map(tab => (
          <TouchableOpacity 
            key={tab} 
            style={[styles.tab, filter === tab && styles.activeTab]}
            onPress={() => setFilter(tab)}
          >
            <Text style={[styles.tabText, filter === tab && styles.activeTabText]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {hasNewOrder && (
        <View style={styles.bookBanner}>
          <View style={styles.bannerIcon}>
            <Ionicons name="flask" size={20} color="#1B6CA8" />
          </View>
          <View style={styles.bannerContent}>
            <Text style={styles.bannerTitle}>🧪 New lab tests ordered</Text>
            <Text style={styles.bannerText}>Dr. Ramesh ordered new tests. Book your home sample collection now.</Text>
          </View>
          <TouchableOpacity style={styles.bookButton}>
            <Text style={styles.bookButtonText}>BOOK</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={styles.listContent}>
          <LoadingSkeleton height={80} style={{marginVertical: 6}} />
          <LoadingSkeleton height={80} style={{marginVertical: 6}} />
        </View>
      ) : filteredLabs.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No test records found.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredLabs}
          keyExtractor={(item) => item.id || item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={loadLabs} tintColor="#1B6CA8" />
          }
          renderItem={({ item }) => <LabCard lab={item} isNew={isRecent(item.ordered_date)} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#F0F0F0',
  },
  activeTab: {
    backgroundColor: '#1B6CA8',
  },
  tabText: {
    color: '#666',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
  },
  bookBanner: {
    backgroundColor: '#EBF8FF',
    borderRadius: 12,
    margin: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BEE3F8',
    gap: 12,
  },
  bannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#BEE3F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2B6CB0',
    marginBottom: 2,
  },
  bannerText: {
    fontSize: 12,
    color: '#2C5282',
    lineHeight: 16,
  },
  bookButton: {
    backgroundColor: '#3182CE',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  bookButtonText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
  }
});
