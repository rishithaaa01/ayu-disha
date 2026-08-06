import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShieldCheck, ShieldOff, Plus, X, User, Clock, ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import patientApi from '../../src/services/patientApi';

export default function ConsentsScreen() {
  const queryClient = useQueryClient();
  const router = useRouter();
  
  const [showGrantForm, setShowGrantForm] = useState(false);
  const [doctorId, setDoctorId] = useState('');
  const [scope, setScope] = useState('full');

  const { data: consents = [], isLoading } = useQuery({
    queryKey: ['patientConsents'],
    queryFn: patientApi.getMyConsents,
  });

  const grantMutation = useMutation({
    mutationFn: patientApi.grantConsent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientConsents'] });
      Alert.alert('Success', 'Access granted successfully');
      setShowGrantForm(false);
      setDoctorId('');
    },
    onError: () => Alert.alert('Error', 'Failed to grant access'),
  });

  const revokeMutation = useMutation({
    mutationFn: patientApi.revokeConsent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientConsents'] });
      Alert.alert('Success', 'Access revoked');
    },
    onError: () => Alert.alert('Error', 'Failed to revoke access'),
  });

  const handleGrant = () => {
    if (!doctorId.trim()) {
      Alert.alert('Validation Error', 'Please enter a Doctor ID, mobile number, or email');
      return;
    }
    grantMutation.mutate({
      granted_to_id: doctorId.trim(),
      data_scope: scope,
      expires_days: 30,
    });
  };

  const confirmRevoke = (id: string) => {
    Alert.alert(
      "Revoke Access",
      "Are you sure you want to revoke this doctor's access to your medical records?",
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Revoke', style: 'destructive', onPress: () => revokeMutation.mutate(id) },
      ]
    );
  };

  const activeConsents = consents.filter((c: any) => !c.revoked);
  const revokedConsents = consents.filter((c: any) => c.revoked);

  return (
    <SafeAreaView className="flex-1 bg-[#F7F3EE]">
      <View className="flex-row items-center justify-between px-4 pt-4 pb-2">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ChevronLeft size={24} color="#374151" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setShowGrantForm(true)}
          className="flex-row items-center bg-[#1B6CA8] px-4 py-2 rounded-xl"
        >
          <Plus size={16} color="white" className="mr-1" />
          <Text className="text-white font-bold text-sm">Grant</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-4 pt-2" showsVerticalScrollIndicator={false}>
        <View className="mb-6">
          <Text className="text-2xl font-bold text-gray-800">Data Consents</Text>
          <Text className="text-gray-500 text-sm mt-1">Control who can access your medical records</Text>
        </View>

        {/* Info Banner */}
        <View className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 flex-row items-start">
          <ShieldCheck size={20} color="#1B6CA8" className="mr-3 mt-0.5" />
          <View className="flex-1">
            <Text className="font-semibold text-blue-800 text-sm mb-1">Your data, your control</Text>
            <Text className="text-blue-700 text-xs">
              Doctors can only see your full medical history when you explicitly grant them access. You can revoke access at any time.
            </Text>
          </View>
        </View>

        {/* Active Consents */}
        <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 ml-1">
          Active Consents ({activeConsents.length})
        </Text>
        
        {isLoading ? (
          <View className="py-10 items-center justify-center">
            <ActivityIndicator size="large" color="#1B6CA8" />
          </View>
        ) : activeConsents.length === 0 ? (
          <View className="bg-white rounded-2xl border border-gray-100 p-8 items-center mb-6">
            <ShieldCheck size={40} color="#d1d5db" className="mb-3" />
            <Text className="text-gray-500 font-medium">No active consents</Text>
            <Text className="text-gray-400 text-xs mt-1 text-center">Grant a doctor access to your records when needed</Text>
          </View>
        ) : (
          <View className="mb-6">
            {activeConsents.map((consent: any, index: number) => (
              <View key={consent._id || consent.id || index} className="bg-white rounded-2xl border border-green-100 shadow-sm p-4 mb-3">
                <View className="flex-row items-start justify-between">
                  <View className="flex-row items-start flex-1 mr-2">
                    <View className="bg-green-100 p-2.5 rounded-xl mr-3">
                      <User size={18} color="#16a34a" />
                    </View>
                    <View className="flex-1">
                      <Text className="font-bold text-gray-800 text-base">{consent.doctor_name || consent.granted_to_id}</Text>
                      
                      <View className="flex-row items-center flex-wrap gap-y-2 mt-1">
                        <View className={`px-2 py-0.5 rounded-full mr-2 ${consent.data_scope === 'full' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                          <Text className={`text-[10px] font-bold ${consent.data_scope === 'full' ? 'text-blue-700' : 'text-gray-600'}`}>
                            {consent.data_scope === 'full' ? 'Full Access' : 'Limited Access'}
                          </Text>
                        </View>
                        {consent.created_at && (
                          <View className="flex-row items-center">
                            <Clock size={10} color="#9ca3af" className="mr-1" />
                            <Text className="text-[10px] text-gray-500">
                              Granted {new Date(consent.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                            </Text>
                          </View>
                        )}
                      </View>
                      
                      {consent.expires_at && (
                        <Text className="text-[10px] text-amber-600 mt-1.5 font-medium">
                          Expires: {new Date(consent.expires_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                        </Text>
                      )}
                    </View>
                  </View>
                  
                  <TouchableOpacity
                    onPress={() => confirmRevoke(consent.id)}
                    disabled={revokeMutation.isPending}
                    className="flex-row items-center bg-red-50 px-3 py-1.5 rounded-lg"
                  >
                    {revokeMutation.isPending ? (
                      <ActivityIndicator size="small" color="#ef4444" />
                    ) : (
                      <>
                        <ShieldOff size={12} color="#ef4444" className="mr-1" />
                        <Text className="text-red-500 text-xs font-bold">Revoke</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Revoked Consents */}
        {revokedConsents.length > 0 && (
          <View className="mb-10">
            <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">
              Revoked ({revokedConsents.length})
            </Text>
            {revokedConsents.map((consent: any, index: number) => (
              <View key={consent._id || consent.id || index} className="bg-white/60 rounded-2xl border border-gray-100 p-4 mb-3 opacity-70">
                <View className="flex-row items-center">
                  <View className="bg-gray-100 p-2.5 rounded-xl mr-3">
                    <User size={18} color="#9ca3af" />
                  </View>
                  <View>
                    <Text className="font-semibold text-gray-600">{consent.doctor_name || consent.granted_to_id}</Text>
                    <Text className="text-xs text-gray-400 mt-0.5">Access revoked</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
        <View className="h-10" />
      </ScrollView>

      {/* Grant Modal */}
      <Modal
        visible={showGrantForm}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowGrantForm(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 justify-end bg-black/50"
        >
          <View className="bg-white rounded-t-3xl p-6 h-[80%]">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-bold text-gray-800">Grant Doctor Access</Text>
              <TouchableOpacity onPress={() => setShowGrantForm(false)} className="p-2 bg-gray-100 rounded-full">
                <X size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="mb-6">
                <Text className="text-sm font-bold text-gray-700 mb-2">Doctor ID</Text>
                <TextInput
                  value={doctorId}
                  onChangeText={setDoctorId}
                  placeholder="Doctor's mobile number or email"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-slate-800"
                  autoCapitalize="none"
                />
                <Text className="text-xs text-gray-400 mt-1 ml-1">Enter the doctor's registered mobile number or email</Text>
              </View>

              <View className="mb-8">
                <Text className="text-sm font-bold text-gray-700 mb-3">Access Level</Text>
                
                <TouchableOpacity 
                  onPress={() => setScope('full')}
                  className={`p-4 rounded-xl border mb-3 flex-row items-center ${scope === 'full' ? 'border-[#1B6CA8] bg-blue-50' : 'border-gray-200'}`}
                >
                  <View className={`w-5 h-5 rounded-full border-2 mr-3 items-center justify-center ${scope === 'full' ? 'border-[#1B6CA8]' : 'border-gray-300'}`}>
                    {scope === 'full' && <View className="w-2.5 h-2.5 rounded-full bg-[#1B6CA8]" />}
                  </View>
                  <View>
                    <Text className="font-bold text-gray-800">Full Access</Text>
                    <Text className="text-xs text-gray-500 mt-0.5">All visits, prescriptions, and lab results</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={() => setScope('limited')}
                  className={`p-4 rounded-xl border flex-row items-center ${scope === 'limited' ? 'border-[#1B6CA8] bg-blue-50' : 'border-gray-200'}`}
                >
                  <View className={`w-5 h-5 rounded-full border-2 mr-3 items-center justify-center ${scope === 'limited' ? 'border-[#1B6CA8]' : 'border-gray-300'}`}>
                    {scope === 'limited' && <View className="w-2.5 h-2.5 rounded-full bg-[#1B6CA8]" />}
                  </View>
                  <View>
                    <Text className="font-bold text-gray-800">Limited Access</Text>
                    <Text className="text-xs text-gray-500 mt-0.5">Only current visit and allergies</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View className="mt-auto pt-4 pb-8">
              <TouchableOpacity
                onPress={handleGrant}
                disabled={grantMutation.isPending}
                className="bg-[#1B6CA8] py-4 rounded-xl items-center"
              >
                {grantMutation.isPending ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-lg">Grant Access</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
