import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import QueueScreen from './QueueScreen';
import ConsultationScreen from './ConsultationScreen';
import SettingsScreen from './SettingsScreen';
import PatientsScreen from './PatientsScreen';
import ReferralsScreen from './ReferralsScreen';
import { useAuthStore } from '../../store/authStore';
import { useClinicianStore } from '../../store/clinicianStore';
import { RealTimeUpdateProvider } from '../../contexts/RealTimeUpdateContext';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/clinicianApi';
import { Bell, Calendar, Menu } from 'lucide-react';
import { format } from 'date-fns';

export default function ClinicianApp() {
  const today = format(new Date(), 'EEEE, d MMMM yyyy');
  const { user } = useAuthStore();
  const { setDoctor } = useClinicianStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  // Fetch referrals for real-time notifications
  const { data: referrals = [] } = useQuery({
    queryKey: ['doctorReferrals'],
    queryFn: () => api.getReferrals().catch(() => []),
    refetchInterval: 10000, // Poll every 10 seconds
  });

  const pendingIncoming = referrals.filter(
    (r: any) => r.type === 'incoming' && r.status === 'pending'
  );

  useEffect(() => {
    if (user && user.role === 'doctor') {
      setDoctor(user);
    }
  }, [user, setDoctor]);

  return (
    <RealTimeUpdateProvider>
      <div className="flex bg-[#F7F3EE] min-h-screen w-full">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <main className="ml-0 lg:ml-64 flex-1 flex flex-col min-h-screen w-full max-w-full overflow-x-hidden">
          {/* Top Bar with Safe Area Top Padding */}
          <header className="pt-safe bg-white border-b border-[#E2DDD8] sticky top-0 z-10 shadow-sm">
            <div className="h-16 px-4 sm:px-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                  aria-label="Open navigation menu"
                >
                  <Menu size={22} />
                </button>
                <h1 className="text-lg sm:text-xl font-bold text-[#333] font-mukta truncate">OPD Management</h1>
              </div>
              
              <div className="flex items-center gap-3 sm:gap-6">
                <div className="hidden sm:flex items-center gap-2 text-[#666]">
                  <Calendar size={18} className="text-[#1B6CA8]" />
                  <span className="text-sm font-medium">{today}</span>
                </div>
                
                <div className="relative">
                  <button 
                    onClick={() => setShowNotifications(!showNotifications)}
                    className={`relative p-2 hover:bg-[#F7F3EE] rounded-full transition-colors ${showNotifications ? 'bg-[#F7F3EE]' : ''}`}
                  >
                    <Bell size={20} className="text-[#666]" />
                    {pendingIncoming.length > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-extrabold text-white px-1">
                        {pendingIncoming.length}
                      </span>
                    )}
                  </button>

                  {showNotifications && (
                    <div className="absolute right-0 mt-3 w-72 sm:w-80 bg-white border border-[#E2DDD8] rounded-2xl shadow-xl overflow-hidden z-50 animate-fadeIn">
                      <div className="px-4 py-3 bg-[#F7F3EE] border-b border-[#E2DDD8] flex justify-between items-center">
                        <span className="font-bold text-xs uppercase tracking-wider text-[#666]">Notifications</span>
                        {pendingIncoming.length > 0 && (
                          <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-[9px] font-extrabold">
                            {pendingIncoming.length} New
                          </span>
                        )}
                      </div>
                      
                      <div className="max-h-[300px] overflow-y-auto divide-y divide-[#E2DDD8] custom-scrollbar">
                        {pendingIncoming.length > 0 ? (
                          pendingIncoming.map((ref: any) => (
                            <div 
                              key={ref.id} 
                              onClick={() => {
                                setShowNotifications(false);
                                navigate('/clinician/referrals');
                              }}
                              className={`p-4 hover:bg-blue-50/10 cursor-pointer transition-colors border-l-4 ${
                                ref.urgency?.toLowerCase() === 'immediate' || ref.urgency?.toLowerCase() === 'today'
                                  ? 'border-red-500 bg-red-50/5' 
                                  : 'border-[#1B6CA8]'
                              }`}
                            >
                              <div className="flex justify-between items-start gap-2 mb-1">
                                <p className="text-xs font-bold text-gray-800">{ref.patient_name}</p>
                                <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase ${
                                  ref.urgency?.toLowerCase() === 'immediate' || ref.urgency?.toLowerCase() === 'today'
                                    ? 'bg-red-50 text-red-600'
                                    : 'bg-blue-50 text-blue-600'
                                }`}>
                                  {ref.urgency}
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-500 line-clamp-2 mb-2">
                                {ref.reason || 'Referred for clinical assessment'}
                              </p>
                              <div className="flex justify-between items-center text-[9px]">
                                <span className="bg-[#F7F3EE] text-gray-600 font-bold px-1.5 py-0.5 rounded">
                                  {ref.to_speciality || 'General Medicine'}
                                </span>
                                <span className="text-[#1B6CA8] font-bold hover:underline">View Referral →</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-8 text-center text-gray-400">
                            <p className="text-sm font-semibold">All caught up!</p>
                            <p className="text-xs mt-1">No pending incoming referrals.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>

          {/* Dynamic Content Area */}
          <div className="flex-1 p-4 sm:p-6 lg:p-8 pb-safe overflow-y-auto">
            <Routes>
              <Route path="queue" element={<QueueScreen />} />
              <Route path="patients" element={<PatientsScreen />} />
              <Route path="referrals" element={<ReferralsScreen />} />
              <Route path="consultation/:visitId" element={<ConsultationScreen />} />
              <Route path="settings" element={<SettingsScreen />} />
              <Route path="/" element={<Navigate to="referrals" replace />} />
              <Route path="*" element={<Navigate to="referrals" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </RealTimeUpdateProvider>
  );
}
