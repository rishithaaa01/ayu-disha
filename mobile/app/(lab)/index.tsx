import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Platform, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import api from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';
import { 
  FlaskConical, RefreshCcw, Upload, CheckCircle, 
  Clock, AlertTriangle, FileText, ChevronDown, ChevronUp, 
  User, Calendar, Sparkles, ExternalLink, X
} from 'lucide-react-native';

const urgencyColor: any = {
  routine: 'bg-blue-100',
  urgent: 'bg-amber-100',
  emergency: 'bg-red-100',
};

const urgencyTextColor: any = {
  routine: 'text-blue-700',
  urgent: 'text-amber-700',
  emergency: 'text-red-700',
};

export default function LabDashboardScreen() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  
  const [activeTab, setActiveTab] = useState('pending');
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resultText, setResultText] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<any>(null);

  const { data: pendingOrders = [], isLoading: pendingLoading, refetch: refetchPending } = useQuery({
    queryKey: ['labPendingOrders'],
    queryFn: () => api.get('/lab/pending-orders').then(r => r.data),
    refetchInterval: 30000,
  });

  const { data: completedOrders = [], isLoading: completedLoading } = useQuery({
    queryKey: ['labCompletedOrders'],
    queryFn: () => api.get('/lab/completed-orders').then(r => r.data),
    refetchInterval: 30000,
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ labOrderId, resultText, notes, file }: any) => {
      const formData = new FormData();
      formData.append('result_text', resultText);
      if (notes) formData.append('notes', notes);
      
      if (file) {
        formData.append('file', {
          uri: file.uri,
          type: file.mimeType || 'application/pdf',
          name: file.name || 'report.pdf',
        } as any);
      }

      return api.post(`/lab/upload-result/${labOrderId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      }).then(r => r.data);
    },
    onSuccess: (data) => {
      Alert.alert('Success', data.message || 'Result uploaded successfully');
      setUploadingId(null);
      setResultText('');
      setNotes('');
      setSelectedFile(null);
      setExpandedId(null);
      queryClient.invalidateQueries({ queryKey: ['labPendingOrders'] });
      queryClient.invalidateQueries({ queryKey: ['labCompletedOrders'] });
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to upload result');
      setUploadingId(null);
    },
  });

  const handleUpload = (labOrderId: string) => {
    if (!resultText.trim()) {
      Alert.alert('Error', 'Please enter a result value');
      return;
    }
    setUploadingId(labOrderId);
    uploadMutation.mutate({ labOrderId, resultText, notes, file: selectedFile });
  };

  const handleFileSelect = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedFile(result.assets[0]);
      }
    } catch (err) {
      console.error('File pick error', err);
      Alert.alert('Error', 'Failed to select file.');
    }
  };

  const openPdf = (order: any) => {
    let url = '';
    const backendBase = 'https://ayu-disha.onrender.com';
    if (!order.pdf_url) {
      url = `${backendBase}/api/lab/orders/${order._id || order.id}/pdf`;
    } else {
      let rawUrl = String(order.pdf_url).replace(/^["']|["']$/g, '').trim();
      if (/^https?:\/\//i.test(rawUrl)) {
        url = rawUrl;
      } else {
        url = `${backendBase}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
      }
    }
    
    Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
  };

  const urgentCount = pendingOrders.filter((o: any) => o.urgency === 'urgent' || o.urgency === 'emergency').length;

  return (
    <SafeAreaView className="flex-1 bg-[#F7F3EE]">
      {/* Header */}
      <View className="px-4 py-4 bg-white border-b border-gray-200 flex-row items-center justify-between shadow-sm">
        <View className="flex-row items-center">
          <View className="bg-teal-600 p-2 rounded-xl mr-3">
            <FlaskConical size={20} color="white" />
          </View>
          <View>
            <Text className="text-lg font-bold text-gray-800">Lab Dashboard</Text>
            <Text className="text-xs text-gray-400">{user?.name} · {user?.hospital || 'Lab Technician'}</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => { refetchPending(); queryClient.invalidateQueries({ queryKey: ['labCompletedOrders'] }); }}
          className="p-2 bg-gray-100 rounded-lg"
        >
          <RefreshCcw size={18} color="#6b7280" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-4 pt-6" showsVerticalScrollIndicator={false}>
        {/* Stats */}
        <View className="flex-row justify-between mb-6">
          <View className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex-1 mr-2">
            <View className="flex-row items-center mb-2">
              <View className="bg-amber-100 p-2 rounded-xl mr-2"><Clock size={16} color="#d97706" /></View>
              <Text className="text-[10px] font-bold text-gray-500 uppercase">Pending</Text>
            </View>
            <Text className="text-2xl font-bold text-gray-800">{pendingOrders.length}</Text>
          </View>
          
          <View className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex-1 mx-1">
            <View className="flex-row items-center mb-2">
              <View className="bg-red-100 p-2 rounded-xl mr-2"><AlertTriangle size={16} color="#dc2626" /></View>
              <Text className="text-[10px] font-bold text-gray-500 uppercase">Urgent</Text>
            </View>
            <Text className="text-2xl font-bold text-gray-800">{urgentCount}</Text>
          </View>
          
          <View className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex-1 ml-2">
            <View className="flex-row items-center mb-2">
              <View className="bg-green-100 p-2 rounded-xl mr-2"><CheckCircle size={16} color="#16a34a" /></View>
              <Text className="text-[10px] font-bold text-gray-500 uppercase">Done</Text>
            </View>
            <Text className="text-2xl font-bold text-gray-800">{completedOrders.length}</Text>
          </View>
        </View>

        {/* Tabs */}
        <View className="flex-row border-b border-gray-200 mb-6">
          <TouchableOpacity
            onPress={() => setActiveTab('pending')}
            className={`flex-1 py-3 items-center border-b-2 ${activeTab === 'pending' ? 'border-teal-600' : 'border-transparent'}`}
          >
            <Text className={`font-semibold ${activeTab === 'pending' ? 'text-teal-700' : 'text-gray-500'}`}>
              Pending ({pendingOrders.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('completed')}
            className={`flex-1 py-3 items-center border-b-2 ${activeTab === 'completed' ? 'border-teal-600' : 'border-transparent'}`}
          >
            <Text className={`font-semibold ${activeTab === 'completed' ? 'text-teal-700' : 'text-gray-500'}`}>
              Completed
            </Text>
          </TouchableOpacity>
        </View>

        {/* Pending Orders */}
        {activeTab === 'pending' && (
          <View className="mb-10">
            {pendingLoading ? (
              <View className="py-10 items-center justify-center">
                <ActivityIndicator size="large" color="#0d9488" />
              </View>
            ) : pendingOrders.length === 0 ? (
              <View className="bg-white rounded-2xl border border-gray-100 p-8 items-center">
                <CheckCircle size={48} color="#86efac" className="mb-4" />
                <Text className="font-bold text-gray-600">All clear — no pending orders</Text>
                <Text className="text-gray-400 text-sm mt-1 text-center">New test orders will appear here automatically</Text>
              </View>
            ) : (
              pendingOrders.map((order: any) => {
                const isExpanded = expandedId === order._id;
                const isUploading = uploadingId === order._id && uploadMutation.isPending;
                
                return (
                  <View key={order._id} className={`bg-white rounded-2xl border shadow-sm mb-4 overflow-hidden ${
                    order.urgency === 'emergency' ? 'border-red-200' :
                    order.urgency === 'urgent' ? 'border-amber-200' : 'border-gray-100'
                  }`}>
                    <TouchableOpacity
                      onPress={() => setExpandedId(isExpanded ? null : order._id)}
                      className="p-4"
                    >
                      <View className="flex-row items-start justify-between">
                        <View className="flex-row items-start flex-1 mr-2">
                          <View className="bg-teal-100 p-2.5 rounded-xl mr-3">
                            <FlaskConical size={18} color="#0d9488" />
                          </View>
                          <View className="flex-1">
                            <View className="flex-row flex-wrap items-center gap-y-1 mb-1.5">
                              <Text className="font-bold text-gray-800 text-sm mr-2">{order.test_name}</Text>
                              <View className={`px-2 py-0.5 rounded-full ${urgencyColor[order.urgency] || urgencyColor.routine}`}>
                                <Text className={`text-[9px] font-bold uppercase ${urgencyTextColor[order.urgency] || urgencyTextColor.routine}`}>
                                  {order.urgency}
                                </Text>
                              </View>
                            </View>
                            
                            <View className="flex-row flex-wrap items-center gap-y-1">
                              <View className="flex-row items-center mr-3">
                                <User size={11} color="#6b7280" className="mr-1" />
                                <Text className="text-xs text-gray-500">{order.patient_name}</Text>
                              </View>
                              <View className="flex-row items-center mr-3">
                                <Calendar size={11} color="#6b7280" className="mr-1" />
                                <Text className="text-xs text-gray-500">
                                  {new Date(order.ordered_date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                                </Text>
                              </View>
                            </View>
                            <Text className="text-xs text-gray-400 mt-1">Ordered by: {order.ordered_by}</Text>
                          </View>
                        </View>
                        
                        <View className="items-end justify-between h-full">
                          <View className="bg-amber-100 px-2 py-1 rounded-full mb-2">
                            <Text className="text-amber-700 text-[10px] font-bold">Pending</Text>
                          </View>
                          {isExpanded ? <ChevronUp size={16} color="#9ca3af" /> : <ChevronDown size={16} color="#9ca3af" />}
                        </View>
                      </View>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View className="border-t border-gray-100 p-4 bg-gray-50">
                        <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Upload Result</Text>

                        <Text className="text-xs font-semibold text-gray-700 mb-1">Result Value *</Text>
                        <TextInput
                          value={resultText}
                          onChangeText={setResultText}
                          placeholder="e.g. HbA1c: 7.2% — above normal range"
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 mb-3"
                        />

                        <Text className="text-xs font-semibold text-gray-700 mb-1">Additional Notes (optional)</Text>
                        <TextInput
                          value={notes}
                          onChangeText={setNotes}
                          placeholder="Special observations..."
                          multiline
                          numberOfLines={2}
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 mb-3"
                          textAlignVertical="top"
                        />

                        <Text className="text-xs font-semibold text-gray-700 mb-1">Lab Report PDF (optional)</Text>
                        <TouchableOpacity
                          onPress={handleFileSelect}
                          className={`border-2 border-dashed rounded-xl p-4 items-center mb-4 ${
                            selectedFile ? 'border-teal-400 bg-teal-50' : 'border-gray-200 bg-white'
                          }`}
                        >
                          {selectedFile ? (
                            <View className="flex-row items-center">
                              <FileText size={16} color="#0d9488" className="mr-2" />
                              <Text className="text-sm font-semibold text-teal-700 mr-2 flex-shrink" numberOfLines={1}>
                                {selectedFile.name}
                              </Text>
                              <TouchableOpacity onPress={() => setSelectedFile(null)}>
                                <X size={16} color="#ef4444" />
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <View className="items-center">
                              <Upload size={20} color="#9ca3af" className="mb-1" />
                              <Text className="text-xs text-gray-500 mb-1">Tap to select PDF report</Text>
                              <Text className="text-[10px] text-gray-400">Max 20MB · AI extraction</Text>
                            </View>
                          )}
                        </TouchableOpacity>

                        <View className="flex-row space-x-3">
                          <TouchableOpacity
                            onPress={() => { setExpandedId(null); setResultText(''); setNotes(''); setSelectedFile(null); }}
                            className="flex-1 py-3 border border-gray-200 rounded-xl items-center bg-white mr-2"
                          >
                            <Text className="text-sm font-semibold text-gray-600">Cancel</Text>
                          </TouchableOpacity>
                          
                          <TouchableOpacity
                            onPress={() => handleUpload(order._id)}
                            disabled={isUploading || !resultText.trim()}
                            className={`flex-1 py-3 rounded-xl items-center flex-row justify-center ml-2 ${
                              isUploading || !resultText.trim() ? 'bg-teal-400' : 'bg-teal-600'
                            }`}
                          >
                            {isUploading ? (
                              <>
                                <ActivityIndicator size="small" color="white" className="mr-2" />
                                <Text className="text-white font-bold text-sm">Uploading...</Text>
                              </>
                            ) : (
                              <>
                                <Upload size={16} color="white" className="mr-2" />
                                <Text className="text-white font-bold text-sm">Submit Result</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        </View>
                        
                        {isUploading && (
                          <Text className="text-xs text-teal-600 text-center mt-3 font-medium">
                            ✨ Extracting PDF text & generating AI summary...
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* Completed Orders */}
        {activeTab === 'completed' && (
          <View className="mb-10">
            {completedLoading ? (
              <View className="py-10 items-center justify-center">
                <ActivityIndicator size="large" color="#0d9488" />
              </View>
            ) : completedOrders.length === 0 ? (
              <View className="bg-white rounded-2xl border border-gray-100 p-12 items-center">
                <FlaskConical size={48} color="#d1d5db" className="mb-4" />
                <Text className="text-gray-400 text-sm">No completed results yet</Text>
              </View>
            ) : (
              completedOrders.map((order: any) => (
                <View key={order._id} className={`bg-white rounded-2xl border shadow-sm p-4 mb-4 ${
                  order.ai_is_abnormal ? 'border-red-100' : 'border-green-100'
                }`}>
                  <View className="flex-row items-start justify-between mb-3">
                    <View className="flex-row items-start flex-1 mr-2">
                      <View className={`p-2.5 rounded-xl mr-3 ${order.ai_is_abnormal ? 'bg-red-100' : 'bg-green-100'}`}>
                        <FlaskConical size={20} color={order.ai_is_abnormal ? '#dc2626' : '#16a34a'} />
                      </View>
                      <View className="flex-1">
                        <View className="flex-row flex-wrap items-center gap-y-1 mb-1">
                          <Text className="font-bold text-gray-800 text-sm mr-2">{order.test_name}</Text>
                          {order.ai_is_abnormal && (
                            <View className="bg-red-100 flex-row items-center px-2 py-0.5 rounded-full">
                              <AlertTriangle size={10} color="#dc2626" className="mr-1" />
                              <Text className="text-red-700 text-[9px] font-bold uppercase">Abnormal</Text>
                            </View>
                          )}
                        </View>
                        
                        <View className="flex-row flex-wrap items-center gap-y-1">
                          <View className="flex-row items-center mr-3">
                            <User size={11} color="#6b7280" className="mr-1" />
                            <Text className="text-xs text-gray-500">{order.patient_name}</Text>
                          </View>
                          <Text className="text-xs text-gray-400 mr-3">
                            {new Date(order.result_date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                          </Text>
                          <Text className="text-xs text-gray-400">by {order.resulted_by}</Text>
                        </View>
                      </View>
                    </View>
                    
                    <View className="items-end gap-y-2">
                      <View className="bg-green-100 px-2.5 py-1 rounded-full">
                        <Text className="text-green-700 text-[10px] font-bold">Resulted</Text>
                      </View>
                    </View>
                  </View>

                  {/* PDF Link */}
                  {(order.pdf_url || order._id || order.id) && (
                    <TouchableOpacity
                      onPress={() => openPdf(order)}
                      className="flex-row items-center bg-blue-50 px-3 py-2 rounded-lg self-start mb-3"
                    >
                      <ExternalLink size={14} color="#2563eb" className="mr-1.5" />
                      <Text className="text-blue-700 text-xs font-bold">View PDF</Text>
                    </TouchableOpacity>
                  )}

                  {/* Result value */}
                  <View className="bg-gray-50 rounded-xl px-4 py-3 mb-3">
                    <Text className="text-sm font-semibold text-gray-800">{order.result}</Text>
                  </View>

                  {/* AI Summary */}
                  {order.ai_summary && (
                    <View className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-3">
                      <View className="flex-row items-center mb-2">
                        <Sparkles size={14} color="#2563eb" className="mr-1.5" />
                        <Text className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">AI Clinical Summary</Text>
                      </View>
                      <Text className="text-xs text-gray-700 leading-relaxed">{order.ai_summary}</Text>
                      {order.ai_recommendation && (
                        <Text className="text-xs text-blue-700 font-semibold mt-2">→ {order.ai_recommendation}</Text>
                      )}
                    </View>
                  )}

                  {/* Key Values */}
                  {order.ai_key_values?.length > 0 && (
                    <View className="mt-1 pt-2 border-t border-gray-100">
                      <View className="flex-row mb-2">
                        <Text className="flex-[2] text-[10px] text-gray-400 uppercase font-bold">Parameter</Text>
                        <Text className="flex-1 text-[10px] text-gray-400 uppercase font-bold">Value</Text>
                        <Text className="flex-1 text-[10px] text-gray-400 uppercase font-bold">Status</Text>
                      </View>
                      {order.ai_key_values.map((kv: any, i: number) => (
                        <View key={i} className="flex-row items-center mb-2">
                          <Text className="flex-[2] text-xs font-medium text-gray-700 pr-2">{kv.parameter}</Text>
                          <Text className="flex-1 text-xs font-bold text-gray-800">{kv.value}</Text>
                          <View className="flex-1 items-start">
                            <View className={`px-2 py-0.5 rounded-full ${
                              kv.status === 'normal' ? 'bg-green-100' :
                              kv.status === 'critical' ? 'bg-red-100' :
                              'bg-amber-100'
                            }`}>
                              <Text className={`text-[9px] font-bold uppercase ${
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
              ))
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
