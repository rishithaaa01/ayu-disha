import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../src/services/api';
import { useRouter } from 'expo-router';
import { User, Clock } from 'lucide-react-native';

export default function DoctorQueue() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchQueue = async () => {
    try {
      setLoading(true);
      const res = await api.get('/clinician/queue');
      setQueue(res.data);
    } catch (err) {
      console.log('Error fetching queue', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      className="bg-white p-4 rounded-3xl mb-4 border border-slate-100 flex-row items-center shadow-sm shadow-slate-200/50"
      onPress={() => router.push({ pathname: '/(doctor)/consult', params: { encounterId: item._id } })}
    >
      <View className="w-12 h-12 bg-slate-100 rounded-full items-center justify-center mr-4">
        <User size={24} color="#64748b" />
      </View>
      <View className="flex-1">
        <Text className="text-slate-800 font-bold text-base">{item.patient_name || 'Unknown Patient'}</Text>
        <Text className="text-slate-500 text-sm mt-1">{item.triage_notes || 'No triage notes'}</Text>
      </View>
      <View className="items-end">
        <View className="flex-row items-center">
          <Clock size={12} color="#94a3b8" />
          <Text className="text-slate-400 text-xs ml-1">Waiting</Text>
        </View>
        <Text className="text-orange-500 font-bold text-sm mt-1">{item.vitals?.bp || '--'}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="p-4 pt-6 flex-1">
        <Text className="text-slate-800 text-2xl font-bold mb-6">Patient Queue</Text>
        
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#0d9488" />
          </View>
        ) : (
          <FlatList
            data={queue}
            renderItem={renderItem}
            keyExtractor={item => item._id}
            contentContainerStyle={{ paddingBottom: 20 }}
            refreshing={loading}
            onRefresh={fetchQueue}
            ListEmptyComponent={
              <View className="items-center justify-center py-10">
                <Text className="text-slate-400 text-base">No patients currently in queue</Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}
