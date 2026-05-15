import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import patientApi from '../../services/patientApi';
import VisitCard from '../../components/VisitCard';
import LoadingSkeleton from '../../components/LoadingSkeleton';

export default function RecordsScreen() {
  const [visits, setVisits] = useState<any[]>([]);
  const [filteredVisits, setFilteredVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadVisits();
  }, []);

  const loadVisits = async () => {
    try {
      const data = await patientApi.getMyVisits();
      setVisits(data || []);
      setFilteredVisits(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (text: string) => {
    setSearch(text);
    if (!text) {
      setFilteredVisits(visits);
      return;
    }
    const lower = text.toLowerCase();
    const filtered = visits.filter(v => 
      v.hospital_name?.toLowerCase().includes(lower) ||
      v.doctor_name?.toLowerCase().includes(lower) ||
      v.diagnosis?.some((d: string) => d.toLowerCase().includes(lower))
    );
    setFilteredVisits(filtered);
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Health Records</Text>
        <Text style={styles.subtitle}>All your hospital visits</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search hospital or diagnosis..."
          value={search}
          onChangeText={handleSearch}
        />
      </View>

      {loading ? (
        <View style={styles.listContent}>
          <LoadingSkeleton height={100} style={{marginVertical: 6}} />
          <LoadingSkeleton height={100} style={{marginVertical: 6}} />
          <LoadingSkeleton height={100} style={{marginVertical: 6}} />
        </View>
      ) : filteredVisits.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={64} color="#CCC" />
          <Text style={styles.emptyText}>No visits recorded yet.</Text>
          <Text style={styles.emptySubtext}>Visit any Ayu Disha registered hospital and your records will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredVisits}
          keyExtractor={(item) => item.id || item._id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <VisitCard
              visit={item}
              expanded={expandedId === (item.id || item._id)}
              onToggle={() => toggleExpand(item.id || item._id)}
            />
          )}
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
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#555',
    marginTop: 16,
  },
  emptySubtext: {
    textAlign: 'center',
    color: '#888',
    marginTop: 8,
    lineHeight: 22,
  }
});
