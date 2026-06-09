import { useNavigate, NavLink } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { LogOut, Home, FileText, Pill, FlaskConical, ShieldCheck, Users, Map, ArrowUpRight, Stethoscope } from 'lucide-react';

export default function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

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
    { to: '/asha/households', label: 'Households', icon: Users },
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
    <nav className="bg-[#1B6CA8] text-white flex items-center justify-between px-6 py-3 shadow-lg sticky top-0 z-50">
      <div className="flex items-center space-x-8">
        <span className="text-xl font-bold tracking-tight">Ayu Disha</span>
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

      <div className="flex items-center space-x-4">
        <div className="text-right hidden sm:block">
          <div className="text-sm font-semibold">{user?.name || 'User'}</div>
          <div className="text-xs text-white/60 capitalize">{user?.role}</div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center space-x-1.5 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg text-sm font-medium transition-all"
        >
          <LogOut size={15} />
          <span>Logout</span>
        </button>
      </div>
    </nav>
  );
}
