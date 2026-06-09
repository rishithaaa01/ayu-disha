'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Users, UserRound, ArrowLeftRight, LogOut, Activity, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useClinicianStore } from '@/store/clinicianStore';

const navItems = [
  { name: 'OPD Queue', icon: Users, path: '/clinician/queue' },
  { name: 'My Patients', icon: UserRound, path: '/clinician/patients' },
  { name: 'Referrals', icon: ArrowLeftRight, path: '/clinician/referrals' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { logout: clinicianLogout } = useClinicianStore();

  const handleLogout = () => { logout(); clinicianLogout(); router.push('/login'); };

  return (
    <div className="w-64 h-screen bg-white border-r border-[#E2DDD8] flex flex-col fixed left-0 top-0 z-20">
      <div className="p-6 border-b border-[#E2DDD8]">
        <div className="flex items-center gap-2 mb-6 text-[#1B6CA8]">
          <Activity size={24} />
          <span className="text-xl font-bold">Ayu Disha</span>
        </div>
        <div className="bg-[#F7F3EE] p-3 rounded-lg">
          <p className="font-bold text-[#333] text-sm truncate">{user?.name || 'Dr. Ramesh Kumar'}</p>
          <p className="text-[#666] text-xs mt-1">{(user as any)?.speciality || 'General Medicine'}</p>
          <p className="text-[#888] text-[10px] mt-0.5 uppercase tracking-wider">{(user as any)?.hospital || 'Govt Hospital'}</p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 mt-4">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.path);
          return (
            <Link key={item.path} href={item.path}
              className={`flex items-center justify-between p-3 rounded-xl transition-all duration-200 ${isActive ? 'bg-[#1B6CA8] text-white shadow-lg' : 'text-[#666] hover:bg-[#F7F3EE] hover:text-[#1B6CA8]'}`}>
              <div className="flex items-center gap-3">
                <item.icon size={20} />
                <span className="font-semibold text-sm">{item.name}</span>
              </div>
              <ChevronRight size={14} className="opacity-50" />
            </Link>
          );
        })}
      </nav>

      <div className="p-6 border-t border-[#E2DDD8]">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-[#666] font-medium">Online & Synced</span>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 text-red-500 font-bold text-sm hover:translate-x-1 transition-transform">
          <LogOut size={18} /><span>Logout</span>
        </button>
      </div>
    </div>
  );
}
