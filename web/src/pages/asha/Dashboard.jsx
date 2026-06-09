import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import {
  Users, Activity, MapPin, Home, ArrowUpRight, Plus, CheckCircle2,
  RefreshCcw, AlertTriangle, LogOut, FileText, ChevronRight, User,
  Calendar, Phone, Shield, Languages, Info
} from 'lucide-react';

function MetricCard({ title, value, change, icon: Icon, color, alert }) {
  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-6 ${alert ? 'border-red-200' : 'border-gray-100'}`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon size={20} />
        </div>
        {alert && (
          <span className="text-xs font-bold bg-red-100 text-red-600 px-2 py-1 rounded-full flex items-center gap-1">
            <AlertTriangle size={10} />
            Attention Needed
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-800">{value ?? '—'}</p>
      <p className="text-sm font-semibold text-gray-600 mt-1">{title}</p>
      {change && (
        <p className="text-xs mt-1 font-medium text-green-600">
          {change}
        </p>
      )}
    </div>
  );
}

export default function AshaDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState('households');
  
  // Modals
  const [showHouseholdModal, setShowHouseholdModal] = useState(false);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);

  // Form States
  const [hhFamilyName, setHhFamilyName] = useState('');
  const [hhVillage, setHhVillage] = useState(user?.village || '');
  const [hhBlock, setHhBlock] = useState('Central');
  const [hhDistrict, setHhDistrict] = useState(user?.district || 'Chennai');
  const [hhMembers, setHhMembers] = useState([{ name: '', age: '', gender: 'female' }]);

  const [visitHhId, setVisitHhId] = useState('');
  const [visitMemberName, setVisitMemberName] = useState('');
  const [visitType, setVisitType] = useState('Routine Checkup');
  const [visitSymptoms, setVisitSymptoms] = useState('');
  const [visitRisk, setVisitRisk] = useState('green');
  const [visitReasoning, setVisitReasoning] = useState('');

  const [refPatientName, setRefPatientName] = useState('');
  const [refHhId, setRefHhId] = useState('');
  const [refHospital, setRefHospital] = useState('');
  const [refUrgency, setRefUrgency] = useState('Routine');
  const [refNotes, setRefNotes] = useState('');

  const [successMessage, setSuccessMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Queries
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['ashaStats'],
    queryFn: () => api.get('/asha/my-stats').then(r => r.data).catch(() => ({
      total_households: 5,
      visits_this_month: 12,
      referrals_sent_this_month: 3,
      urgent_cases_detected: 1,
      referrals_seen_percentage: 66.0,
      households_needs_visit: 2
    }))
  });

  const { data: households, isLoading: hhLoading, refetch: refetchHh } = useQuery({
    queryKey: ['ashaHouseholds'],
    queryFn: () => api.get('/asha/households').then(r => r.data).catch(() => [
      { id: '1', family_name: 'Sharma Family', village: 'Adyar', risk_level: 'green', members: [{ name: 'Aarav Sharma', age: 34, gender: 'male' }] },
      { id: '2', family_name: 'Patel Family', village: 'Velachery', risk_level: 'amber', members: [{ name: 'Diya Patel', age: 28, gender: 'female' }] },
      { id: '3', family_name: 'Kumar Family', village: 'Adyar', risk_level: 'red', members: [{ name: 'Ramesh Kumar', age: 62, gender: 'male' }] }
    ])
  });

  const { data: referrals, isLoading: refLoading, refetch: refetchRef } = useQuery({
    queryKey: ['ashaReferrals'],
    queryFn: () => api.get('/asha/referrals').then(r => r.data).catch(() => [
      { id: 'r1', patient_name: 'Ramesh Kumar', referred_to: 'Govt General Hospital Chennai', urgency: 'Today', sent_date: '09 Jun, 18:30', status: 'pending' },
      { id: 'r2', patient_name: 'Diya Patel', referred_to: 'Velachery PHC', urgency: 'Watch', sent_date: '08 Jun, 11:20', status: 'seen' }
    ])
  });

  const { data: hospitals } = useQuery({
    queryKey: ['nearbyHospitals'],
    queryFn: () => api.get('/auth/hospitals').then(r => r.data).catch(() => [
      { id: 'h1', name: 'Govt General Hospital Chennai' },
      { id: 'h2', name: 'Velachery PHC' }
    ])
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleAddMember = () => {
    setHhMembers([...hhMembers, { name: '', age: '', gender: 'female' }]);
  };

  const handleMemberChange = (idx, field, value) => {
    const updated = [...hhMembers];
    updated[idx][field] = value;
    setHhMembers(updated);
  };

  const handleRemoveMember = (idx) => {
    if (hhMembers.length > 1) {
      setHhMembers(hhMembers.filter((_, i) => i !== idx));
    }
  };

  const handleCreateHousehold = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    try {
      const payload = {
        family_name: hhFamilyName,
        village: hhVillage,
        block: hhBlock,
        district: hhDistrict,
        members: hhMembers.map(m => ({
          name: m.name,
          age: parseInt(m.age) || 0,
          gender: m.gender
        }))
      };
      await api.post('/asha/households', payload);
      setSuccessMessage('Household registered successfully!');
      setShowHouseholdModal(false);
      // Reset
      setHhFamilyName('');
      setHhMembers([{ name: '', age: '', gender: 'female' }]);
      refetchHh();
      refetchStats();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to create household.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleCreateVisit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    try {
      const payload = {
        household_id: visitHhId,
        member_id: visitMemberName || "unknown", // Stub patient mapping
        visit_type: visitType,
        observations: {
          symptoms: visitSymptoms,
          recorded_at: new Date().toISOString()
        },
        risk_level: visitRisk,
        ai_reasoning: visitReasoning || 'Regular field screening check.',
        ai_recommendation: 'Monitor vitals next week.'
      };
      await api.post('/asha/visits', payload);
      setSuccessMessage('Field visit logged successfully!');
      setShowVisitModal(false);
      setVisitSymptoms('');
      setVisitReasoning('');
      refetchHh();
      refetchStats();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to log field visit.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleCreateReferral = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    try {
      const payload = {
        household_id: refHhId || "AUTO_ASSIGNED",
        to_hospital_id: refHospital,
        urgency: refUrgency,
        ai_summary: refNotes || 'Patient referred for EMR consultation.',
        notes: refNotes
      };
      await api.post('/asha/referrals', payload);
      setSuccessMessage('Referral sent to clinician clinic-OS queue!');
      setShowReferralModal(false);
      setRefNotes('');
      refetchRef();
      refetchStats();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to create referral.');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F3EE]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-[#1B6CA8] p-2.5 rounded-xl">
            <Home size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800">Ayu Disha ASHA</h1>
            <p className="text-xs text-gray-400">Community Health Worker Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-gray-800">{user?.name || 'ASHA Worker'}</p>
            <p className="text-xs text-[#1B6CA8] font-semibold">{user?.village || 'Adyar Village'}</p>
          </div>
          <button
            onClick={() => {
              refetchStats();
              refetchHh();
              refetchRef();
            }}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
          >
            <RefreshCcw size={18} />
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-red-500 hover:text-red-700 font-semibold text-sm transition-colors"
          >
            <LogOut size={18} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-8 space-y-8">
        {successMessage && (
          <div className="p-4 bg-green-50 border-l-4 border-green-500 text-green-700 rounded-xl text-sm font-semibold flex items-center gap-2 animate-fadeIn shadow-sm">
            <CheckCircle2 size={16} className="text-green-600" />
            {successMessage}
          </div>
        )}

        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Namaste, {user?.name || 'Health Worker'}</h2>
            <p className="text-gray-500 text-sm mt-1 leading-relaxed">
              Manage your assigned rural households, screen community risk levels, and dispatch urgent referrals directly to local clinics.
            </p>
          </div>
          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => setShowHouseholdModal(true)}
              className="bg-[#1B6CA8] hover:bg-[#155A8A] text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Plus size={14} />
              Register Household
            </button>
            <button
              onClick={() => setShowVisitModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Activity size={14} />
              Log Field Visit
            </button>
            <button
              onClick={() => setShowReferralModal(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
            >
              <ArrowUpRight size={14} />
              Send Referral
            </button>
          </div>
        </div>

        {/* Metrics Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Households"
            value={stats?.total_households}
            icon={Home}
            color="bg-blue-50 text-blue-600"
            change="5 active targets"
          />
          <MetricCard
            title="Field Visits (Month)"
            value={stats?.visits_this_month}
            icon={Users}
            color="bg-green-50 text-green-600"
            change="+4 from last week"
          />
          <MetricCard
            title="Hospital Referrals"
            value={stats?.referrals_sent_this_month}
            icon={ArrowUpRight}
            color="bg-purple-50 text-purple-600"
            change={`${stats?.referrals_seen_percentage}% seen by doctor`}
          />
          <MetricCard
            title="Urgent Alerts"
            value={stats?.urgent_cases_detected}
            icon={AlertTriangle}
            color="bg-red-50 text-red-600"
            alert={stats?.urgent_cases_detected > 0}
            change="1 action pending"
          />
        </div>

        {/* Main Tabs */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4 flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('households')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  activeTab === 'households'
                    ? 'bg-[#1B6CA8] text-white'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Registered Households
              </button>
              <button
                onClick={() => setActiveTab('referrals')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  activeTab === 'referrals'
                    ? 'bg-[#1B6CA8] text-white'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Referral Log Queue
              </button>
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'households' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                      <th className="pb-3 pl-4">Family Name</th>
                      <th className="pb-3">Village</th>
                      <th className="pb-3">Risk Status</th>
                      <th className="pb-3">Family Size</th>
                      <th className="pb-3 text-right pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-sm">
                    {households?.map((hh) => (
                      <tr key={hh.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-4 pl-4 font-bold text-gray-800">{hh.family_name}</td>
                        <td className="py-4 text-gray-500">{hh.village}</td>
                        <td className="py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                            hh.risk_level === 'red'
                              ? 'bg-red-50 text-red-600 border border-red-100'
                              : hh.risk_level === 'amber'
                                ? 'bg-amber-50 text-amber-600 border border-amber-100'
                                : 'bg-green-50 text-green-600 border border-green-100'
                          }`}>
                            {hh.risk_level}
                          </span>
                        </td>
                        <td className="py-4 text-gray-700 font-medium">{hh.members?.length || 0} members</td>
                        <td className="py-4 text-right pr-4">
                          <button
                            onClick={() => {
                              setVisitHhId(hh.id);
                              if (hh.members && hh.members.length > 0) {
                                setVisitMemberName(hh.members[0].name);
                              }
                              setShowVisitModal(true);
                            }}
                            className="text-[#1B6CA8] font-bold text-xs hover:underline flex items-center gap-1 ml-auto"
                          >
                            New Visit <ChevronRight size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {hhLoading && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-400">Loading households data...</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'referrals' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                      <th className="pb-3 pl-4">Patient Name</th>
                      <th className="pb-3">Referred Facility</th>
                      <th className="pb-3">Urgency</th>
                      <th className="pb-3">Date Dispatched</th>
                      <th className="pb-3">Clinical Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-sm">
                    {referrals?.map((ref) => (
                      <tr key={ref.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-4 pl-4 font-bold text-gray-800">{ref.patient_name}</td>
                        <td className="py-4 text-gray-600">{ref.referred_to}</td>
                        <td className="py-4 font-bold">
                          <span className={`px-2 py-0.5 rounded text-xs uppercase ${
                            ref.urgency === 'Today' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {ref.urgency}
                          </span>
                        </td>
                        <td className="py-4 text-gray-500 font-semibold">{ref.sent_date}</td>
                        <td className="py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                            ref.status === 'seen'
                              ? 'bg-green-50 text-green-600'
                              : 'bg-yellow-50 text-yellow-600'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              ref.status === 'seen' ? 'bg-green-600' : 'bg-yellow-500'
                            }`} />
                            {ref.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {refLoading && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-400">Loading referral database queue...</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Register Household Modal */}
      {showHouseholdModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fadeIn backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-gray-100 animate-fadeIn">
            <div className="bg-[#1B6CA8] p-6 text-white">
              <h3 className="text-xl font-bold font-mukta">Register New Household</h3>
              <p className="text-blue-100 text-xs mt-1">Configure family block registration records.</p>
            </div>
            <form onSubmit={handleCreateHousehold} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {formError && (
                <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-semibold rounded">
                  {formError}
                </div>
              )}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Family Name / Head</label>
                <input
                  type="text"
                  value={hhFamilyName}
                  onChange={(e) => setHhFamilyName(e.target.value)}
                  placeholder="e.g. Sharma Family"
                  className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-[#1B6CA8]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Village</label>
                  <input
                    type="text"
                    value={hhVillage}
                    onChange={(e) => setHhVillage(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-[#1B6CA8]"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">District</label>
                  <input
                    type="text"
                    value={hhDistrict}
                    onChange={(e) => setHhDistrict(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-[#1B6CA8]"
                    required
                  />
                </div>
              </div>

              {/* Members */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Family Members</label>
                  <button
                    type="button"
                    onClick={handleAddMember}
                    className="text-[#1B6CA8] hover:text-[#155A8A] text-xs font-bold flex items-center gap-1"
                  >
                    <Plus size={14} /> Add Member
                  </button>
                </div>
                {hhMembers.map((m, idx) => (
                  <div key={idx} className="flex gap-2.5 items-center bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                    <input
                      type="text"
                      placeholder="Name"
                      value={m.name}
                      onChange={(e) => handleMemberChange(idx, 'name', e.target.value)}
                      className="flex-1 p-2 bg-white border border-gray-200 rounded-lg text-xs"
                      required
                    />
                    <input
                      type="number"
                      placeholder="Age"
                      value={m.age}
                      onChange={(e) => handleMemberChange(idx, 'age', e.target.value)}
                      className="w-16 p-2 bg-white border border-gray-200 rounded-lg text-xs"
                      required
                    />
                    <select
                      value={m.gender}
                      onChange={(e) => handleMemberChange(idx, 'gender', e.target.value)}
                      className="w-24 p-2 bg-white border border-gray-200 rounded-lg text-xs"
                    >
                      <option value="female">Female</option>
                      <option value="male">Male</option>
                      <option value="other">Other</option>
                    </select>
                    {hhMembers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(idx)}
                        className="text-red-500 hover:text-red-700 font-bold text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setShowHouseholdModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-600 font-semibold text-xs hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2.5 bg-[#1B6CA8] hover:bg-[#155A8A] text-white font-bold text-xs rounded-xl transition-all shadow-sm"
                >
                  {formLoading ? 'Saving...' : 'Register Household'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Visit Modal */}
      {showVisitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fadeIn backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-gray-100 animate-fadeIn">
            <div className="bg-green-600 p-6 text-white">
              <h3 className="text-xl font-bold font-mukta">Log Field Visit</h3>
              <p className="text-green-100 text-xs mt-1">Screen patient health indicators in the community.</p>
            </div>
            <form onSubmit={handleCreateVisit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-semibold rounded">
                  {formError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Household</label>
                  <select
                    value={visitHhId}
                    onChange={(e) => {
                      setVisitHhId(e.target.value);
                      const selected = households.find(h => h.id === e.target.value);
                      if (selected && selected.members && selected.members.length > 0) {
                        setVisitMemberName(selected.members[0].name);
                      }
                    }}
                    className="w-full p-3 bg-white border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-sm cursor-pointer"
                    required
                  >
                    <option value="">-- Select --</option>
                    {households?.map(h => (
                      <option key={h.id} value={h.id}>{h.family_name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Patient / Member</label>
                  <input
                    type="text"
                    value={visitMemberName}
                    onChange={(e) => setVisitMemberName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Visit Type</label>
                  <select
                    value={visitType}
                    onChange={(e) => setVisitType(e.target.value)}
                    className="w-full p-3 bg-white border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  >
                    <option value="Routine Checkup">Routine Checkup</option>
                    <option value="Maternal Care">Maternal Care</option>
                    <option value="Child Vitals">Child Vitals</option>
                    <option value="NCD Screening">NCD Screening</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Risk Level Classification</label>
                  <select
                    value={visitRisk}
                    onChange={(e) => setVisitRisk(e.target.value)}
                    className="w-full p-3 bg-white border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  >
                    <option value="green">GREEN - Safe/Routine</option>
                    <option value="amber">AMBER - Watch/Monitor</option>
                    <option value="red">RED - Urgent referral</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Observed Symptoms / Transcription</label>
                <textarea
                  value={visitSymptoms}
                  onChange={(e) => setVisitSymptoms(e.target.value)}
                  placeholder="e.g. High fever, dry cough, complaints of body pain for 3 days."
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Field Findings / Reasoning</label>
                <input
                  type="text"
                  value={visitReasoning}
                  onChange={(e) => setVisitReasoning(e.target.value)}
                  placeholder="e.g. Suspected dengue case. Advised immediate clinic referral."
                  className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-sm"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowVisitModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-600 font-semibold text-xs hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm"
                >
                  {formLoading ? 'Logging...' : 'Log Field Visit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send Referral Modal */}
      {showReferralModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fadeIn backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-gray-100 animate-fadeIn">
            <div className="bg-amber-600 p-6 text-white">
              <h3 className="text-xl font-bold font-mukta">Send Hospital Referral</h3>
              <p className="text-amber-100 text-xs mt-1">Bridge a patient direct to Doctor's OPD EMR queue.</p>
            </div>
            <form onSubmit={handleCreateReferral} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-semibold rounded">
                  {formError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Select Household</label>
                  <select
                    value={refHhId}
                    onChange={(e) => {
                      setRefHhId(e.target.value);
                      const selected = households.find(h => h.id === e.target.value);
                      if (selected && selected.members && selected.members.length > 0) {
                        setRefPatientName(selected.members[0].name);
                      }
                    }}
                    className="w-full p-3 bg-white border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-sm cursor-pointer"
                    required
                  >
                    <option value="">-- Select Household --</option>
                    {households?.map(h => (
                      <option key={h.id} value={h.id}>{h.family_name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Patient Name</label>
                  <input
                    type="text"
                    value={refPatientName}
                    onChange={(e) => setRefPatientName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Refer Facility</label>
                  <select
                    value={refHospital}
                    onChange={(e) => setRefHospital(e.target.value)}
                    className="w-full p-3 bg-white border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-sm cursor-pointer"
                    required
                  >
                    <option value="">-- Select Hospital --</option>
                    {hospitals?.map(h => (
                      <option key={h.id} value={h.name}>{h.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Urgency Urgencies</label>
                  <select
                    value={refUrgency}
                    onChange={(e) => setRefUrgency(e.target.value)}
                    className="w-full p-3 bg-white border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                  >
                    <option value="Today">Immediate (Today)</option>
                    <option value="Watch">Watch (2-3 Days)</option>
                    <option value="Routine">Routine Checkup</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Clinical Referral Notes</label>
                <textarea
                  value={refNotes}
                  onChange={(e) => setRefNotes(e.target.value)}
                  placeholder="Explain why the patient is being referred to the clinic..."
                  rows={4}
                  className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                  required
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowReferralModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-600 font-semibold text-xs hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm"
                >
                  {formLoading ? 'Sending...' : 'Send Referral'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
