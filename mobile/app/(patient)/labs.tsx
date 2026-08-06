import React from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Linking, Platform } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import patientApi from '../../src/services/patientApi';
import { FlaskConical, AlertTriangle, User, Clock, ExternalLink, Sparkles } from 'lucide-react-native';

const statusConfig: any = {
  resulted: { label: 'Resulted', color: 'bg-green-100 text-green-700' },
  pending:  { label: 'Pending',  color: 'bg-amber-100 text-amber-700' },
  ordered:  { label: 'Ordered',  color: 'bg-blue-100 text-blue-700' },
};

const safeFormatDate = (dateStr: string) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('en-IN', { dateStyle: 'medium' });
};

export default function LabTestsScreen() {
  const { data: labResults = [], isLoading } = useQuery({
    queryKey: ['patientLabResults'],
    queryFn: patientApi.getMyLabResults,
    refetchInterval: 30000,
  });

  const openPdf = (lab: any) => {
    let url = '';
    const backendBase = 'https://ayu-disha.onrender.com';
    if (!lab.pdf_url) {
      url = `${backendBase}/api/lab/orders/${lab._id || lab.id}/pdf`;
    } else {
      let rawUrl = String(lab.pdf_url).replace(/^["']|["']$/g, '').trim();
      if (/^https?:\/\//i.test(rawUrl)) {
        url = rawUrl;
      } else {
        url = `${backendBase}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
      }
    }
    
    Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F7F3EE]">
      <View className="px-4 pt-6 flex-1">
        <View className="mb-6">
          <Text className="text-2xl font-bold text-gray-800">Lab Tests</Text>
          <Text className="text-gray-500 text-sm mt-1">All your ordered and resulted laboratory tests</Text>
        </View>

        {isLoading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#ea580c" />
          </View>
        ) : labResults.length === 0 ? (
          <View className="flex-1 items-center justify-center py-20">
            <FlaskConical size={56} color="#d1d5db" className="mb-4" />
            <Text className="text-gray-500 font-medium">No lab tests ordered yet</Text>
            <Text className="text-gray-400 text-sm mt-1 text-center">Your lab results will appear here when ordered by a doctor</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
            {labResults.map((lab: any, i: number) => {
              const status = lab.status || 'ordered';
              const sc = statusConfig[status] || statusConfig.ordered;
              const isResulted = status === 'resulted';
              const isAbnormal = lab.ai_is_abnormal;

              return (
                <View 
                  key={i} 
                  className={`bg-white rounded-2xl border shadow-sm p-4 mb-4 ${
                    isAbnormal ? 'border-red-100' : isResulted ? 'border-green-100' : 'border-gray-100'
                  }`}
                >
                  <View className="flex-row items-start justify-between mb-3">
                    <View className="flex-row flex-1 mr-2">
                      <View className={`p-3 rounded-xl mr-3 items-center justify-center ${
                        isAbnormal ? 'bg-red-100' : isResulted ? 'bg-green-100' : 'bg-orange-100'
                      }`}>
                        <FlaskConical size={20} color={
                          isAbnormal ? '#dc2626' : isResulted ? '#16a34a' : '#ea580c'
                        } />
                      </View>
                      
                      <View className="flex-1">
                        <Text className="font-bold text-gray-800 text-base flex-wrap" numberOfLines={2}>
                          {lab.test_name}
                        </Text>
                        {isAbnormal && (
                          <View className="bg-red-100 flex-row items-center self-start px-2 py-0.5 rounded-full mt-1">
                            <AlertTriangle size={10} color="#dc2626" />
                            <Text className="text-red-700 text-[10px] font-bold uppercase ml-1">Abnormal</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    <View className={`px-2 py-1 rounded-lg ${sc.color.split(' ')[0]}`}>
                      <Text className={`text-[10px] font-bold uppercase ${sc.color.split(' ')[1]}`}>
                        {sc.label}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center flex-wrap mb-3">
                    <View className="flex-row items-center mr-3 mb-1">
                      <User size={12} color="#6b7280" className="mr-1" />
                      <Text className="text-xs text-gray-500">{lab.ordered_by || 'Unknown'}</Text>
                    </View>
                    <View className="flex-row items-center mb-1">
                      <Clock size={12} color="#6b7280" className="mr-1" />
                      <Text className="text-xs text-gray-500">{safeFormatDate(lab.ordered_date)}</Text>
                    </View>
                  </View>

                  {/* Actions */}
                  {(lab.pdf_url || lab._id || lab.id) && (
                    <TouchableOpacity 
                      onPress={() => openPdf(lab)}
                      className="bg-blue-50 py-2.5 rounded-xl flex-row justify-center items-center mb-3"
                    >
                      <ExternalLink size={14} color="#1d4ed8" className="mr-2" />
                      <Text className="text-blue-700 font-bold text-xs">View PDF Report</Text>
                    </TouchableOpacity>
                  )}

                  {!isResulted && (
                    <View className="bg-amber-50 rounded-xl px-4 py-3">
                      <View className="flex-row items-center">
                        <Clock size={14} color="#b45309" className="mr-2" />
                        <Text className="text-xs text-amber-700 font-semibold flex-1">
                          Processing — your result will appear here once ready
                        </Text>
                      </View>
                    </View>
                  )}

                  {isResulted && lab.result && (
                    <View className="bg-gray-50 rounded-xl px-4 py-3 mb-3">
                      <Text className="text-sm font-bold text-gray-800">{lab.result}</Text>
                      {lab.result_date && (
                        <Text className="text-xs text-gray-400 mt-1">
                          Reported: {safeFormatDate(lab.result_date)}
                          {lab.resulted_by && ` · by ${lab.resulted_by}`}
                        </Text>
                      )}
                    </View>
                  )}

                  {isResulted && lab.ai_summary && (
                    <View className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-3">
                      <View className="flex-row items-center mb-2">
                        <Sparkles size={14} color="#2563eb" className="mr-1.5" />
                        <Text className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">AI Report Summary</Text>
                      </View>
                      <Text className="text-xs text-gray-700 leading-relaxed">{lab.ai_summary}</Text>
                      {lab.ai_recommendation && (
                        <Text className="text-xs text-blue-700 font-semibold mt-2">
                          → {lab.ai_recommendation}
                        </Text>
                      )}
                    </View>
                  )}

                  {isResulted && lab.ai_key_values?.length > 0 && (
                    <View className="mt-2 border-t border-gray-100 pt-3">
                      <View className="flex-row pb-2 mb-2 border-b border-gray-100">
                        <Text className="flex-[2] text-[10px] text-gray-400 uppercase font-semibold">Parameter</Text>
                        <Text className="flex-1 text-[10px] text-gray-400 uppercase font-semibold">Value</Text>
                        <Text className="flex-1 text-[10px] text-gray-400 uppercase font-semibold">Status</Text>
                      </View>
                      {lab.ai_key_values.map((kv: any, idx: number) => (
                        <View key={idx} className="flex-row mb-2 items-center">
                          <Text className="flex-[2] text-xs font-medium text-gray-700 pr-2">{kv.parameter}</Text>
                          <Text className="flex-1 text-xs font-bold text-gray-800">{kv.value}</Text>
                          <View className="flex-1 items-start">
                            <View className={`px-2 py-0.5 rounded-full ${
                              kv.status === 'normal' ? 'bg-green-100' :
                              kv.status === 'critical' ? 'bg-red-100' :
                              'bg-amber-100'
                            }`}>
                              <Text className={`text-[10px] font-bold uppercase ${
                                kv.status === 'normal' ? 'text-green-700' :
                                kv.status === 'critical' ? 'text-red-700' :
                                'text-amber-700'
                              }`}>{kv.status}</Text>
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
            <View className="h-10" />
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}
