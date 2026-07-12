import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  Users, Activity, Hospital, ShieldCheck, LogOut,
  TrendingUp, AlertTriangle, CheckCircle, Clock,
  BarChart2, Map, RefreshCcw, Plus, Trash2, Building2
} from 'lucide-react';

function StatCard({ title, value, subtitle, icon: Icon, color, trend }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon size={22} />
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${trend >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <p className="text-3xl font-bold text-gray-800">{value ?? '—'}</p>
      <p className="text-sm font-semibold text-gray-600 mt-1">{title}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');

  // Hospital form state
  const [hospitalForm, setHospitalForm] = useState({
    name: '', type: 'govt', district: 'Chennai', state: 'Tamil Nadu'
  });
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ['adminStats'],
    queryFn: () => api.get('/admin/stats').then(r => r.data),
    refetchInterval: 60000,
    retry: 1,
  });

  const { data: recentActivity } = useQuery({
    queryKey: ['adminActivity'],
    queryFn: () => api.get('/admin/activity').then(r => r.data),
    refetchInterval: 30000,
    retry: 1,
  });

  // Hospital queries & mutations
  const { data: hospitals = [], isLoading: hospitalsLoading } = useQuery({
    queryKey: ['adminHospitals'],
    queryFn: () => api.get('/admin/hospitals').then(r => r.data),
    enabled: activeTab === 'hospitals',
  });

  const addHospitalMutation = useMutation({
    mutationFn: (data) => api.post('/admin/hospitals', data).then(r => r.data),
    onSuccess: (newH) => {
      queryClient.invalidateQueries({ queryKey: ['adminHospitals'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
      setHospitalForm({ name: '', type: 'govt', district: 'Chennai', state: 'Tamil Nadu' });
      toast.success(`Hospital "${newH.name}" added successfully`);
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to add hospital');
    },
  });

  const deleteHospitalMutation = useMutation({
    mutationFn: (id) => api.delete(`/admin/hospitals/${id}`).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminHospitals'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
      setDeleteConfirmId(null);
      toast.success('Hospital removed successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to delete hospital');
      setDeleteConfirmId(null);
    },
  });

  const handleAddHospital = (e) => {
    e.preventDefault();
    if (!hospitalForm.name.trim()) return;
    addHospitalMutation.mutate(hospitalForm);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'users', label: 'Users' },
    { id: 'hospitals', label: 'Hospitals' },
    { id: 'reports', label: 'Reports' },
  ];

  return (
    <div className="min-h-screen bg-[#F7F3EE]">
      {/* Top Bar */}
      <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-[#1B6CA8] p-2 rounded-xl">
            <Activity size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800">Ayu Disha Admin</h1>
            <p className="text-xs text-gray-400">System Administration Panel</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => refetch()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
            title="Refresh data"
          >
            <RefreshCcw size={18} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-red-500 hover:text-red-700 font-semibold text-sm"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800">System Dashboard</h2>
          <p className="text-gray-500 mt-1">Real-time overview of Ayu Disha platform activity</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 text-sm font-semibold border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-[#1B6CA8] text-[#1B6CA8]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="Total Patients"
                value={isLoading ? '...' : stats?.total_patients?.toLocaleString()}
                subtitle="Registered on platform"
                icon={Users}
                color="bg-blue-100 text-blue-600"
              />
              <StatCard
                title="Doctors"
                value={isLoading ? '...' : stats?.total_doctors}
                subtitle="Active clinicians"
                icon={Activity}
                color="bg-green-100 text-green-600"
              />
              <StatCard
                title="ASHA Workers"
                value={isLoading ? '...' : stats?.total_asha_workers}
                subtitle="Community health workers"
                icon={ShieldCheck}
                color="bg-purple-100 text-purple-600"
              />
              <StatCard
                title="Hospitals"
                value={isLoading ? '...' : stats?.total_hospitals}
                subtitle="Registered facilities"
                icon={Hospital}
                color="bg-orange-100 text-orange-600"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="Visits Today"
                value={isLoading ? '...' : stats?.visits_today}
                subtitle="Consultations completed"
                icon={CheckCircle}
                color="bg-teal-100 text-teal-600"
              />
              <StatCard
                title="Pending Referrals"
                value={isLoading ? '...' : stats?.referrals_pending}
                subtitle="Awaiting acceptance"
                icon={Clock}
                color="bg-amber-100 text-amber-600"
              />
              <StatCard
                title="High-Risk Households"
                value={isLoading ? '...' : stats?.high_risk_households}
                subtitle="Flagged by ASHA workers"
                icon={AlertTriangle}
                color="bg-red-100 text-red-600"
              />
              <StatCard
                title="Active Consents"
                value={isLoading ? '...' : stats?.consents_active}
                subtitle="Patient data access grants"
                icon={ShieldCheck}
                color="bg-indigo-100 text-indigo-600"
              />
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-gray-800">Recent Activity</h3>
                <span className="text-xs text-gray-400">Live feed</span>
              </div>
              <div className="divide-y divide-gray-50">
                {(recentActivity || []).map((item, i) => (
                  <div key={i} className="px-6 py-4 flex items-start gap-4 hover:bg-gray-50 transition-colors">
                    <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                      item.severity === 'urgent' ? 'bg-red-500' :
                      item.severity === 'warning' ? 'bg-amber-500' : 'bg-green-500'
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm text-gray-700">{item.message}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{item.time}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      item.severity === 'urgent' ? 'bg-red-100 text-red-600' :
                      item.severity === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'
                    }`}>
                      {item.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === 'users' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
            <Users size={48} className="text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-600">User Management</h3>
            <p className="text-gray-400 text-sm mt-2">View and manage all registered users across roles</p>
            <p className="text-xs text-gray-300 mt-4">Full user management coming in next release</p>
          </div>
        )}

        {activeTab === 'hospitals' && (
          <div className="space-y-6">
            {/* Add Hospital Form */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Plus size={18} className="text-[#1B6CA8]" />
                Add New Hospital
              </h3>
              <form onSubmit={handleAddHospital} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Hospital Name *
                  </label>
                  <input
                    type="text"
                    value={hospitalForm.name}
                    onChange={e => setHospitalForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. PHC Ambattur"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-[#1B6CA8]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Type
                  </label>
                  <select
                    value={hospitalForm.type}
                    onChange={e => setHospitalForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-[#1B6CA8] bg-white"
                  >
                    <option value="govt">Government</option>
                    <option value="private">Private</option>
                    <option value="ngo">NGO / Trust</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                    District
                  </label>
                  <input
                    type="text"
                    value={hospitalForm.district}
                    onChange={e => setHospitalForm(f => ({ ...f, district: e.target.value }))}
                    placeholder="e.g. Chennai"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-[#1B6CA8]"
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={addHospitalMutation.isPending}
                    className="bg-[#1B6CA8] hover:bg-[#155A8A] text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    <Plus size={16} />
                    {addHospitalMutation.isPending ? 'Adding...' : 'Add Hospital'}
                  </button>
                </div>
              </form>
            </div>

            {/* Hospital List */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <Building2 size={18} className="text-[#1B6CA8]" />
                  Registered Hospitals
                  <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full ml-1">
                    {hospitals.length}
                  </span>
                </h3>
              </div>

              {hospitalsLoading ? (
                <div className="p-8 text-center text-gray-400 text-sm">Loading hospitals...</div>
              ) : hospitals.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">No hospitals registered yet.</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {hospitals.map(h => (
                    <div key={h.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                          <Hospital size={18} className="text-[#1B6CA8]" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{h.name}</p>
                          <p className="text-xs text-gray-400">{h.district}, {h.state}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                          h.type === 'govt' ? 'bg-green-100 text-green-700' :
                          h.type === 'private' ? 'bg-purple-100 text-purple-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {h.type === 'govt' ? 'Government' : h.type === 'private' ? 'Private' : 'NGO'}
                        </span>
                        {deleteConfirmId === h.id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-red-600 font-semibold">Confirm?</span>
                            <button
                              onClick={() => deleteHospitalMutation.mutate(h.id)}
                              disabled={deleteHospitalMutation.isPending}
                              className="text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg font-bold transition-all disabled:opacity-50"
                            >
                              Yes, Delete
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1 rounded-lg font-bold transition-all"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(h.id)}
                            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            title="Delete hospital"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
            <BarChart2 size={48} className="text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-600">Analytics & Reports</h3>
            <p className="text-gray-400 text-sm mt-2">District-level health analytics and trend reports</p>
            <p className="text-xs text-gray-300 mt-4">Advanced analytics coming in next release</p>
          </div>
        )}
      </div>
    </div>
  );
}
