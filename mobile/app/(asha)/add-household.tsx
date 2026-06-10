import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { registerHousehold } from '../../services/ashaApi';
import { openDatabase } from '../../database/database-sqlite';
import { useAuthStore } from '../../store/authStore';

export default function AddHouseholdScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    family_name: '',
    village: user?.village || '',
    block: '',
    district: user?.district || ''
  });

  const [members, setMembers] = useState<any[]>([]);

  const addMember = () => {
    setMembers([...members, { name: '', age: '', gender: 'female' }]);
  };

  const updateMember = (index: number, key: string, value: string) => {
    const newMembers = [...members];
    newMembers[index][key] = value;
    setMembers(newMembers);
  };

  const removeMember = (index: number) => {
    const newMembers = [...members];
    newMembers.splice(index, 1);
    setMembers(newMembers);
  };

  const handleSave = async () => {
    if (!formData.family_name) {
      Alert.alert("Error", "Family name is required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...formData,
        members: members.map(m => ({ ...m, age: parseInt(m.age) || 0 }))
      };
      
      const householdId = `h_${Date.now()}`; // Local ID first
      let synced = 0;

      // 1. Attempt to sync with server immediately if online
      try {
        const serverRes = await registerHousehold(payload);
        if (serverRes.id) {
           synced = 1;
        }
      } catch (apiErr) {
        console.warn("Server unreachable, saving locally for later sync.");
      }

      // 2. Save locally for instant UI update
      const db = await openDatabase();
      await db.runAsync(`
        INSERT INTO asha_households (
          id, family_name, village, block, district, members_json, synced
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        householdId,
        formData.family_name,
        formData.village,
        formData.block,
        formData.district,
        JSON.stringify(payload.members),
        synced
      ]);

      Alert.alert("Success", synced ? "Household registered and synced!" : "Saved locally (Offline Mode)", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to save household.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Household</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        <Text style={styles.sectionTitle}>Household Details</Text>
        
        <Text style={styles.label}>Family Name</Text>
        <TextInput 
          style={styles.input} 
          placeholder="e.g. Murugan Family"
          value={formData.family_name}
          onChangeText={t => setFormData({...formData, family_name: t})}
        />

        <Text style={styles.label}>Village</Text>
        <TextInput 
          style={styles.input} 
          value={formData.village}
          onChangeText={t => setFormData({...formData, village: t})}
        />

        <Text style={styles.sectionTitle}>Family Members</Text>
        
        {members.map((member, index) => (
          <View key={index} style={styles.memberCard}>
            <View style={styles.mHeader}>
              <Text style={styles.mTitle}>Member {index + 1}</Text>
              <TouchableOpacity onPress={() => removeMember(index)}>
                <Ionicons name="trash" size={20} color="#D32F2F" />
              </TouchableOpacity>
            </View>
            
            <TextInput 
              style={styles.input} 
              placeholder="Full Name"
              value={member.name}
              onChangeText={t => updateMember(index, 'name', t)}
            />
            <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
              <TextInput 
                style={[styles.input, {flex: 1, marginRight: 8}]} 
                placeholder="Age"
                keyboardType="numeric"
                value={member.age}
                onChangeText={t => updateMember(index, 'age', t)}
              />
              <TextInput 
                style={[styles.input, {flex: 1}]} 
                placeholder="Gender (male/female)"
                value={member.gender}
                onChangeText={t => updateMember(index, 'gender', t)}
              />
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.addBtn} onPress={addMember}>
          <Ionicons name="add-circle-outline" size={24} color="#1B6CA8" />
          <Text style={styles.addBtnText}>Add Member</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.submitBtn} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Register Household</Text>}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F3EE' },
  header: { padding: 16, paddingTop: 48, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee' },
  backBtn: { marginRight: 16 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  content: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1B6CA8', marginTop: 16, marginBottom: 12 },
  label: { fontSize: 13, color: '#666', marginBottom: 4, fontWeight: 'bold' },
  input: { backgroundColor: '#fff', padding: 14, borderRadius: 8, fontSize: 16, borderWidth: 1, borderColor: '#ddd', marginBottom: 16 },
  memberCard: { backgroundColor: '#E8F4FD', padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#BBDEFB' },
  mHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  mTitle: { fontWeight: 'bold', color: '#1B6CA8' },
  addBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 16, borderStyle: 'dashed', borderWidth: 2, borderColor: '#1B6CA8', borderRadius: 12, marginBottom: 24 },
  addBtnText: { color: '#1B6CA8', fontWeight: 'bold', marginLeft: 8, fontSize: 16 },
  submitBtn: { backgroundColor: '#F57C00', padding: 18, borderRadius: 32, alignItems: 'center', marginBottom: 40 },
  submitText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});
