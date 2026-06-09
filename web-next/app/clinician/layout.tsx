import Sidebar from '@/components/clinician/Sidebar';
import TopBar from '@/components/clinician/TopBar';

export default function ClinicianLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex bg-[#F7F3EE] min-h-screen">
      <Sidebar />
      <main className="ml-64 flex-1 flex flex-col h-screen">
        <TopBar />
        <div className="flex-1 overflow-auto p-8">{children}</div>
      </main>
    </div>
  );
}
