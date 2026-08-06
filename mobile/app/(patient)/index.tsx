import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/store/authStore';
import patientApi from '../../src/services/patientApi';
import { FileText, Pill, FlaskConical, ShieldCheck, Sparkles, RefreshCw, Calendar, Activity } from 'lucide-react-native';

export default function PatientDashboard() {
  const { user } = useAuthStore();
  const router = useRouter();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['patientProfile'],
    queryFn: patientApi.getMyProfile,
  });

  const { data: visits, isLoading: visitsLoading } = useQuery({
    queryKey: ['patientVisits'],
    queryFn: patientApi.getMyVisits,
  });

  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = useQuery({
    queryKey: ['healthSummary'],
    queryFn: patientApi.getHealthSummary,
    retry: false,
  });

  const recentVisit = visits?.[0];
  const upcomingFollowUp = recentVisit?.follow_up_date && new Date(recentVisit.follow_up_date) > new Date()
    ? recentVisit
    : null;

  const quickLinks = [
    { to: '/(patient)/records', label: 'My Records', icon: FileText, color: 'bg-blue-50 text-blue-600 border-blue-100', iconColor: '#2563eb' },
    { to: '/(patient)/medicines', label: 'Medicines', icon: Pill, color: 'bg-purple-50 text-purple-600 border-purple-100', iconColor: '#9333ea' },
    { to: '/(patient)/labs', label: 'Lab Tests', icon: FlaskConical, color: 'bg-orange-50 text-orange-600 border-orange-100', iconColor: '#ea580c' },
    { to: '/(patient)/consents', label: 'Consents', icon: ShieldCheck, color: 'bg-green-50 text-green-600 border-green-100', iconColor: '#16a34a' },
  ];

  const isLoading = profileLoading || visitsLoading || summaryLoading;

  return (
    <SafeAreaView className="flex-1 bg-[#F7F3EE]">
      <ScrollView 
        className="flex-1 px-4 pt-6"
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetchSummary} />}
      >
        {/* Welcome */}
        <View className="mb-6">
          <Text className="text-2xl font-bold text-gray-800">
            Welcome back, {profileLoading ? '...' : profile?.name || user?.name} 👋
          </Text>
          <Text className="text-gray-500 text-sm mt-1">Here's your health summary for today.</Text>
        </View>

        {/* Health Card */}
        {!profileLoading && profile && (
          <View className="bg-blue-700 rounded-3xl p-6 mb-6 shadow-lg">
            <View className="flex-row justify-between items-start">
              <View>
                <Text className="text-white/70 text-xs font-medium uppercase tracking-wider">Patient</Text>
                <Text className="text-white text-2xl font-bold mt-1">{profile.name}</Text>
                {profile.abha_number && (
                  <Text className="text-white/80 text-sm mt-1">ABHA: {profile.abha_number}</Text>
                )}
              </View>
              {profile.blood_group && (
                <View className="bg-red-500 px-3 py-1 rounded-full">
                  <Text className="text-white text-sm font-bold">{profile.blood_group}</Text>
                </View>
              )}
            </View>
            {profile.allergies?.length > 0 && (
              <View className="mt-4 flex-row flex-wrap items-center">
                <Text className="text-white/70 text-xs mr-2">Allergies:</Text>
                {profile.allergies.map((a: string) => (
                  <View key={a} className="bg-white/20 px-2 py-0.5 rounded-full mr-2 mb-1">
                    <Text className="text-white text-xs">{a}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Upcoming Follow-up Banner */}
        {upcomingFollowUp && (
          <View className="bg-amber-50 border-l-4 border-amber-400 rounded-xl p-4 mb-6 flex-row items-start">
            <Calendar color="#f59e0b" size={18} className="mt-0.5 mr-3" />
            <View className="flex-1">
              <Text className="font-semibold text-amber-800 text-sm">Follow-up Due</Text>
              <Text className="text-amber-700 text-sm mt-1">
                {new Date(upcomingFollowUp.follow_up_date).toLocaleDateString('en-IN', { dateStyle: 'long' })} at {upcomingFollowUp.hospital_name}
              </Text>
            </View>
          </View>
        )}

        {/* AI Summary */}
        <View className="bg-white rounded-2xl border border-gray-100 p-6 mb-6 shadow-sm">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center">
              <Sparkles size={18} color="#1B6CA8" />
              <Text className="font-bold text-gray-800 text-base ml-2">Your Health Today</Text>
            </View>
            <TouchableOpacity onPress={() => refetchSummary()} className="p-2">
              <RefreshCw size={16} color="#9ca3af" />
            </TouchableOpacity>
          </View>
          {summaryLoading ? (
            <Text className="text-gray-400 text-sm">Loading summary...</Text>
          ) : (
            <Text className="text-gray-600 leading-relaxed text-sm">
              {summary?.summary || 'No health summary available yet. Your AI health summary will appear here after your medical records are updated.'}
            </Text>
          )}
        </View>

        {/* Quick Links */}
        <View className="flex-row flex-wrap justify-between mb-6">
          {quickLinks.map((link) => (
            <TouchableOpacity
              key={link.to}
              onPress={() => router.push(link.to)}
              className="bg-white w-[48%] rounded-2xl p-4 mb-4 border border-slate-100 items-center shadow-sm shadow-slate-200/50"
            >
              <View className={`${link.color.split(' ')[0]} w-12 h-12 rounded-xl items-center justify-center mb-3`}>
                <link.icon size={24} color={link.iconColor} />
              </View>
              <Text className="text-sm font-semibold text-slate-700">{link.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Visit */}
        {recentVisit && (
          <View className="bg-white rounded-2xl border border-gray-100 p-6 mb-10 shadow-sm">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="font-bold text-gray-800">Last Visit</Text>
              <TouchableOpacity onPress={() => router.push('/(patient)/records')}>
                <Text className="text-sm text-blue-600 font-medium">View all →</Text>
              </TouchableOpacity>
            </View>
            <View>
              <Text className="font-semibold text-gray-800 text-lg">{recentVisit.hospital_name}</Text>
              <Text className="text-gray-500 text-sm mt-1">{recentVisit.doctor_name}</Text>
              <Text className="text-gray-400 text-xs mt-1">
                {new Date(recentVisit.date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
              </Text>
              {recentVisit.diagnosis?.length > 0 && (
                <View className="flex-row flex-wrap gap-2 mt-3">
                  {recentVisit.diagnosis.map((d: string, i: number) => (
                    <View key={i} className="bg-blue-50 px-2 py-1 rounded-full mr-2 mb-2">
                      <Text className="text-blue-700 text-xs font-medium">{d}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
