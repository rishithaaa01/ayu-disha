import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../src/services/api';
import { useRouter } from 'expo-router';
import { Search, User, Phone, MapPin, AlertTriangle, Clock, Activity, ChevronRight } from 'lucide-react-native';

export default function PatientsScreen() {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const res = await api.get('/clinician/patients');
      const data = Array.isArray(res.data) ? res.data : [];
      setPatients(data);
    } catch (err) {
      console.log('Error fetching patients', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const filteredPatients = patients.filter(patient => {
    const searchLower = searchQuery.toLowerCase();
    return (
      patient.name?.toLowerCase().includes(searchLower) ||
      patient.mobile?.includes(searchQuery) ||
      patient.village?.toLowerCase().includes(searchLower)
    );
  });

  const getRiskColor = (risk: string) => {
    switch(risk) {
      case 'high': return 'bg-red-100 text-red-700';
      case 'medium': return 'bg-orange-100 text-orange-700';
      default: return 'bg-green-100 text-green-700';
    }
  };

  const renderPatient = ({ item }: { item: any }) => (
    <TouchableOpacity 
      className="bg-white p-4 rounded-3xl mb-4 border border-slate-100 flex-row items-center shadow-sm shadow-slate-200/50"
      onPress={() => router.push({ pathname: '/(doctor)/queue', params: { patient_id: item.patient_id } })}
    >
      <View className="w-12 h-12 bg-blue-100 rounded-full items-center justify-center mr-4">
        <User size={24} color="#2563eb" />
      </View>
      <View className="flex-1">
        <View className="flex-row items-center mb-1">
          <Text className="text-slate-800 font-bold text-base mr-2">{item.name || 'Unknown'}</Text>
          {item.risk_level && (
            <View className={`px-2 py-0.5 rounded-full ${getRiskColor(item.risk_level).split(' ')[0]}`}>
              <Text className={`text-[10px] font-bold uppercase ${getRiskColor(item.risk_level).split(' ')[1]}`}>
                {item.risk_level} Risk
              </Text>
            </View>
          )}
        </View>
        <View className="flex-row items-center mb-1">
          <Text className="text-slate-500 text-xs font-semibold mr-2">{item.age}Y, {item.gender}</Text>
          {item.mobile && (
            <View className="flex-row items-center mr-2">
              <Phone size={10} color="#94a3b8" />
              <Text className="text-slate-500 text-xs ml-1">{item.mobile}</Text>
            </View>
          )}
        </View>
        {item.last_diagnosis && (
          <Text className="text-slate-600 text-xs mt-1" numberOfLines={1}>
            <Text className="font-bold">Last:</Text> {item.last_diagnosis}
          </Text>
        )}
      </View>
      <ChevronRight size={20} color="#cbd5e1" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="p-4 pt-6 flex-1">
        <Text className="text-slate-800 text-2xl font-bold mb-2">My Patients</Text>
        <Text className="text-slate-500 text-sm mb-6">Patients you manage</Text>

        <View className="bg-white flex-row items-center rounded-2xl px-4 h-12 mb-6 border border-slate-200 shadow-sm shadow-slate-200/50">
          <Search size={20} color="#94a3b8" />
          <TextInput
            className="flex-1 ml-3 text-slate-800"
            placeholder="Search by name, phone..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#0d9488" />
          </View>
        ) : (
          <FlatList
            data={filteredPatients}
            keyExtractor={(item) => item.patient_id}
            renderItem={renderPatient}
            refreshing={loading}
            onRefresh={fetchPatients}
            ListEmptyComponent={
              <View className="items-center justify-center py-10">
                <Text className="text-slate-400">No patients found</Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}
