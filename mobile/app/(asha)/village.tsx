import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import SyncIndicator from '../../components/SyncIndicator';
import { getHouseholds } from '../../services/ashaApi';
import { openDatabase } from '../../database/database-sqlite';
import { useFocusEffect } from 'expo-router';
import { useAuthStore } from '../../store/authStore';

export default function VillageScreen() {
  const router = useRouter();
  const [households, setHouseholds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const db = await openDatabase();
      const localData: any[] = await db.getAllAsync('SELECT * FROM asha_households ORDER BY created_at DESC');
      
      if (localData.length > 0) {
        setHouseholds(localData.map(h => ({
          ...h,
          members: h.members_json ? JSON.parse(h.members_json) : [],
          open_issues: []
        })));
      } else {
        // 2. Fetch from API if local is empty (initial load)
        try {
          const data = await getHouseholds();
          setHouseholds(data);
          
          // Seed local database
          for (const h of data) {
             await db.runAsync(`
               INSERT OR REPLACE INTO asha_households (
                 id, family_name, village, block, district, members_json, synced
               ) VALUES (?, ?, ?, ?, ?, ?, 1)
             `, [h.id, h.family_name, h.village, h.block, h.district, JSON.stringify(h.members)]);
          }
        } catch (apiErr: any) {
          console.warn('API Fetch failed in VillageScreen:', apiErr.message);
          setHouseholds([]); // Keep empty if offline and no local data
        }
      }
    } catch (e) {
      console.warn('Failed to load households', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredHouseholds = households.filter((h) => {
    if (filter === 'Urgent') return h.risk_level === 'red';
    if (filter === 'Watch') return h.risk_level === 'amber';
    if (filter === 'Done') return h.risk_level === 'green';
    return true; // 'All'
  });

  const counts = {
    All: households.length,
    Urgent: households.filter(h => h.risk_level === 'red').length,
    Watch: households.filter(h => h.risk_level === 'amber').length,
    Done: households.filter(h => h.risk_level === 'green').length,
  };

  const getRiskColor = (risk: string) => {
    if (risk === 'red') return '#D32F2F';
    if (risk === 'amber') return '#F57C00';
    return '#388E3C';
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 1. Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Ayu Disha</Text>
          <Text style={styles.headerSubtitle}>Kavitha Devi • ASHA Worker</Text>
        </View>
        <SyncIndicator />
      </View>

      {/* 2. Summary Row */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{counts.All}</Text>
          <Text style={styles.summaryLabel}>Households</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>2</Text>
          <Text style={styles.summaryLabel}>Visits Today</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>0</Text>
          <Text style={styles.summaryLabel}>Pending Sync</Text>
        </View>
      </View>

      {/* 3. Priority Filter Tabs */}
      <View style={styles.filterRow}>
        {['All', 'Urgent', 'Watch', 'Done'].map((tab) => (
          <TouchableOpacity 
            key={tab} 
            style={[styles.filterTab, filter === tab && styles.filterTabActive]}
            onPress={() => setFilter(tab)}
          >
            <Text style={[styles.filterText, filter === tab && styles.filterTextActive]}>
              {tab} ({counts[tab as keyof typeof counts]})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 4. Household List */}
      {loading ? (
        <ActivityIndicator size="large" color="#1B6CA8" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredHouseholds}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.householdCard}
              onPress={() => router.push(`/(asha)/household?id=${item.id}`)}
              activeOpacity={0.7}
            >
              <View style={[styles.riskIndicator, { backgroundColor: getRiskColor(item.risk_level) }]} />
              
              <View style={styles.cardContent}>
                <Text style={styles.familyName}>{item.family_name}</Text>
                <Text style={styles.villageText}>{item.village} • {item.members?.length || 0} members</Text>
                
                <Text style={[
                  styles.lastVisitText, 
                  { color: item.risk_level === 'red' ? '#D32F2F' : '#666' }
                ]}>
                  Last visited: {item.last_visit_date ? new Date(item.last_visit_date).toLocaleDateString() : 'Never'}
                </Text>

                {item.open_issues?.length > 0 && (
                  <View style={styles.issueTagsContainer}>
                    {item.open_issues.map((i: string, idx: number) => (
                      <View key={idx} style={styles.issueTag}>
                        <Text style={styles.issueTagText}>{i}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
              
              <Ionicons name="chevron-forward" size={24} color="#ccc" style={styles.chevron} />
            </TouchableOpacity>
          )}
        />
      )}

      {/* 5. FAB Button */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => router.push('/(asha)/add-household')}
      >
        <Ionicons name="add" size={24} color="#fff" />
        <Text style={styles.fabText}>Add</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F3EE',
  },
  header: {
    backgroundColor: '#1B6CA8',
    padding: 16,
    paddingTop: 48, // Handle SafeArea visually
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#E8F4FD',
    fontSize: 14,
    marginTop: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    padding: 16,
    justifyContent: 'space-between',
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    width: '31%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1B6CA8',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  filterTab: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    marginRight: 6,
    backgroundColor: '#E0E0E0',
  },
  filterTabActive: {
    backgroundColor: '#1B6CA8',
  },
  filterText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#fff',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  householdCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  riskIndicator: {
    width: 6,
    height: '100%',
  },
  cardContent: {
    flex: 1,
    padding: 14,
  },
  familyName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  villageText: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  lastVisitText: {
    fontSize: 12,
    marginTop: 4,
  },
  issueTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  issueTag: {
    backgroundColor: '#FFF3E0',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 6,
    marginBottom: 4,
  },
  issueTagText: {
    fontSize: 11,
    color: '#E65100',
  },
  chevron: {
    alignSelf: 'center',
    paddingRight: 12,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#F57C00', // Amber +
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  fabText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 4,
    fontSize: 16,
  }
});
