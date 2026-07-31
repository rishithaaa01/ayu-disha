import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../services/clinicianApi';
import { useRealTimeUpdates } from '../../contexts/RealTimeUpdateContext';
import { 
  Search, 
  Filter, 
  User, 
  Calendar, 
  Phone, 
  MapPin,
  ChevronRight,
  Activity,
  Heart,
  AlertTriangle,
  Clock,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';

interface Patient {
  patient_id: string;
  name: string;
  age?: number;
  gender?: string;
  mobile?: string;
  village?: string;
  district?: string;
  last_visit_date?: string;
  last_diagnosis?: string;
  chronic_conditions?: string[];
  risk_level?: 'low' | 'medium' | 'high';
  total_visits?: number;
}

import { useClinicianStore } from '../../store/clinicianStore';

export default function PatientsScreen() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const { updatePatientCounts } = useRealTimeUpdates();
  const { setActivePatient } = useClinicianStore();

  // Fetch doctor's patients
  const { data: patients = [], isLoading, refetch } = useQuery({
    queryKey: ['doctorPatients'],
    queryFn: async () => {
      const data = await api.getMyPatients();

      // Ensure we have an array
      const patientsArray = Array.isArray(data) ? data : [];

      // Sort by last visit date descending (most recent first)
      return patientsArray.sort((a: any, b: any) => {
        const dateA = a.last_visit_date ? new Date(a.last_visit_date).getTime() : 0;
        const dateB = b.last_visit_date ? new Date(b.last_visit_date).getTime() : 0;
        return dateB - dateA;
      });
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchOnWindowFocus: true,
    staleTime: 10000,
    retry: 2,
  });


  // Filter patients
  const filteredPatients = patients.filter((patient: Patient) => {
    const matchesSearch = patient.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         patient.mobile?.includes(searchQuery) ||
                         patient.village?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRisk = filterRisk === 'all' || patient.risk_level === filterRisk;
    
    return matchesSearch && matchesRisk;
  });

  const handlePatientClick = (patient: Patient) => {
    setActivePatient(patient);
    navigate(`/clinician/queue?patient_id=${patient.patient_id}`);
  };

  const getRiskBadge = (risk?: string) => {
    switch (risk) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'medium':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      default:
        return 'bg-green-100 text-green-700 border-green-200';
    }
  };

  const getRiskIcon = (risk?: string) => {
    switch (risk) {
      case 'high':
        return <AlertTriangle size={12} className="text-red-600" />;
      case 'medium':
        return <Clock size={12} className="text-amber-600" />;
      default:
        return <Activity size={12} className="text-green-600" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">My Patients</h1>
          <p className="text-gray-500 text-sm">Patients you've consulted or are currently managing</p>
        </div>
        {isLoading && (
          <div className="flex items-center gap-2 text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm font-medium">Updating...</span>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Patients</span>
            <User size={18} className="text-blue-500" />
          </div>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold text-gray-800">{patients.length}</p>
            {isLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>}
          </div>
        </div>
        
        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">High Risk</span>
            <AlertTriangle size={18} className="text-red-500" />
          </div>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold text-gray-800">
              {patients.filter((p: Patient) => p.risk_level === 'high').length}
            </p>
            {isLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>}
          </div>
        </div>
        
        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Chronic Cases</span>
            <Heart size={18} className="text-purple-500" />
          </div>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold text-gray-800">
              {patients.filter((p: Patient) => p.chronic_conditions && p.chronic_conditions.length > 0).length}
            </p>
            {isLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500"></div>}
          </div>
        </div>
        
        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">This Week</span>
            <Calendar size={18} className="text-green-500" />
          </div>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold text-gray-800">
              {patients.filter((p: Patient) => {
                if (!p.last_visit_date) return false;
                const lastVisit = new Date(p.last_visit_date);
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return lastVisit > weekAgo;
              }).length}
            </p>
            {isLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500"></div>}
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 mb-6 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, phone, or village..."
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1B6CA8] focus:border-transparent outline-none min-h-[48px]"
            />
          </div>

          {/* Risk Filter & Refresh */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex items-center gap-2 flex-1">
              <Filter size={18} className="text-gray-400 shrink-0" />
              <select
                value={filterRisk}
                onChange={(e) => setFilterRisk(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1B6CA8] focus:border-transparent outline-none bg-white min-h-[48px]"
              >
                <option value="all">All Risk Levels</option>
                <option value="high">High Risk</option>
                <option value="medium">Medium Risk</option>
                <option value="low">Low Risk</option>
              </select>
            </div>

            <button
              onClick={() => { refetch(); updatePatientCounts(); }}
              className="w-full sm:w-auto px-5 py-3 bg-[#1B6CA8] hover:bg-[#155A8A] text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 min-h-[48px] shrink-0"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Patient Records List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 sm:px-6 py-4 bg-gray-50/50 border-b border-gray-100">
          <h3 className="font-bold text-gray-800">Patient Records</h3>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1B6CA8] mx-auto mb-4"></div>
            <p className="text-gray-500 text-sm">Loading patients...</p>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="p-12 text-center">
            <User size={48} className="text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-600 mb-2">
              {searchQuery || filterRisk !== 'all' ? 'No patients found' : 'No patients yet'}
            </h3>
            <p className="text-gray-400 text-sm">
              {searchQuery || filterRisk !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Patients will appear here after consultations'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredPatients.map((patient: Patient) => (
              <div
                key={patient.patient_id}
                onClick={() => handlePatientClick(patient)}
                className="p-4 sm:p-6 hover:bg-gray-50 transition-colors cursor-pointer group"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                    {/* Avatar */}
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-base sm:text-lg shrink-0 shadow-sm">
                      {patient.name?.charAt(0).toUpperCase() || 'P'}
                    </div>

                    {/* Patient Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <h4 className="font-bold text-gray-900 text-base">{patient.name}</h4>
                        {patient.risk_level && (
                          <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getRiskBadge(patient.risk_level)}`}>
                            {getRiskIcon(patient.risk_level)}
                            {patient.risk_level} Risk
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mb-2.5">
                        {patient.age && patient.gender && (
                          <span className="font-semibold text-gray-700">{patient.age}Y, {patient.gender}</span>
                        )}
                        {patient.mobile && (
                          <span className="flex items-center gap-1">
                            <Phone size={12} className="text-gray-400" /> {patient.mobile}
                          </span>
                        )}
                        {patient.village && (
                          <span className="flex items-center gap-1">
                            <MapPin size={12} className="text-gray-400" /> {patient.village}
                          </span>
                        )}
                      </div>

                      {patient.last_diagnosis && (
                        <p className="text-xs text-gray-600 mb-2 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                          <span className="font-bold text-gray-700">Last Diagnosis:</span> {patient.last_diagnosis}
                        </p>
                      )}

                      {patient.chronic_conditions && patient.chronic_conditions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {patient.chronic_conditions.map((condition, idx) => (
                            <span
                              key={idx}
                              className="px-2.5 py-0.5 bg-purple-50 text-purple-700 text-[10px] font-bold rounded-lg border border-purple-100"
                            >
                              {condition}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Side Info */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 shrink-0">
                    <div className="text-left sm:text-right">
                      {patient.last_visit_date && (
                        <p className="text-xs font-semibold text-gray-600">
                          Last visit: {format(new Date(patient.last_visit_date), 'dd MMM yyyy')}
                        </p>
                      )}
                      {patient.total_visits && (
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {patient.total_visits} total visits
                        </p>
                      )}
                    </div>
                    <ChevronRight size={20} className="text-gray-400 group-hover:text-[#1B6CA8] transition-colors shrink-0" />
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
