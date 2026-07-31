import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, NavLink } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { LogOut, Home, FileText, Pill, FlaskConical, ShieldCheck, ArrowUpRight, Stethoscope, Bell, Menu, X } from 'lucide-react';

export default function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [showNotifs, setShowNotifs] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch patient notifications if they are a patient
  const { data: notifications = [] } = useQuery({
    queryKey: ['patientNotifications', user?.id],
    queryFn: () => api.get('/lab/notifications').then(res => res.data).catch(() => []),
    enabled: !!user && user.role === 'patient',
    refetchInterval: 15000,
  });

  const unreadCount = (notifications || []).filter(n => !n.read).length;

  const markReadMutation = useMutation({
    mutationFn: (notifId) => api.patch(`/lab/notifications/${notifId}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientNotifications'] });
    }
  });

  const handleNotificationClick = (notif) => {
    if (!notif.read) {
      markReadMutation.mutate(notif.id || notif._id);
    }
    setShowNotifs(false);
    navigate('/patient/tests');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const patientLinks = [
    { to: '/patient', label: 'Home', icon: Home },
    { to: '/patient/records', label: 'Records', icon: FileText },
    { to: '/patient/medicines', label: 'Medicines', icon: Pill },
    { to: '/patient/tests', label: 'Lab Tests', icon: FlaskConical },
    { to: '/patient/consents', label: 'Consents', icon: ShieldCheck },
  ];

  const ashaLinks = [
    { to: '/asha', label: 'Dashboard', icon: Home },
    { to: '/asha/households', label: 'Households', icon: Home },
    { to: '/asha/referrals', label: 'Referrals', icon: ArrowUpRight },
  ];

  const doctorLinks = [
    { to: '/clinician', label: 'OPD Queue', icon: Stethoscope },
  ];

  const links = user?.role === 'patient' ? patientLinks 
              : user?.role === 'asha' ? ashaLinks
              : user?.role === 'doctor' ? doctorLinks
              : [];

  return (
    <header className="bg-[#1B6CA8] text-white pt-safe sticky top-0 z-50 shadow-md">
      <nav className="flex items-center justify-between px-4 sm:px-6 py-3 w-full max-w-7xl mx-auto">
        <div className="flex items-center space-x-4 md:space-x-8">
          {links.length > 0 && (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          )}
          <span className="text-lg sm:text-xl font-bold tracking-tight">Ayu Disha</span>

          <div className="hidden md:flex items-center space-x-1">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/patient' || to === '/asha'}
                className={({ isActive }) =>
                  `flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <Icon size={15} />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-4">
          {user?.role === 'patient' && (
            <div className="relative">
              <button 
                onClick={() => setShowNotifs(!showNotifs)}
                className={`relative p-2 hover:bg-white/10 rounded-full transition-colors text-white ${showNotifs ? 'bg-white/10' : ''}`}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] bg-red-500 rounded-full border border-[#1B6CA8] flex items-center justify-center text-[8px] font-extrabold text-white px-0.5">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifs && createPortal(
                <div className="fixed right-3 sm:right-6 top-[calc(env(safe-area-inset-top,0px)+4.25rem)] w-[calc(100vw-1.5rem)] max-w-xs sm:w-80 bg-white border border-[#E2DDD8] rounded-2xl shadow-2xl overflow-hidden z-[99999] animate-fadeIn text-left text-gray-800 pointer-events-auto">
                  <div className="px-4 py-3 bg-[#F7F3EE] border-b border-[#E2DDD8] flex justify-between items-center">
                    <span className="font-bold text-xs uppercase tracking-wider text-gray-600">Health Updates</span>
                    {unreadCount > 0 && (
                      <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-[9px] font-extrabold">
                        {unreadCount} New
                      </span>
                    )}
                  </div>
                  
                  <div className="max-h-[300px] overflow-y-auto divide-y divide-[#E2DDD8] custom-scrollbar">
                    {notifications.length > 0 ? (
                      notifications.map((notif) => (
                        <div 
                          key={notif.id || notif._id} 
                          onClick={() => handleNotificationClick(notif)}
                          className={`p-4 hover:bg-blue-50/10 cursor-pointer transition-colors border-l-4 ${
                            !notif.read ? 'border-[#1B6CA8] bg-blue-50/5' : 'border-transparent'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2 mb-1">
                            <p className="text-xs font-bold text-gray-800">{notif.title || 'Lab Result Ready'}</p>
                            {notif.is_abnormal && (
                              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-red-50 text-red-600 uppercase">
                                Attention
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-500 leading-normal">
                            {notif.message}
                          </p>
                          <p className="text-[9px] text-gray-400 mt-2 font-medium">
                            {new Date(notif.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-gray-400">
                        <p className="text-sm font-semibold">No notifications</p>
                        <p className="text-xs mt-1">We will notify you here when your test results are ready.</p>
                      </div>
                    )}
                  </div>
                </div>,
                document.body
              )}
            </div>
          )}

          <div className="text-right hidden sm:block">
            <div className="text-sm font-semibold">{user?.name || 'User'}</div>
            <div className="text-xs text-white/60 capitalize">{user?.role}</div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-1.5 bg-white/10 hover:bg-white/20 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all"
          >
            <LogOut size={15} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </nav>

      {/* Mobile Links Menu */}
      {mobileMenuOpen && links.length > 0 && (
        <div className="md:hidden bg-[#1557A0] px-4 py-2 space-y-1 border-t border-white/10 animate-fadeIn">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/patient' || to === '/asha'}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      )}
    </header>
  );
}
