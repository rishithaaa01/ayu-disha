import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import patientApi from '../../services/patientApi';
import MedicineCard from '../../components/MedicineCard';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import * as Notifications from 'expo-notifications'; // Placeholder for reminders

export default function MedicinesScreen() {
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPast, setShowPast] = useState(false);
  const [reminders, setReminders] = useState<{[key: string]: boolean}>({});

  useEffect(() => {
    loadMedicines();
  }, []);

  const loadMedicines = async () => {
    try {
      const data = await patientApi.getMyPrescriptions();
      setPrescriptions(data || []);
      
      // Initialize reminders state (mocked)
      const rMap: any = {};
      data?.forEach((m: any, i: number) => {
        rMap[`med_${i}`] = false;
      });
      setReminders(rMap);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const isRecent = (dateStr: string) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    return diffHours < 24;
  };

  const hasNewPrescription = prescriptions.some(p => isRecent(p.date || p.created_at));

  // Very simple filtering
  const currentMeds = prescriptions.filter(p => p.duration?.toLowerCase().includes('ongoing') || parseInt(p.duration) > 10);
  const pastMeds = prescriptions.filter(p => !currentMeds.includes(p));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Medicines</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadMedicines} color="#1B6CA8" />
        }
      >
        {hasNewPrescription && (
          <View style={styles.orderBanner}>
            <View style={styles.bannerIcon}>
              <Ionicons name="medical" size={20} color="#92400E" />
            </View>
            <View style={styles.bannerContent}>
              <Text style={styles.bannerTitle}>💊 New prescription ready</Text>
              <Text style={styles.bannerText}>You have new medicines from your recent visit. Order them now for home delivery.</Text>
            </View>
            <TouchableOpacity style={styles.orderButton}>
              <Text style={styles.orderButtonText}>ORDER</Text>
            </TouchableOpacity>
          </View>
        )}
        {loading ? (
          <>
            <LoadingSkeleton height={120} style={{marginBottom: 10}} />
            <LoadingSkeleton height={120} style={{marginBottom: 10}} />
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Currently Taking</Text>
            {currentMeds.length === 0 ? (
              <Text style={styles.emptyText}>No active medications right now.</Text>
            ) : (
              currentMeds.map((med, i) => (
                <MedicineCard
                  key={`cur_${i}`}
                  medicine={med}
                  isNew={isRecent(med.date || med.created_at)}
                  reminderEnabled={reminders[`med_cur_${i}`] || false}
                  onReminderToggle={(val) => toggleReminder(`med_cur_${i}`, val)}
                />
              ))
            )}

            <TouchableOpacity style={styles.pastHeader} onPress={() => setShowPast(!showPast)}>
              <Text style={styles.sectionTitle}>Past Medicines</Text>
              <Ionicons name={showPast ? "chevron-up" : "chevron-down"} size={24} color="#333" />
            </TouchableOpacity>

            {showPast && (
              pastMeds.length === 0 ? (
                <Text style={styles.emptyText}>No past records.</Text>
              ) : (
                pastMeds.map((med, i) => (
                  <MedicineCard
                    key={`past_${i}`}
                    medicine={med}
                    reminderEnabled={false}
                    onReminderToggle={() => {}}
                  />
                ))
              )
            )}
            
            <View style={{height: 20}} />
            <TouchableOpacity style={styles.setReminderBtn}>
              <Ionicons name="alarm-outline" size={20} color="#FFF" style={{marginRight: 8}} />
              <Text style={styles.setReminderText}>Set Custom Reminder</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
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
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  pastHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
  },
  emptyText: {
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  setReminderBtn: {
    backgroundColor: '#F57F17',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    marginTop: 16,
  },
  setReminderText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  orderBanner: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FEF3C7',
    gap: 12,
  },
  bannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400E',
    marginBottom: 2,
  },
  bannerText: {
    fontSize: 12,
    color: '#B45309',
    lineHeight: 16,
  },
  orderButton: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  orderButtonText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
  }
});
