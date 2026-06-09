import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { 
  ShieldCheck, UserCircle, Activity, Map, Home, 
  Shield, Sparkles, ChevronLeft, ArrowRight, User, Plus
} from 'lucide-react';
import { 
  auth, 
  isFirebaseConfigured, 
  RecaptchaVerifier, 
  signInWithPhoneNumber 
} from '../services/firebase';

export default function Login() {
  const navigate = useNavigate();
  const loginState = useAuthStore((state) => state.login);
  
  // Navigation & Step Control
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1); // 1: Phone, 2: OTP, 3: Complete Profile
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Firebase Auth Confirmation Result
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState(null);

  // Registration / Complete Profile State
  const [regName, setRegName] = useState('');
  const [regRole, setRegRole] = useState('patient'); // default
  const [regHospital, setRegHospital] = useState('');
  const [regVillage, setRegVillage] = useState('');
  const [regDistrict, setRegDistrict] = useState('Chennai');
  const [regLanguage, setRegLanguage] = useState('en');
  
  // Metadata lists
  const [hospitals, setHospitals] = useState([]);
  const [villages, setVillages] = useState([]);
  
  // Temporary auth token received after OTP validation (stored until profile completed)
  const [tempAuthToken, setTempAuthToken] = useState('');
  const [tempUser, setTempUser] = useState(null);

  // Initialize Recaptcha if Firebase is configured
  useEffect(() => {
    if (isFirebaseConfigured && auth && !recaptchaVerifier) {
      try {
        const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
          callback: () => {
            console.log('Recaptcha resolved');
          }
        });
        setRecaptchaVerifier(verifier);
      } catch (err) {
        console.error('Recaptcha initialization failed', err);
      }
    }
  }, [recaptchaVerifier]);

  // Load Metadata (Hospitals & Villages) when entering Step 3
  useEffect(() => {
    if (step === 3) {
      const fetchMetadata = async () => {
        try {
          const [hospRes, villRes] = await Promise.all([
            api.get('/auth/hospitals'),
            api.get('/auth/villages')
          ]);
          setHospitals(hospRes.data || []);
          setVillages(villRes.data || []);
        } catch (e) {
          console.error("Failed to load metadata", e);
        }
      };
      fetchMetadata();
    }
  }, [step]);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccessMsg('');

    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;

    // A. Use Real Firebase Phone Auth if configured
    if (isFirebaseConfigured && auth && recaptchaVerifier) {
      try {
        console.log('Sending OTP via Firebase...');
        const confirmation = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier);
        setConfirmationResult(confirmation);
        setSuccessMsg('OTP sent to your phone via Firebase!');
        setStep(2);
      } catch (err) {
        console.error('Firebase Auth Error:', err);
        setError(`Firebase failed to send OTP: ${err.message}. Check your console.`);
      } finally {
        setLoading(false);
      }
    } 
    // B. Fall back to custom DB-backed OTP flow
    else {
      try {
        console.log('Sending OTP via custom DB flow...');
        const res = await api.post('/auth/send-otp', { mobile: formattedPhone });
        setSuccessMsg(res.data.message || 'OTP sent successfully! (Check server console logs)');
        setStep(2);
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to send OTP. Please check your connection.');
      } finally {
        setLoading(false);
      }
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
    
    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;

    try {
      let payload = {};
      
      // A. Verify with Firebase Token
      if (confirmationResult) {
        console.log('Verifying OTP via Firebase...');
        const userCredential = await confirmationResult.confirm(otp);
        const firebaseToken = await userCredential.user.getIdToken();
        payload = { firebase_token: firebaseToken, language: regLanguage };
      } 
      // B. Verify with custom DB-backed OTP
      else {
        console.log('Verifying OTP via custom DB flow...');
        payload = { mobile: formattedPhone, otp: otp, language: regLanguage };
      }

      const res = await api.post('/auth/verify-otp', payload);
      const { access_token, user, needs_registration } = res.data;
      
      if (needs_registration) {
        // Save token and user details temporarily, and move to Step 3 (Registration)
        setTempAuthToken(access_token);
        setTempUser(user);
        setStep(3);
      } else {
        handleSuccessfulLogin(user, access_token);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Verification failed. Please check the OTP and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteProfile = async (e) => {
    e.preventDefault();
    if (!regName.trim()) {
      setError('Please enter your full name');
      return;
    }
    
    if (regRole === 'doctor' && !regHospital) {
      setError('Please select your hospital');
      return;
    }
    if (regRole === 'asha' && !regVillage) {
      setError('Please select your assigned village');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        name: regName.trim(),
        role: regRole,
        language: regLanguage,
        hospital: regRole === 'doctor' ? regHospital : null,
        village: regRole === 'asha' ? regVillage : null,
        district: regDistrict
      };

      // Call complete-profile using the temp auth token we received in step 2
      const res = await api.post('/auth/complete-profile', payload, {
        headers: {
          Authorization: `Bearer ${tempAuthToken}`
        }
      });
      
      handleSuccessfulLogin(res.data, tempAuthToken);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to complete registration profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessfulLogin = (user, token) => {
    loginState(user, token);
    
    // Route based on role
    switch (user.role) {
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

  // Roles available for selection
  const roles = [
    { id: 'patient', name: 'Patient', desc: 'Book appointments & view health records', icon: User, color: 'text-orange-600 bg-orange-50 border-orange-200' },
    { id: 'doctor', name: 'Doctor', desc: 'OPD queue & EMR management', icon: Activity, color: 'text-green-600 bg-green-50 border-green-200' },
    { id: 'asha', name: 'ASHA', desc: 'Community health worker tracking', icon: Home, color: 'text-blue-600 bg-blue-50 border-blue-200' },
    { id: 'pho', name: 'PHO', desc: 'Public Health Officer surveillance', icon: Map, color: 'text-purple-600 bg-purple-50 border-purple-200' },
    { id: 'admin', name: 'Admin', desc: 'System administrator dashboard', icon: Shield, color: 'text-red-600 bg-red-50 border-red-200' },
  ];

  return (
    <div className="min-h-screen bg-[#F7F3EE] flex flex-col justify-center items-center p-4">
      {/* Firebase Invisible Recaptcha Anchor */}
      <div id="recaptcha-container"></div>

      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden border border-[#E2DDD8]">
        
        {/* Header */}
        <div className="bg-[#1B6CA8] p-8 text-center relative">
          <h1 className="text-4xl font-bold text-white tracking-tight mb-2 font-mukta">Ayu Disha</h1>
          <p className="text-[#A3D5FF] font-semibold text-sm">Clinic-OS for Bharat</p>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 text-green-700 rounded-xl text-sm font-medium">
              {successMsg}
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleSendOTP} className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">Welcome</h2>
                <p className="text-gray-500 text-sm mb-6">Enter your phone number to log in or create an account.</p>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Mobile Number</label>
                <div className="flex gap-2">
                  <span className="flex items-center justify-center bg-gray-100 border border-gray-300 px-4 rounded-xl font-bold text-gray-600 text-lg">+91</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="99999 99999"
                    className="flex-1 p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1B6CA8] focus:border-transparent outline-none transition-all text-lg font-bold"
                    maxLength={10}
                    disabled={loading}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1B6CA8] text-white py-4 rounded-xl font-bold text-lg hover:bg-[#155A8A] transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
              >
                {loading ? 'Sending OTP...' : 'Get OTP Code'}
                {!loading && <ArrowRight size={18} />}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleVerifyOTP} className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">Enter Verification Code</h2>
                <p className="text-gray-500 text-sm mb-6">We've sent a 6-digit code to +91 {phone}.</p>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  OTP Code
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 6-digit OTP"
                  className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1B6CA8] focus:border-transparent outline-none transition-all text-center tracking-[0.5em] text-2xl font-bold"
                  maxLength={6}
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1B6CA8] text-white py-4 rounded-xl font-bold text-lg hover:bg-[#155A8A] transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
              >
                {loading ? 'Verifying OTP...' : 'Verify & Continue'}
              </button>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full text-center text-[#1B6CA8] font-bold text-sm hover:underline flex items-center justify-center gap-1.5"
              >
                <ChevronLeft size={16} />
                Change mobile number
              </button>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleCompleteProfile} className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
              <div>
                <h2 className="text-xl font-bold text-gray-800 mb-1">Create Your Account</h2>
                <p className="text-gray-500 text-sm mb-6">Complete your profile to get started on Ayu Disha.</p>
                
                {/* Name */}
                <div className="mb-5">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. Dr. Ramesh Kumar / Priya Sharma"
                    className="w-full p-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1B6CA8] focus:border-transparent outline-none text-base"
                    required
                  />
                </div>

                {/* Role Selector */}
                <div className="mb-5">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Select Your Role</label>
                  <div className="space-y-2.5">
                    {roles.map((r) => {
                      const Icon = r.icon;
                      return (
                        <div
                          key={r.id}
                          onClick={() => {
                            setRegRole(r.id);
                            setRegHospital('');
                            setRegVillage('');
                          }}
                          className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            regRole === r.id 
                              ? 'border-[#1B6CA8] bg-blue-50/50 shadow-sm' 
                              : 'border-gray-100 hover:border-gray-200 bg-white'
                          }`}
                        >
                          <div className={`p-2.5 rounded-lg ${r.color} shrink-0`}>
                            <Icon size={20} />
                          </div>
                          <div>
                            <p className="font-bold text-gray-800 text-sm">{r.name}</p>
                            <p className="text-gray-500 text-xs mt-0.5">{r.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Conditional Fields based on Role Selection */}
                {regRole === 'doctor' && (
                  <div className="mb-5 animate-fadeIn">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Select Your Hospital</label>
                    <select
                      value={regHospital}
                      onChange={(e) => setRegHospital(e.target.value)}
                      className="w-full p-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1B6CA8] outline-none text-base bg-white"
                      required
                    >
                      <option value="">-- Choose Hospital --</option>
                      {hospitals.map(h => (
                        <option key={h.id} value={h.name}>{h.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {regRole === 'asha' && (
                  <div className="mb-5 animate-fadeIn">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Select Assigned Village</label>
                    <select
                      value={regVillage}
                      onChange={(e) => setRegVillage(e.target.value)}
                      className="w-full p-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1B6CA8] outline-none text-base bg-white"
                      required
                    >
                      <option value="">-- Choose Assigned Village --</option>
                      {villages.map(v => (
                        <option key={v.id} value={v.name}>{v.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* District Input */}
                <div className="mb-5">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">District / City</label>
                  <input
                    type="text"
                    value={regDistrict}
                    onChange={(e) => setRegDistrict(e.target.value)}
                    placeholder="e.g. Chennai / Vellore"
                    className="w-full p-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1B6CA8] focus:border-transparent outline-none text-base"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-green-700 transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
              >
                {loading ? 'Creating Account...' : 'Complete Registration & Login'}
                {!loading && <Plus size={18} />}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
