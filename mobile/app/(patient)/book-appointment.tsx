import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, SafeAreaView, Alert
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { Colors } from '../../constants/colors';

export default function BookAppointmentScreen() {
  const [step, setStep] = useState(1); // 1: Symptoms, 2: AI Analysis, 3: Select Doctor, 4: Time Slot
  const [loading, setLoading] = useState(false);

  // Step 1: Symptom Input
  const [symptoms, setSymptoms] = useState('');
  const [duration, setDuration] = useState('');
  const [severity, setSeverity] = useState('mild');

  // Step 2: AI Analysis Results
  const [analysis, setAnalysis] = useState<any>(null);

  // Step 3: Selected Doctor
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);

  // Step 4: Date and Time
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [reason, setReason] = useState('');

  const analyzeSymptoms = async () => {
    if (!symptoms.trim()) {
      Alert.alert('Required', 'Please describe your symptoms');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/appointments/analyze-symptoms', {
        symptoms,
        duration,
        severity
      });
      setAnalysis(res.data);
      setStep(2);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to analyze symptoms');
    } finally {
      setLoading(false);
    }
  };

  const selectDoctor = (doctor: any) => {
    setSelectedDoctor(doctor);
    setStep(3);
  };

  const submitAppointmentRequest = async () => {
    if (!selectedDate || !selectedTimeSlot || !reason.trim()) {
      Alert.alert('Required', 'Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      await api.post('/appointments/request', {
        doctor_id: selectedDoctor.id,
        hospital_id: selectedDoctor.hospital,
        requested_date: selectedDate,
        requested_time_slot: selectedTimeSlot,
        symptoms,
        reason,
        urgency: analysis?.urgency_level || 'routine'
      });

      Alert.alert(
        'Success!',
        'Your appointment request has been sent to the doctor. You will be notified once they respond.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to send request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => step > 1 ? setStep(step - 1) : router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book Appointment</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Progress Steps */}
      <View style={styles.progressBar}>
        {[1, 2, 3].map((s) => (
          <View key={s} style={[styles.progressDot, step >= s && styles.progressDotActive]} />
        ))}
      </View>

      <ScrollView style={styles.content}>
        {/* STEP 1: Describe Symptoms */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Describe Your Symptoms</Text>
            <Text style={styles.stepSubtitle}>Help our AI understand your condition</Text>

            <Text style={styles.label}>What are you experiencing?</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="E.g., fever, headache, cough..."
              value={symptoms}
              onChangeText={setSymptoms}
              multiline
              numberOfLines={4}
            />

            <Text style={styles.label}>How long have you had these symptoms?</Text>
            <View style={styles.optionsRow}>
              {['1-2 days', '3-7 days', 'Over a week', 'Over a month'].map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.optionBtn, duration === d && styles.optionBtnActive]}
                  onPress={() => setDuration(d)}
                >
                  <Text style={[styles.optionText, duration === d && styles.optionTextActive]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Severity Level</Text>
            <View style={styles.optionsRow}>
              {['mild', 'moderate', 'severe'].map((sev) => (
                <TouchableOpacity
                  key={sev}
                  style={[styles.optionBtn, severity === sev && styles.optionBtnActive]}
                  onPress={() => setSeverity(sev)}
                >
                  <Text style={[styles.optionText, severity === sev && styles.optionTextActive]}>
                    {sev.charAt(0).toUpperCase() + sev.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.nextButton}
              onPress={analyzeSymptoms}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <>
                  <Text style={styles.nextButtonText}>Analyze with AI</Text>
                  <Ionicons name="sparkles" size={20} color={Colors.white} />
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 2: AI Analysis & Doctor Recommendations */}
        {step === 2 && analysis && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>AI Analysis Results</Text>

            {/* Analysis Card */}
            <View style={[styles.card, { backgroundColor: '#E8F4FD' }]}>
              <View style={styles.cardHeader}>
                <Ionicons name="sparkles" size={20} color={Colors.primary} />
                <Text style={styles.cardTitle}>Health Assessment</Text>
              </View>
              <Text style={styles.analysisText}>{analysis.analysis}</Text>

              <View style={styles.urgencyBadge}>
                <Text style={styles.urgencyText}>
                  Urgency: {analysis.urgency_level.toUpperCase()}
                </Text>
              </View>

              <Text style={styles.specialitiesLabel}>Recommended Specialities:</Text>
              <View style={styles.specialitiesRow}>
                {analysis.recommended_specialities.map((spec: string, i: number) => (
                  <View key={i} style={styles.specialityBadge}>
                    <Text style={styles.specialityText}>{spec}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Recommended Doctors */}
            <Text style={styles.sectionTitle}>Recommended Doctors</Text>
            {analysis.recommended_doctors.length === 0 ? (
              <Text style={styles.emptyText}>No doctors available matching your symptoms</Text>
            ) : (
              analysis.recommended_doctors.map((doctor: any) => (
                <TouchableOpacity
                  key={doctor.id}
                  style={styles.doctorCard}
                  onPress={() => selectDoctor(doctor)}
                >
                  <View style={styles.doctorIcon}>
                    <Ionicons name="person" size={24} color={Colors.primary} />
                  </View>
                  <View style={styles.doctorInfo}>
                    <Text style={styles.doctorName}>{doctor.name}</Text>
                    <Text style={styles.doctorSpeciality}>{doctor.speciality}</Text>
                    <Text style={styles.doctorHospital}>{doctor.hospital}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* STEP 3: Select Date & Time */}
        {step === 3 && selectedDoctor && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Schedule Appointment</Text>

            {/* Selected Doctor Info */}
            <View style={styles.selectedDoctorCard}>
              <Text style={styles.selectedDoctorName}>{selectedDoctor.name}</Text>
              <Text style={styles.selectedDoctorSpec}>{selectedDoctor.speciality}</Text>
              <Text style={styles.selectedDoctorHospital}>{selectedDoctor.hospital}</Text>
            </View>

            <Text style={styles.label}>Preferred Date</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD (e.g., 2026-08-15)"
              value={selectedDate}
              onChangeText={setSelectedDate}
            />

            <Text style={styles.label}>Preferred Time Slot</Text>
            <View style={styles.timeSlotGrid}>
              {['09:00-10:00', '10:00-11:00', '11:00-12:00', '14:00-15:00', '15:00-16:00', '16:00-17:00'].map((slot) => (
                <TouchableOpacity
                  key={slot}
                  style={[styles.timeSlotBtn, selectedTimeSlot === slot && styles.timeSlotBtnActive]}
                  onPress={() => setSelectedTimeSlot(slot)}
                >
                  <Text style={[styles.timeSlotText, selectedTimeSlot === slot && styles.timeSlotTextActive]}>
                    {slot}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Reason for Visit</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Brief reason for consultation..."
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity
              style={styles.nextButton}
              onPress={submitAppointmentRequest}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <>
                  <Text style={styles.nextButtonText}>Send Request</Text>
                  <Ionicons name="paper-plane" size={20} color={Colors.white} />
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.textDark },
  progressBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: Colors.white,
  },
  progressDot: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
  },
  progressDotActive: { backgroundColor: Colors.primary },
  content: { flex: 1, padding: 16 },
  stepContainer: { flex: 1 },
  stepTitle: { fontSize: 22, fontWeight: 'bold', color: Colors.textDark, marginBottom: 8 },
  stepSubtitle: { fontSize: 14, color: Colors.textMuted, marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.textDark, marginBottom: 8, marginTop: 16 },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    backgroundColor: Colors.white,
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  optionBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  optionText: { fontSize: 13, color: Colors.textDark, fontWeight: '600' },
  optionTextActive: { color: Colors.white },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 12,
    marginTop: 32,
  },
  nextButtonText: { color: Colors.white, fontSize: 16, fontWeight: 'bold' },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.textDark },
  analysisText: { fontSize: 14, color: Colors.textDark, lineHeight: 22, marginBottom: 12 },
  urgencyBadge: {
    backgroundColor: '#FFF3CD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  urgencyText: { fontSize: 12, fontWeight: 'bold', color: '#856404' },
  specialitiesLabel: { fontSize: 12, fontWeight: '600', color: Colors.textMuted, marginBottom: 8 },
  specialitiesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  specialityBadge: {
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  specialityText: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.textDark, marginTop: 16, marginBottom: 12 },
  emptyText: { textAlign: 'center', color: Colors.textMuted, fontSize: 14, paddingVertical: 20 },
  doctorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  doctorIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  doctorInfo: { flex: 1 },
  doctorName: { fontSize: 16, fontWeight: 'bold', color: Colors.textDark },
  doctorSpeciality: { fontSize: 13, color: Colors.primary, marginTop: 2 },
  doctorHospital: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  selectedDoctorCard: {
    backgroundColor: Colors.primary + '10',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  selectedDoctorName: { fontSize: 18, fontWeight: 'bold', color: Colors.textDark },
  selectedDoctorSpec: { fontSize: 14, color: Colors.primary, marginTop: 4 },
  selectedDoctorHospital: { fontSize: 13, color: Colors.textMuted, marginTop: 4 },
  timeSlotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeSlotBtn: {
    width: '31%',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  timeSlotBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  timeSlotText: { fontSize: 13, fontWeight: '600', color: Colors.textDark },
  timeSlotTextActive: { color: Colors.white },
});
