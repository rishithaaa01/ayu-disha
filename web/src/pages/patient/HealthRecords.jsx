import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, ChevronDown, ChevronUp, Hospital, User, Calendar, FileText } from 'lucide-react';
import patientApi from '../../services/patientApi';
import Navbar from '../../components/Navbar';

export default function HealthRecords() {
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const { data: visits = [], isLoading } = useQuery({
    queryKey: ['patientVisits'],
    queryFn: patientApi.getMyVisits,
  });

  const filtered = visits.filter(v =>
    v.hospital_name?.toLowerCase().includes(search.toLowerCase()) ||
    v.doctor_name?.toLowerCase().includes(search.toLowerCase()) ||
    v.diagnosis?.some(d => d.toLowerCase().includes(search.toLowerCase())) ||
    v.chief_complaint?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F7F3EE]">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">My Health Records</h1>
          <p className="text-gray-500 mt-1">All your hospital visits and consultations</p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search hospital, doctor or diagnosis..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-[#1B6CA8] outline-none text-sm"
          />
        </div>

        {/* Visit List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-200 animate-pulse rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <FileText size={56} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No records found</p>
            <p className="text-gray-400 text-sm mt-1">Your hospital visits will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(visit => {
              const id = visit.id || visit._id;
              const isExpanded = expandedId === id;
              return (
                <div key={id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : id)}
                    className="w-full text-left p-5 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <Hospital size={16} className="text-[#1B6CA8] shrink-0" />
                          <span className="font-semibold text-gray-800">{visit.hospital_name}</span>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span className="flex items-center space-x-1">
                            <User size={13} />
                            <span>{visit.doctor_name}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Calendar size={13} />
                            <span>{new Date(visit.date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
                          </span>
                        </div>
                        {visit.diagnosis?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {visit.diagnosis.map((d, i) => (
                              <span key={i} className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">{d}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="ml-3">
                        {isExpanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-4">
                      {visit.chief_complaint && (
                        <div>
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Chief Complaint</p>
                          <p className="text-gray-700 text-sm">{visit.chief_complaint}</p>
                        </div>
                      )}
                      {visit.prescriptions?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Prescriptions</p>
                          <div className="space-y-2">
                            {visit.prescriptions.map((rx, i) => (
                              <div key={i} className="bg-purple-50 rounded-lg p-3 text-sm">
                                <p className="font-semibold text-purple-800">{rx.medicine}</p>
                                <p className="text-purple-600 text-xs mt-0.5">{rx.dosage} · {rx.frequency} · {rx.duration}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {visit.follow_up_date && (
                        <div className="bg-amber-50 rounded-lg p-3 text-sm flex items-center space-x-2">
                          <Calendar size={15} className="text-amber-500" />
                          <span className="text-amber-700">Follow-up: {new Date(visit.follow_up_date).toLocaleDateString('en-IN', { dateStyle: 'long' })}</span>
                        </div>
                      )}
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
