import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import patientApi from '../../services/patientApi';
import ConsentCard from '../../components/ConsentCard';
import LoadingSkeleton from '../../components/LoadingSkeleton';

export default function ConsentsScreen() {
  const [consents, setConsents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [newConsent, setNewConsent] = useState({
    granted_to_id: '',
    granted_to_name: '',
    data_scope: 'full',
    expires_days: 30
  });

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

  const handleRevoke = async (id: string) => {
    try {
      await patientApi.revokeConsent(id);
      loadConsents();
    } catch (e) {
      alert("Failed to revoke consent");
    }
  };

  const handleGrant = async () => {
    if (!newConsent.granted_to_name) return alert('Doctor name required');
    try {
      await patientApi.grantConsent(newConsent);
      setModalVisible(false);
      setNewConsent({...newConsent, granted_to_name: ''});
      loadConsents();
    } catch (e) {
      alert("Failed to grant consent");
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
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add" size={24} color="#FFF" />
        <Text style={styles.fabText}>Grant Access</Text>
      </TouchableOpacity>

      {/* Grant Access Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Grant New Access</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Doctor/Hospital Name</Text>
              <TextInput 
                style={styles.input} 
                placeholder="E.g. Dr. Ramesh Kumar"
                value={newConsent.granted_to_name}
                onChangeText={(t) => setNewConsent({...newConsent, granted_to_name: t})}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Access Level</Text>
              <View style={styles.rowChoices}>
                <TouchableOpacity 
                  style={[styles.choiceBtn, newConsent.data_scope === 'full' && styles.choiceBtnActive]}
                  onPress={() => setNewConsent({...newConsent, data_scope: 'full'})}
                >
                  <Text style={[styles.choiceText, newConsent.data_scope === 'full' && styles.choiceTextActive]}>Full History</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.choiceBtn, newConsent.data_scope === 'visit_only' && styles.choiceBtnActive]}
                  onPress={() => setNewConsent({...newConsent, data_scope: 'visit_only'})}
                >
                  <Text style={[styles.choiceText, newConsent.data_scope === 'visit_only' && styles.choiceTextActive]}>Visit Only</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Duration</Text>
              <View style={styles.rowChoices}>
                {[7, 30, 90].map(days => (
                  <TouchableOpacity 
                    key={days}
                    style={[styles.choiceBtn, newConsent.expires_days === days && styles.choiceBtnActive]}
                    onPress={() => setNewConsent({...newConsent, expires_days: days})}
                  >
                    <Text style={[styles.choiceText, newConsent.expires_days === days && styles.choiceTextActive]}>{days} d</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity style={styles.grantBtn} onPress={handleGrant}>
              <Text style={styles.grantBtnText}>Grant Access</Text>
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
  grantBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
