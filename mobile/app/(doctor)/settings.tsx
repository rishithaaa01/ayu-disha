import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/store/authStore';
import { useRouter } from 'expo-router';
import { LogOut, User as UserIcon } from 'lucide-react-native';

export default function SettingsScreen() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="p-4 pt-6 flex-1">
        <Text className="text-slate-800 text-2xl font-bold mb-6">Settings</Text>
        
        <View className="bg-white p-6 rounded-3xl mb-6 shadow-sm shadow-slate-200/50 border border-slate-100 items-center">
          <View className="w-20 h-20 bg-teal-100 rounded-full items-center justify-center mb-4">
            <UserIcon size={40} color="#0d9488" />
          </View>
          <Text className="text-slate-800 font-bold text-xl">{user?.name}</Text>
          <Text className="text-slate-500 font-medium">{user?.role?.toUpperCase()}</Text>
        </View>

        <TouchableOpacity 
          className="bg-white p-4 rounded-2xl flex-row items-center justify-between shadow-sm shadow-slate-200/50 border border-slate-100 active:bg-slate-50"
          onPress={() => {
            logout();
            router.replace('/(auth)/login');
          }}
        >
          <View className="flex-row items-center">
            <View className="w-10 h-10 bg-red-50 rounded-xl items-center justify-center mr-4">
              <LogOut size={20} color="#dc2626" />
            </View>
            <Text className="text-red-600 font-semibold text-base">Log Out</Text>
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
