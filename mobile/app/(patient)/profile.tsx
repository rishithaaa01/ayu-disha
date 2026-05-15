import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import patientApi from '../../services/patientApi';
import { useAuthStore } from '../../store/authStore';
import LoadingSkeleton from '../../components/LoadingSkeleton';

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await patientApi.getMyProfile();
      setProfile(data);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: async () => {
        await useAuthStore.getState().logout();
        router.replace('/(auth)/welcome');
      }}
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      {loading ? (
        <View style={styles.skeletonContainer}>
          <LoadingSkeleton height={100} width={100} borderRadius={50} style={styles.avatarSkeleton} />
          <LoadingSkeleton height={24} width={200} style={{marginBottom: 8}} />
          <LoadingSkeleton height={16} width={150} />
        </View>
      ) : profile ? (
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{profile.name?.charAt(0) || 'P'}</Text>
          </View>
          <Text style={styles.name}>{profile.name}</Text>
          <Text style={styles.abha}>ABHA: {profile.abha_number || 'Not Linked'}</Text>
          <Text style={styles.mobile}>Mobile: {profile.mobile || '+91'}</Text>
        </View>
      ) : (
        <View style={styles.header}>
          <Text>Could not load profile. Please make sure you have created one.</Text>
        </View>
      )}

      {profile && (
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Health Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Blood Group</Text>
            <Text style={styles.infoValue}>{profile.blood_group || '-'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Allergies</Text>
            <Text style={styles.infoValue}>{profile.allergies?.join(', ') || 'None'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Location</Text>
            <Text style={styles.infoValue}>{profile.district}, {profile.state}</Text>
          </View>
        </View>
      )}

      <View style={styles.actionsSection}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(patient)/consents')}>
          <Ionicons name="shield-checkmark-outline" size={24} color="#1B6CA8" />
          <Text style={styles.actionBtnText}>Consent Manager</Text>
          <Ionicons name="chevron-forward" size={20} color="#ccc" style={styles.chevron} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn}>
          <Ionicons name="language-outline" size={24} color="#1B6CA8" />
          <Text style={styles.actionBtnText}>Language Preference ({profile?.language?.toUpperCase() || 'EN'})</Text>
          <Ionicons name="chevron-forward" size={20} color="#ccc" style={styles.chevron} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 80,
    paddingBottom: 30,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ebebeb',
  },
  skeletonContainer: {
    paddingTop: 80,
    paddingBottom: 30,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  avatarSkeleton: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1B6CA8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  abha: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  mobile: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  infoSection: {
    backgroundColor: '#fff',
    marginTop: 16,
    padding: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#ebebeb',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  infoLabel: {
    width: 100,
    color: '#666',
  },
  infoValue: {
    flex: 1,
    color: '#333',
    fontWeight: '500',
  },
  actionsSection: {
    backgroundColor: '#fff',
    marginTop: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#ebebeb',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  actionBtnText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  chevron: {
    marginLeft: 'auto',
  },
  logoutBtn: {
    margin: 20,
    backgroundColor: '#FFEBEE',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderColor: '#FFCDD2',
    borderWidth: 1,
  },
  logoutText: {
    color: '#D32F2F',
    fontWeight: 'bold',
    fontSize: 16,
  }
});
