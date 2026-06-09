'use client';

import { Bell, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function TopBar() {
  return (
    <header className="h-16 bg-white border-b border-[#E2DDD8] px-8 flex items-center justify-between sticky top-0 z-10">
      <h1 className="text-xl font-bold text-[#333]">OPD Management</h1>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-[#666]">
          <Calendar size={18} className="text-[#1B6CA8]" />
          <span className="text-sm font-medium">{format(new Date(), 'EEEE, d MMMM yyyy')}</span>
        </div>
        <button className="relative p-2 hover:bg-[#F7F3EE] rounded-full transition-colors">
          <Bell size={20} className="text-[#666]" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
        </button>
      </div>
    </header>
  );
}
