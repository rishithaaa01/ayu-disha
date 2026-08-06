import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/store/authStore';
import api from '../../src/services/api';
import { Activity, Users, FileText, CalendarClock } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function DoctorDashboard() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();

  const [stats, setStats] = useState({ waiting: 0, completed: 0, pendingLabs: 0 });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await api.get('/clinician/queue-summary');
      setStats({
        waiting: res.data.waiting_count || 0,
        completed: res.data.completed_count || 0,
        pendingLabs: res.data.pending_labs_count || 0,
      });
    } catch (err) {
      console.log('Error fetching stats', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView 
        className="flex-1 px-4 pt-6"
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchStats} />}
      >
        <View className="flex-row justify-between items-center mb-8">
          <View>
            <Text className="text-slate-500 text-sm font-semibold uppercase tracking-wider">Welcome back</Text>
            <Text className="text-slate-800 text-2xl font-bold mt-1">Dr. {user?.name}</Text>
          </View>
          <View className="w-12 h-12 bg-teal-100 rounded-full items-center justify-center border border-teal-200">
            <Text className="text-teal-700 font-bold text-lg">{user?.name?.charAt(0) || 'D'}</Text>
          </View>
        </View>

        <View className="flex-row flex-wrap justify-between">
          {/* Card 1 */}
          <TouchableOpacity 
            className="bg-white p-4 rounded-3xl w-[48%] shadow-sm shadow-slate-200/50 mb-4 border border-slate-100"
            onPress={() => router.push('/(doctor)/queue')}
          >
            <View className="w-10 h-10 bg-orange-100 rounded-2xl items-center justify-center mb-3">
              <Users size={20} color="#ea580c" />
            </View>
            <Text className="text-3xl font-bold text-slate-800">{stats.waiting}</Text>
            <Text className="text-slate-500 font-medium text-sm mt-1">Waiting Queue</Text>
          </TouchableOpacity>

          {/* Card 2 */}
          <View className="bg-white p-4 rounded-3xl w-[48%] shadow-sm shadow-slate-200/50 mb-4 border border-slate-100">
            <View className="w-10 h-10 bg-teal-100 rounded-2xl items-center justify-center mb-3">
              <Activity size={20} color="#0d9488" />
            </View>
            <Text className="text-3xl font-bold text-slate-800">{stats.completed}</Text>
            <Text className="text-slate-500 font-medium text-sm mt-1">Completed Today</Text>
          </View>

          {/* Card 3 */}
          <View className="bg-white p-4 rounded-3xl w-[48%] shadow-sm shadow-slate-200/50 mb-4 border border-slate-100">
            <View className="w-10 h-10 bg-purple-100 rounded-2xl items-center justify-center mb-3">
              <FileText size={20} color="#9333ea" />
            </View>
            <Text className="text-3xl font-bold text-slate-800">{stats.pendingLabs}</Text>
            <Text className="text-slate-500 font-medium text-sm mt-1">Pending Labs</Text>
          </View>
          
          {/* Card 4 */}
          <View className="bg-white p-4 rounded-3xl w-[48%] shadow-sm shadow-slate-200/50 mb-4 border border-slate-100">
            <View className="w-10 h-10 bg-blue-100 rounded-2xl items-center justify-center mb-3">
              <CalendarClock size={20} color="#2563eb" />
            </View>
            <Text className="text-3xl font-bold text-slate-800">4</Text>
            <Text className="text-slate-500 font-medium text-sm mt-1">Appointments</Text>
          </View>
        </View>

        <View className="mt-6 mb-10">
          <Text className="text-slate-800 text-xl font-bold mb-4">Quick Actions</Text>
          <View className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm shadow-slate-200/50">
            <TouchableOpacity 
              className="flex-row items-center p-4 border-b border-slate-50 active:bg-slate-50"
              onPress={() => router.push('/(doctor)/queue')}
            >
              <View className="w-10 h-10 bg-slate-100 rounded-2xl items-center justify-center mr-4">
                <Users size={20} color="#475569" />
              </View>
              <Text className="text-slate-700 font-semibold text-base flex-1">View Patient Queue</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              className="flex-row items-center p-4 active:bg-slate-50"
              onPress={() => {
                logout();
                router.replace('/(auth)/login');
              }}
            >
              <View className="w-10 h-10 bg-red-50 rounded-2xl items-center justify-center mr-4">
                <Activity size={20} color="#dc2626" />
              </View>
              <Text className="text-red-600 font-semibold text-base flex-1">Logout</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
