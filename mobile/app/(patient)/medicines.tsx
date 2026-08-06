import React from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import patientApi from '../../src/services/patientApi';
import { Pill, Clock, Calendar } from 'lucide-react-native';

export default function MedicinesScreen() {
  const { data: prescriptions = [], isLoading } = useQuery({
    queryKey: ['patientPrescriptions'],
    queryFn: patientApi.getMyPrescriptions,
  });

  return (
    <SafeAreaView className="flex-1 bg-[#F7F3EE]">
      <View className="px-4 pt-6 flex-1">
        <View className="mb-6">
          <Text className="text-2xl font-bold text-gray-800">My Medicines</Text>
          <Text className="text-gray-500 text-sm mt-1">All prescribed medications across your visits</Text>
        </View>

        {isLoading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#9333ea" />
          </View>
        ) : prescriptions.length === 0 ? (
          <View className="flex-1 items-center justify-center py-20">
            <Pill size={56} color="#d1d5db" className="mb-4" />
            <Text className="text-gray-500 font-medium">No prescriptions yet</Text>
            <Text className="text-gray-400 text-sm mt-1 text-center">Your medicines will appear here after your doctor visits</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
            {prescriptions.map((rx: any, i: number) => (
              <View key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
                <View className="flex-row items-start">
                  <View className="bg-purple-100 p-3 rounded-xl mr-3 items-center justify-center">
                    <Pill size={20} color="#9333ea" />
                  </View>
                  <View className="flex-1">
                    <Text className="font-bold text-gray-800 text-base mb-2">
                      {rx.medicine || rx.name || 'Unknown Medicine'}
                    </Text>
                    
                    <View className="flex-row flex-wrap gap-y-2 mb-2">
                      {rx.frequency && (
                        <View className="flex-row items-center bg-gray-50 px-2 py-1 rounded-lg mr-2">
                          <Clock size={12} color="#6b7280" className="mr-1" />
                          <Text className="text-xs text-gray-500">{rx.frequency}</Text>
                        </View>
                      )}
                      {rx.dosage && (
                        <View className="flex-row items-center bg-gray-50 px-2 py-1 rounded-lg mr-2">
                          <Text className="text-xs mr-1">💊</Text>
                          <Text className="text-xs text-gray-500">{rx.dosage}</Text>
                        </View>
                      )}
                      {rx.duration && (
                        <View className="flex-row items-center bg-gray-50 px-2 py-1 rounded-lg">
                          <Calendar size={12} color="#6b7280" className="mr-1" />
                          <Text className="text-xs text-gray-500">{rx.duration}</Text>
                        </View>
                      )}
                    </View>

                    {rx.instructions && (
                      <View className="bg-blue-50 px-3 py-2 rounded-lg mt-1 mb-3">
                        <Text className="text-xs text-blue-600">📋 {rx.instructions}</Text>
                      </View>
                    )}

                    <View className="flex-row flex-wrap items-center mt-2 pt-2 border-t border-gray-50">
                      {rx.prescribed_by && (
                        <View className="flex-row items-center mr-3 mb-1">
                          <Text className="text-xs text-gray-400 mr-1">By:</Text>
                          <Text className="text-xs font-medium text-gray-600">{rx.prescribed_by}</Text>
                        </View>
                      )}
                      {rx.hospital_name && (
                        <View className="flex-row items-center mr-3 mb-1">
                          <Text className="text-xs text-gray-400 mr-1">At:</Text>
                          <Text className="text-xs font-medium text-gray-600">{rx.hospital_name}</Text>
                        </View>
                      )}
                      {rx.prescribed_date && (
                        <View className="ml-auto mb-1">
                          <Text className="text-xs text-gray-400">
                            {new Date(rx.prescribed_date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            ))}
            <View className="h-10" />
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}
