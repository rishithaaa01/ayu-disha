import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { Colors } from '../../constants/colors';

export default function HospitalsScreen() {
  const [name, setName] = useState('');
  const [type, setType] = useState('govt');
  const [district, setDistrict] = useState('Chennai');
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  const loadHospitals = async () => {
    try {
      const res = await api.get('/admin/hospitals');
      setHospitals(res.data || []);
    } catch (err) {
      console.error('Failed to load hospitals:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHospitals();
  }, []);

  const handleAdd = async () => {
    if (!name.trim()) return Alert.alert('Required', 'Please enter hospital name');
    setIsAdding(true);
    try {
      await api.post('/admin/hospitals', { name, type, district, state: 'Tamil Nadu' });
      setName('');
      setType('govt');
      setDistrict('Chennai');
      Alert.alert('Success', 'Hospital added successfully');
      await loadHospitals();
    } catch (err) {
      Alert.alert('Error', 'Failed to add hospital');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = (id: string, hospitalName: string) => {
    Alert.alert('Confirm Delete', `Remove ${hospitalName}?`, [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive', 
        onPress: async () => {
          try {
            await api.delete(`/admin/hospitals/${id}`);
            await loadHospitals();
          } catch (err) {
            Alert.alert('Error', 'Failed to delete hospital');
          }
        }
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Hospitals</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Add Form */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Add New Hospital</Text>
          <TextInput style={styles.input} placeholder="Hospital Name" value={name} onChangeText={setName} />
          <View style={styles.row}>
            <View style={styles.picker}>
              <Text style={styles.label}>Type</Text>
              <View style={styles.pickerButtons}>
                {['govt', 'private', 'ngo'].map(t => (
                  <TouchableOpacity key={t} style={[styles.pickerButton, type === t && styles.pickerButtonActive]} onPress={() => setType(t)}>
                    <Text style={[styles.pickerButtonText, type === t && styles.pickerButtonTextActive]}>{t.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
          <TextInput style={styles.input} placeholder="District" value={district} onChangeText={setDistrict} />
          <TouchableOpacity style={styles.addButton} onPress={handleAdd} disabled={isAdding}>
            {isAdding ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.addButtonText}>Add Hospital</Text>}
          </TouchableOpacity>
        </View>

        {/* Hospital List */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Registered Hospitals ({hospitals.length})</Text>
          {isLoading ? (
            <ActivityIndicator size="large" color={Colors.primary} style={{ marginVertical: 20 }} />
          ) : hospitals.length === 0 ? (
            <Text style={styles.emptyText}>No hospitals registered yet</Text>
          ) : (
            hospitals.map((h: any) => (
              <View key={h.id} style={styles.hospitalItem}>
                <View style={styles.hospitalIcon}>
                  <Ionicons name="business" size={20} color={Colors.primary} />
                </View>
                <View style={styles.hospitalInfo}>
                  <Text style={styles.hospitalName}>{h.name}</Text>
                  <Text style={styles.hospitalMeta}>{h.district}, {h.state} · {h.type.toUpperCase()}</Text>
                </View>
                <TouchableOpacity onPress={() => handleDelete(h.id, h.name)}>
                  <Ionicons name="trash-outline" size={20} color={Colors.error} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.textDark },
  content: { flex: 1, padding: 16 },
  card: { backgroundColor: Colors.white, borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.textDark, marginBottom: 16 },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: 10, padding: 12, fontSize: 14, marginBottom: 12, backgroundColor: Colors.white },
  row: { marginBottom: 12 },
  picker: { flex: 1 },
  label: { fontSize: 12, fontWeight: '600', color: Colors.textMuted, marginBottom: 8 },
  pickerButtons: { flexDirection: 'row', gap: 8 },
  pickerButton: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: Colors.background, alignItems: 'center' },
  pickerButtonActive: { backgroundColor: Colors.primary },
  pickerButtonText: { fontSize: 12, fontWeight: '600', color: Colors.textDark },
  pickerButtonTextActive: { color: Colors.white },
  addButton: { backgroundColor: Colors.primary, padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  addButtonText: { color: Colors.white, fontSize: 14, fontWeight: 'bold' },
  hospitalItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  hospitalIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  hospitalInfo: { flex: 1 },
  hospitalName: { fontSize: 14, fontWeight: '600', color: Colors.textDark },
  hospitalMeta: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  emptyText: { textAlign: 'center', color: Colors.textMuted, fontSize: 14, paddingVertical: 20 },
});
