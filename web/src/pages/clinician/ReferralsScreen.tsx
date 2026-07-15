import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../services/clinicianApi';
import { useRealTimeUpdates } from '../../contexts/RealTimeUpdateContext';
import toast from 'react-hot-toast';
import {
  ArrowLeftRight,
  ArrowDownLeft,
  ArrowUpRight,
  User,
  Calendar,
  Phone,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Home,
  Building2,
  RefreshCw,
  Stethoscope
} from 'lucide-react';
import { format } from 'date-fns';

interface Referral {
  id: string;
  patient_id: string;
  patient_name: string;
  patient_age?: number;
  patient_gender?: string;
  patient_mobile?: string;
  type: 'incoming' | 'outgoing';
  from_doctor?: string;
  from_facility?: string;
  to_doctor?: string;
  to_facility?: string;
  reason: string;
  notes?: string;
  urgency: 'routine' | 'urgent' | 'emergency';
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  created_date: string;
  updated_date?: string;
  asha_name?: string;
  to_speciality?: string;
}

import { useAuthStore } from '../../store/authStore';

export default function ReferralsScreen() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { notifyReferralAccepted, updateReferralCounts } = useRealTimeUpdates();
  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Fetch referrals
  const { data: referrals = [], isLoading, refetch } = useQuery({
    queryKey: ['doctorReferrals'],
    queryFn: async () => {
      const data = await api.getReferrals();

      // Ensure we have an array
      const referralsArray = Array.isArray(data) ? data : [];

      // Sort by created_date descending (most recent first)
      return referralsArray.sort((a: any, b: any) => {
        const dateA = new Date(a.created_date).getTime();
        const dateB = new Date(b.created_date).getTime();
        return dateB - dateA;
      });
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchOnWindowFocus: true,
    staleTime: 10000,
    retry: 2,
  });

  // Accept referral mutation
  const acceptMutation = useMutation({
    mutationFn: (referralId: string) => api.acceptReferral(referralId),
    onSuccess: () => {
      notifyReferralAccepted();
      refetch();
      toast.success('Referral accepted successfully');
    },
    onError: (err: any) => {
      const errorMsg = err.response?.data?.detail || 'Failed to accept referral';
      toast.error(errorMsg);
    },
  });

  // Reject referral mutation
  const rejectMutation = useMutation({
    mutationFn: ({ referralId, reason }: { referralId: string; reason: string }) =>
      api.rejectReferral(referralId, reason),
    onSuccess: () => {
      toast.success('Referral rejected');
      // Explicitly refetch to update stats immediately
      refetch();
      queryClient.invalidateQueries({ queryKey: ['doctorReferrals'] });
    },
    onError: () => {
      toast.error('Failed to reject referral');
    },
  });

  const filteredReferrals = referrals.filter((ref: Referral) => {
    const matchesTab = ref.type === activeTab;
    const matchesStatus = filterStatus === 'all' || ref.status === filterStatus;
    return matchesTab && matchesStatus;
  });

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'emergency':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'urgent':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      default:
        return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-100 text-green-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      case 'completed':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-amber-100 text-amber-700';
    }
  };

  const handleAccept = (referralId: string) => {
    if (window.confirm('Accept this referral? The patient will be added to your queue.')) {
      acceptMutation.mutate(referralId);
    }
  };

  const handleReject = (referralId: string) => {
    const reason = window.prompt('Reason for rejection (optional):');
    if (reason !== null) {
      rejectMutation.mutate({ referralId, reason: reason || 'No reason provided' });
    }
  };

  const stats = {
    total: referrals.length,
    incoming: referrals.filter((r: Referral) => r.type === 'incoming').length,
    outgoing: referrals.filter((r: Referral) => r.type === 'outgoing').length,
    pending: referrals.filter((r: Referral) => r.status === 'pending').length,
    urgent: referrals.filter((r: Referral) => r.urgency === 'urgent' || r.urgency === 'emergency').length,
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Referrals</h1>
          <p className="text-gray-500 text-sm">Manage incoming and outgoing patient referrals</p>
        </div>
        {isLoading && (
          <div className="flex items-center gap-2 text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm font-medium">Updating...</span>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total</span>
            <ArrowLeftRight size={16} className="text-gray-500" />
          </div>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
            {isLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>}
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Incoming</span>
            <ArrowDownLeft size={16} className="text-blue-500" />
          </div>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold text-gray-800">{stats.incoming}</p>
            {isLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>}
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Outgoing</span>
            <ArrowUpRight size={16} className="text-purple-500" />
          </div>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold text-gray-800">{stats.outgoing}</p>
            {isLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500"></div>}
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pending</span>
            <Clock size={16} className="text-amber-500" />
          </div>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold text-gray-800">{stats.pending}</p>
            {isLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-500"></div>}
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Urgent</span>
            <AlertTriangle size={16} className="text-red-500" />
          </div>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold text-gray-800">{stats.urgent}</p>
            {isLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>}
          </div>
        </div>
      </div>

      {/* Tabs and Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-6">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('incoming')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === 'incoming'
                  ? 'bg-[#1B6CA8] text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <ArrowDownLeft size={16} className="inline mr-2" />
              Incoming ({stats.incoming})
            </button>
            <button
              onClick={() => setActiveTab('outgoing')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === 'outgoing'
                  ? 'bg-[#1B6CA8] text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <ArrowUpRight size={16} className="inline mr-2" />
              Outgoing ({stats.outgoing})
            </button>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1B6CA8] focus:border-transparent outline-none bg-white"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
              <option value="completed">Completed</option>
            </select>
            
            <button
              onClick={() => { refetch(); updateReferralCounts(); }}
              className="px-4 py-2 bg-[#1B6CA8] hover:bg-[#155A8A] text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Referrals List */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1B6CA8] mx-auto mb-4"></div>
            <p className="text-gray-500 text-sm">Loading referrals...</p>
          </div>
        ) : filteredReferrals.length === 0 ? (
          <div className="p-12 text-center">
            <ArrowLeftRight size={48} className="text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-600 mb-2">
              No {activeTab} referrals
            </h3>
            <p className="text-gray-400 text-sm">
              {activeTab === 'incoming' 
                ? 'Referrals from ASHA workers will appear here'
                : 'Your patient referrals will appear here'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredReferrals.map((referral: Referral) => (
              <div key={referral.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-4 flex-1">
                    {/* Patient Info */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center text-white font-bold shrink-0">
                      {referral.patient_name?.charAt(0).toUpperCase() || 'P'}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-gray-800">{referral.patient_name}</h4>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getUrgencyColor(referral.urgency)}`}>
                          {referral.urgency}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${getStatusColor(referral.status)}`}>
                          {referral.status}
                        </span>
                        {referral.to_speciality && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EBF5FB] text-[#1B6CA8] border border-blue-200">
                            {referral.to_speciality}
                          </span>
                        )}
                        {referral.to_speciality && user?.speciality && referral.to_speciality.toLowerCase() === user.speciality.toLowerCase() && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-705 border border-purple-200 flex items-center gap-1 animate-pulse">
                            ✨ Matches Your Speciality
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 mb-2">
                        {referral.patient_age && referral.patient_gender && (
                          <span>{referral.patient_age}Y, {referral.patient_gender}</span>
                        )}
                        {referral.patient_mobile && (
                          <span className="flex items-center gap-1">
                            <Phone size={11} /> {referral.patient_mobile}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar size={11} /> {format(new Date(referral.created_date), 'dd MMM yyyy, HH:mm')}
                        </span>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-3 mb-2">
                        <p className="text-xs font-semibold text-gray-700 mb-1">Reason for Referral:</p>
                        <p className="text-sm text-gray-800">{referral.reason}</p>
                        {referral.notes && (
                          <p className="text-xs text-gray-600 mt-2">
                            <span className="font-semibold">Notes:</span> {referral.notes}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-4 text-xs text-gray-600">
                        {activeTab === 'incoming' ? (
                          <>
                            {referral.asha_name && (
                              <span className="flex items-center gap-1">
                                <Home size={11} className="text-blue-600" />
                                Referred by ASHA: {referral.asha_name}
                              </span>
                            )}
                            {referral.from_facility && (
                              <span className="flex items-center gap-1">
                                <Building2 size={11} className="text-gray-500" />
                                From: {referral.from_facility}
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            {referral.to_doctor && (
                              <span className="flex items-center gap-1">
                                <User size={11} className="text-purple-600" />
                                To: Dr. {referral.to_doctor}
                              </span>
                            )}
                            {referral.to_facility && (
                              <span className="flex items-center gap-1">
                                <Building2 size={11} className="text-gray-500" />
                                Facility: {referral.to_facility}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 shrink-0 flex-col items-end">
                    {/* Pending incoming: Accept / Reject */}
                    {activeTab === 'incoming' && referral.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAccept(referral.id)}
                          disabled={acceptMutation.isPending}
                          className="flex items-center gap-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          <CheckCircle size={14} />
                          Accept
                        </button>
                        <button
                          onClick={() => handleReject(referral.id)}
                          disabled={rejectMutation.isPending}
                          className="flex items-center gap-1 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          <XCircle size={14} />
                          Reject
                        </button>
                      </div>
                    )}

                    {/* Accepted incoming: Start Consultation */}
                    {activeTab === 'incoming' && referral.status === 'accepted' && (
                      <button
                        onClick={() => navigate('/clinician/queue')}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#1B6CA8] hover:bg-[#155A8A] text-white rounded-lg text-xs font-semibold transition-colors shadow-sm shadow-[#1B6CA8]/30"
                      >
                        <Stethoscope size={14} />
                        Start Consultation
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
