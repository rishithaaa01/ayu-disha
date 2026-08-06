import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/store/authStore';
import { useRouter } from 'expo-router';
import { LogOut, User as UserIcon } from 'lucide-react-native';

export default function LabSettingsScreen() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F7F3EE]">
      <ScrollView className="flex-1 px-4 pt-6">
        <Text className="text-2xl font-bold text-slate-800 mb-6">Settings</Text>

        <View className="bg-white rounded-2xl p-4 mb-6 shadow-sm shadow-slate-200 border border-slate-100">
          <View className="flex-row items-center mb-4 pb-4 border-b border-slate-100">
            <View className="w-12 h-12 bg-teal-100 rounded-full items-center justify-center mr-4">
              <UserIcon size={24} color="#0d9488" />
            </View>
            <View>
              <Text className="text-lg font-bold text-slate-800">{user?.name}</Text>
              <Text className="text-slate-500 capitalize">{user?.role} · {user?.hospital}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity 
          className="bg-white rounded-2xl flex-row items-center p-4 shadow-sm shadow-slate-200 border border-slate-100"
          onPress={handleLogout}
        >
          <View className="w-10 h-10 bg-red-50 rounded-xl items-center justify-center mr-4">
            <LogOut size={20} color="#ef4444" />
          </View>
          <Text className="text-red-500 font-semibold text-base">Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
