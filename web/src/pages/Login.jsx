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

  const handleSendOTP = (e) => {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (otp !== '123456') {
      setError('Invalid OTP. For development, use: 123456');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const mockFirebaseToken = `MOCK_${phone.replace('+91', '')}`;
      const res = await api.post('/auth/verify-otp', {
        firebase_token: mockFirebaseToken,
        language: 'en'
      });
      
      handleSuccessfulLogin(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed');
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

  const devAutoLogin = async (role) => {
    setLoading(true);
    setError('');
    let payload = {};
    
    if (role === 'patient') {
      payload = { firebase_token: "MOCK_9999999999", name: "Priya Sharma", role: "patient", language: "en" };
    } else if (role === 'asha') {
      payload = { firebase_token: "MOCK_9876543210", name: "Kavitha Devi", role: "asha", language: "en" };
    } else if (role === 'doctor') {
      payload = { firebase_token: "MOCK_9876543211", name: "Dr. Ramesh Kumar", role: "doctor", language: "en" };
    } else if (role === 'admin') {
      payload = { firebase_token: "MOCK_9876543212", name: "Admin User", role: "admin", language: "en" };
    } else if (role === 'pho') {
      payload = { firebase_token: "MOCK_9876543213", name: "PHO Officer", role: "pho", language: "en" };
    }

    try {
      const res = await api.post('/auth/verify-otp', payload);
      handleSuccessfulLogin(res.data);
    } catch (err) {
      setError(`Dev Login Failed: ${err.message}`);
    } finally {
      setLoading(false);
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
                className="w-full bg-[#1B6CA8] text-white py-4 rounded-lg font-bold text-lg hover:bg-[#155A8A] transition-colors shadow-md"
              >
                Continue
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
                  placeholder="123456"
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

          <div className="mt-10 pt-8 border-t border-gray-100">
            <p className="text-center text-sm text-gray-500 font-medium mb-4 uppercase tracking-wider">
              Developer Quick Login
            </p>
            <div className="grid grid-cols-1 gap-3">
              <button 
                onClick={() => devAutoLogin('patient')}
                className="flex items-center justify-center space-x-2 w-full bg-[#F7F3EE] text-[#D35400] hover:bg-[#F0E6D8] border border-[#E2DDD8] py-3 rounded-lg font-semibold transition-colors"
              >
                <UserCircle size={18} />
                <span>Patient Login</span>
              </button>
              <button 
                onClick={() => devAutoLogin('asha')}
                className="flex items-center justify-center space-x-2 w-full bg-[#F7F3EE] text-[#1B6CA8] hover:bg-[#E6F0F7] border border-[#B3D4EC] py-3 rounded-lg font-semibold transition-colors"
              >
                <ShieldCheck size={18} />
                <span>ASHA Login</span>
              </button>
              <button 
                onClick={() => devAutoLogin('doctor')}
                className="flex items-center justify-center space-x-2 w-full bg-[#F7F3EE] text-[#2C8C68] hover:bg-[#E5F5EF] border border-[#BDE0D1] py-3 rounded-lg font-semibold transition-colors"
              >
                <Activity size={18} />
                <span>Doctor Login</span>
              </button>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => devAutoLogin('admin')}
                  className="flex items-center justify-center space-x-2 w-full bg-[#F7F3EE] text-[#7D3C98] hover:bg-[#F5EEF8] border border-[#D7BDE2] py-3 rounded-lg font-semibold transition-colors text-sm"
                >
                  <ShieldCheck size={16} />
                  <span>Admin</span>
                </button>
                <button 
                  onClick={() => devAutoLogin('pho')}
                  className="flex items-center justify-center space-x-2 w-full bg-[#F7F3EE] text-[#1A5276] hover:bg-[#EBF5FB] border border-[#AED6F1] py-3 rounded-lg font-semibold transition-colors text-sm"
                >
                  <Activity size={16} />
                  <span>PHO</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
