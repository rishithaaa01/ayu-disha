import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import QueueScreen from './QueueScreen';
import ConsultationScreen from './ConsultationScreen';
import SettingsScreen from './SettingsScreen';
import PatientsScreen from './PatientsScreen';
import ReferralsScreen from './ReferralsScreen';
import { useAuthStore } from '../../store/authStore';
import { useClinicianStore } from '../../store/clinicianStore';
import { Bell, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function ClinicianApp() {
  const today = format(new Date(), 'EEEE, d MMMM yyyy');
  const { user } = useAuthStore();
  const { setDoctor } = useClinicianStore();

  useEffect(() => {
    if (user && user.role === 'doctor') {
      setDoctor(user);
    }
  }, [user, setDoctor]);

  return (
    <div className="flex bg-[#F7F3EE] min-h-screen">
      <Sidebar />
      
      <main className="ml-64 flex-1 flex flex-col h-screen">
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-[#E2DDD8] px-8 flex items-center justify-between sticky top-0 z-10">
          <h1 className="text-xl font-bold text-[#333] font-mukta">OPD Management</h1>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-[#666]">
              <Calendar size={18} className="text-[#1B6CA8]" />
              <span className="text-sm font-medium">{today}</span>
            </div>
            
            <button className="relative p-2 hover:bg-[#F7F3EE] rounded-full transition-colors">
              <Bell size={20} className="text-[#666]" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
            </button>
          </div>
        </header>

        {/* Dynamic Content Area */}
        <div className="flex-1 overflow-auto p-8">
          <Routes>
            <Route path="queue" element={<QueueScreen />} />
            <Route path="patients" element={<PatientsScreen />} />
            <Route path="referrals" element={<ReferralsScreen />} />
            <Route path="consultation/:visitId" element={<ConsultationScreen />} />
            <Route path="settings" element={<SettingsScreen />} />
            <Route path="/" element={<Navigate to="queue" replace />} />
            <Route path="*" element={<Navigate to="queue" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
