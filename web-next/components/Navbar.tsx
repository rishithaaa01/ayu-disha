'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { LogOut, Home, FileText, Pill, FlaskConical, ShieldCheck, Stethoscope, ArrowUpRight } from 'lucide-react';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const handleLogout = () => { logout(); router.push('/login'); };

  const patientLinks = [
    { href: '/patient', label: 'Home', icon: Home },
    { href: '/patient/records', label: 'Records', icon: FileText },
    { href: '/patient/medicines', label: 'Medicines', icon: Pill },
    { href: '/patient/tests', label: 'Lab Tests', icon: FlaskConical },
    { href: '/patient/consents', label: 'Consents', icon: ShieldCheck },
  ];

  const links = user?.role === 'patient' ? patientLinks : [];

  return (
    <nav className="bg-[#1B6CA8] text-white flex items-center justify-between px-6 py-3 shadow-lg sticky top-0 z-50">
      <div className="flex items-center space-x-8">
        <span className="text-xl font-bold tracking-tight">Ayu Disha</span>
        <div className="hidden md:flex items-center space-x-1">
          {links.map(({ href, label, icon: Icon }) => {
            const isActive = href === '/patient' ? pathname === '/patient' : pathname.startsWith(href);
            return (
              <Link key={href} href={href}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}>
                <Icon size={15} /><span>{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <div className="text-right hidden sm:block">
          <div className="text-sm font-semibold">{user?.name || 'User'}</div>
          <div className="text-xs text-white/60 capitalize">{user?.role}</div>
        </div>
        <button onClick={handleLogout}
          className="flex items-center space-x-1.5 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg text-sm font-medium transition-all">
          <LogOut size={15} /><span>Logout</span>
        </button>
      </div>
    </nav>
  );
}
