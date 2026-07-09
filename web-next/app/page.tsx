'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, user, hydrate } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/login'); return; }
    const routes: Record<string, string> = {
      doctor:  '/clinician',
      patient: '/patient',
      asha:    '/asha',
      admin:   '/admin',
      pho:     '/pho',
    };
    router.replace(routes[user?.role ?? ''] ?? '/login');
  }, [isAuthenticated, user]);

  return null;
}
