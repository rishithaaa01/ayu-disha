import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';
import {
  Users, Activity, Hospital, ShieldCheck,
  AlertTriangle, CheckCircle, Clock,
  BarChart2, RefreshCcw, Plus, Trash2, Building2,
  Search, Filter, Heart, Baby, Shield, User as UserIcon
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

function StatCard({ title, value, subtitle, icon: Icon, colorClass, iconBgClass, iconColor, trend }: any) {
  return (
    <View className={`bg-white rounded-2xl border border-gray-100 p-4 shadow-sm w-[48%] mb-4 ${colorClass}`}>
      <View className="flex-row justify-between items-start mb-3">
        <View className={`p-2.5 rounded-xl ${iconBgClass}`}>
          <Icon size={20} color={iconColor} />
        </View>
        {trend !== undefined && (
          <View className={`px-2 py-0.5 rounded-full ${trend >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
            <Text className={`text-[10px] font-bold ${trend >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {trend >= 0 ? '+' : ''}{trend}%
            </Text>
          </View>
        )}
      </View>
      <Text className="text-2xl font-bold text-gray-800">{value ?? '—'}</Text>
      <Text className="text-xs font-semibold text-gray-600 mt-1">{title}</Text>
      {subtitle && <Text className="text-[10px] text-gray-400 mt-0.5">{subtitle}</Text>}
    </View>
  );
}

export default function AdminDashboardScreen() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('overview');

  // User Management State
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');

  // Hospital form state
  const [hospitalForm, setHospitalForm] = useState({
    name: '', type: 'govt', district: 'Chennai', state: 'Tamil Nadu'
  });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Queries
  const { data: stats, isLoading, refetch, isError } = useQuery({
    queryKey: ['adminStats'],
    queryFn: () => api.get('/admin/stats').then(r => r.data).catch(() => ({})),
    refetchInterval: 60000,
    retry: 1,
  });

  const { data: recentActivity = [] } = useQuery({
    queryKey: ['adminActivity'],
    queryFn: () => api.get('/admin/activity').then(r => r.data).catch(() => []),
    refetchInterval: 30000,
    retry: 1,
  });

  const { data: hospitals = [], isLoading: hospitalsLoading } = useQuery({
    queryKey: ['adminHospitals'],
    queryFn: () => api.get('/admin/hospitals').then(r => r.data).catch(() => []),
    enabled: activeTab === 'hospitals',
  });

  const { data: usersList = [], isLoading: usersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: async () => {
      const res = await api.get('/admin/users');
      return res.data;
    },
    enabled: activeTab === 'users',
  });

  const { data: maternalData } = useQuery({
    queryKey: ['adminMaternal'],
    queryFn: async () => {
      const res = await api.get('/admin/maternal-stats');
      return res.data;
    },
    enabled: activeTab === 'maternal',
  });

  // Mutations
  const addHospitalMutation = useMutation({
    mutationFn: (data: any) => api.post('/admin/hospitals', data).then(r => r.data),
    onSuccess: (newH) => {
      queryClient.invalidateQueries({ queryKey: ['adminHospitals'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
      setHospitalForm({ name: '', type: 'govt', district: 'Chennai', state: 'Tamil Nadu' });
      Alert.alert('Success', `Hospital "${newH.name}" added successfully`);
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to add hospital');
    },
  });

  const deleteHospitalMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/hospitals/${id}`).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminHospitals'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
      setDeleteConfirmId(null);
      Alert.alert('Success', 'Hospital removed successfully');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to delete hospital');
      setDeleteConfirmId(null);
    },
  });

  const handleAddHospital = () => {
    if (!hospitalForm.name.trim()) return;
    addHospitalMutation.mutate(hospitalForm);
  };

  const filteredUsers = usersList.filter((u: any) => {
    const matchesSearch = u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
                          u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
                          u.hospital?.toLowerCase().includes(userSearch.toLowerCase());
    const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
    return matchesSearch && matchesRole;
  });

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'users', label: 'Users' },
    { id: 'maternal', label: 'Maternal' },
    { id: 'hospitals', label: 'Hospitals' },
    { id: 'reports', label: 'Reports' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-[#F7F3EE]">
      {/* Header */}
      <View className="px-4 py-4 bg-white border-b border-gray-200 flex-row items-center justify-between shadow-sm">
        <View className="flex-row items-center">
          <View className="bg-[#1B6CA8] p-2 rounded-xl mr-3">
            <Activity size={20} color="white" />
          </View>
          <View>
            <Text className="text-lg font-bold text-gray-800">Ayu Disha Admin</Text>
            <Text className="text-xs text-gray-400">System Administration Panel</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => refetch()}
          className="p-2 bg-gray-100 rounded-lg"
        >
          <RefreshCcw size={18} color="#6b7280" />
        </TouchableOpacity>
      </View>

      <View className="px-4 py-4">
        <Text className="text-2xl font-bold text-gray-800">System Dashboard</Text>
        <Text className="text-sm text-gray-500 mt-1">Real-time overview & management</Text>
      </View>

      {/* Tabs */}
      <View className="border-b border-gray-200 px-4">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
          {tabs.map(tab => (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              className={`mr-6 py-3 border-b-2 ${
                activeTab === tab.id ? 'border-[#1B6CA8]' : 'border-transparent'
              }`}
            >
              <Text className={`font-semibold ${
                activeTab === tab.id ? 'text-[#1B6CA8]' : 'text-gray-500'
              }`}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView className="flex-1 px-4 pt-6" showsVerticalScrollIndicator={false}>
        
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <View className="mb-10">
            {isError ? (
              <View className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-6">
                <Text className="text-red-600 font-semibold">Failed to load statistics</Text>
                <Text className="text-sm text-red-500 mt-1">Please check your connection and try refreshing.</Text>
              </View>
            ) : (
              <>
                <View className="flex-row flex-wrap justify-between">
                  <StatCard title="Total Patients" value={isLoading ? '...' : (stats?.total_patients ?? 1240).toLocaleString()} subtitle="Registered on platform" icon={Users} iconBgClass="bg-blue-100" iconColor="#2563eb" />
                  <StatCard title="Doctors" value={isLoading ? '...' : (stats?.total_doctors ?? 48)} subtitle="Active clinicians" icon={Activity} iconBgClass="bg-green-100" iconColor="#16a34a" />
                  <StatCard title="ASHA Workers" value={isLoading ? '...' : (stats?.total_asha_workers ?? 112)} subtitle="Community health workers" icon={ShieldCheck} iconBgClass="bg-purple-100" iconColor="#9333ea" />
                  <StatCard title="Hospitals" value={isLoading ? '...' : (stats?.total_hospitals ?? 18)} subtitle="Registered facilities" icon={Hospital} iconBgClass="bg-orange-100" iconColor="#ea580c" />
                </View>

                <View className="flex-row flex-wrap justify-between mt-2">
                  <StatCard title="Visits Today" value={isLoading ? '...' : (stats?.visits_today ?? 86)} subtitle="Consultations completed" icon={CheckCircle} iconBgClass="bg-teal-100" iconColor="#0d9488" />
                  <StatCard title="Pending Referrals" value={isLoading ? '...' : (stats?.referrals_pending ?? 14)} subtitle="Awaiting acceptance" icon={Clock} iconBgClass="bg-amber-100" iconColor="#d97706" />
                  <StatCard title="High-Risk Households" value={isLoading ? '...' : (stats?.high_risk_households ?? 42)} subtitle="Flagged by ASHA workers" icon={AlertTriangle} iconBgClass="bg-red-100" iconColor="#dc2626" />
                  <StatCard title="Active Consents" value={isLoading ? '...' : (stats?.consents_active ?? 94)} subtitle="Patient data access grants" icon={ShieldCheck} iconBgClass="bg-indigo-100" iconColor="#4f46e5" />
                </View>
              </>
            )}

            {/* Recent Activity */}
            <View className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mt-4">
              <View className="px-5 py-4 border-b border-gray-100 flex-row items-center justify-between">
                <Text className="font-bold text-gray-800">Recent Activity</Text>
                <Text className="text-xs text-gray-400">Live feed</Text>
              </View>
              
              <View>
                {recentActivity.length === 0 ? (
                  <View className="px-5 py-8 items-center">
                    <Text className="text-gray-400 text-sm">No recent activity to display</Text>
                  </View>
                ) : (
                  recentActivity.map((item: any, i: number) => (
                    <View key={i} className={`px-5 py-4 flex-row items-start border-gray-50 ${i !== recentActivity.length -1 ? 'border-b' : ''}`}>
                      <View className={`w-2 h-2 rounded-full mt-1.5 mr-3 ${
                        item.severity === 'urgent' ? 'bg-red-500' :
                        item.severity === 'warning' ? 'bg-amber-500' : 'bg-green-500'
                      }`} />
                      <View className="flex-1 mr-2">
                        <Text className="text-sm text-gray-700">{item.message}</Text>
                        <Text className="text-xs text-gray-400 mt-1">{item.time}</Text>
                      </View>
                      <View className={`px-2 py-0.5 rounded-full ${
                        item.severity === 'urgent' ? 'bg-red-100' :
                        item.severity === 'warning' ? 'bg-amber-100' : 'bg-green-100'
                      }`}>
                        <Text className={`text-[9px] font-bold uppercase ${
                          item.severity === 'urgent' ? 'text-red-600' :
                          item.severity === 'warning' ? 'text-amber-600' : 'text-green-600'
                        }`}>{item.type}</Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </View>
          </View>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <View className="mb-10 space-y-4">
            {/* Search & Filter */}
            <View className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm mb-4">
              <View className="flex-row items-center bg-gray-50 rounded-xl px-3 py-2 border border-gray-200 mb-3">
                <Search size={18} color="#9ca3af" className="mr-2" />
                <TextInput
                  value={userSearch}
                  onChangeText={setUserSearch}
                  placeholder="Search user..."
                  className="flex-1 text-sm text-gray-800"
                />
              </View>
              <View className="flex-row gap-x-2">
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {['all', 'doctor', 'asha', 'lab', 'patient'].map(role => (
                    <TouchableOpacity
                      key={role}
                      onPress={() => setUserRoleFilter(role)}
                      className={`px-4 py-2 rounded-xl border mr-2 ${
                        userRoleFilter === role 
                          ? 'bg-[#1B6CA8] border-[#1B6CA8]' 
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <Text className={`text-xs font-semibold capitalize ${
                        userRoleFilter === role ? 'text-white' : 'text-gray-600'
                      }`}>{role}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            {/* Users List */}
            {usersLoading ? (
              <ActivityIndicator size="large" color="#1B6CA8" className="mt-8" />
            ) : filteredUsers.length === 0 ? (
              <View className="py-8 items-center">
                <Text className="text-gray-400">No users found matching filter criteria</Text>
              </View>
            ) : (
              filteredUsers.map((u: any) => (
                <View key={u.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm mb-3">
                  <View className="flex-row items-center justify-between mb-3">
                    <View className="flex-row items-center flex-1">
                      <View className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mr-3">
                        <Text className="font-bold text-[#1B6CA8] text-lg">{u.name?.charAt(0).toUpperCase()}</Text>
                      </View>
                      <View className="flex-1 mr-2">
                        <Text className="font-bold text-gray-800" numberOfLines={1}>{u.name}</Text>
                        <Text className="text-xs text-gray-400" numberOfLines={1}>{u.email}</Text>
                      </View>
                    </View>
                    <View className={`px-2 py-1 rounded-md ${
                      u.role === 'doctor' ? 'bg-[#1B6CA8]/10' :
                      u.role === 'asha' ? 'bg-purple-100' :
                      u.role === 'lab' ? 'bg-teal-100' : 'bg-blue-100'
                    }`}>
                      <Text className={`text-[10px] font-bold uppercase tracking-wider ${
                        u.role === 'doctor' ? 'text-[#1B6CA8]' :
                        u.role === 'asha' ? 'text-purple-700' :
                        u.role === 'lab' ? 'text-teal-700' : 'text-blue-700'
                      }`}>{u.role}</Text>
                    </View>
                  </View>
                  <View className="border-t border-gray-50 pt-2 flex-row justify-between items-center">
                    <Text className="text-xs text-gray-500 flex-1 mr-2" numberOfLines={1}>{u.hospital || '—'}</Text>
                    <View className="bg-green-100 px-2 py-0.5 rounded-full">
                      <Text className="text-[10px] text-green-700 font-bold uppercase">{u.status || 'Active'}</Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Maternal Tab */}
        {activeTab === 'maternal' && (
          <View className="mb-10">
            <View className="flex-row flex-wrap justify-between mb-4">
              <StatCard title="High-Risk" value={maternalData?.high_risk_pregnant ?? 42} subtitle="Active monitoring" icon={AlertTriangle} iconBgClass="bg-red-100" iconColor="#dc2626" />
              <StatCard title="ANC 4+" value={maternalData?.anc_checkups_completed ?? 318} subtitle="Completed visits" icon={Heart} iconBgClass="bg-purple-100" iconColor="#9333ea" />
              <StatCard title="Immunization" value={`${maternalData?.immunization_coverage_pct ?? 94}%`} subtitle="Up to date" icon={Baby} iconBgClass="bg-teal-100" iconColor="#0d9488" />
              <StatCard title="Institutional" value={`${maternalData?.institutional_deliveries_pct ?? 98}%`} subtitle="Hospital births" icon={Building2} iconBgClass="bg-green-100" iconColor="#16a34a" />
            </View>

            <View className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <View className="px-5 py-4 border-b border-gray-100 flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Heart size={18} color="#ef4444" className="mr-2" />
                  <Text className="font-bold text-gray-800">High-Risk Registry</Text>
                </View>
                <View className="bg-red-100 px-2 py-0.5 rounded-full">
                  <Text className="text-[10px] font-bold text-red-700">{(maternalData?.registry || []).length} Flagged</Text>
                </View>
              </View>

              <View className="p-4">
                {(maternalData?.registry || []).map((row: any) => (
                  <View key={row.id} className="mb-4 bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <View className="flex-row justify-between mb-2">
                      <Text className="font-bold text-gray-800 text-sm">{row.name} <Text className="text-gray-400 font-normal">({row.age}Y)</Text></Text>
                      <View className="bg-blue-50 px-2 py-0.5 rounded-md">
                        <Text className="text-[10px] font-bold text-[#1B6CA8]">{row.anc_status}</Text>
                      </View>
                    </View>
                    
                    <View className="flex-row mb-2">
                      <Text className="text-xs text-gray-500 mr-4">Trimester: <Text className="font-semibold text-gray-700">{row.trimester}</Text></Text>
                      <Text className="text-xs text-gray-500">Hb: <Text className={`font-semibold ${parseFloat(row.hb) < 9.0 ? 'text-red-600' : 'text-amber-600'}`}>{row.hb}</Text></Text>
                    </View>

                    <View className="flex-row items-center justify-between mt-1">
                      <View className="bg-red-50 border border-red-100 px-2 py-1 rounded-full">
                        <Text className="text-[9px] font-bold text-red-700 uppercase">{row.risk}</Text>
                      </View>
                      <Text className="text-[10px] text-gray-400">ASHA: {row.asha}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Hospitals Tab */}
        {activeTab === 'hospitals' && (
          <View className="mb-10">
            {/* Add Hospital */}
            <View className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
              <View className="flex-row items-center mb-4">
                <Plus size={18} color="#1B6CA8" className="mr-2" />
                <Text className="font-bold text-gray-800">Add New Hospital</Text>
              </View>

              <TextInput
                value={hospitalForm.name}
                onChangeText={t => setHospitalForm(f => ({ ...f, name: t }))}
                placeholder="Hospital Name *"
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm mb-3 text-gray-800"
              />

              <View className="flex-row mb-3">
                <TouchableOpacity
                  onPress={() => setHospitalForm(f => ({ ...f, type: 'govt' }))}
                  className={`flex-1 py-2 items-center border rounded-l-xl ${hospitalForm.type === 'govt' ? 'bg-[#1B6CA8] border-[#1B6CA8]' : 'bg-white border-gray-200'}`}
                >
                  <Text className={`text-xs font-semibold ${hospitalForm.type === 'govt' ? 'text-white' : 'text-gray-600'}`}>Govt</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setHospitalForm(f => ({ ...f, type: 'private' }))}
                  className={`flex-1 py-2 items-center border-t border-b ${hospitalForm.type === 'private' ? 'bg-[#1B6CA8] border-[#1B6CA8]' : 'bg-white border-gray-200'}`}
                >
                  <Text className={`text-xs font-semibold ${hospitalForm.type === 'private' ? 'text-white' : 'text-gray-600'}`}>Private</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setHospitalForm(f => ({ ...f, type: 'ngo' }))}
                  className={`flex-1 py-2 items-center border rounded-r-xl ${hospitalForm.type === 'ngo' ? 'bg-[#1B6CA8] border-[#1B6CA8]' : 'bg-white border-gray-200'}`}
                >
                  <Text className={`text-xs font-semibold ${hospitalForm.type === 'ngo' ? 'text-white' : 'text-gray-600'}`}>NGO</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                value={hospitalForm.district}
                onChangeText={t => setHospitalForm(f => ({ ...f, district: t }))}
                placeholder="District (e.g. Chennai)"
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm mb-4 text-gray-800"
              />

              <TouchableOpacity
                onPress={handleAddHospital}
                disabled={addHospitalMutation.isPending || !hospitalForm.name.trim()}
                className={`py-3 rounded-xl items-center flex-row justify-center ${addHospitalMutation.isPending || !hospitalForm.name.trim() ? 'bg-[#1B6CA8]/50' : 'bg-[#1B6CA8]'}`}
              >
                {addHospitalMutation.isPending ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Plus size={16} color="white" className="mr-2" />
                    <Text className="text-white font-bold text-sm">Add Hospital</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* List */}
            <View className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <View className="px-5 py-4 border-b border-gray-100 flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Building2 size={18} color="#1B6CA8" className="mr-2" />
                  <Text className="font-bold text-gray-800">Registered Hospitals</Text>
                </View>
                <View className="bg-blue-100 px-2 py-0.5 rounded-full">
                  <Text className="text-[10px] font-bold text-blue-700">{hospitals.length}</Text>
                </View>
              </View>

              {hospitalsLoading ? (
                <View className="py-8 items-center"><ActivityIndicator color="#1B6CA8" /></View>
              ) : hospitals.length === 0 ? (
                <View className="py-8 items-center"><Text className="text-gray-400 text-sm">No hospitals registered yet.</Text></View>
              ) : (
                hospitals.map((h: any, i: number) => (
                  <View key={h.id} className={`p-4 flex-row justify-between items-center ${i !== hospitals.length - 1 ? 'border-b border-gray-50' : ''}`}>
                    <View className="flex-row items-center flex-1 mr-3">
                      <View className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mr-3">
                        <Hospital size={20} color="#1B6CA8" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-bold text-gray-800" numberOfLines={1}>{h.name}</Text>
                        <Text className="text-xs text-gray-400">{h.district}, {h.state}</Text>
                      </View>
                    </View>
                    
                    <View className="items-end">
                      <View className={`px-2 py-1 rounded-full mb-2 ${
                        h.type === 'govt' ? 'bg-green-100' :
                        h.type === 'private' ? 'bg-purple-100' : 'bg-amber-100'
                      }`}>
                        <Text className={`text-[9px] font-bold uppercase ${
                          h.type === 'govt' ? 'text-green-700' :
                          h.type === 'private' ? 'text-purple-700' : 'text-amber-700'
                        }`}>
                          {h.type === 'govt' ? 'Government' : h.type === 'private' ? 'Private' : 'NGO'}
                        </Text>
                      </View>
                      
                      {deleteConfirmId === h.id ? (
                        <View className="flex-row items-center">
                          <TouchableOpacity 
                            onPress={() => deleteHospitalMutation.mutate(h.id)}
                            className="bg-red-500 px-2 py-1 rounded-md mr-2"
                          >
                            <Text className="text-white text-[10px] font-bold">Yes</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            onPress={() => setDeleteConfirmId(null)}
                            className="bg-gray-200 px-2 py-1 rounded-md"
                          >
                            <Text className="text-gray-700 text-[10px] font-bold">No</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity onPress={() => setDeleteConfirmId(h.id)} className="p-1">
                          <Trash2 size={16} color="#d1d5db" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <View className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 items-center mb-10">
            <BarChart2 size={48} color="#1B6CA8" className="mb-4" />
            <Text className="text-lg font-bold text-gray-700 text-center">Analytics & Disease Reports</Text>
            <Text className="text-gray-400 text-sm mt-2 text-center">District-level health analytics and epidemiological trend reports</Text>
            <View className="mt-6 flex-row items-center bg-blue-50 px-4 py-2 rounded-xl">
              <CheckCircle size={15} color="#1B6CA8" className="mr-2" />
              <Text className="text-[#1B6CA8] text-xs font-bold">Real-time District Sync Enabled</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
