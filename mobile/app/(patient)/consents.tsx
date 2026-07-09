import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import patientApi from '../../services/patientApi';
import api from '../../services/api';
import ConsentCard from '../../components/ConsentCard';
import LoadingSkeleton from '../../components/LoadingSkeleton';

export default function ConsentsScreen() {
  const [consents, setConsents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [dataScope, setDataScope] = useState('full');
  const [expiresDays, setExpiresDays] = useState(30);

  useEffect(() => {
    loadConsents();
  }, []);

  const loadConsents = async () => {
    try {
      const data = await patientApi.getMyConsents();
      setConsents(data || []);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  const loadDoctors = async () => {
    setDoctorsLoading(true);
    try {
      const res = await api.get('/auth/doctors');
      setDoctors(res.data || []);
    } catch (e) {
      console.warn('Failed to load doctors', e);
    } finally {
      setDoctorsLoading(false);
    }
  };

  const openModal = () => {
    setModalVisible(true);
    setSelectedDoctor(null);
    loadDoctors();
  };

  const handleRevoke = async (id: string) => {
    try {
      await patientApi.revokeConsent(id);
      loadConsents();
    } catch (e) {
      alert('Failed to revoke consent');
    }
  };

  const handleGrant = async () => {
    if (!selectedDoctor) return alert('Please select a doctor');
    try {
      await patientApi.grantConsent({
        granted_to_id:   selectedDoctor.id,
        granted_to_name: selectedDoctor.name,
        data_scope:      dataScope,
        expires_days:    expiresDays,
      });
      setModalVisible(false);
      setSelectedDoctor(null);
      loadConsents();
    } catch (e) {
      alert('Failed to grant consent');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {/* handled by nav technically but this is inside tabs */}} style={{position: 'absolute', top: 55, left: 16, zIndex: 10}}>
          {/* Usually router.back() here in a stack, but it's okay without if it's a tab or pushed */}
        </TouchableOpacity>
        <Text style={styles.title}>My Data Consents</Text>
        <Text style={styles.subtitle}>Control who can see your medical records</Text>
      </View>

      {loading ? (
        <View style={styles.listContent}>
          <LoadingSkeleton height={150} style={{marginVertical: 6}} />
        </View>
      ) : consents.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="shield-checkmark" size={64} color="#CCC" />
          <Text style={styles.emptyText}>No active consents.</Text>
          <Text style={styles.emptySubtext}>No one currently has access to your records. Your data is private.</Text>
        </View>
      ) : (
        <FlatList
          data={consents}
          keyExtractor={(c) => c.id || c._id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <ConsentCard consent={item} onRevoke={handleRevoke} />
          )}
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openModal}>
        <Ionicons name="add" size={24} color="#FFF" />
        <Text style={styles.fabText}>Grant Access</Text>
      </TouchableOpacity>

      {/* Grant Access Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Grant Doctor Access</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {/* Doctor List */}
            <Text style={styles.inputLabel}>Select Doctor</Text>
            {doctorsLoading ? (
              <ActivityIndicator size="small" color="#1B6CA8" style={{ marginVertical: 16 }} />
            ) : doctors.length === 0 ? (
              <Text style={styles.emptyDoctors}>No doctors found. Try again later.</Text>
            ) : (
              <View style={styles.doctorList}>
                {doctors.map(doc => (
                  <TouchableOpacity
                    key={doc.id}
                    style={[styles.doctorItem, selectedDoctor?.id === doc.id && styles.doctorItemSelected]}
                    onPress={() => setSelectedDoctor(doc)}
                  >
                    <View style={styles.doctorInfo}>
                      <Text style={[styles.doctorName, selectedDoctor?.id === doc.id && { color: '#1B6CA8' }]}>
                        {doc.name}
                      </Text>
                      <Text style={styles.doctorMeta}>{doc.speciality} • {doc.hospital}</Text>
                    </View>
                    {selectedDoctor?.id === doc.id && (
                      <Ionicons name="checkmark-circle" size={20} color="#1B6CA8" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Access Level */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Access Level</Text>
              <View style={styles.rowChoices}>
                <TouchableOpacity
                  style={[styles.choiceBtn, dataScope === 'full' && styles.choiceBtnActive]}
                  onPress={() => setDataScope('full')}
                >
                  <Text style={[styles.choiceText, dataScope === 'full' && styles.choiceTextActive]}>Full History</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.choiceBtn, dataScope === 'visit_only' && styles.choiceBtnActive]}
                  onPress={() => setDataScope('visit_only')}
                >
                  <Text style={[styles.choiceText, dataScope === 'visit_only' && styles.choiceTextActive]}>Visit Only</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Duration */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Duration</Text>
              <View style={styles.rowChoices}>
                {[7, 30, 90].map(days => (
                  <TouchableOpacity
                    key={days}
                    style={[styles.choiceBtn, expiresDays === days && styles.choiceBtnActive]}
                    onPress={() => setExpiresDays(days)}
                  >
                    <Text style={[styles.choiceText, expiresDays === days && styles.choiceTextActive]}>{days}d</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity style={[styles.grantBtn, !selectedDoctor && styles.grantBtnDisabled]} onPress={handleGrant} disabled={!selectedDoctor}>
              <Text style={styles.grantBtnText}>
                {selectedDoctor ? `Grant Access to ${selectedDoctor.name}` : 'Select a doctor first'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#555',
    marginTop: 16,
  },
  emptySubtext: {
    textAlign: 'center',
    color: '#888',
    marginTop: 8,
    lineHeight: 22,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    backgroundColor: '#F57F17',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  fabText: {
    color: '#FFF',
    fontWeight: 'bold',
    marginLeft: 4,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  rowChoices: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  choiceBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  choiceBtnActive: {
    backgroundColor: '#E8F4FD',
    borderColor: '#1B6CA8',
  },
  choiceText: {
    color: '#666',
    fontWeight: '500',
  },
  choiceTextActive: {
    color: '#1B6CA8',
    fontWeight: 'bold',
  },
  grantBtn: {
    backgroundColor: '#1B6CA8',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  grantBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
  grantBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  doctorList: {
    maxHeight: 200,
    marginBottom: 16,
  },
  doctorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
    backgroundColor: '#F8FAFC',
  },
  doctorItemSelected: {
    borderColor: '#1B6CA8',
    backgroundColor: '#EFF6FF',
  },
  doctorInfo: { flex: 1 },
  doctorName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  doctorMeta: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  emptyDoctors: {
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: 14,
    marginVertical: 16,
  },
});
