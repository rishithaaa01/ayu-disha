import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../src/services/api';
import { useRouter } from 'expo-router';
import { FileText, ArrowRight, Activity, Clock } from 'lucide-react-native';

export default function ReferralsScreen() {
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchReferrals = async () => {
    try {
      setLoading(true);
      const res = await api.get('/clinician/referrals');
      setReferrals(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.log('Error fetching referrals', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferrals();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-orange-100 text-orange-700';
    }
  };

  const renderReferral = ({ item }: { item: any }) => (
    <View className="bg-white p-4 rounded-3xl mb-4 border border-slate-100 shadow-sm shadow-slate-200/50">
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-1">
          <Text className="text-slate-800 font-bold text-base mb-1">{item.patient_name || 'Unknown Patient'}</Text>
          <View className="flex-row items-center">
            <Text className="text-slate-500 text-xs">To: </Text>
            <Text className="text-teal-700 font-semibold text-xs">{item.referred_to_department || 'General'}</Text>
          </View>
        </View>
        <View className={`px-2 py-1 rounded-lg ${getStatusColor(item.status).split(' ')[0]}`}>
          <Text className={`text-[10px] font-bold uppercase ${getStatusColor(item.status).split(' ')[1]}`}>
            {item.status || 'Pending'}
          </Text>
        </View>
      </View>

      <View className="bg-slate-50 p-3 rounded-xl mb-3 border border-slate-100">
        <Text className="text-slate-600 text-xs italic" numberOfLines={2}>
          "{item.reason_for_referral || 'No reason provided'}"
        </Text>
      </View>

      <View className="flex-row justify-between items-center">
        <Text className="text-slate-400 text-[10px]">
          Ref ID: {item._id?.slice(-6).toUpperCase()}
        </Text>
        <TouchableOpacity 
          className="flex-row items-center"
          onPress={() => router.push({ pathname: '/(doctor)/consult', params: { encounterId: item.visit_id } })}
        >
          <Text className="text-teal-600 font-bold text-xs mr-1">View Visit</Text>
          <ArrowRight size={14} color="#0d9488" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="p-4 pt-6 flex-1">
        <Text className="text-slate-800 text-2xl font-bold mb-2">Referrals</Text>
        <Text className="text-slate-500 text-sm mb-6">Patients referred to specialists</Text>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#0d9488" />
          </View>
        ) : (
          <FlatList
            data={referrals}
            keyExtractor={(item) => item._id || Math.random().toString()}
            renderItem={renderReferral}
            refreshing={loading}
            onRefresh={fetchReferrals}
            ListEmptyComponent={
              <View className="items-center justify-center py-10">
                <Text className="text-slate-400">No active referrals</Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}
