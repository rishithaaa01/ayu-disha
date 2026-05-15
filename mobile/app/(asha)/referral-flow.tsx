import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Config } from '../../constants/Config';

export default function ReferralFlowScreen() {
  const { visit_id, household_id, patient_id, risk_desc, obs } = useLocalSearchParams<{ 
    visit_id: string, 
    household_id: string, 
    patient_id: string,
    risk_desc: string,
    obs: string 
  }>();
  const router = useRouter();

  const [facilities, setFacilities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFacility, setSelectedFacility] = useState<string | null>(null);
  const [urgency, setUrgency] = useState('Today');
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadFacilities();
  }, []);

  const loadFacilities = async () => {
    try {
      const token = await SecureStore.getItemAsync('token');
      const res = await axios.get(`${Config.API_URL}/asha/nearby-facilities`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFacilities(res.data);
    } catch (e) {
      console.warn("Failed to load facilities", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!selectedFacility) {
      alert("Please select a facility!");
      return;
    }
    setSending(true);
    try {
      const token = await SecureStore.getItemAsync('token');
      const userStr = await SecureStore.getItemAsync('user');
      const user = userStr ? JSON.parse(userStr) : {};
      
      const observations = obs ? JSON.parse(decodeURIComponent(obs)) : {};

      await axios.post(`${Config.API_URL}/asha/referrals`, {
        patient_id: patient_id || "unknown", 
        household_id: household_id || "unknown",
        to_hospital_id: selectedFacility,
        visit_id: visit_id || "unknown",
        urgency,
        ai_summary: risk_desc || "Urgent Referral",
        from_worker_name: user?.name,
        asha_observations: observations,
        notes
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      Alert.alert("Success", "Referral sent! The doctor will be notified.", [
        { text: "OK", onPress: () => router.replace('/(asha)/village') }
      ]);
    } catch (e) {
      console.error(e);
      alert("Failed to send referral.");
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Send Urgent Referral</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>AI Risk Summary</Text>
          <Text style={styles.summaryDesc}>{risk_desc || "No summary provided."}</Text>
        </View>

        <Text style={styles.sectionTitle}>1. Select Facility</Text>
        {loading ? <ActivityIndicator color="#F57C00" /> : (
          facilities.map((fac) => (
            <TouchableOpacity
              key={fac.id}
              style={[styles.facilityCard, selectedFacility === fac.id && styles.facilitySelected]}
              onPress={() => setSelectedFacility(fac.id)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.facName}>{fac.name}</Text>
                <Text style={styles.facMeta}>{fac.type} • {fac.distance}</Text>
              </View>
              {selectedFacility === fac.id && <Ionicons name="checkmark-circle" size={28} color="#1B6CA8" />}
            </TouchableOpacity>
          ))
        )}

        <Text style={styles.sectionTitle}>2. Urgency</Text>
        <View style={styles.rowBtnGrp}>
          {['Today', 'This Week'].map(opt => (
            <TouchableOpacity
              key={opt}
              style={[styles.urgencyBtn, urgency === opt && styles.urgencyBtnSelected]}
              onPress={() => setUrgency(opt)}
            >
              <Text style={[styles.urgencyText, urgency === opt && { color: '#D32F2F', fontWeight: 'bold' }]}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>3. Additional Notes (Optional)</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Any specific instructions for the doctor?"
          multiline
          numberOfLines={4}
          value={notes}
          onChangeText={setNotes}
        />

        <TouchableOpacity style={styles.submitBtn} onPress={handleSend} disabled={sending}>
          {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Send Referral</Text>}
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
  content: { padding: 16, paddingBottom: 60 },
  summaryCard: { backgroundColor: '#FFEBEE', padding: 16, borderRadius: 12, marginBottom: 24, borderLeftWidth: 4, borderLeftColor: '#D32F2F' },
  summaryTitle: { fontSize: 13, color: '#D32F2F', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 4 },
  summaryDesc: { fontSize: 16, color: '#333', lineHeight: 22 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: '#333', marginTop: 8 },
  facilityCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  facilitySelected: { borderColor: '#1B6CA8', backgroundColor: '#E8F4FD' },
  facName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  facMeta: { fontSize: 14, color: '#666', marginTop: 4 },
  rowBtnGrp: { flexDirection: 'row', marginBottom: 24 },
  urgencyBtn: { flex: 1, backgroundColor: '#fff', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', alignItems: 'center', marginRight: 8 },
  urgencyBtnSelected: { borderColor: '#D32F2F', backgroundColor: '#FFEBEE' },
  urgencyText: { fontSize: 16, color: '#666' },
  textInput: { backgroundColor: '#fff', borderRadius: 12, padding: 16, fontSize: 16, height: 100, textAlignVertical: 'top', marginBottom: 24 },
  submitBtn: { backgroundColor: '#F57C00', padding: 20, borderRadius: 32, alignItems: 'center', marginTop: 16 },
  submitText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});
