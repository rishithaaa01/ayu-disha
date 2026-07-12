import { useQuery } from '@tanstack/react-query';
import { FlaskConical, CheckCircle, Clock, User, Sparkles, ExternalLink, AlertTriangle } from 'lucide-react';
import patientApi from '../../services/patientApi';
import Navbar from '../../components/Navbar';

const statusConfig = {
  resulted: { label: 'Resulted', color: 'bg-green-100 text-green-700' },
  pending:  { label: 'Pending',  color: 'bg-amber-100 text-amber-700' },
  ordered:  { label: 'Ordered',  color: 'bg-blue-100 text-blue-700' },
};

export default function LabTests() {
  const { data: labResults = [], isLoading } = useQuery({
    queryKey: ['patientLabResults'],
    queryFn: patientApi.getMyLabResults,
    refetchInterval: 30000, // poll every 30s for real-time updates
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
              const isResulted = status === 'resulted';
              return (
                <div key={i} className={`bg-white rounded-2xl border shadow-sm p-5 ${
                  lab.ai_is_abnormal ? 'border-red-100' :
                  isResulted ? 'border-green-100' : 'border-gray-100'
                }`}>
                  {/* Header row */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start space-x-4">
                      <div className={`p-3 rounded-xl shrink-0 ${
                        lab.ai_is_abnormal ? 'bg-red-100' :
                        isResulted ? 'bg-green-100' : 'bg-orange-100'
                      }`}>
                        <FlaskConical size={20} className={
                          lab.ai_is_abnormal ? 'text-red-600' :
                          isResulted ? 'text-green-600' : 'text-orange-600'
                        } />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-gray-800">{lab.test_name}</h3>
                          {lab.ai_is_abnormal && (
                            <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                              <AlertTriangle size={9} /> Abnormal
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <User size={13} />
                          <span>{lab.ordered_by}</span>
                          <span>·</span>
                          <span>{new Date(lab.ordered_date).toLocaleDateString('en-IN')}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {lab.pdf_url && (
                        <a
                          href={lab.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => {
                            // Open PDF in new tab without sending auth headers
                            e.preventDefault();
                            window.open(lab.pdf_url, '_blank', 'noopener,noreferrer');
                          }}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-semibold bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <ExternalLink size={12} /> View PDF
                        </a>
                      )}
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full ${sc.color}`}>
                        {sc.label}
                      </span>
                    </div>
                  </div>

                  {/* Pending state */}
                  {!isResulted && (
                    <div className="bg-amber-50 rounded-xl px-4 py-3">
                      <p className="text-xs text-amber-700 font-semibold flex items-center gap-1.5">
                        <Clock size={13} /> Processing — your result will appear here once ready
                      </p>
                    </div>
                  )}

                  {/* Result value */}
                  {isResulted && lab.result && (
                    <div className="bg-gray-50 rounded-xl px-4 py-2.5 mb-3">
                      <p className="text-sm font-bold text-gray-800">{lab.result}</p>
                      {lab.result_date && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          Reported: {new Date(lab.result_date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                          {lab.resulted_by && ` · by ${lab.resulted_by}`}
                        </p>
                      )}
                    </div>
                  )}

                  {/* AI Summary */}
                  {isResulted && lab.ai_summary && (
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Sparkles size={13} className="text-blue-600" />
                        <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">AI Report Summary</p>
                      </div>
                      <p className="text-xs text-gray-700 leading-relaxed">{lab.ai_summary}</p>
                      {lab.ai_recommendation && (
                        <p className="text-xs text-blue-700 font-semibold mt-1.5">
                          → {lab.ai_recommendation}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Key values table */}
                  {isResulted && lab.ai_key_values?.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-gray-400 uppercase tracking-wider text-[10px] border-b border-gray-100">
                            <th className="text-left py-1.5 pr-4">Parameter</th>
                            <th className="text-left py-1.5 pr-4">Value</th>
                            <th className="text-left py-1.5 pr-4">Reference</th>
                            <th className="text-left py-1.5">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {lab.ai_key_values.map((kv, idx) => (
                            <tr key={idx}>
                              <td className="py-1.5 pr-4 font-medium text-gray-700">{kv.parameter}</td>
                              <td className="py-1.5 pr-4 font-bold text-gray-800">{kv.value}</td>
                              <td className="py-1.5 pr-4 text-gray-500">{kv.reference_range}</td>
                              <td className="py-1.5">
                                <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                                  kv.status === 'normal' ? 'bg-green-100 text-green-700' :
                                  kv.status === 'critical' ? 'bg-red-100 text-red-700' :
                                  'bg-amber-100 text-amber-700'
                                }`}>
                                  {kv.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
