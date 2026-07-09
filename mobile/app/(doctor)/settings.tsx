import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, ScrollView, Switch, Alert, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { router } from 'expo-router';
import api from '../../services/api';

export default function DoctorSettings() {
  const { user, logout, refreshUser } = useAuthStore();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [urgentAlertsEnabled, setUrgentAlertsEnabled] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout', style: 'destructive', onPress: async () => {
          await logout();
          router.replace('/(auth)/welcome');
        }
      }
    ]);
  };

  const handleRefreshProfile = async () => {
    setRefreshing(true);
    await refreshUser();
    setRefreshing(false);
    Alert.alert('Refreshed', 'Profile data updated.');
  };

  const Section = ({ title }: { title: string }) => (
    <Text style={styles.sectionTitle}>{title}</Text>
  );

  const Row = ({ icon, label, value, onPress, right }: any) => (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
      <View style={styles.rowLeft}>
        <View style={styles.iconBox}>
          <Ionicons name={icon} size={18} color="#1B6CA8" />
        </View>
        <View>
          <Text style={styles.rowLabel}>{label}</Text>
          {value ? <Text style={styles.rowValue}>{value}</Text> : null}
        </View>
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color="#CBD5E1" /> : null)}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        {refreshing && <ActivityIndicator size="small" color="#fff" />}
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* Profile */}
        <Section title="MY PROFILE" />
        <View style={styles.card}>
          <View style={styles.profileBlock}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0)?.toUpperCase() || 'D'}
              </Text>
            </View>
            <View>
              <Text style={styles.profileName}>{user?.name || '—'}</Text>
              <Text style={styles.profileRole}>{user?.role?.toUpperCase()} • {user?.hospital || '—'}</Text>
              <Text style={styles.profileId}>ID: {user?.id?.slice(-8).toUpperCase() || '—'}</Text>
            </View>
          </View>
        </View>

        {/* Account Info */}
        <Section title="ACCOUNT" />
        <View style={styles.card}>
          <Row icon="call-outline"     label="Mobile"   value={user?.mobile || '—'} />
          <Row icon="mail-outline"     label="Email"    value={user?.email || '—'} />
          <Row icon="business-outline" label="Hospital" value={user?.hospital || '—'} />
          <Row icon="location-outline" label="District" value={user?.district || '—'} />
        </View>

        {/* Notifications */}
        <Section title="NOTIFICATIONS" />
        <View style={styles.card}>
          <Row
            icon="notifications-outline"
            label="Queue Alerts"
            right={
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: '#E2E8F0', true: '#BFDBFE' }}
                thumbColor={notificationsEnabled ? '#1B6CA8' : '#94A3B8'}
              />
            }
          />
          <Row
            icon="warning-outline"
            label="Urgent Case Alerts"
            right={
              <Switch
                value={urgentAlertsEnabled}
                onValueChange={setUrgentAlertsEnabled}
                trackColor={{ false: '#E2E8F0', true: '#FEE2E2' }}
                thumbColor={urgentAlertsEnabled ? '#EF4444' : '#94A3B8'}
              />
            }
          />
        </View>

        {/* Actions */}
        <Section title="ACTIONS" />
        <View style={styles.card}>
          <Row
            icon="refresh-outline"
            label="Refresh Profile from Server"
            onPress={handleRefreshProfile}
          />
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Logout from Ayu Disha</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Ayu Disha v1.0 • Doctor Portal</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#F8FAFC' },
  header:      { backgroundColor: '#1B6CA8', padding: 20, paddingTop: 52, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title:       { color: '#fff', fontSize: 22, fontWeight: '800' },
  content:     { padding: 16, paddingBottom: 48 },
  sectionTitle:{ fontSize: 10, fontWeight: '800', color: '#94A3B8', letterSpacing: 1.5, marginTop: 24, marginBottom: 8, marginLeft: 4 },
  card:        { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#F1F5F9' },
  profileBlock:{ flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20 },
  avatar:      { width: 60, height: 60, borderRadius: 30, backgroundColor: '#1B6CA8', alignItems: 'center', justifyContent: 'center' },
  avatarText:  { fontSize: 24, fontWeight: '800', color: '#fff' },
  profileName: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  profileRole: { fontSize: 12, color: '#64748B', fontWeight: '600', marginTop: 2 },
  profileId:   { fontSize: 11, color: '#94A3B8', fontFamily: 'monospace', marginTop: 4 },
  row:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  rowLeft:     { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  iconBox:     { width: 36, height: 36, borderRadius: 10, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  rowLabel:    { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  rowValue:    { fontSize: 12, color: '#64748B', marginTop: 1 },
  logoutBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 18, borderWidth: 1, borderColor: '#FEE2E2', borderRadius: 16, backgroundColor: '#FFF1F2', marginTop: 24 },
  logoutText:  { color: '#EF4444', fontSize: 14, fontWeight: '800' },
  version:     { textAlign: 'center', fontSize: 11, color: '#CBD5E1', marginTop: 24 },
});
