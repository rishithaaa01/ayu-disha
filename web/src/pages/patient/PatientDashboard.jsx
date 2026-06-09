import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import patientApi from '../../services/patientApi';
import Navbar from '../../components/Navbar';
import { FileText, Pill, FlaskConical, ShieldCheck, Sparkles, RefreshCw, AlertCircle, Calendar } from 'lucide-react';

export default function PatientDashboard() {
  const { user } = useAuthStore();

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
    { to: '/patient/records', label: 'My Records', icon: FileText, color: 'bg-blue-50 text-blue-600 border-blue-100' },
    { to: '/patient/medicines', label: 'Medicines', icon: Pill, color: 'bg-purple-50 text-purple-600 border-purple-100' },
    { to: '/patient/tests', label: 'Lab Tests', icon: FlaskConical, color: 'bg-orange-50 text-orange-600 border-orange-100' },
    { to: '/patient/consents', label: 'Consents', icon: ShieldCheck, color: 'bg-green-50 text-green-600 border-green-100' },
  ];

  return (
    <div className="min-h-screen bg-[#F7F3EE]">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">
            Welcome back, {profileLoading ? '...' : profile?.name || user?.name} 👋
          </h1>
          <p className="text-gray-500 mt-1">Here's your health summary for today.</p>
        </div>

        {/* Health Card */}
        {!profileLoading && profile && (
          <div className="bg-gradient-to-r from-[#1B6CA8] to-[#1557A0] text-white rounded-2xl p-6 mb-6 shadow-lg">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-white/70 text-sm font-medium uppercase tracking-wider">Patient</p>
                <h2 className="text-2xl font-bold mt-1">{profile.name}</h2>
                {profile.abha_number && (
                  <p className="text-white/80 text-sm mt-1">ABHA: {profile.abha_number}</p>
                )}
              </div>
              <div className="text-right">
                {profile.blood_group && (
                  <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">{profile.blood_group}</span>
                )}
              </div>
            </div>
            {profile.allergies?.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-white/70 text-xs">Allergies:</span>
                {profile.allergies.map((a) => (
                  <span key={a} className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">{a}</span>
                ))}
              </div>
            )}
          </div>
        )}
        {profileLoading && <div className="h-36 bg-gray-200 animate-pulse rounded-2xl mb-6" />}

        {/* Upcoming Follow-up Banner */}
        {upcomingFollowUp && (
          <div className="bg-amber-50 border-l-4 border-amber-400 rounded-xl p-4 mb-6 flex items-start space-x-3">
            <Calendar className="text-amber-500 mt-0.5 shrink-0" size={20} />
            <div>
              <p className="font-semibold text-amber-800">Follow-up Due</p>
              <p className="text-amber-700 text-sm">{new Date(upcomingFollowUp.follow_up_date).toLocaleDateString('en-IN', { dateStyle: 'long' })} at {upcomingFollowUp.hospital_name}</p>
            </div>
          </div>
        )}

        {/* AI Summary */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Sparkles size={18} className="text-[#1B6CA8]" />
              <h3 className="font-bold text-gray-800">Your Health Today</h3>
            </div>
            <button onClick={() => refetchSummary()} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <RefreshCw size={16} className="text-gray-400" />
            </button>
          </div>
          {summaryLoading ? (
            <div className="space-y-2">
              <div className="h-4 bg-gray-100 animate-pulse rounded w-full" />
              <div className="h-4 bg-gray-100 animate-pulse rounded w-5/6" />
              <div className="h-4 bg-gray-100 animate-pulse rounded w-4/6" />
            </div>
          ) : (
            <p className="text-gray-600 leading-relaxed text-sm">
              {summary?.summary || 'No health summary available yet. Your AI health summary will appear here after your medical records are updated.'}
            </p>
          )}
        </div>

        {/* Quick Links Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {quickLinks.map(({ to, label, icon: Icon, color }) => (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center justify-center p-5 rounded-2xl border bg-white hover:shadow-md transition-all space-y-3 group`}
            >
              <div className={`p-3 rounded-xl ${color}`}>
                <Icon size={22} />
              </div>
              <span className="text-sm font-semibold text-gray-700 group-hover:text-[#1B6CA8] transition-colors">{label}</span>
            </Link>
          ))}
        </div>

        {/* Recent Visit */}
        {recentVisit && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">Last Visit</h3>
              <Link to="/patient/records" className="text-sm text-[#1B6CA8] hover:underline font-medium">View all →</Link>
            </div>
            <div>
              <p className="font-semibold text-gray-800">{recentVisit.hospital_name}</p>
              <p className="text-gray-500 text-sm">{recentVisit.doctor_name}</p>
              <p className="text-gray-400 text-xs mt-1">
                {new Date(recentVisit.date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
              </p>
              {recentVisit.diagnosis?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {recentVisit.diagnosis.map((d: string, i: number) => (
                    <span key={i} className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full">{d}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        {visitsLoading && <div className="h-36 bg-gray-200 animate-pulse rounded-2xl" />}
      </div>
    </div>
  );
}
