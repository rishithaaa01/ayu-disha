import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { ShieldCheck, UserCircle, Activity } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }
    setLoading(true);
    setError('');
    
    try {
      await api.post('/auth/send-otp', { mobile: phone });
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send OTP. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!otp || otp.length < 6) {
      setError('Enter a valid 6-digit OTP');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const res = await api.post('/auth/verify-otp', {
        mobile: phone,
        otp: otp,
        language: 'en'
      });
      
      handleSuccessfulLogin(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Verification failed. Please check the OTP and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessfulLogin = (data) => {
    login(data.user, data.access_token);
    
    if (data.needs_registration) {
      setError('Registration required. Please use mobile app for first-time setup.');
      return;
    }

    // Route based on role
    switch (data.user.role) {
      case 'patient':
        navigate('/patient');
        break;
      case 'asha':
        navigate('/asha');
        break;
      case 'doctor':
        navigate('/clinician');
        break;
      case 'admin':
        navigate('/admin');
        break;
      case 'pho':
        navigate('/pho');
        break;
      default:
        navigate('/clinician');
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F3EE] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-[#E2DDD8]">
        
        {/* Header */}
        <div className="bg-[#1B6CA8] p-8 text-center">
          <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Ayu Disha</h1>
          <p className="text-[#A3D5FF] font-medium">Unified Health Portal</p>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded text-sm">
              {error}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleSendOTP} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="99999 99999"
                  className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1B6CA8] focus:border-transparent outline-none transition-all text-lg"
                  maxLength={10}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1B6CA8] text-white py-4 rounded-lg font-bold text-lg hover:bg-[#155A8A] transition-colors shadow-md disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Continue'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter OTP sent to +91 {phone}
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter 6-digit OTP"
                  className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1B6CA8] focus:border-transparent outline-none transition-all text-center tracking-widest text-2xl font-bold"
                  maxLength={6}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1B6CA8] text-white py-4 rounded-lg font-bold text-lg hover:bg-[#155A8A] transition-colors shadow-md disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full text-center text-[#1B6CA8] font-medium text-sm hover:underline"
              >
                Change mobile number
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
