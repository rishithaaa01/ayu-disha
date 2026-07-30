import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  FlaskConical, LogOut, RefreshCcw, Upload, CheckCircle,
  Clock, AlertTriangle, FileText, ChevronDown, ChevronUp,
  User, Calendar, Sparkles, ExternalLink, X
} from 'lucide-react';

export default function LabDashboard() {
  const navigate = useNavigate();
  const { logout, user } = useAuthStore();
  
  // Debug logging
  console.log('LabDashboard mounted, user:', user);
  
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('pending');
  const [uploadingId, setUploadingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [resultText, setResultText] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  // Fetch pending orders — refetch every 30s
  const { data: pendingOrders = [], isLoading: pendingLoading, refetch: refetchPending, isError: pendingError, error: pendingErrorDetails } = useQuery({
    queryKey: ['labPendingOrders'],
    queryFn: () => api.get('/lab/pending-orders').then(r => r.data),
    refetchInterval: 30000,
    retry: 1,
    onError: (error) => {
      console.error('Failed to fetch pending orders:', error);
    }
  });

  // Fetch completed orders
  const { data: completedOrders = [], isLoading: completedLoading, isError: completedError } = useQuery({
    queryKey: ['labCompletedOrders'],
    queryFn: () => api.get('/lab/completed-orders').then(r => r.data),
    enabled: activeTab === 'completed',
    refetchInterval: 60000,
    retry: 1,
    onError: (error) => {
      console.error('Failed to fetch completed orders:', error);
    }
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ labOrderId, resultText, notes, file }) => {
      const formData = new FormData();
      formData.append('result_text', resultText);
      if (notes) formData.append('notes', notes);
      if (file) formData.append('file', file);
      return api.post(`/lab/upload-result/${labOrderId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000, // PDF processing can take a while
      }).then(r => r.data);
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Result uploaded successfully');
      setUploadingId(null);
      setResultText('');
      setNotes('');
      setSelectedFile(null);
      setExpandedId(null);
      queryClient.invalidateQueries({ queryKey: ['labPendingOrders'] });
      queryClient.invalidateQueries({ queryKey: ['labCompletedOrders'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to upload result');
    },
  });

  const handleUpload = (labOrderId) => {
    if (!resultText.trim()) {
      toast.error('Please enter a result value');
      return;
    }
    setUploadingId(labOrderId);
    uploadMutation.mutate({ labOrderId, resultText, notes, file: selectedFile });
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const urgencyColor = {
    routine: 'bg-blue-100 text-blue-700',
    urgent: 'bg-amber-100 text-amber-700',
    emergency: 'bg-red-100 text-red-700',
  };

  return (
    <div className="min-h-screen bg-[#F7F3EE] w-full max-w-full overflow-x-hidden">
      {/* Error boundary for API failures */}
      {(pendingError || completedError) && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 m-4">
          <p className="text-red-700 font-semibold">Failed to load lab data</p>
          <p className="text-sm text-red-600 mt-1">
            {pendingErrorDetails?.response?.data?.detail || pendingErrorDetails?.message || 'Please check your connection and try refreshing.'}
          </p>
        </div>
      )}
      
      {/* Header */}
      <header className="pt-safe bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-teal-600 p-2 rounded-xl">
              <FlaskConical size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-800">Lab Dashboard</h1>
              <p className="text-xs text-gray-400">{user?.name} · {user?.hospital || 'Lab Technician'}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => { refetchPending(); queryClient.invalidateQueries({ queryKey: ['labCompletedOrders'] }); }}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
              title="Refresh"
            >
              <RefreshCcw size={18} className={pendingLoading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-red-500 hover:text-red-700 font-semibold text-sm"
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-amber-100 p-2.5 rounded-xl"><Clock size={18} className="text-amber-600" /></div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pending</p>
            </div>
            <p className="text-3xl font-bold text-gray-800">{pendingOrders.length}</p>
            <p className="text-xs text-gray-400 mt-1">Tests awaiting results</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-red-100 p-2.5 rounded-xl"><AlertTriangle size={18} className="text-red-600" /></div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Urgent</p>
            </div>
            <p className="text-3xl font-bold text-gray-800">
              {pendingOrders.filter(o => o.urgency === 'urgent' || o.urgency === 'emergency').length}
            </p>
            <p className="text-xs text-gray-400 mt-1">Priority tests</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-green-100 p-2.5 rounded-xl"><CheckCircle size={18} className="text-green-600" /></div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Completed</p>
            </div>
            <p className="text-3xl font-bold text-gray-800">{completedOrders.length}</p>
            <p className="text-xs text-gray-400 mt-1">Recent results</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          {[
            { id: 'pending', label: `Pending (${pendingOrders.length})` },
            { id: 'completed', label: 'Completed' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 text-sm font-semibold border-b-2 transition-all ${
                activeTab === tab.id ? 'border-teal-600 text-teal-700' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Pending Orders */}
        {activeTab === 'pending' && (
          <div className="space-y-4">
            {pendingLoading ? (
              [1,2,3].map(i => <div key={i} className="h-20 bg-gray-200 animate-pulse rounded-2xl" />)
            ) : pendingOrders.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                <CheckCircle size={48} className="text-green-300 mx-auto mb-4" />
                <p className="font-bold text-gray-600">All clear — no pending orders</p>
                <p className="text-gray-400 text-sm mt-1">New test orders will appear here automatically</p>
              </div>
            ) : (
              pendingOrders.map(order => {
                const isExpanded = expandedId === order._id;
                const isUploading = uploadingId === order._id && uploadMutation.isPending;
                return (
                  <div key={order._id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
                    order.urgency === 'emergency' ? 'border-red-200' :
                    order.urgency === 'urgent' ? 'border-amber-200' : 'border-gray-100'
                  }`}>
                    <div
                      className="p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => setExpandedId(isExpanded ? null : order._id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="bg-teal-100 p-2.5 sm:p-3 rounded-xl shrink-0">
                            <FlaskConical size={18} className="text-teal-600 sm:w-5 sm:h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                              <h3 className="font-bold text-gray-800 text-sm sm:text-base break-words">{order.test_name}</h3>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 whitespace-nowrap ${urgencyColor[order.urgency] || urgencyColor.routine}`}>
                                {order.urgency}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-gray-500">
                              <span className="flex items-center gap-1 shrink-0 whitespace-nowrap"><User size={11} /> {order.patient_name}</span>
                              <span className="flex items-center gap-1 shrink-0 whitespace-nowrap"><Calendar size={11} /> {new Date(order.ordered_date).toLocaleDateString('en-IN')}</span>
                              <span className="truncate">Ordered by: {order.ordered_by}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                          <span className="bg-amber-100 text-amber-700 text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap">Pending</span>
                          {isExpanded ? <ChevronUp size={16} className="text-gray-400 shrink-0" /> : <ChevronDown size={16} className="text-gray-400 shrink-0" />}
                        </div>
                      </div>
                    </div>

                    {/* Upload Form */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 p-5 bg-gray-50 space-y-4">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Upload Result for {order.patient_name}</h4>

                        {/* Result Value */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                            Result Value *
                          </label>
                          <input
                            type="text"
                            value={resultText}
                            onChange={e => setResultText(e.target.value)}
                            placeholder="e.g. HbA1c: 7.2% — above normal range"
                            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none bg-white"
                          />
                        </div>

                        {/* Notes */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                            Additional Notes (optional)
                          </label>
                          <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="Any special observations or collection notes..."
                            rows={2}
                            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none bg-white resize-none"
                          />
                        </div>

                        {/* PDF Upload */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                            Lab Report PDF (optional — AI will extract & summarize)
                          </label>
                          <div
                            className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                              selectedFile ? 'border-teal-400 bg-teal-50' : 'border-gray-200 hover:border-teal-300 hover:bg-teal-50/30'
                            }`}
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept=".pdf"
                              className="hidden"
                              onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                            />
                            {selectedFile ? (
                              <div className="flex items-center justify-center gap-2">
                                <FileText size={16} className="text-teal-600" />
                                <span className="text-sm font-semibold text-teal-700">{selectedFile.name}</span>
                                <button
                                  onClick={e => { e.stopPropagation(); setSelectedFile(null); }}
                                  className="text-gray-400 hover:text-red-500"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-1">
                                <Upload size={20} className="text-gray-400" />
                                <p className="text-xs text-gray-500">Click to upload PDF report</p>
                                <p className="text-[10px] text-gray-400">Max 20MB · AI will extract values automatically</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Submit */}
                        <div className="flex gap-3">
                          <button
                            onClick={() => { setExpandedId(null); setResultText(''); setNotes(''); setSelectedFile(null); }}
                            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleUpload(order._id)}
                            disabled={isUploading || !resultText.trim()}
                            className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                          >
                            {isUploading ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <Upload size={15} />
                                Submit Result
                              </>
                            )}
                          </button>
                        </div>
                        {isUploading && (
                          <p className="text-xs text-teal-600 text-center animate-pulse">
                            ✨ Extracting PDF text & generating AI summary...
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Completed Orders */}
        {activeTab === 'completed' && (
          <div className="space-y-4">
            {completedLoading ? (
              [1,2,3].map(i => <div key={i} className="h-20 bg-gray-200 animate-pulse rounded-2xl" />)
            ) : completedOrders.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                <FlaskConical size={48} className="text-gray-300 mx-auto mb-4" />
                <p className="text-gray-400 text-sm">No completed results yet</p>
              </div>
            ) : (
              completedOrders.map(order => (
                <div key={order._id} className={`bg-white rounded-2xl border shadow-sm p-5 ${
                  order.ai_is_abnormal ? 'border-red-100' : 'border-green-100'
                }`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl shrink-0 ${order.ai_is_abnormal ? 'bg-red-100' : 'bg-green-100'}`}>
                        <FlaskConical size={20} className={order.ai_is_abnormal ? 'text-red-600' : 'text-green-600'} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-gray-800">{order.test_name}</h3>
                          {order.ai_is_abnormal && (
                            <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                              <AlertTriangle size={9} /> Abnormal
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1"><User size={11} /> {order.patient_name}</span>
                          <span>{new Date(order.result_date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
                          <span>by {order.resulted_by}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {order.pdf_url && (
                        <a
                          href={order.pdf_url.startsWith('http') ? order.pdf_url : `https://ayu-disha.onrender.com${order.pdf_url.startsWith('/') ? '' : '/'}${order.pdf_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => {
                            e.preventDefault();
                            const fullUrl = order.pdf_url.startsWith('http') 
                              ? order.pdf_url 
                              : `https://ayu-disha.onrender.com${order.pdf_url.startsWith('/') ? '' : '/'}${order.pdf_url}`;
                            window.open(fullUrl, '_blank');
                          }}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-semibold bg-blue-50 px-3 py-1.5 rounded-lg"
                        >
                          <ExternalLink size={12} /> PDF
                        </a>
                      )}
                      <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full">Resulted</span>
                    </div>
                  </div>

                  {/* Result value */}
                  <div className="bg-gray-50 rounded-xl px-4 py-2.5 mb-3">
                    <p className="text-sm font-semibold text-gray-800">{order.result}</p>
                  </div>

                  {/* AI Summary */}
                  {order.ai_summary && (
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Sparkles size={13} className="text-blue-600" />
                        <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">AI Clinical Summary</p>
                      </div>
                      <p className="text-xs text-gray-700 leading-relaxed">{order.ai_summary}</p>
                      {order.ai_recommendation && (
                        <p className="text-xs text-blue-700 font-semibold mt-1.5">→ {order.ai_recommendation}</p>
                      )}
                    </div>
                  )}

                  {/* Key Values Table */}
                  {order.ai_key_values?.length > 0 && (
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-gray-400 uppercase tracking-wider text-[10px]">
                            <th className="text-left py-1.5 pr-4">Parameter</th>
                            <th className="text-left py-1.5 pr-4">Value</th>
                            <th className="text-left py-1.5 pr-4">Reference</th>
                            <th className="text-left py-1.5">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {order.ai_key_values.map((kv, i) => (
                            <tr key={i}>
                              <td className="py-1.5 pr-4 font-medium text-gray-700">{kv.parameter}</td>
                              <td className="py-1.5 pr-4 font-bold text-gray-800">{kv.value}</td>
                              <td className="py-1.5 pr-4 text-gray-500">{kv.reference_range}</td>
                              <td className="py-1.5">
                                <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                                  kv.status === 'normal' ? 'bg-green-100 text-green-700' :
                                  kv.status === 'critical' ? 'bg-red-100 text-red-700' :
                                  'bg-amber-100 text-amber-700'
                                }`}>{kv.status}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
