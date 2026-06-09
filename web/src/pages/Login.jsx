import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { 
  ShieldCheck, UserCircle, Activity, Map, Home, 
  Shield, Sparkles, ChevronLeft, ArrowRight, User, Plus,
  Phone, Lock, RefreshCw, CheckCircle2, Languages, MapPin
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
  const [otpArray, setOtpArray] = useState(['', '', '', '', '', '']);
  const [step, setStep] = useState(1); // 1: Phone, 2: OTP, 3: Complete Profile
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [canResend, setCanResend] = useState(false);

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

  // Countdown timer for resending OTP
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (countdown === 0 && step === 2) {
      setCanResend(true);
    }
    return () => clearTimeout(timer);
  }, [countdown, step]);

  // Handle individual digit input in OTP boxes
  const handleOtpChange = (value, index) => {
    const cleanVal = value.replace(/\D/g, '');
    if (!cleanVal) {
      const newOtp = [...otpArray];
      newOtp[index] = '';
      setOtpArray(newOtp);
      return;
    }

    const newOtp = [...otpArray];
    newOtp[index] = cleanVal.substring(cleanVal.length - 1);
    setOtpArray(newOtp);

    // Auto-focus next input box
    if (index < 5 && cleanVal) {
      document.getElementById(`otp-input-${index + 1}`)?.focus();
    }
  };

  // Handle backspace navigation in OTP boxes
  const handleOtpKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      if (!otpArray[index] && index > 0) {
        const newOtp = [...otpArray];
        newOtp[index - 1] = '';
        setOtpArray(newOtp);
        document.getElementById(`otp-input-${index - 1}`)?.focus();
      }
    }
  };

  // Handle clipboard paste in OTP boxes
  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').substring(0, 6);
    if (pasteData.length === 6) {
      const newOtp = pasteData.split('');
      setOtpArray(newOtp);
      setTimeout(() => {
        document.getElementById('otp-input-5')?.focus();
      }, 30);
    }
  };

  const triggerSendOTP = async (formattedPhone) => {
    setLoading(true);
    setError('');
    setSuccessMsg('');

    // A. Use Real Firebase Phone Auth if configured
    if (isFirebaseConfigured && auth && recaptchaVerifier) {
      try {
        console.log('Sending OTP via Firebase...');
        const confirmation = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier);
        setConfirmationResult(confirmation);
        setSuccessMsg('OTP sent to your phone via Firebase!');
        setCountdown(60);
        setCanResend(false);
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
        setCountdown(60);
        setCanResend(false);
        setStep(2);
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to send OTP. Please check your connection.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }
    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
    await triggerSendOTP(formattedPhone);
  };

  const handleResendOTP = async () => {
    if (!canResend) return;
    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
    await triggerSendOTP(formattedPhone);
    setOtpArray(['', '', '', '', '', '']);
    setTimeout(() => {
      document.getElementById('otp-input-0')?.focus();
    }, 50);
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    const otpString = otpArray.join('');
    if (otpString.length < 6) {
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
        const userCredential = await confirmationResult.confirm(otpString);
        const firebaseToken = await userCredential.user.getIdToken();
        payload = { firebase_token: firebaseToken, language: regLanguage };
      } 
      // B. Verify with custom DB-backed OTP
      else {
        console.log('Verifying OTP via custom DB flow...');
        payload = { mobile: formattedPhone, otp: otpString, language: regLanguage };
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
    { id: 'patient', name: 'Patient Workspace', desc: 'Access medical history, prescriptions & book doctor visits', icon: UserCircle, color: 'text-orange-600 bg-orange-50 border-orange-200' },
    { id: 'doctor', name: 'Doctor Workspace', desc: 'Manage EMR, view OPD queue & write digital prescriptions', icon: Activity, color: 'text-green-600 bg-green-50 border-green-200' },
    { id: 'asha', name: 'ASHA Workspace', desc: 'Perform field visits, log surveys & track community vitals', icon: Home, color: 'text-blue-600 bg-blue-50 border-blue-200' },
    { id: 'pho', name: 'PHO Workspace', desc: 'Monitor community disease dashboards & spatial heatmaps', icon: Map, color: 'text-purple-600 bg-purple-50 border-purple-200' },
    { id: 'admin', name: 'System Admin Workspace', desc: 'Configure hospital databases, clinician profiles & access logs', icon: Shield, color: 'text-red-600 bg-red-50 border-red-200' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5EFE6] via-[#FDFBF7] to-[#EAE5DF] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Decorative ambient background glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-[#1B6CA8]/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-orange-600/5 blur-[120px] pointer-events-none" />
      
      {/* Firebase Invisible Recaptcha Anchor */}
      <div id="recaptcha-container"></div>

      <div className="w-full max-w-lg bg-white rounded-3xl shadow-[0_20px_50px_rgba(27,108,168,0.08)] overflow-hidden border border-gray-100/80 transition-all duration-300">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1B6CA8] to-[#145E94] p-8 text-center relative overflow-hidden">
          {/* Subtle grid pattern overlay */}
          <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:14px_24px]" />
          
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center mb-3 border border-white/20 shadow-inner">
              <Activity className="text-white animate-pulse" size={24} />
            </div>
            <h1 className="text-4xl font-extrabold text-white tracking-tight mb-1 font-mukta">Ayu Disha</h1>
            <p className="text-blue-100/95 font-bold text-xs tracking-widest uppercase">Clinic-OS for Bharat</p>
          </div>
        </div>

        {/* Progress Tracker */}
        <div className="flex justify-between items-center px-8 py-5 bg-gray-50/55 border-b border-gray-100">
          {[
            { num: 1, title: 'Mobile', desc: 'Verify number' },
            { num: 2, title: 'Security', desc: 'Secure OTP' },
            { num: 3, title: 'Profile', desc: 'Choose workspace' }
          ].map((s) => (
            <div key={s.num} className="flex flex-col items-center flex-1 relative">
              <div className="flex items-center w-full">
                {/* Connector Line */}
                <div className={`h-[2px] flex-1 ${s.num === 1 ? 'invisible' : (step >= s.num ? 'bg-[#1B6CA8]' : 'bg-gray-200/60')}`} />
                
                {/* Step Circle */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-xs z-10 transition-all duration-300 ${
                  step === s.num
                    ? 'bg-[#1B6CA8] text-white ring-4 ring-blue-100'
                    : step > s.num
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-400'
                }`}>
                  {step > s.num ? '✓' : s.num}
                </div>
                
                <div className={`h-[2px] flex-1 ${s.num === 3 ? 'invisible' : (step > s.num ? 'bg-[#1B6CA8]' : 'bg-gray-200/60')}`} />
              </div>
              <span className={`text-[10px] font-bold mt-1.5 uppercase tracking-wider ${
                step === s.num ? 'text-[#1B6CA8] font-extrabold' : step > s.num ? 'text-green-600' : 'text-gray-400'
              }`}>
                {s.title}
              </span>
            </div>
          ))}
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50/80 border-l-4 border-red-500 text-red-700 rounded-xl text-sm font-semibold flex items-center gap-2 animate-fadeIn shadow-sm">
              <span className="shrink-0 font-bold">⚠️</span>
              <div>{error}</div>
            </div>
          )}

          {successMsg && (
            <div className="mb-6 p-4 bg-green-50/80 border-l-4 border-green-500 text-green-700 rounded-xl text-sm font-semibold flex items-center gap-2 animate-fadeIn shadow-sm">
              <CheckCircle2 size={16} className="text-green-600 shrink-0" />
              <div>{successMsg}</div>
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleSendOTP} className="space-y-6 animate-fadeIn">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Welcome to Ayu Disha</h2>
                <p className="text-gray-500 text-sm leading-relaxed">Enter your mobile number to configure your workspace. We will verify your identity via a secure OTP.</p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Mobile Number</label>
                <div className="relative flex items-center border border-gray-300/80 rounded-xl bg-white shadow-sm focus-within:ring-2 focus-within:ring-[#1B6CA8] focus-within:border-transparent transition-all overflow-hidden">
                  <div className="flex items-center gap-2 pl-4 pr-3 py-4 bg-gray-50 border-r border-gray-100 text-gray-500 font-semibold select-none">
                    <span className="text-lg">🇮🇳</span>
                    <span className="font-extrabold text-sm tracking-wide text-gray-700">+91</span>
                  </div>
                  <div className="pl-3 text-gray-400">
                    <Phone size={18} />
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="99999 99999"
                    className="flex-1 p-4 pl-2 bg-transparent outline-none text-base font-bold text-gray-800 placeholder-gray-400 tracking-wider"
                    maxLength={10}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1B6CA8] text-white py-4 rounded-xl font-bold text-base hover:bg-[#155A8A] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10 disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading ? 'Sending OTP Code...' : 'Get Security Code'}
                {!loading && <ArrowRight size={18} />}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleVerifyOTP} className="space-y-6 animate-fadeIn">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Enter Verification Code</h2>
                <p className="text-gray-500 text-sm leading-relaxed">
                  We've sent a 6-digit code to <span className="font-bold text-gray-800">+91 {phone}</span>. Please input it below.
                </p>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 text-center">
                  6-Digit OTP Code
                </label>
                
                {/* 6 Digit Input Group */}
                <div className="flex justify-between gap-2.5 max-w-sm mx-auto" onPaste={handleOtpPaste}>
                  {otpArray.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`otp-input-${idx}`}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(e.target.value, idx)}
                      onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                      className="w-12 h-14 border-2 border-gray-200 rounded-xl focus:border-[#1B6CA8] focus:ring-2 focus:ring-blue-100 outline-none text-center text-xl font-extrabold text-gray-800 transition-all bg-white"
                      disabled={loading}
                      autoFocus={idx === 0}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#1B6CA8] text-white py-4 rounded-xl font-bold text-base hover:bg-[#155A8A] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {loading ? 'Verifying OTP...' : 'Verify & Log In'}
                </button>

                <div className="flex flex-col items-center gap-3.5 mt-4">
                  {/* Resend & Timer */}
                  <div className="text-sm">
                    {countdown > 0 ? (
                      <p className="text-gray-400 font-medium flex items-center gap-1.5">
                        <RefreshCw size={14} className="animate-spin" />
                        Resend code in <span className="font-bold text-gray-700">{countdown}s</span>
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendOTP}
                        disabled={!canResend || loading}
                        className="text-[#1B6CA8] font-bold hover:underline flex items-center gap-1.5 disabled:opacity-50 disabled:no-underline"
                      >
                        <RefreshCw size={14} />
                        Resend OTP Code
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setOtpArray(['', '', '', '', '', '']);
                    }}
                    className="text-gray-400 font-semibold text-sm hover:text-gray-600 transition-colors flex items-center gap-1"
                  >
                    <ChevronLeft size={16} />
                    Edit Phone Number
                  </button>
                </div>
              </div>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleCompleteProfile} className="space-y-6 max-h-[70vh] overflow-y-auto pr-1 custom-scrollbar animate-fadeIn">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold text-gray-800 tracking-tight font-mukta">Create Your Account</h2>
                <p className="text-gray-500 text-sm">Please register your details to configure your clinical workspace.</p>
              </div>

              {/* Name Input */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Full Name</label>
                <div className="relative flex items-center border border-gray-300/80 rounded-xl bg-white shadow-sm focus-within:ring-2 focus-within:ring-[#1B6CA8] focus-within:border-transparent transition-all overflow-hidden">
                  <div className="pl-4 text-gray-400">
                    <User size={18} />
                  </div>
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. Dr. Ramesh Kumar"
                    className="flex-1 p-3.5 pl-3 bg-transparent outline-none text-base font-semibold text-gray-800 placeholder-gray-400"
                    required
                  />
                </div>
              </div>

              {/* Role Selector Grid */}
              <div className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Choose Workspace Role</label>
                <div className="grid grid-cols-1 gap-2.5">
                  {roles.map((r) => {
                    const Icon = r.icon;
                    const isSelected = regRole === r.id;
                    return (
                      <div
                        key={r.id}
                        onClick={() => {
                          setRegRole(r.id);
                          setRegHospital('');
                          setRegVillage('');
                        }}
                        className={`flex items-start justify-between p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 active:scale-[0.99] ${
                          isSelected 
                            ? 'border-[#1B6CA8] bg-blue-50/40 shadow-sm' 
                            : 'border-gray-100 hover:border-gray-200 bg-white hover:bg-gray-50/30'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`p-2.5 rounded-lg shrink-0 transition-colors mt-0.5 ${
                            isSelected ? 'bg-[#1B6CA8] text-white' : 'bg-gray-100 text-gray-500'
                          }`}>
                            <Icon size={18} />
                          </div>
                          <div className="text-left">
                            <p className={`text-sm font-bold ${isSelected ? 'text-[#1B6CA8]' : 'text-gray-800'}`}>
                              {r.name}
                            </p>
                            <p className="text-[11px] text-gray-400 leading-relaxed mt-1">{r.desc}</p>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-[#1B6CA8] flex items-center justify-center text-white text-[10px] shrink-0 mt-1">
                            ✓
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Conditional Fields based on Role Selection */}
              {regRole === 'doctor' && (
                <div className="space-y-2 animate-fadeIn">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Select Assigned Hospital</label>
                  <div className="relative flex items-center border border-gray-300/80 rounded-xl bg-white shadow-sm focus-within:ring-2 focus-within:ring-[#1B6CA8] transition-all overflow-hidden">
                    <div className="pl-4 text-gray-400">
                      <Activity size={18} />
                    </div>
                    <select
                      value={regHospital}
                      onChange={(e) => setRegHospital(e.target.value)}
                      className="flex-1 p-3.5 pl-3 bg-transparent outline-none text-base font-semibold text-gray-800 appearance-none bg-white cursor-pointer"
                      required
                    >
                      <option value="">-- Select Hospital --</option>
                      {hospitals.map(h => (
                        <option key={h.id} value={h.name}>{h.name}</option>
                      ))}
                    </select>
                    <div className="pr-4 pointer-events-none text-gray-400 text-xs font-bold">▼</div>
                  </div>
                </div>
              )}

              {regRole === 'asha' && (
                <div className="space-y-2 animate-fadeIn">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Select Assigned Village</label>
                  <div className="relative flex items-center border border-gray-300/80 rounded-xl bg-white shadow-sm focus-within:ring-2 focus-within:ring-[#1B6CA8] transition-all overflow-hidden">
                    <div className="pl-4 text-gray-400">
                      <Home size={18} />
                    </div>
                    <select
                      value={regVillage}
                      onChange={(e) => setRegVillage(e.target.value)}
                      className="flex-1 p-3.5 pl-3 bg-transparent outline-none text-base font-semibold text-gray-800 appearance-none bg-white cursor-pointer"
                      required
                    >
                      <option value="">-- Choose Assigned Village --</option>
                      {villages.map(v => (
                        <option key={v.id} value={v.name}>{v.name}</option>
                      ))}
                    </select>
                    <div className="pr-4 pointer-events-none text-gray-400 text-xs font-bold">▼</div>
                  </div>
                </div>
              )}

              {/* District & Language */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">District / City</label>
                  <div className="relative flex items-center border border-gray-300/80 rounded-xl bg-white shadow-sm focus-within:ring-2 focus-within:ring-[#1B6CA8] transition-all overflow-hidden">
                    <div className="pl-4 text-gray-400">
                      <MapPin size={18} />
                    </div>
                    <input
                      type="text"
                      value={regDistrict}
                      onChange={(e) => setRegDistrict(e.target.value)}
                      placeholder="e.g. Chennai"
                      className="flex-1 p-3.5 pl-3 bg-transparent outline-none text-base font-semibold text-gray-800"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Preferred Language</label>
                  <div className="relative flex items-center border border-gray-300/80 rounded-xl bg-white shadow-sm focus-within:ring-2 focus-within:ring-[#1B6CA8] transition-all overflow-hidden">
                    <div className="pl-4 text-gray-400">
                      <Languages size={18} />
                    </div>
                    <select
                      value={regLanguage}
                      onChange={(e) => setRegLanguage(e.target.value)}
                      className="flex-1 p-3.5 pl-3 bg-transparent outline-none text-base font-semibold text-gray-800 appearance-none bg-white cursor-pointer"
                    >
                      <option value="en">English</option>
                      <option value="ta">Tamil (தமிழ்)</option>
                      <option value="hi">Hindi (हिन्दी)</option>
                    </select>
                    <div className="pr-4 pointer-events-none text-gray-400 text-xs font-bold">▼</div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-base hover:bg-green-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-500/10 disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading ? 'Creating Workspace...' : 'Complete Profile & Log In'}
                {!loading && <Plus size={18} />}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
