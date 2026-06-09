import { useQuery } from '@tanstack/react-query';
import { FlaskConical, CheckCircle, Clock, User } from 'lucide-react';
import patientApi from '../../services/patientApi';
import Navbar from '../../components/Navbar';

const statusConfig = {
  resulted: { label: 'Resulted', color: 'bg-green-100 text-green-700' },
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700' },
  ordered: { label: 'Ordered', color: 'bg-blue-100 text-blue-700' },
};

export default function LabTests() {
  const { data: labResults = [], isLoading } = useQuery({
    queryKey: ['patientLabResults'],
    queryFn: patientApi.getMyLabResults,
  });

  return (
    <div className="min-h-screen bg-[#F7F3EE]">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Lab Tests</h1>
          <p className="text-gray-500 mt-1">All your ordered and resulted laboratory tests</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-28 bg-gray-200 animate-pulse rounded-xl" />)}
          </div>
        ) : labResults.length === 0 ? (
          <div className="text-center py-20">
            <FlaskConical size={56} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No lab tests ordered yet</p>
            <p className="text-gray-400 text-sm mt-1">Your lab results will appear here when ordered by a doctor</p>
          </div>
        ) : (
          <div className="space-y-4">
            {labResults.map((lab, i) => {
              const status = lab.status || 'ordered';
              const sc = statusConfig[status] || statusConfig.ordered;
              return (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="bg-orange-100 p-3 rounded-xl shrink-0">
                        <FlaskConical size={20} className="text-orange-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800">{lab.test_name}</h3>
                        <div className="flex items-center space-x-2 mt-1 text-sm text-gray-500">
                          <User size={13} />
                          <span>{lab.ordered_by}</span>
                          <span>·</span>
                          <span>{new Date(lab.ordered_date).toLocaleDateString('en-IN')}</span>
                        </div>
                        {lab.result && (
                          <div className="mt-3 bg-green-50 rounded-lg p-3">
                            <p className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-1">Result</p>
                            <p className="text-green-800 font-medium text-sm">{lab.result}</p>
                            {lab.result_date && (
                              <p className="text-green-600 text-xs mt-1">
                                Reported: {new Date(lab.result_date).toLocaleDateString('en-IN')}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full shrink-0 ${sc.color}`}>
                      {sc.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
