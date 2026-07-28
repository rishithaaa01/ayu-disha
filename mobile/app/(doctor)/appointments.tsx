import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, SafeAreaView, RefreshControl, Alert, TextInput
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { Colors } from '../../constants/colors';

export default function DoctorAppointmentsScreen() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseMessage, setResponseMessage] = useState('');

  const loadAppointments = async () => {
    try {
      const res = await api.get('/appointments/pending-requests');
      setAppointments(res.data || []);
    } catch (err) {
      console.error('Failed to load appointments:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadAppointments();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadAppointments();
  };

  const handleResponse = async (appointmentId: string, action: 'accept' | 'reject') => {
    try {
      await api.post('/appointments/respond', {
        appointment_id: appointmentId,
        action,
        message: responseMessage.trim() || undefined
      });

      Alert.alert(
        'Success',
        `Appointment ${action}ed successfully. Patient has been notified.`,
        [{ text: 'OK' }]
      );

      setRespondingTo(null);
      setResponseMessage('');
      loadAppointments();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || `Failed to ${action} appointment`);
    }
  };

  const AppointmentRequestCard = ({ appointment }: any) => {
    const isResponding = respondingTo === appointment.id;

    return (
      <View style={styles.appointmentCard}>
        {/* Patient Info */}
        <View style={styles.patientHeader}>
          <View style={styles.patientIcon}>
            <Ionicons name="person" size={24} color={Colors.white} />
          </View>
          <View style={styles.patientInfo}>
            <Text style={styles.patientName}>{appointment.patient_name}</Text>
            <Text style={styles.requestDate}>
              Requested {new Date(appointment.created_at).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.urgencyBadge}>
            <Text style={styles.urgencyText}>{appointment.urgency?.toUpperCase() || 'ROUTINE'}</Text>
          </View>
        </View>

        {/* Appointment Details */}
        <View style={styles.detailsSection}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
            <Text style={styles.detailLabel}>Date:</Text>
            <Text style={styles.detailValue}>{appointment.requested_date}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={18} color={Colors.primary} />
            <Text style={styles.detailLabel}>Time:</Text>
            <Text style={styles.detailValue}>{appointment.requested_time_slot}</Text>
          </View>
        </View>

        {/* Symptoms & Reason */}
        <View style={styles.infoSection}>
          <Text style={styles.infoLabel}>Symptoms:</Text>
          <Text style={styles.infoText}>{appointment.symptoms}</Text>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoLabel}>Reason for Visit:</Text>
          <Text style={styles.infoText}>{appointment.reason}</Text>
        </View>

        {/* Response Section */}
        {!isResponding ? (
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={() => setRespondingTo(appointment.id)}
            >
              <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
              <Text style={styles.actionButtonText}>Respond</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => {
                Alert.alert(
                  'Reject Appointment',
                  'Are you sure you want to reject this appointment?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Reject',
                      style: 'destructive',
                      onPress: () => handleResponse(appointment.id, 'reject')
                    }
                  ]
                );
              }}
            >
              <Ionicons name="close-circle" size={20} color={Colors.white} />
              <Text style={styles.actionButtonText}>Quick Reject</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.responseSection}>
            <Text style={styles.responseLabel}>Optional Message to Patient:</Text>
            <TextInput
              style={styles.responseInput}
              placeholder="E.g., Please arrive 15 minutes early..."
              value={responseMessage}
              onChangeText={setResponseMessage}
              multiline
              numberOfLines={3}
            />
            <View style={styles.responseActionsRow}>
              <TouchableOpacity
                style={[styles.responseButton, styles.acceptButton]}
                onPress={() => handleResponse(appointment.id, 'accept')}
              >
                <Text style={styles.responseButtonText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.responseButton, styles.rejectButton]}
                onPress={() => handleResponse(appointment.id, 'reject')}
              >
                <Text style={styles.responseButtonText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.responseButton, styles.cancelButton]}
                onPress={() => {
                  setRespondingTo(null);
                  setResponseMessage('');
                }}
              >
                <Text style={[styles.responseButtonText, { color: Colors.textDark }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Appointment Requests</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginVertical: 40 }} />
        ) : appointments.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No Pending Requests</Text>
            <Text style={styles.emptyText}>
              New appointment requests from patients will appear here
            </Text>
          </View>
        ) : (
          appointments.map((appt) => <AppointmentRequestCard key={appt.id} appointment={appt} />)
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
  content: { flex: 1, padding: 16 },
  appointmentCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  patientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  patientIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  patientInfo: { flex: 1 },
  patientName: { fontSize: 18, fontWeight: 'bold', color: Colors.textDark },
  requestDate: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  urgencyBadge: {
    backgroundColor: '#FFF3CD',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  urgencyText: { fontSize: 10, fontWeight: 'bold', color: '#856404' },
  detailsSection: { marginBottom: 16 },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  detailLabel: { fontSize: 14, fontWeight: '600', color: Colors.textMuted },
  detailValue: { fontSize: 14, color: Colors.textDark, fontWeight: '500' },
  infoSection: { marginBottom: 12 },
  infoLabel: { fontSize: 12, fontWeight: '600', color: Colors.textMuted, marginBottom: 4 },
  infoText: { fontSize: 14, color: Colors.textDark, lineHeight: 20 },
  actionsRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  acceptButton: { backgroundColor: '#10B981' },
  rejectButton: { backgroundColor: '#EF4444' },
  actionButtonText: { color: Colors.white, fontSize: 14, fontWeight: 'bold' },
  responseSection: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: Colors.border },
  responseLabel: { fontSize: 13, fontWeight: '600', color: Colors.textDark, marginBottom: 8 },
  responseInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    backgroundColor: Colors.background,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  responseActionsRow: { flexDirection: 'row', gap: 8 },
  responseButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: { backgroundColor: Colors.background },
  responseButtonText: { color: Colors.white, fontSize: 13, fontWeight: 'bold' },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.textDark, marginTop: 16 },
  emptyText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', marginTop: 8 },
});
