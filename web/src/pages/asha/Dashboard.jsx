import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';
import {
  Users, Activity, MapPin, Home, ArrowUpRight, Plus, CheckCircle2,
  RefreshCcw, AlertTriangle, LogOut, FileText, ChevronRight, User,
  Calendar, Phone, Shield, Languages, Info, Mic, Sparkles, Bell
} from 'lucide-react';

function MetricCard({ title, value, change, icon: Icon, color, alert }) {
  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-6 ${alert ? 'border-red-200' : 'border-gray-100'}`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon size={20} />
        </div>
        {alert && (
          <span className="text-xs font-bold bg-red-100 text-red-600 px-2 py-1 rounded-full flex items-center gap-1">
            <AlertTriangle size={10} />
            Attention Needed
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-800">{value ?? '—'}</p>
      <p className="text-sm font-semibold text-gray-600 mt-1">{title}</p>
      {change && (
        <p className="text-xs mt-1 font-medium text-green-600">
          {change}
        </p>
      )}
    </div>
  );
}

export default function AshaDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState('households');
  const [showBellDropdown, setShowBellDropdown] = useState(false);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Search & Filtering States
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('All');
  const [offlineVisits, setOfflineVisits] = useState([]);
  
  // Async states
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isAnalyzingRisk, setIsAnalyzingRisk] = useState(false);

  // Voice recording hook
  const { isRecording, duration, audioBlob, startRecording, stopRecording, clearRecording } = useVoiceRecorder();

  // Load offline visits from local storage on startup
  useEffect(() => {
    const stored = localStorage.getItem('offline_visits');
    if (stored) {
      try {
        setOfflineVisits(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse offline visits:", e);
      }
    }
  }, []);

  // Modals
  const [showHouseholdModal, setShowHouseholdModal] = useState(false);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);

  // Form States
  const [hhFamilyName, setHhFamilyName] = useState('');
  const [hhVillage, setHhVillage] = useState(user?.village || '');
  const [hhBlock, setHhBlock] = useState('Central');
  const [hhDistrict, setHhDistrict] = useState(user?.district || 'Chennai');
  const [hhMembers, setHhMembers] = useState([{ name: '', age: '', gender: 'female' }]);

  const [visitHhId, setVisitHhId] = useState('');
  const [visitMemberName, setVisitMemberName] = useState('');
  const [visitType, setVisitType] = useState('Routine Checkup');
  const [visitSymptoms, setVisitSymptoms] = useState('');
  const [visitRisk, setVisitRisk] = useState('green');
  const [visitReasoning, setVisitReasoning] = useState('');
  const [visitPreferredHospital, setVisitPreferredHospital] = useState('');

  const [refPatientName, setRefPatientName] = useState('');
  const [refHhId, setRefHhId] = useState('');
  const [refHospital, setRefHospital] = useState('');
  const [refUrgency, setRefUrgency] = useState('Routine');
  const [refNotes, setRefNotes] = useState('');

  const [successMessage, setSuccessMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Transcription Audio Upload
  const handleTranscribe = async () => {
    if (!audioBlob) return;
    setIsTranscribing(true);
    setFormError('');
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'voice_note.webm');
      
      const res = await api.post('/asha/transcribe', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      if (res.data.transcript) {
        setVisitSymptoms(prev => prev + (prev ? ' ' : '') + res.data.transcript);
        clearRecording();
      } else {
        setFormError("No speech detected. Please speak louder and retry.");
      }
    } catch (err) {
      console.error(err);
      setFormError("Failed to transcribe audio. Verify your Groq API key.");
    } finally {
      setIsTranscribing(false);
    }
  };

  // Auto-transcribe once recording stops and audioBlob is populated
  useEffect(() => {
    if (audioBlob) {
      handleTranscribe();
    }
  }, [audioBlob]);

  // AI Risk Classifier Call
  const handleAiRiskAnalysis = async () => {
    if (!visitHhId) {
      setFormError("Please select a household first.");
      return;
    }
    if (!visitSymptoms.trim()) {
      setFormError("Please enter or dictate symptoms first.");
      return;
    }
    
    setIsAnalyzingRisk(true);
    setFormError('');
    try {
      const selectedHh = households?.find(h => h.id === visitHhId);
      const selectedMember = selectedHh?.members?.find(m => m.name === visitMemberName);
      const age = selectedMember?.age || 30;
      const gender = selectedMember?.gender || 'female';
      
      const payload = {
        member_name: visitMemberName,
        member_age: age,
        member_gender: gender,
        visit_type: visitType,
        observations: {
          symptoms: visitSymptoms
        },
        transcript: ""
      };
      
      console.log("Calling AI risk classifier with:", payload);
      const res = await api.post('/asha/visits/classify-risk', payload);
      
      console.log("AI Risk classification response:", res.data);
      const risk = res.data.risk_level?.toLowerCase() || 'green';
      setVisitRisk(risk);
      setVisitReasoning(res.data.reasoning || '');
      setSuccessMessage(`AI classification complete! Suggested: ${res.data.risk_level} risk. Please review details.`);
      setTimeout(() => setSuccessMessage(''), 6000);
    } catch (err) {
      console.error(err);
      setFormError("AI classification failed. Check your Groq API key.");
    } finally {
      setIsAnalyzingRisk(false);
    }
  };

  // Sync Offline Visits Queue
  const handleSyncOfflineVisits = async () => {
    setFormLoading(true);
    setFormError('');
    setSuccessMessage('');
    let syncCount = 0;
    const remaining = [];
    
    for (const visit of offlineVisits) {
      try {
        let finalVisit = { ...visit };
        
        // 1. If it has an offline recording, transcribe it first
        if (finalVisit.needs_transcription && finalVisit.audio_base64) {
          try {
            // Convert base64 Data URL to Blob
            const responseBlob = await fetch(finalVisit.audio_base64);
            const blob = await responseBlob.blob();
            const formData = new FormData();
            formData.append('file', blob, 'voice_note.webm');
            
            const transRes = await api.post('/asha/transcribe', formData, {
              headers: {
                'Content-Type': 'multipart/form-data'
              }
            });
            if (transRes.data.transcript) {
              finalVisit.observations.symptoms = (finalVisit.observations.symptoms || '') + 
                (finalVisit.observations.symptoms ? ' ' : '') + transRes.data.transcript;
              finalVisit.needs_transcription = false;
              finalVisit.needs_ai = true; // Symptoms updated, run AI classification
            }
          } catch (transErr) {
            console.warn("Could not transcribe offline voice note during sync:", transErr);
          }
        }
        
        // 2. Run AI analysis if needed and online now
        if (finalVisit.needs_ai) {
          try {
            const selectedHh = households?.find(h => h.id === finalVisit.household_id);
            const selectedMember = selectedHh?.members?.find(m => m.name === finalVisit.member_id);
            const age = selectedMember?.age || 30;
            const gender = selectedMember?.gender || 'female';
            
            const aiRes = await api.post('/asha/visits/classify-risk', {
              member_name: finalVisit.member_id,
              member_age: age,
              member_gender: gender,
              visit_type: finalVisit.visit_type,
              observations: {
                symptoms: finalVisit.observations.symptoms
              },
              transcript: ""
            });
            
            finalVisit.risk_level = aiRes.data.risk_level?.toLowerCase() || 'green';
            finalVisit.ai_reasoning = aiRes.data.reasoning || '';
            finalVisit.ai_recommendation = aiRes.data.recommendation || '';
            finalVisit.needs_ai = false;
          } catch (aiErr) {
            console.warn("Could not get AI analysis for offline visit during sync:", aiErr);
          }
        }
        
        // 3. Submit visit to backend
        const payload = {
          household_id:      finalVisit.household_id,
          member_id:         finalVisit.member_id || 'unknown',
          visit_type:        finalVisit.visit_type || 'general',
          observations:      typeof finalVisit.observations === 'object'
                               ? finalVisit.observations
                               : { symptoms: String(finalVisit.observations || '') },
          voice_notes:       finalVisit.voice_notes || '',
          risk_level:        (finalVisit.risk_level || 'WATCH').toUpperCase(),
          ai_reasoning:      finalVisit.ai_reasoning || '',
          ai_recommendation: finalVisit.ai_recommendation || '',
        };
        await api.post('/asha/visits', payload);
        
        // 4. Direct referral creation if severe risk (RED) to ensure doctor queue placement for the preferred hospital
        if (finalVisit.risk_level?.toLowerCase() === 'red') {
          try {
            const referralPayload = {
              household_id: finalVisit.household_id,
              to_hospital_id: finalVisit.preferred_hospital || hospitals?.[0]?.name || "",
              urgency: "Today",
              ai_summary: finalVisit.ai_reasoning || 'Severe symptoms detected during offline field screening.',
              notes: `Automatic referral generated from offline visit. Symptoms: ${finalVisit.observations.symptoms || "Severe complaints"}`
            };
            await api.post('/asha/referrals', referralPayload);
          } catch (refErr) {
            console.warn("Auto referral during sync failed:", refErr);
          }
        }

        syncCount++;
      } catch (err) {
        console.error("Failed to sync offline visit:", visit.id, err);
        remaining.push(visit);
      }
    }
    
    setOfflineVisits(remaining);
    localStorage.setItem('offline_visits', JSON.stringify(remaining));
    
    if (syncCount > 0) {
      setSuccessMessage(`Successfully synced ${syncCount} offline visits to server!`);
      refetchHh();
      refetchStats();
      setTimeout(() => setSuccessMessage(''), 5000);
    } else {
      setFormError("Failed to sync offline visits. Make sure you are connected to the internet.");
    }
    setFormLoading(false);
  };

  // Queries
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['ashaStats'],
    queryFn: () => api.get('/asha/my-stats').then(r => r.data),
    retry: 1,
  });

  const { data: households, isLoading: hhLoading, refetch: refetchHh } = useQuery({
    queryKey: ['ashaHouseholds'],
    queryFn: () => api.get('/asha/households').then(r => r.data),
    retry: 1,
  });

  const { data: referrals, isLoading: refLoading, refetch: refetchRef } = useQuery({
    queryKey: ['ashaReferrals'],
    queryFn: async () => {
      const response = await api.get('/asha/referrals');
      // Sort by created_date descending (most recent first)
      const sorted = (response.data || []).sort((a, b) => {
        const dateA = a.created_date ? new Date(a.created_date).getTime() : 0;
        const dateB = b.created_date ? new Date(b.created_date).getTime() : 0;
        return dateB - dateA; // Newest first
      });
      return sorted;
    },
    refetchInterval: 30000,
    retry: 1,
  });

  const { data: hospitals } = useQuery({
    queryKey: ['nearbyHospitals'],
    queryFn: () => api.get('/auth/hospitals').then(r => r.data),
    retry: 1,
  });

  // ASHA Notifications Query (fetches patient symptom alerts from their village)
  const { data: notifications, isLoading: notifLoading, refetch: refetchNotifs } = useQuery({
    queryKey: ['ashaNotifications'],
    queryFn: () => api.get('/asha/notifications').then(r => r.data),
    refetchInterval: 30000, // Refresh every 30s
    retry: 1,
  });

  const unreadNotificationsCount = (notifications || []).filter(n => !n.read).length;

  const handleMarkAsRead = async (id) => {
    try {
      await api.patch(`/asha/notifications/${id}/read`);
      refetchNotifs();
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.patch(`/asha/notifications/read-all`);
      refetchNotifs();
    } catch (err) {
      console.error("Failed to mark all as read", err);
    }
  };
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredHouseholds = (households || []).filter((h) => {
    // 1. Filter by Priority Tab
    if (riskFilter === 'Urgent') {
      if (h.risk_level !== 'red') return false;
    } else if (riskFilter === 'Watch') {
      if (h.risk_level !== 'amber') return false;
    } else if (riskFilter === 'Done') {
      if (h.risk_level !== 'green') return false;
    }

    // 2. Filter by Search Query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const nameMatch = h.family_name?.toLowerCase().includes(query);
      const villageMatch = h.village?.toLowerCase().includes(query);
      return nameMatch || villageMatch;
    }

    return true;
  });

  const handleAddMember = () => {
    setHhMembers([...hhMembers, { name: '', age: '', gender: 'female' }]);
  };

  const handleMemberChange = (idx, field, value) => {
    const updated = [...hhMembers];
    updated[idx][field] = value;
    setHhMembers(updated);
  };

  const handleRemoveMember = (idx) => {
    if (hhMembers.length > 1) {
      setHhMembers(hhMembers.filter((_, i) => i !== idx));
    }
  };

  const handleCreateHousehold = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    try {
      const payload = {
        family_name: hhFamilyName,
        village: hhVillage,
        block: hhBlock,
        district: hhDistrict,
        members: hhMembers.map(m => ({
          name: m.name,
          age: parseInt(m.age) || 0,
          gender: m.gender
        }))
      };
      await api.post('/asha/households', payload);
      setSuccessMessage('Household registered successfully!');
      setShowHouseholdModal(false);
      // Reset
      setHhFamilyName('');
      setHhMembers([{ name: '', age: '', gender: 'female' }]);
      refetchHh();
      refetchStats();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to create household.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleCreateVisit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    try {
      const payload = {
        household_id: visitHhId,
        member_id: visitMemberName || "unknown", // Stub patient mapping
        visit_type: visitType,
        observations: {
          symptoms: visitSymptoms,
          recorded_at: new Date().toISOString()
        },
        risk_level: visitRisk,
        ai_reasoning: visitReasoning || 'Regular field screening check.',
        ai_recommendation: 'Monitor vitals next week.'
      };
      await api.post('/asha/visits', payload);
      
      // Auto-dispatch referral if risk is severe (RED)
      if (visitRisk?.toLowerCase() === 'red') {
        try {
          const refPayload = {
            household_id: visitHhId,
            to_hospital_id: visitPreferredHospital || hospitals?.[0]?.name || "",
            urgency: 'Today',
            ai_summary: visitReasoning || 'Urgent AI classified risk.',
            notes: `Automatic doctor referral for severe risk observations. Symptoms: ${visitSymptoms}`
          };
          await api.post('/asha/referrals', refPayload);
          setSuccessMessage('Field visit logged & automatic urgent referral dispatched to doctor queue!');
        } catch (refErr) {
          console.warn("Auto referral failed:", refErr);
          setSuccessMessage('Field visit logged successfully!');
        }
      } else {
        setSuccessMessage('Field visit logged successfully!');
      }

      setShowVisitModal(false);
      setVisitSymptoms('');
      setVisitReasoning('');
      setVisitPreferredHospital('');
      refetchHh();
      refetchStats();
      setTimeout(() => setSuccessMessage(''), 6000);
    } catch (err) {
      // Offline fallback
      console.warn("API visit save failed, saving to offline visits storage instead:", err);
      
      const saveOffline = (base64Audio) => {
        const offlineVisit = {
          id: 'local_' + Date.now(),
          household_id: visitHhId,
          family_name: households?.find(h => h.id === visitHhId)?.family_name || 'Family',
          member_id: visitMemberName || "unknown",
          visit_type: visitType,
          observations: {
            symptoms: visitSymptoms,
            recorded_at: new Date().toISOString()
          },
          risk_level: visitRisk,
          ai_reasoning: visitReasoning || 'Logged offline (no AI insights yet).',
          ai_recommendation: visitReasoning ? 'Monitor vitals next week.' : 'Sync to online to retrieve AI recommendations.',
          needs_ai: !visitReasoning || visitReasoning.includes('Offline mode') || visitReasoning.includes('Unable to reach') || visitReasoning.includes('missing API key'),
          needs_transcription: !!base64Audio,
          audio_base64: base64Audio,
          preferred_hospital: visitPreferredHospital || hospitals?.[0]?.name || "",
          created_at: new Date().toISOString()
        };
        
        const updated = [...offlineVisits, offlineVisit];
        setOfflineVisits(updated);
        localStorage.setItem('offline_visits', JSON.stringify(updated));
        
        setSuccessMessage('Saved locally in offline mode! The visit will be synced when you go online.');
        setShowVisitModal(false);
        setVisitSymptoms('');
        setVisitReasoning('');
        setVisitPreferredHospital('');
        clearRecording();
        setTimeout(() => setSuccessMessage(''), 5000);
      };

      if (audioBlob) {
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          saveOffline(reader.result);
        };
      } else {
        saveOffline(null);
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleCreateReferral = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    try {
      const payload = {
        household_id: refHhId || "AUTO_ASSIGNED",
        to_hospital_id: refHospital,
        urgency: refUrgency,
        ai_summary: refNotes || 'Patient referred for EMR consultation.',
        notes: refNotes
      };
      await api.post('/asha/referrals', payload);
      setSuccessMessage('Referral sent to clinician clinic-OS queue!');
      setShowReferralModal(false);
      setRefNotes('');
      refetchRef();
      refetchStats();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to create referral.');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F3EE]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-[#1B6CA8] p-2.5 rounded-xl">
            <Home size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800">Ayu Disha ASHA</h1>
            <p className="text-xs text-gray-400">Community Health Worker Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-gray-800">{user?.name || 'ASHA Worker'}</p>
            <p className="text-xs text-[#1B6CA8] font-semibold">{user?.village || user?.district || '—'}</p>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowBellDropdown(!showBellDropdown)}
              className={`relative p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 ${showBellDropdown ? 'bg-gray-100' : ''}`}
            >
              <Bell size={18} />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] bg-red-500 rounded-full border border-white flex items-center justify-center text-[8px] font-extrabold text-white px-0.5">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>

            {showBellDropdown && (
              <div className="absolute right-0 mt-3 w-80 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden z-50 animate-fadeIn text-left">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                  <span className="font-bold text-xs uppercase tracking-wider text-gray-600">Village Alerts</span>
                  {unreadNotificationsCount > 0 && (
                    <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-[9px] font-extrabold">
                      {unreadNotificationsCount} New
                    </span>
                  )}
                </div>
                
                <div className="max-h-[300px] overflow-y-auto divide-y divide-gray-100 custom-scrollbar">
                  {notifications && notifications.length > 0 ? (
                    notifications.slice(0, 5).map((notif) => {
                      const isUrgent = notif.risk_level === 'URGENT' || notif.risk_level === 'SEVERE';
                      const isWarning = notif.risk_level === 'WATCH';
                      return (
                        <div
                          key={notif.id || notif._id}
                          onClick={() => {
                            setShowBellDropdown(false);
                            handleMarkAsRead(notif.id || notif._id);
                            setActiveTab('alerts');
                          }}
                          className={`p-4 hover:bg-blue-50/10 cursor-pointer transition-colors border-l-4 ${
                            !notif.read
                              ? isUrgent
                                ? 'border-red-500 bg-red-50/5'
                                : isWarning
                                  ? 'border-amber-500 bg-amber-50/5'
                                  : 'border-blue-500 bg-blue-50/5'
                              : 'border-transparent'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2 mb-1">
                            <p className="text-xs font-bold text-gray-800">{notif.patient_name}</p>
                            <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase ${
                              isUrgent
                                ? 'bg-red-50 text-red-600'
                                : isWarning
                                  ? 'bg-amber-50 text-amber-600'
                                  : 'bg-green-50 text-green-600'
                            }`}>
                              {notif.risk_level}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-500 line-clamp-2">
                            {notif.symptoms_summary || 'Logged symptom screening'}
                          </p>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-8 text-center text-gray-400">
                      <p className="text-sm font-semibold">All caught up!</p>
                      <p className="text-xs mt-1">No pending village alerts.</p>
                    </div>
                  )}
                </div>
                
                <div className="p-2.5 border-t border-gray-100 bg-gray-50 text-center">
                  <button
                    onClick={() => {
                      setShowBellDropdown(false);
                      setActiveTab('alerts');
                    }}
                    className="text-xs text-[#1B6CA8] font-bold hover:underline"
                  >
                    View All Village Alerts
                  </button>
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => {
              refetchStats();
              refetchHh();
              refetchRef();
              refetchNotifs();
            }}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
          >
            <RefreshCcw size={18} />
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-red-500 hover:text-red-700 font-semibold text-sm transition-colors"
          >
            <LogOut size={18} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>
      <main className="max-w-7xl mx-auto p-8 space-y-8">
        {offlineVisits.length > 0 && (
          <div className="p-4 bg-amber-500 text-white rounded-xl text-sm font-bold flex items-center justify-between shadow-md animate-pulse">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} />
              <span>You have {offlineVisits.length} offline visit{offlineVisits.length > 1 ? 's' : ''} waiting to sync to the server.</span>
            </div>
            <button
              onClick={handleSyncOfflineVisits}
              disabled={formLoading}
              className="bg-white text-amber-700 px-4 py-1.5 rounded-lg hover:bg-amber-50 transition-colors text-xs font-bold shadow-sm"
            >
              {formLoading ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>
        )}

        {successMessage && (
          <div className="p-4 bg-green-50 border-l-4 border-green-500 text-green-700 rounded-xl text-sm font-semibold flex items-center gap-2 animate-fadeIn shadow-sm">
            <CheckCircle2 size={16} className="text-green-600" />
            {successMessage}
          </div>
        )}

        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Namaste, {user?.name || 'Health Worker'}</h2>
            <p className="text-gray-500 text-sm mt-1 leading-relaxed">
              Manage your assigned rural households, screen community risk levels, and dispatch urgent referrals directly to local clinics.
            </p>
          </div>
          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => setShowHouseholdModal(true)}
              className="bg-[#1B6CA8] hover:bg-[#155A8A] text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Plus size={14} />
              Register Household
            </button>
            <button
              onClick={() => setShowVisitModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Activity size={14} />
              Log Field Visit
            </button>
            <button
              onClick={() => setShowReferralModal(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
            >
              <ArrowUpRight size={14} />
              Send Referral
            </button>
          </div>
        </div>

        {/* Metrics Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Households"
            value={stats?.total_households}
            icon={Home}
            color="bg-blue-50 text-blue-600"
          />
          <MetricCard
            title="Field Visits (Month)"
            value={stats?.visits_this_month}
            icon={Users}
            color="bg-green-50 text-green-600"
          />
          <MetricCard
            title="Hospital Referrals"
            value={stats?.referrals_sent_this_month}
            icon={ArrowUpRight}
            color="bg-purple-50 text-purple-600"
            change={`${stats?.referrals_seen_percentage ?? '—'}% seen by doctor`}
          />
          <MetricCard
            title="Urgent Alerts"
            value={stats?.urgent_cases_detected}
            icon={AlertTriangle}
            color="bg-red-50 text-red-600"
            alert={stats?.urgent_cases_detected > 0}
          />
        </div>

        {/* Main Tabs */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4 flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('households')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  activeTab === 'households'
                    ? 'bg-[#1B6CA8] text-white'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Registered Households
              </button>
              <button
                onClick={() => setActiveTab('referrals')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  activeTab === 'referrals'
                    ? 'bg-[#1B6CA8] text-white'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Referral Log Queue
              </button>
              <button
                onClick={() => setActiveTab('alerts')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'alerts'
                    ? 'bg-[#1B6CA8] text-white'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <span>Village Alerts</span>
                {unreadNotificationsCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-extrabold leading-none animate-pulse">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'households' && (
              <div className="space-y-6">
                {/* Search & Priority Filters Row */}
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  {/* Search Bar */}
                  <div className="relative w-full md:w-80">
                    <input
                      type="text"
                      placeholder="Search family name or village..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#1B6CA8] transition-all"
                    />
                    <span className="absolute right-3 top-3.5 text-gray-450">
                      <Users size={16} />
                    </span>
                  </div>

                  {/* Priority Filter Tabs */}
                  <div className="flex bg-white p-1 rounded-xl border border-gray-200 w-full md:w-auto overflow-x-auto">
                    {['All', 'Urgent', 'Watch', 'Done'].map((tab) => {
                      const count = (households || []).filter(h => {
                        if (tab === 'Urgent') return h.risk_level === 'red';
                        if (tab === 'Watch') return h.risk_level === 'amber';
                        if (tab === 'Done') return h.risk_level === 'green';
                        return true;
                      }).length;
                      
                      const isActive = riskFilter === tab;
                      return (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setRiskFilter(tab)}
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                            isActive
                              ? tab === 'Urgent'
                                ? 'bg-red-600 text-white shadow-sm'
                                : tab === 'Watch'
                                  ? 'bg-amber-500 text-white shadow-sm'
                                  : tab === 'Done'
                                    ? 'bg-green-600 text-white shadow-sm'
                                    : 'bg-[#1B6CA8] text-white shadow-sm'
                              : 'text-gray-500 hover:text-gray-800'
                          }`}
                        >
                          {tab}
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                            isActive ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                        <th className="pb-3 pl-4">Family Name</th>
                        <th className="pb-3">Village</th>
                        <th className="pb-3">Risk Status</th>
                        <th className="pb-3">Family Size</th>
                        <th className="pb-3 text-right pr-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-sm">
                      {filteredHouseholds.map((hh) => {
                        const hasOffline = offlineVisits.some(ov => ov.household_id === hh.id);
                        return (
                          <tr key={hh.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="py-4 pl-4 font-bold text-gray-800">
                              <div className="flex items-center gap-2">
                                <span>{hh.family_name}</span>
                                {hasOffline && (
                                  <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-200">
                                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                                    Pending Sync
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-4 text-gray-500">{hh.village}</td>
                            <td className="py-4">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                hh.risk_level === 'red'
                                  ? 'bg-red-50 text-red-600 border border-red-100'
                                  : hh.risk_level === 'amber'
                                    ? 'bg-amber-50 text-amber-600 border border-amber-100'
                                    : 'bg-green-50 text-green-600 border border-green-100'
                              }`}>
                                {hh.risk_level}
                              </span>
                            </td>
                            <td className="py-4 text-gray-700 font-medium">{hh.members?.length || 0} members</td>
                            <td className="py-4 text-right pr-4">
                              <button
                                onClick={() => {
                                  setVisitHhId(hh.id);
                                  setVisitMemberName(''); // let user pick from dropdown
                                  setShowVisitModal(true);
                                }}
                                className="text-[#1B6CA8] font-bold text-xs hover:underline flex items-center gap-1 ml-auto"
                              >
                                New Visit <ChevronRight size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredHouseholds.length === 0 && !hhLoading && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-gray-400 font-medium">
                            No households found matching your search or filters.
                          </td>
                        </tr>
                      )}
                      {hhLoading && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-gray-400">Loading households data...</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'referrals' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                      <th className="pb-3 pl-4">Patient Name</th>
                      <th className="pb-3">Referred Facility</th>
                      <th className="pb-3">Urgency</th>
                      <th className="pb-3">Date Dispatched</th>
                      <th className="pb-3">Clinical Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-sm">
                    {referrals?.map((ref) => (
                      <tr key={ref.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-4 pl-4 font-bold text-gray-800">{ref.patient_name}</td>
                        <td className="py-4 text-gray-600">{ref.referred_to}</td>
                        <td className="py-4 font-bold">
                          <span className={`px-2 py-0.5 rounded text-xs uppercase ${
                            ref.urgency === 'Today' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {ref.urgency}
                          </span>
                        </td>
                        <td className="py-4 text-gray-500 font-semibold">{ref.sent_date}</td>
                        <td className="py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                            ref.status === 'seen'
                              ? 'bg-green-50 text-green-600'
                              : 'bg-yellow-50 text-yellow-600'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              ref.status === 'seen' ? 'bg-green-600' : 'bg-yellow-500'
                            }`} />
                            {ref.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {refLoading && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-400">Loading referral database queue...</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'alerts' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <div>
                    <h3 className="text-sm font-extrabold text-gray-800">Symptom Alerts from your Village</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Real-time reports when patients log symptoms using Ayu Disha.</p>
                  </div>
                  {unreadNotificationsCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-xs text-[#1B6CA8] font-bold hover:underline"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  {notifications && notifications.length > 0 ? (
                    notifications.map((notif) => {
                      const isUrgent = notif.risk_level === 'URGENT' || notif.risk_level === 'SEVERE';
                      const isWarning = notif.risk_level === 'WATCH';
                      
                      return (
                        <div
                          key={notif.id}
                          className={`p-5 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                            !notif.read
                              ? isUrgent
                                ? 'bg-red-50/40 border-red-200 shadow-sm'
                                : isWarning
                                  ? 'bg-amber-50/40 border-amber-200 shadow-sm'
                                  : 'bg-blue-50/30 border-blue-200 shadow-sm'
                              : 'bg-white border-gray-100 hover:border-gray-200'
                          }`}
                        >
                          <div className="space-y-2 max-w-2xl">
                            <div className="flex items-center flex-wrap gap-2">
                              <span className={`w-2.5 h-2.5 rounded-full ${
                                isUrgent ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-green-500'
                              } ${!notif.read ? 'animate-pulse' : ''}`} />
                              <h4 className="font-bold text-gray-800">{notif.patient_name}</h4>
                              <span className="text-xs text-gray-400 font-semibold">({notif.patient_village || 'Your Village'})</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                                isUrgent
                                  ? 'bg-red-100 text-red-700'
                                  : isWarning
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-green-100 text-green-700'
                              }`}>
                                {notif.risk_level} Risk
                              </span>
                              {notif.referred && (
                                <span className="bg-blue-100 text-blue-750 text-[10px] font-bold px-2 py-0.5 rounded">
                                  Auto-Referred {notif.target_speciality ? `— ${notif.target_speciality}` : ''}
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-semibold text-gray-500 mt-1 uppercase tracking-wider">Symptoms Reported:</p>
                            <p className="text-sm text-gray-700 italic bg-white/40 p-2.5 rounded-lg border border-gray-100/50">
                              "{notif.symptoms_summary}"
                            </p>
                            <p className="text-[10px] text-gray-400 font-medium">
                              Logged on {new Date(notif.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                            </p>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            {!notif.read ? (
                              <button
                                onClick={() => handleMarkAsRead(notif.id)}
                                className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                              >
                                <CheckCircle2 size={12} className="text-green-600" />
                                <span>Acknowledge</span>
                              </button>
                            ) : (
                              <span className="text-xs text-gray-400 font-bold flex items-center gap-1 bg-gray-50 px-2.5 py-1.5 rounded-lg">
                                <CheckCircle2 size={12} className="text-gray-400" />
                                <span>Seen</span>
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-12 text-gray-400 font-semibold">
                      No village symptom alerts logged yet.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Register Household Modal */}
      {showHouseholdModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fadeIn backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-gray-100 animate-fadeIn">
            <div className="bg-[#1B6CA8] p-6 text-white">
              <h3 className="text-xl font-bold font-mukta">Register New Household</h3>
              <p className="text-blue-100 text-xs mt-1">Configure family block registration records.</p>
            </div>
            <form onSubmit={handleCreateHousehold} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {formError && (
                <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-semibold rounded">
                  {formError}
                </div>
              )}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Family Name / Head</label>
                <input
                  type="text"
                  value={hhFamilyName}
                  onChange={(e) => setHhFamilyName(e.target.value)}
                  placeholder="e.g. Sharma Family"
                  className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-[#1B6CA8]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Village</label>
                  <input
                    type="text"
                    value={hhVillage}
                    onChange={(e) => setHhVillage(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-[#1B6CA8]"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">District</label>
                  <input
                    type="text"
                    value={hhDistrict}
                    onChange={(e) => setHhDistrict(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-[#1B6CA8]"
                    required
                  />
                </div>
              </div>

              {/* Members */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Family Members</label>
                  <button
                    type="button"
                    onClick={handleAddMember}
                    className="text-[#1B6CA8] hover:text-[#155A8A] text-xs font-bold flex items-center gap-1"
                  >
                    <Plus size={14} /> Add Member
                  </button>
                </div>
                {hhMembers.map((m, idx) => (
                  <div key={idx} className="flex gap-2.5 items-center bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                    <input
                      type="text"
                      placeholder="Name"
                      value={m.name}
                      onChange={(e) => handleMemberChange(idx, 'name', e.target.value)}
                      className="flex-1 p-2 bg-white border border-gray-200 rounded-lg text-xs"
                      required
                    />
                    <input
                      type="number"
                      placeholder="Age"
                      value={m.age}
                      onChange={(e) => handleMemberChange(idx, 'age', e.target.value)}
                      className="w-16 p-2 bg-white border border-gray-200 rounded-lg text-xs"
                      required
                    />
                    <select
                      value={m.gender}
                      onChange={(e) => handleMemberChange(idx, 'gender', e.target.value)}
                      className="w-24 p-2 bg-white border border-gray-200 rounded-lg text-xs"
                    >
                      <option value="female">Female</option>
                      <option value="male">Male</option>
                      <option value="other">Other</option>
                    </select>
                    {hhMembers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(idx)}
                        className="text-red-500 hover:text-red-700 font-bold text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setShowHouseholdModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-600 font-semibold text-xs hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2.5 bg-[#1B6CA8] hover:bg-[#155A8A] text-white font-bold text-xs rounded-xl transition-all shadow-sm"
                >
                  {formLoading ? 'Saving...' : 'Register Household'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Visit Modal */}
      {showVisitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fadeIn backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-gray-100 animate-fadeIn">
            <div className="bg-green-600 p-6 text-white">
              <h3 className="text-xl font-bold font-mukta">Log Field Visit</h3>
              <p className="text-green-100 text-xs mt-1">Screen patient health indicators in the community.</p>
            </div>
            <form onSubmit={handleCreateVisit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-semibold rounded">
                  {formError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Household</label>
                  <select
                    value={visitHhId}
                    onChange={(e) => {
                      setVisitHhId(e.target.value);
                      setVisitMemberName(''); // clear member so user picks from dropdown
                    }}
                    className="w-full p-3 bg-white border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-sm cursor-pointer"
                    required
                  >
                    <option value="">-- Select --</option>
                    {households?.map(h => (
                      <option key={h.id} value={h.id}>{h.family_name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Patient / Member</label>
                  <select
                    value={visitMemberName}
                    onChange={(e) => setVisitMemberName(e.target.value)}
                    className="w-full p-3 bg-white border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-sm cursor-pointer"
                    required
                    disabled={!visitHhId}
                  >
                    <option value="">{visitHhId ? '-- Select member --' : '-- Select household first --'}</option>
                    {visitHhId && households?.find(h => h.id === visitHhId)?.members?.map((m, i) => (
                      <option key={i} value={m.name}>
                        {m.name}{m.age ? ` (${m.age}y` : ''}{m.gender ? `, ${m.gender}` : ''}{m.age ? ')' : ''}
                        {m.details ? ` — ${m.details}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Visit Type</label>
                  <select
                    value={visitType}
                    onChange={(e) => setVisitType(e.target.value)}
                    className="w-full p-3 bg-white border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  >
                    <option value="Routine Checkup">Routine Checkup</option>
                    <option value="Maternal Care">Maternal Care</option>
                    <option value="Child Vitals">Child Vitals</option>
                    <option value="NCD Screening">NCD Screening</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Risk Level Classification</label>
                  <select
                    value={visitRisk}
                    onChange={(e) => setVisitRisk(e.target.value)}
                    className="w-full p-3 bg-white border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  >
                    <option value="green">GREEN - Safe/Routine</option>
                    <option value="amber">AMBER - Watch/Monitor</option>
                    <option value="red">RED - Urgent referral</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Preferred Clinic / Referral Facility</label>
                <select
                  value={visitPreferredHospital}
                  onChange={(e) => setVisitPreferredHospital(e.target.value)}
                  className="w-full p-3 bg-white border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-sm cursor-pointer"
                  required
                >
                  <option value="">-- Select Clinic --</option>
                  {hospitals?.map(h => (
                    <option key={h.id} value={h.name}>{h.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Observed Symptoms / Transcription</label>
                  <div className="flex gap-2">
                    {isRecording ? (
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="bg-red-600 hover:bg-red-700 text-white px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm animate-pulse"
                      >
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                        Stop ({duration}s)
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={startRecording}
                        className="bg-[#1B6CA8] hover:bg-[#155A8A] text-white px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm"
                      >
                        <Mic size={12} />
                        Dictate
                      </button>
                    )}
                    {isTranscribing && (
                      <span className="text-[10px] text-gray-500 font-semibold animate-pulse flex items-center gap-1">
                        <Sparkles size={10} className="animate-spin animate-pulse" />
                        Transcribing...
                      </span>
                    )}
                  </div>
                </div>
                <textarea
                  value={visitSymptoms}
                  onChange={(e) => setVisitSymptoms(e.target.value)}
                  placeholder="e.g. High fever, dry cough, complaints of body pain for 3 days."
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  required
                />
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleAiRiskAnalysis}
                    disabled={isAnalyzingRisk || !visitSymptoms.trim()}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                      isAnalyzingRisk
                        ? 'bg-purple-100 text-purple-700 cursor-not-allowed animate-pulse'
                        : !visitSymptoms.trim()
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                          : 'bg-purple-600 hover:bg-purple-700 text-white'
                    }`}
                  >
                    <Sparkles size={12} className={isAnalyzingRisk ? 'animate-spin' : ''} />
                    {isAnalyzingRisk ? 'Analyzing with AI...' : 'Analyze Risk with AI'}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Field Findings / Reasoning</label>
                <input
                  type="text"
                  value={visitReasoning}
                  onChange={(e) => setVisitReasoning(e.target.value)}
                  placeholder="e.g. Suspected dengue case. Advised immediate clinic referral."
                  className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-sm"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowVisitModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-600 font-semibold text-xs hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm"
                >
                  {formLoading ? 'Logging...' : 'Log Field Visit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send Referral Modal */}
      {showReferralModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fadeIn backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-gray-100 animate-fadeIn">
            <div className="bg-amber-600 p-6 text-white">
              <h3 className="text-xl font-bold font-mukta">Send Hospital Referral</h3>
              <p className="text-amber-100 text-xs mt-1">Bridge a patient direct to Doctor's OPD EMR queue.</p>
            </div>
            <form onSubmit={handleCreateReferral} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-semibold rounded">
                  {formError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Select Household</label>
                  <select
                    value={refHhId}
                    onChange={(e) => {
                      setRefHhId(e.target.value);
                      const selected = households.find(h => h.id === e.target.value);
                      if (selected && selected.members && selected.members.length > 0) {
                        setRefPatientName(selected.members[0].name);
                      }
                    }}
                    className="w-full p-3 bg-white border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-sm cursor-pointer"
                    required
                  >
                    <option value="">-- Select Household --</option>
                    {households?.map(h => (
                      <option key={h.id} value={h.id}>{h.family_name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Patient Name</label>
                  <input
                    type="text"
                    value={refPatientName}
                    onChange={(e) => setRefPatientName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Refer Facility</label>
                  <select
                    value={refHospital}
                    onChange={(e) => setRefHospital(e.target.value)}
                    className="w-full p-3 bg-white border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-sm cursor-pointer"
                    required
                  >
                    <option value="">-- Select Hospital --</option>
                    {hospitals?.map(h => (
                      <option key={h.id} value={h.name}>{h.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Urgency Urgencies</label>
                  <select
                    value={refUrgency}
                    onChange={(e) => setRefUrgency(e.target.value)}
                    className="w-full p-3 bg-white border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                  >
                    <option value="Today">Immediate (Today)</option>
                    <option value="Watch">Watch (2-3 Days)</option>
                    <option value="Routine">Routine Checkup</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Clinical Referral Notes</label>
                <textarea
                  value={refNotes}
                  onChange={(e) => setRefNotes(e.target.value)}
                  placeholder="Explain why the patient is being referred to the clinic..."
                  rows={4}
                  className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                  required
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowReferralModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-600 font-semibold text-xs hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm"
                >
                  {formLoading ? 'Sending...' : 'Send Referral'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
