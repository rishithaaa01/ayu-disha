import { useQuery } from '@tanstack/react-query';
import { Pill, Clock, Calendar } from 'lucide-react';
import patientApi from '../../services/patientApi';
import Navbar from '../../components/Navbar';

export default function Medicines() {
  const { data: prescriptions = [], isLoading } = useQuery({
    queryKey: ['patientPrescriptions'],
    queryFn: patientApi.getMyPrescriptions,
  });

  return (
    <div className="min-h-screen bg-[#F7F3EE]">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">My Medicines</h1>
          <p className="text-gray-500 mt-1">All prescribed medications across your visits</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1,2,3,4].map(i => <div key={i} className="h-20 bg-gray-200 animate-pulse rounded-xl" />)}
          </div>
        ) : prescriptions.length === 0 ? (
          <div className="text-center py-20">
            <Pill size={56} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No prescriptions yet</p>
            <p className="text-gray-400 text-sm mt-1">Your medicines will appear here after your doctor visits</p>
          </div>
        ) : (
          <div className="space-y-4">
            {prescriptions.map((rx, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-start space-x-4">
                  <div className="bg-purple-100 p-3 rounded-xl shrink-0">
                    <Pill size={20} className="text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-800">{rx.medicine}</h3>
                    <div className="flex flex-wrap gap-3 mt-2">
                      <span className="flex items-center space-x-1 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-lg">
                        <Clock size={12} />
                        <span>{rx.frequency}</span>
                      </span>
                      <span className="flex items-center space-x-1 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-lg">
                        <span>💊</span>
                        <span>{rx.dosage}</span>
                      </span>
                      <span className="flex items-center space-x-1 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-lg">
                        <Calendar size={12} />
                        <span>{rx.duration}</span>
                      </span>
                    </div>
                    {rx.visit_date && (
                      <p className="text-xs text-gray-400 mt-2">Prescribed: {new Date(rx.visit_date).toLocaleDateString('en-IN')}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
