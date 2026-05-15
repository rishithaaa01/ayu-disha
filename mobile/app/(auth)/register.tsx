import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { Colors } from '../../constants/colors';

type Role = 'patient' | 'asha' | 'doctor';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('patient');
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [villages, setVillages] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  const updateUserInfo = useAuthStore(state => state.login);
  const token = useAuthStore(state => state.token);
  const currentUser = useAuthStore(state => state.user);

  useEffect(() => {
    loadMetaData();
  }, []);

  const loadMetaData = async () => {
    try {
      const [hospRes, villRes] = await Promise.all([
        api.get('/auth/hospitals'),
        api.get('/auth/villages')
      ]);
      setHospitals(hospRes.data);
      setVillages(villRes.data);
    } catch (e) {
      console.error("Failed to load metadata", e);
    } finally {
      setDataLoading(false);
    }
  };

  const handleCompleteProfile = async () => {
    if (!name.trim()) return Alert.alert("Required", "Please enter your name");
    if (role !== 'patient' && !selectedLocation) return Alert.alert("Required", `Please select your ${role === 'doctor' ? 'hospital' : 'village'}`);

    setLoading(true);
    try {
      const payload: any = {
        name,
        role,
        language: 'en'
      };

      if (role === 'doctor') payload.hospital = selectedLocation;
      if (role === 'asha') payload.village = selectedLocation;
      if (role === 'asha') payload.district = "Chennai"; // Default for demo

      const response = await api.post('/auth/complete-profile', payload);
      
      // Update local storage with the complete user object
      await updateUserInfo(response.data, token!);
      
      Alert.alert("Success", "Profile completed!");
      router.replace('/');
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to save profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (dataLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Setting up your profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Complete your profile</Text>
      <Text style={styles.subheading}>Tell us who you are to get started</Text>

      <View style={styles.section}>
        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Dr. Ramesh Kumar"
          value={name}
          onChangeText={setName}
        />
      </View>

      <Text style={styles.label}>I am a...</Text>
      <View style={styles.roleRow}>
        {(['patient', 'asha', 'doctor'] as Role[]).map((r) => (
          <TouchableOpacity
            key={r}
            style={[styles.roleCard, role === r && styles.activeRole]}
            onPress={() => { setRole(r); setSelectedLocation(''); }}
          >
            <Ionicons 
              name={r === 'patient' ? 'person' : r === 'asha' ? 'home' : 'medical'} 
              size={24} 
              color={role === r ? Colors.white : Colors.textDark} 
            />
            <Text style={[styles.roleLabel, role === r && { color: '#fff' }]}>
              {r.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {role === 'doctor' && (
        <View style={styles.section}>
          <Text style={styles.label}>Select your Hospital</Text>
          {hospitals.map(h => (
            <TouchableOpacity 
              key={h.id} 
              style={[styles.locationItem, selectedLocation === h.name && styles.activeLocation]}
              onPress={() => setSelectedLocation(h.name)}
            >
              <Text style={[styles.locationText, selectedLocation === h.name && { color: '#fff' }]}>{h.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {role === 'asha' && (
        <View style={styles.section}>
          <Text style={styles.label}>Select your Assigned Village</Text>
          {villages.map(v => (
            <TouchableOpacity 
              key={v.id} 
              style={[styles.locationItem, selectedLocation === v.name && styles.activeLocation]}
              onPress={() => setSelectedLocation(v.name)}
            >
              <Text style={[styles.locationText, selectedLocation === v.name && { color: '#fff' }]}>{v.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <TouchableOpacity 
        style={[styles.submitButton, loading && { opacity: 0.7 }]}
        onPress={handleCompleteProfile}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Get Started</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 24, paddingTop: 64 },
  heading: { fontSize: 24, fontWeight: 'bold', color: Colors.textDark },
  subheading: { fontSize: 16, color: Colors.textMuted, marginBottom: 32 },
  section: { marginBottom: 24 },
  label: { fontSize: 14, fontWeight: 'bold', color: Colors.textDark, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  input: { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: 16, fontSize: 16 },
  roleRow: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  roleCard: { flex: 1, backgroundColor: Colors.white, padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  activeRole: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  roleLabel: { fontSize: 12, fontWeight: 'bold', marginTop: 8, color: Colors.textDark },
  locationItem: { backgroundColor: Colors.white, padding: 16, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: Colors.border },
  activeLocation: { backgroundColor: Colors.action, borderColor: Colors.action },
  locationText: { fontSize: 16, color: Colors.textDark },
  submitButton: { backgroundColor: Colors.primary, padding: 20, borderRadius: 12, alignItems: 'center', marginTop: 32 },
  submitText: { color: Colors.white, fontSize: 18, fontWeight: 'bold' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 16, color: Colors.textMuted },
});
