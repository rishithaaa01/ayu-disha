import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  const [searchParams] = useSearchParams();
  const targetReferralId = searchParams.get('id');
  const targetType = searchParams.get('type') as 'incoming' | 'outgoing' | null;

  const { user } = useAuthStore();
  const { notifyReferralAccepted, updateReferralCounts } = useRealTimeUpdates();
  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [rejectModalReferralId, setRejectModalReferralId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');

  // Fetch referrals
  const { data: referrals = [], isLoading, refetch } = useQuery({
    queryKey: ['doctorReferrals'],
    queryFn: async () => {
      const data = await api.getReferrals();
      const referralsArray = Array.isArray(data) ? data : [];
      return referralsArray.sort((a: any, b: any) => {
        const dateA = new Date(a.created_date).getTime();
        const dateB = new Date(b.created_date).getTime();
        return dateB - dateA;
      });
    },
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    staleTime: 10000,
    retry: 2,
  });

  // Auto-switch tab, reset filter, and scroll to target referral if navigated from notification
  useEffect(() => {
    if (targetType === 'incoming' || targetType === 'outgoing') {
      setActiveTab(targetType);
    }
    if (targetReferralId && referrals.length > 0) {
      const targetRef = referrals.find((r: Referral) => r.id === targetReferralId);
      if (targetRef) {
        if (targetRef.type !== activeTab) {
          setActiveTab(targetRef.type);
        }
        if (filterStatus !== 'all') {
          setFilterStatus('all');
        }
        setTimeout(() => {
          const el = document.getElementById(`referral-card-${targetReferralId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 150);
      } else {
        toast.error("Referral record not found or has been processed.", { id: 'ref-not-found' });
      }
    }
  }, [searchParams, referrals]);

  // Accept referral mutation
  const acceptMutation = useMutation({
    mutationFn: (referralId: string) => api.acceptReferral(referralId),
    onSuccess: () => {
      notifyReferralAccepted();
      refetch();
      toast.success('Referral accepted. Patient added to your OPD queue.');
    },
    onError: (err: any) => {
      const errorMsg = err.response?.data?.detail || 'Unable to accept referral. Please try again.';
      toast.error(errorMsg);
    },
  });

  // Reject referral mutation
  const rejectMutation = useMutation({
    mutationFn: ({ referralId, reason }: { referralId: string; reason: string }) =>
      api.rejectReferral(referralId, reason),
    onSuccess: () => {
      toast.success('Referral status updated to rejected.');
      setRejectModalReferralId(null);
      setRejectReason('');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['doctorReferrals'] });
    },
    onError: () => {
      toast.error('Unable to reject referral. Please try again.');
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
    acceptMutation.mutate(referralId);
  };

  const handleReject = (referralId: string) => {
    setRejectModalReferralId(referralId);
    setRejectReason('');
  };

  const submitRejection = () => {
    if (!rejectModalReferralId) return;
    rejectMutation.mutate({
      referralId: rejectModalReferralId,
      reason: rejectReason.trim() || 'No reason provided'
    });
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:px-6 sm:py-4 border-b border-gray-100">
          {/* Tabs */}
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('incoming')}
              className={`flex-1 sm:flex-none px-4 sm:px-5 py-3 rounded-xl text-sm font-semibold transition-colors min-h-[48px] flex items-center justify-center ${
                activeTab === 'incoming'
                  ? 'bg-[#1B6CA8] text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <ArrowDownLeft size={18} className="inline mr-1.5 shrink-0" />
              <span>Incoming ({stats.incoming})</span>
            </button>
            <button
              onClick={() => setActiveTab('outgoing')}
              className={`flex-1 sm:flex-none px-4 sm:px-5 py-3 rounded-xl text-sm font-semibold transition-colors min-h-[48px] flex items-center justify-center ${
                activeTab === 'outgoing'
                  ? 'bg-[#1B6CA8] text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <ArrowUpRight size={18} className="inline mr-1.5 shrink-0" />
              <span>Outgoing ({stats.outgoing})</span>
            </button>
          </div>

          {/* Status Filter & Refresh Button */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="flex-1 sm:flex-none px-3.5 sm:px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1B6CA8] focus:border-transparent outline-none bg-white min-h-[48px]"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
              <option value="completed">Completed</option>
            </select>
            
            <button
              onClick={() => { refetch(); updateReferralCounts(); }}
              className="px-4 sm:px-5 py-3 bg-[#1B6CA8] hover:bg-[#155A8A] text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 min-h-[48px] shrink-0"
            >
              <RefreshCw size={16} />
              <span>Refresh</span>
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
            {filteredReferrals.map((referral: Referral) => {
              const isSelected = referral.id === targetReferralId;
              return (
                <div 
                  id={`referral-card-${referral.id}`}
                  key={referral.id} 
                  className={`p-4 sm:p-6 transition-all duration-300 ${
                    isSelected ? 'bg-blue-50/50 ring-2 ring-[#1B6CA8] rounded-xl my-1 shadow-md' : 'hover:bg-gray-50/80'
                  }`}
                >
                  <div className="flex flex-col gap-3.5">
                    {/* ROW 1: Avatar & Patient Demographics */}
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center text-white font-bold text-base shrink-0 shadow-sm">
                        {referral.patient_name?.charAt(0).toUpperCase() || 'P'}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-900 text-base leading-snug break-words">{referral.patient_name}</h4>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500 mt-0.5">
                          {referral.patient_age && referral.patient_gender && (
                            <span className="font-semibold text-gray-700">{referral.patient_age}Y • {referral.patient_gender}</span>
                          )}
                          {referral.patient_mobile && (
                            <span className="flex items-center gap-1 text-gray-500">
                              <Phone size={12} className="text-gray-400" /> {referral.patient_mobile}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ROW 2: Status & Department Badges (Flex-Wrap Row) */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border tracking-wider ${getUrgencyColor(referral.urgency)}`}>
                        {referral.urgency}
                      </span>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${getStatusColor(referral.status)}`}>
                        {referral.status}
                      </span>
                      {referral.to_speciality && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#EBF5FB] text-[#1B6CA8] border border-blue-200">
                          {referral.to_speciality}
                        </span>
                      )}
                      {referral.to_speciality && user?.speciality && referral.to_speciality.toLowerCase() === user.speciality.toLowerCase() && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200 flex items-center gap-1 animate-pulse">
                          ✨ Matches Your Speciality
                        </span>
                      )}
                    </div>

                    {/* ROW 3: Date & Reason for Referral */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                        <Calendar size={13} className="text-gray-400" />
                        <span>{format(new Date(referral.created_date), 'dd MMM yyyy • HH:mm')}</span>
                      </div>

                      <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100/80 space-y-1">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Reason for Referral:</p>
                        <p className="text-xs sm:text-sm font-medium text-gray-800 leading-relaxed">{referral.reason}</p>
                        {referral.notes && (
                          <p className="text-xs text-gray-600 pt-1 border-t border-gray-200/60 mt-1.5">
                            <span className="font-semibold text-gray-700">Notes:</span> {referral.notes}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 font-medium pt-1">
                        {activeTab === 'incoming' ? (
                          <>
                            {referral.asha_name && (
                              <span className="flex items-center gap-1 text-blue-700 font-semibold">
                                <Home size={13} className="text-blue-600" />
                                Referred by ASHA: {referral.asha_name}
                              </span>
                            )}
                            {referral.from_facility && (
                              <span className="flex items-center gap-1 text-gray-600">
                                <Building2 size={13} className="text-gray-400" />
                                From: {referral.from_facility}
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            {referral.to_doctor && (
                              <span className="flex items-center gap-1 text-purple-700 font-semibold">
                                <User size={13} className="text-purple-600" />
                                To: Dr. {referral.to_doctor}
                              </span>
                            )}
                            {referral.to_facility && (
                              <span className="flex items-center gap-1 text-gray-600">
                                <Building2 size={13} className="text-gray-400" />
                                Facility: {referral.to_facility}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* ROW 4: Action Buttons (FULL WIDTH ON MOBILE, 100% OWN ROW) */}
                    {( (activeTab === 'incoming' && referral.status === 'pending') || 
                       (activeTab === 'incoming' && referral.status === 'accepted') ) && (
                      <div className="pt-2 border-t border-gray-100">
                        {activeTab === 'incoming' && referral.status === 'pending' && (
                          <div className="flex gap-3">
                            <button
                              onClick={() => handleAccept(referral.id)}
                              disabled={acceptMutation.isPending}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition-all min-h-[48px] shadow-sm disabled:opacity-50"
                            >
                              <CheckCircle size={16} />
                              Accept Referral
                            </button>
                            <button
                              onClick={() => handleReject(referral.id)}
                              disabled={rejectMutation.isPending}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-bold border border-red-200/80 transition-all min-h-[48px] disabled:opacity-50"
                            >
                              <XCircle size={16} />
                              Reject
                            </button>
                          </div>
                        )}

                        {activeTab === 'incoming' && referral.status === 'accepted' && (
                          <button
                            onClick={() => {
                              navigate(`/clinician/queue?patient_id=${referral.patient_id}&referral_id=${referral.id}`);
                            }}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3.5 bg-[#1B6CA8] hover:bg-[#155A8A] text-white rounded-xl text-xs sm:text-sm font-bold transition-all min-h-[48px] shadow-md shadow-[#1B6CA8]/20 active:scale-[0.99]"
                          >
                            <Stethoscope size={18} />
                            Start Consultation
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rejection Modal */}
      {rejectModalReferralId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800 text-lg">Reject Referral</h3>
              <button 
                onClick={() => setRejectModalReferralId(null)}
                className="text-gray-400 hover:text-gray-600 font-bold p-1"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Please provide a reason for rejecting this referral (optional):
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Bed capacity full, Referred to specialized facility..."
              className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 mb-4 min-h-[90px]"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setRejectModalReferralId(null)}
                className="flex-1 py-3 px-4 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors min-h-[44px]"
              >
                Cancel
              </button>
              <button
                onClick={submitRejection}
                disabled={rejectMutation.isPending}
                className="flex-1 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors min-h-[44px] shadow-sm disabled:opacity-50"
              >
                {rejectMutation.isPending ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
