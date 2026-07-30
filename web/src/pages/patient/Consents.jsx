import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, ShieldOff, Plus, X, AlertTriangle, Clock, User } from 'lucide-react';
import patientApi from '../../services/patientApi';
import Navbar from '../../components/Navbar';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function Consents() {
  const queryClient = useQueryClient();
  const [showGrantForm, setShowGrantForm] = useState(false);
  const [doctorId, setDoctorId] = useState('');
  const [scope, setScope] = useState('full');

  const { data: consents = [], isLoading } = useQuery({
    queryKey: ['patientConsents'],
    queryFn: patientApi.getMyConsents,
  });

  const grantMutation = useMutation({
    mutationFn: patientApi.grantConsent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientConsents'] });
      toast.success('Access granted successfully');
      setShowGrantForm(false);
      setDoctorId('');
    },
    onError: () => toast.error('Failed to grant access'),
  });

  const revokeMutation = useMutation({
    mutationFn: patientApi.revokeConsent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientConsents'] });
      toast.success('Access revoked');
    },
    onError: () => toast.error('Failed to revoke access'),
  });

  const handleGrant = (e) => {
    e.preventDefault();
    if (!doctorId.trim()) {
      toast.error('Please enter a Doctor ID, mobile number, or email');
      return;
    }
    grantMutation.mutate({
      granted_to_id: doctorId.trim(),
      data_scope: scope,
      expires_days: 30,
    });
  };

  const activeConsents = consents.filter(c => !c.revoked);
  const revokedConsents = consents.filter(c => c.revoked);

  return (
    <div className="min-h-screen bg-[#F7F3EE] w-full max-w-full overflow-x-hidden">
      <Navbar />
      <div className="w-full max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-8 pb-safe">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Data Consents</h1>
            <p className="text-gray-500 text-xs sm:text-sm mt-1">Control who can access your medical records</p>
          </div>
          <button
            onClick={() => setShowGrantForm(true)}
            className="flex items-center gap-2 bg-[#1B6CA8] text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#155A8A] transition-colors shadow-md"
          >
            <Plus size={16} />
            Grant Access
          </button>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 flex items-start gap-3">
          <ShieldCheck size={20} className="text-[#1B6CA8] shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-800 text-sm">Your data, your control</p>
            <p className="text-blue-700 text-xs mt-1">
              Doctors can only see your full medical history when you explicitly grant them access. You can revoke access at any time.
            </p>
          </div>
        </div>

        {/* Grant Form Modal */}
        {showGrantForm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h3 className="font-bold text-gray-800 text-lg">Grant Doctor Access</h3>
                <button onClick={() => setShowGrantForm(false)} className="p-1 hover:bg-gray-100 rounded-full">
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
              <form onSubmit={handleGrant} className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Doctor ID</label>
                  <input
                    type="text"
                    value={doctorId}
                    onChange={e => setDoctorId(e.target.value)}
                    placeholder="Doctor's mobile number or email"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#1B6CA8] focus:border-transparent outline-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">Enter the doctor's registered mobile number or email address</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Access Level</label>
                  <div className="space-y-2">
                    {[
                      { value: 'full', label: 'Full Access', desc: 'All visits, prescriptions, and lab results' },
                      { value: 'limited', label: 'Limited Access', desc: 'Only current visit and allergies' },
                    ].map(opt => (
                      <label key={opt.value} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${scope === opt.value ? 'border-[#1B6CA8] bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <input
                          type="radio"
                          name="scope"
                          value={opt.value}
                          checked={scope === opt.value}
                          onChange={() => setScope(opt.value)}
                          className="mt-0.5"
                        />
                        <div>
                          <p className="font-semibold text-sm text-gray-800">{opt.label}</p>
                          <p className="text-xs text-gray-500">{opt.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowGrantForm(false)}
                    className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={grantMutation.isPending}
                    className="flex-1 py-3 bg-[#1B6CA8] text-white rounded-xl text-sm font-semibold hover:bg-[#155A8A] transition-colors disabled:opacity-50"
                  >
                    {grantMutation.isPending ? 'Granting...' : 'Grant Access'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Active Consents */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map(i => <div key={i} className="h-24 bg-gray-200 animate-pulse rounded-xl" />)}
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
                Active Consents ({activeConsents.length})
              </h2>
              {activeConsents.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                  <ShieldCheck size={40} className="text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No active consents</p>
                  <p className="text-gray-400 text-sm mt-1">Grant a doctor access to your records when needed</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeConsents.map(consent => (
                    <div key={consent.id} className="bg-white rounded-2xl border border-green-100 shadow-sm p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="bg-green-100 p-2.5 rounded-xl">
                            <User size={18} className="text-green-600" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-800">{consent.doctor_name || consent.granted_to_id}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${consent.data_scope === 'full' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                                {consent.data_scope === 'full' ? 'Full Access' : 'Limited Access'}
                              </span>
                              {consent.created_at && (
                                <span className="flex items-center gap-1 text-xs text-gray-400">
                                  <Clock size={11} />
                                  Granted {format(new Date(consent.created_at), 'dd MMM yyyy')}
                                </span>
                              )}
                            </div>
                            {consent.expires_at && (
                              <p className="text-xs text-amber-600 mt-1">
                                Expires: {format(new Date(consent.expires_at), 'dd MMM yyyy')}
                              </p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => revokeMutation.mutate(consent.id)}
                          disabled={revokeMutation.isPending}
                          className="flex items-center gap-1.5 text-red-500 hover:text-red-700 text-xs font-semibold bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <ShieldOff size={13} />
                          Revoke
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {revokedConsents.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
                  Revoked ({revokedConsents.length})
                </h2>
                <div className="space-y-3">
                  {revokedConsents.map(consent => (
                    <div key={consent.id} className="bg-white rounded-2xl border border-gray-100 p-5 opacity-60">
                      <div className="flex items-center gap-3">
                        <div className="bg-gray-100 p-2.5 rounded-xl">
                          <User size={18} className="text-gray-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-600">{consent.doctor_name || consent.granted_to_id}</p>
                          <p className="text-xs text-gray-400 mt-0.5">Access revoked</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
