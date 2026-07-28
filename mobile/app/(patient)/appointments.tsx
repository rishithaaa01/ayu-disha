import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, SafeAreaView, RefreshControl
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { Colors } from '../../constants/colors';

export default function MyAppointmentsScreen() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'appointments' | 'notifications'>('appointments');

  const loadData = async () => {
    try {
      const [apptsRes, notifsRes] = await Promise.all([
        api.get('/appointments/my-requests'),
        api.get('/appointments/notifications')
      ]);
      setAppointments(apptsRes.data || []);
      setNotifications(notifsRes.data || []);
    } catch (err) {
      console.error('Failed to load appointments:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const markNotificationRead = async (notifId: string) => {
    try {
      await api.patch(`/appointments/notifications/${notifId}/read`);
      setNotifications(notifications.map(n => 
        n.id === notifId ? { ...n, read: true } : n
      ));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return '#10B981';
      case 'rejected': return '#EF4444';
      case 'pending': return '#F59E0B';
      default: return Colors.textMuted;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted': return 'checkmark-circle';
      case 'rejected': return 'close-circle';
      case 'pending': return 'time';
      default: return 'help-circle';
    }
  };

  const AppointmentCard = ({ appointment }: any) => {
    const statusColor = getStatusColor(appointment.status);
    const statusIcon = getStatusIcon(appointment.status);

    return (
      <View style={styles.appointmentCard}>
        <View style={styles.appointmentHeader}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Ionicons name={statusIcon} size={16} color={statusColor} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {appointment.status.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.appointmentDate}>
            {new Date(appointment.created_at).toLocaleDateString()}
          </Text>
        </View>

        <Text style={styles.doctorName}>Dr. {appointment.doctor_name}</Text>
        <Text style={styles.hospitalName}>{appointment.hospital_name}</Text>

        <View style={styles.appointmentDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color={Colors.textMuted} />
            <Text style={styles.detailText}>{appointment.requested_date}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={16} color={Colors.textMuted} />
            <Text style={styles.detailText}>{appointment.requested_time_slot}</Text>
          </View>
        </View>

        <Text style={styles.reasonLabel}>Reason:</Text>
        <Text style={styles.reasonText}>{appointment.reason}</Text>

        {appointment.response_message && (
          <View style={[styles.responseBox, { backgroundColor: statusColor + '10' }]}>
            <Text style={styles.responseLabel}>Doctor's Response:</Text>
            <Text style={styles.responseText}>{appointment.response_message}</Text>
          </View>
        )}
      </View>
    );
  };

  const NotificationCard = ({ notification }: any) => {
    return (
      <TouchableOpacity
        style={[styles.notificationCard, !notification.read && styles.notificationUnread]}
        onPress={() => markNotificationRead(notification.id)}
      >
        <View style={styles.notificationIcon}>
          <Ionicons
            name={notification.type === 'appointment_response' ? 'notifications' : 'calendar'}
            size={20}
            color={Colors.primary}
          />
        </View>
        <View style={styles.notificationContent}>
          <Text style={styles.notificationTitle}>{notification.title}</Text>
          <Text style={styles.notificationMessage}>{notification.message}</Text>
          <Text style={styles.notificationTime}>
            {new Date(notification.created_at).toLocaleString()}
          </Text>
        </View>
        {!notification.read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Appointments</Text>
        <TouchableOpacity onPress={() => router.push('/(patient)/book-appointment')}>
          <Ionicons name="add-circle" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'appointments' && styles.tabActive]}
          onPress={() => setActiveTab('appointments')}
        >
          <Text style={[styles.tabText, activeTab === 'appointments' && styles.tabTextActive]}>
            Appointments ({appointments.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'notifications' && styles.tabActive]}
          onPress={() => setActiveTab('notifications')}
        >
          <Text style={[styles.tabText, activeTab === 'notifications' && styles.tabTextActive]}>
            Notifications ({notifications.filter(n => !n.read).length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginVertical: 40 }} />
        ) : (
          <>
            {activeTab === 'appointments' && (
              <>
                {appointments.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="calendar-outline" size={64} color={Colors.textMuted} />
                    <Text style={styles.emptyTitle}>No Appointments Yet</Text>
                    <Text style={styles.emptyText}>
                      Book your first appointment with AI-powered doctor recommendations
                    </Text>
                    <TouchableOpacity
                      style={styles.bookButton}
                      onPress={() => router.push('/(patient)/book-appointment')}
                    >
                      <Text style={styles.bookButtonText}>Book Appointment</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  appointments.map((appt) => <AppointmentCard key={appt.id} appointment={appt} />)
                )}
              </>
            )}

            {activeTab === 'notifications' && (
              <>
                {notifications.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="notifications-outline" size={64} color={Colors.textMuted} />
                    <Text style={styles.emptyTitle}>No Notifications</Text>
                    <Text style={styles.emptyText}>
                      You'll receive notifications when doctors respond to your appointments
                    </Text>
                  </View>
                ) : (
                  notifications.map((notif) => (
                    <NotificationCard key={notif.id} notification={notif} />
                  ))
                )}
              </>
            )}
          </>
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
  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: Colors.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: Colors.textMuted },
  tabTextActive: { color: Colors.primary },
  content: { flex: 1, padding: 16 },
  appointmentCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: { fontSize: 11, fontWeight: 'bold' },
  appointmentDate: { fontSize: 12, color: Colors.textMuted },
  doctorName: { fontSize: 18, fontWeight: 'bold', color: Colors.textDark, marginBottom: 4 },
  hospitalName: { fontSize: 14, color: Colors.textMuted, marginBottom: 12 },
  appointmentDetails: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { fontSize: 13, color: Colors.textMuted },
  reasonLabel: { fontSize: 12, fontWeight: '600', color: Colors.textMuted, marginBottom: 4 },
  reasonText: { fontSize: 14, color: Colors.textDark },
  responseBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
  },
  responseLabel: { fontSize: 12, fontWeight: 'bold', color: Colors.textDark, marginBottom: 4 },
  responseText: { fontSize: 13, color: Colors.textDark },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  notificationUnread: { borderLeftWidth: 4, borderLeftColor: Colors.primary },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: { flex: 1 },
  notificationTitle: { fontSize: 15, fontWeight: 'bold', color: Colors.textDark, marginBottom: 4 },
  notificationMessage: { fontSize: 13, color: Colors.textMuted, marginBottom: 4 },
  notificationTime: { fontSize: 11, color: Colors.textMuted },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.textDark, marginTop: 16 },
  emptyText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', marginTop: 8 },
  bookButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 20,
  },
  bookButtonText: { color: Colors.white, fontSize: 14, fontWeight: 'bold' },
});
