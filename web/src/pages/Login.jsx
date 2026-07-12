import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { 
  ShieldCheck, UserCircle, Activity, Map, Home, 
  Shield, Sparkles, ChevronLeft, ArrowRight, User, Plus,
  Phone, Lock, RefreshCw, CheckCircle2, Languages, MapPin, Mail, Key
} from 'lucide-react';
// Authentication is purely JWT-based — no Firebase dependency

export default function Login() {
  const navigate = useNavigate();
  const loginState = useAuthStore((state) => state.login);
  
  // Onboarding UI State Control
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'
  const [loginMethod, setLoginMethod] = useState('password'); // 'password' | 'otp'
  const [step, setStep] = useState(1); // 1: main forms, 2: OTP verification, 3: Forgot Password, 4: Reset Password
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [tempToken, setTempToken] = useState('');

  // Password Credentials State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Passwordless Phone OTP State
  const [phone, setPhone] = useState('');
  const [otpArray, setOtpArray] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(0);
  const [canResend, setCanResend] = useState(false);

  // (No Firebase state needed — OTP is handled by backend)

  // Register state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regRole, setRegRole] = useState('patient');
  const [regHospital, setRegHospital] = useState('');
  const [regVillage, setRegVillage] = useState('');
  const [regDistrict, setRegDistrict] = useState('Chennai');
  const [regLanguage, setRegLanguage] = useState('en');

  // Forgot / Reset Password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Metadata
  const [hospitals, setHospitals] = useState([]);
  const [villages, setVillages] = useState([]);

  // Load hospitals & villages on startup
  useEffect(() => {
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
  }, []);

  // Countdown timer for OTP
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

    if (index < 5 && cleanVal) {
      document.getElementById(`otp-input-${index + 1}`)?.focus();
    }
  };

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

  // Redirect after login
  const handleSuccessfulLogin = (user, token, refreshToken) => {
    loginState(user, token, refreshToken);
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

  // Credentials Log In
  const handleCredentialsLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await api.post('/auth/login', {
        email: email,
        password: password
      });
      handleSuccessfulLogin(res.data.user, res.data.access_token, res.data.refresh_token);
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  // Credentials Sign Up / Register
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    if (regRole === 'doctor' && !regHospital) {
      setError('Please select your hospital');
      setLoading(false);
      return;
    }
    if (regRole === 'asha' && !regVillage) {
      setError('Please select your assigned village');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        email: regEmail.trim(),
        password: regPassword,
        name: regName.trim(),
        mobile: regPhone.trim(),
        role: regRole,
        language: regLanguage,
        district: regDistrict,
        hospital: regRole === 'doctor' ? regHospital : null,
        village: regRole === 'asha' ? regVillage : null
      };
      const res = await api.post('/auth/register', payload);
      setSuccessMsg('Account created successfully!');
      handleSuccessfulLogin(res.data.user, res.data.access_token, res.data.refresh_token);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to complete registration.');
    } finally {
      setLoading(false);
    }
  };

  // Phone OTP Flow — purely backend/JWT based
  const triggerSendOTP = async (formattedPhone) => {
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await api.post('/auth/send-otp', { mobile: formattedPhone });
      let msg = res.data.message || 'OTP sent successfully!';
      if (res.data.otp) {
        msg += ` [DEV MODE - OTP: ${res.data.otp}]`;
      } else {
        msg += ' (Check server console logs)';
      }
      setSuccessMsg(msg);
      setCountdown(60);
      setCanResend(false);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send OTP. Please check your connection.');
    } finally {
      setLoading(false);
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
      const payload = { mobile: formattedPhone, otp: otpString, language: regLanguage };
      const res = await api.post('/auth/verify-otp', payload);

      setTempToken(res.data.access_token);
      api.defaults.headers.common['Authorization'] = `Bearer ${res.data.access_token}`;

      if (res.data.needs_registration) {
        setRegPhone(formattedPhone);
        setStep(5);
        setError('');
        setSuccessMsg('Phone verified! Please complete your profile details below.');
      } else {
        handleSuccessfulLogin(res.data.user, res.data.access_token, res.data.refresh_token);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Verification failed. Check the OTP and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Forgot Password
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setError('Please enter your email.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/forgot-password', { email: forgotEmail.trim() });
      setSuccessMsg(res.data.message || 'Reset code sent successfully!');
      setStep(4); // Move to Reset Password form
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit password reset request.');
    } finally {
      setLoading(false);
    }
  };

  // Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetCode.trim() || !newPassword.trim()) {
      setError('Reset code and new password are required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/reset-password', {
        email: forgotEmail.trim(),
        code: resetCode.trim(),
        new_password: newPassword
      });
      setSuccessMsg(res.data.message || 'Password reset successfully! Please sign in.');
      setEmail(forgotEmail);
      setStep(1);
      setActiveTab('login');
      setLoginMethod('password');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reset password. Check the code.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    if (regRole === 'doctor' && !regHospital) {
      setError('Please select your hospital');
      setLoading(false);
      return;
    }
    if (regRole === 'asha' && !regVillage) {
      setError('Please select your assigned village');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        name: regName.trim(),
        role: regRole,
        language: regLanguage,
        district: regDistrict,
        hospital: regRole === 'doctor' ? regHospital : null,
        village: regRole === 'asha' ? regVillage : null
      };
      
      const token = tempToken || useAuthStore.getState().token;
      const res = await api.post('/auth/complete-profile', payload, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setSuccessMsg('Profile completed successfully!');
      handleSuccessfulLogin(res.data, token, undefined);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to complete profile registration.');
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { id: 'patient', name: 'Patient', desc: 'Access medical history, prescriptions & book doctor visits', icon: UserCircle, color: 'text-orange-600 bg-orange-50 border-orange-200' },
    { id: 'doctor', name: 'Doctor', desc: 'Manage EMR, view OPD queue & write digital prescriptions', icon: Activity, color: 'text-green-600 bg-green-50 border-green-200' },
    { id: 'asha', name: 'ASHA', desc: 'Perform field visits, log surveys & track community vitals', icon: Home, color: 'text-blue-600 bg-blue-50 border-blue-200' },
    { id: 'pho', name: 'PHO', desc: 'Monitor community disease dashboards & spatial heatmaps', icon: Map, color: 'text-purple-600 bg-purple-50 border-purple-200' },
    { id: 'admin', name: 'Admin', desc: 'Configure hospital databases, clinician profiles & access logs', icon: Shield, color: 'text-red-600 bg-red-50 border-red-200' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5EFE6] via-[#FDFBF7] to-[#EAE5DF] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Decorative ambient background glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-[#1B6CA8]/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-orange-600/5 blur-[120px] pointer-events-none" />
      

      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-[0_20px_50px_rgba(27,108,168,0.08)] overflow-hidden border border-gray-100/80 transition-all duration-300 grid grid-cols-1 md:grid-cols-12 min-h-[600px]">
        
        {/* Left Side: Brand & Visuals */}
        <div className="md:col-span-5 bg-gradient-to-br from-[#1B6CA8] via-[#155A8A] to-[#0E3E61] p-10 flex flex-col justify-between text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-5 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:14px_24px]" />
          
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Activity className="text-white" size={20} />
            </div>
            <span className="text-xl font-bold tracking-wider uppercase font-mukta">Ayu Disha</span>
          </div>

          <div className="relative z-10 space-y-4 my-auto">
            <h2 className="text-3xl font-extrabold tracking-tight leading-tight">Clinic-OS for rural healthcare in India</h2>
            <p className="text-blue-100/80 text-sm leading-relaxed">
              Bridging community health workers (Asha), clinics, and district supervisors on a unified, high-reliability platform.
            </p>
          </div>

          <div className="relative z-10 text-xs text-blue-200/50 flex justify-between items-center border-t border-white/10 pt-4">
            <span>© 2026 Ayu Disha</span>
            <span>National Health Mission</span>
          </div>
        </div>

        {/* Right Side: Authentication Forms */}
        <div className="md:col-span-7 p-8 md:p-12 flex flex-col justify-center bg-white">
          
          {/* Notifications */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
              <span>⚠️</span>
              <div>{error}</div>
            </div>
          )}
          {successMsg && (
            <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 text-green-700 rounded-xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 size={14} className="text-green-600 shrink-0" />
              <div>{successMsg}</div>
            </div>
          )}

          {/* MAIN WORKSPACE ENTRY */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Tabs Switcher */}
              <div className="flex border-b border-gray-100 pb-0.5">
                <button
                  onClick={() => {
                    setActiveTab('login');
                    setError('');
                    setSuccessMsg('');
                  }}
                  className={`pb-4 px-2 text-sm font-extrabold tracking-wide uppercase transition-all border-b-2 ${
                    activeTab === 'login'
                      ? 'border-[#1B6CA8] text-gray-800'
                      : 'border-transparent text-gray-400 hover:text-gray-500'
                  }`}
                >
                  Workspace Login
                </button>
                <button
                  onClick={() => {
                    setActiveTab('register');
                    setError('');
                    setSuccessMsg('');
                  }}
                  className={`pb-4 px-6 text-sm font-extrabold tracking-wide uppercase transition-all border-b-2 ${
                    activeTab === 'register'
                      ? 'border-[#1B6CA8] text-gray-800'
                      : 'border-transparent text-gray-400 hover:text-gray-500'
                  }`}
                >
                  Register Account
                </button>
              </div>

              {/* A. LOGIN TAB */}
              {activeTab === 'login' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-extrabold text-gray-800">Sign In</h3>
                      <p className="text-gray-400 text-xs mt-1">Configure your login credentials.</p>
                    </div>
                    {/* Switch Login Method */}
                    <button
                      onClick={() => setLoginMethod(loginMethod === 'password' ? 'otp' : 'password')}
                      className="text-xs font-bold text-[#1B6CA8] hover:underline flex items-center gap-1.5"
                    >
                      {loginMethod === 'password' ? (
                        <>
                          <Phone size={14} /> Log in with Phone OTP
                        </>
                      ) : (
                        <>
                          <Mail size={14} /> Log in with Password
                        </>
                      )}
                    </button>
                  </div>

                  {/* 1. Login with Password */}
                  {loginMethod === 'password' && (
                    <form onSubmit={handleCredentialsLogin} className="space-y-4">
                      <div className="space-y-2">
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Email Address / Mobile</label>
                        <div className="relative flex items-center border border-gray-300 rounded-xl bg-white focus-within:ring-2 focus-within:ring-[#1B6CA8] overflow-hidden">
                          <div className="pl-4 text-gray-400">
                            <Mail size={16} />
                          </div>
                          <input
                            id="email"
                            type="text"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="e.g. clinic@ayudisha.org"
                            className="w-full p-3.5 pl-3 outline-none text-sm text-gray-700 font-medium"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Password</label>
                          <button
                            type="button"
                            onClick={() => setStep(3)}
                            className="text-xs text-[#1B6CA8] font-bold hover:underline"
                          >
                            Forgot Password?
                          </button>
                        </div>
                        <div className="relative flex items-center border border-gray-300 rounded-xl bg-white focus-within:ring-2 focus-within:ring-[#1B6CA8] overflow-hidden">
                          <div className="pl-4 text-gray-400">
                            <Lock size={16} />
                          </div>
                          <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full p-3.5 pl-3 outline-none text-sm text-gray-700 font-medium"
                            required
                          />
                        </div>
                      </div>

                      <button
                        id="login-button"
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#1B6CA8] hover:bg-[#155A8A] text-white py-3.5 rounded-xl font-bold text-sm shadow-md transition-all active:scale-[0.99] disabled:opacity-50"
                      >
                        {loading ? 'Signing In...' : 'Log In to Workspace'}
                      </button>
                    </form>
                  )}

                  {/* 2. Login with Phone OTP */}
                  {loginMethod === 'otp' && (
                    <form onSubmit={handleSendOTP} className="space-y-4">
                      <div className="space-y-2">
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Mobile Number</label>
                        <div className="relative flex items-center border border-gray-300 rounded-xl bg-white focus-within:ring-2 focus-within:ring-[#1B6CA8] overflow-hidden">
                          <div className="flex items-center gap-1.5 pl-4 pr-2.5 py-3.5 bg-gray-50 border-r border-gray-100 text-gray-500 font-extrabold text-sm select-none">
                            <span>🇮🇳</span>
                            <span>+91</span>
                          </div>
                          <div className="pl-3 text-gray-400">
                            <Phone size={16} />
                          </div>
                          <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                            placeholder="99999 99999"
                            className="w-full p-3.5 pl-2.5 outline-none text-sm font-bold text-gray-800 tracking-wide"
                            maxLength={10}
                            disabled={loading}
                            required
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#1B6CA8] hover:bg-[#155A8A] text-white py-3.5 rounded-xl font-bold text-sm shadow-md transition-all active:scale-[0.99] disabled:opacity-50"
                      >
                        {loading ? 'Sending OTP...' : 'Get OTP Security Code'}
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* B. REGISTER TAB */}
              {activeTab === 'register' && (
                <form onSubmit={handleRegister} className="space-y-4 animate-fadeIn max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
                  <div>
                    <h3 className="text-xl font-extrabold text-gray-800">Register Account</h3>
                    <p className="text-gray-400 text-xs mt-1">Configure your clinical credentials.</p>
                  </div>

                  {/* Name */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Full Name</label>
                    <div className="relative flex items-center border border-gray-300 rounded-xl bg-white focus-within:ring-2 focus-within:ring-[#1B6CA8] overflow-hidden">
                      <div className="pl-4 text-gray-400">
                        <User size={16} />
                      </div>
                      <input
                        type="text"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="Dr. Ramesh Kumar"
                        className="w-full p-3 pl-3 outline-none text-sm text-gray-700"
                        required
                      />
                    </div>
                  </div>

                  {/* Email & Password */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Email Address</label>
                      <div className="relative flex items-center border border-gray-300 rounded-xl bg-white focus-within:ring-2 focus-within:ring-[#1B6CA8] overflow-hidden">
                        <div className="pl-4 text-gray-400">
                          <Mail size={16} />
                        </div>
                        <input
                          type="email"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="name@example.com"
                          className="w-full p-3 pl-3 outline-none text-sm text-gray-700"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Password</label>
                      <div className="relative flex items-center border border-gray-300 rounded-xl bg-white focus-within:ring-2 focus-within:ring-[#1B6CA8] overflow-hidden">
                        <div className="pl-4 text-gray-400">
                          <Lock size={16} />
                        </div>
                        <input
                          type="password"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="Min 6 characters"
                          className="w-full p-3 pl-3 outline-none text-sm text-gray-700"
                          minLength={6}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Mobile Number</label>
                    <div className="relative flex items-center border border-gray-300 rounded-xl bg-white focus-within:ring-2 focus-within:ring-[#1B6CA8] overflow-hidden">
                      <div className="flex items-center gap-1 pl-4 pr-2 py-3 bg-gray-50 border-r border-gray-100 text-gray-500 font-bold text-xs select-none">
                        <span>🇮🇳</span>
                        <span>+91</span>
                      </div>
                      <input
                        type="tel"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value.replace(/\D/g, ''))}
                        placeholder="99999 99999"
                        className="w-full p-3 pl-3 outline-none text-sm text-gray-700 font-bold"
                        maxLength={10}
                        required
                      />
                    </div>
                  </div>

                  {/* Role Selection */}
                  <div className="space-y-2.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Workspace Role</label>
                    <div className="grid grid-cols-1 gap-2">
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
                            className={`flex items-start justify-between p-3 rounded-xl border cursor-pointer transition-all duration-200 ${
                              isSelected 
                                ? 'border-[#1B6CA8] bg-blue-50/20 shadow-sm' 
                                : 'border-gray-100 hover:border-gray-200 bg-white'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                                isSelected ? 'bg-[#1B6CA8] text-white' : 'bg-gray-100 text-gray-400'
                              }`}>
                                <Icon size={16} />
                              </div>
                              <div className="text-left">
                                <p className={`text-xs font-extrabold ${isSelected ? 'text-[#1B6CA8]' : 'text-gray-700'}`}>{r.name}</p>
                                <p className="text-[10px] text-gray-400 mt-0.5 leading-normal">{r.desc}</p>
                              </div>
                            </div>
                            {isSelected && (
                              <div className="w-4.5 h-4.5 rounded-full bg-[#1B6CA8] flex items-center justify-center text-white text-[9px] mt-0.5">✓</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Conditional Hospital Selector */}
                  {regRole === 'doctor' && (
                    <div className="space-y-2 animate-fadeIn">
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Select Clinical Hospital</label>
                      <div className="relative flex items-center border border-gray-300 rounded-xl bg-white focus-within:ring-2 focus-within:ring-[#1B6CA8] overflow-hidden">
                        <div className="pl-4 text-gray-400">
                          <Activity size={16} />
                        </div>
                        <select
                          value={regHospital}
                          onChange={(e) => setRegHospital(e.target.value)}
                          className="w-full p-3 bg-transparent outline-none text-sm text-gray-700 appearance-none bg-white cursor-pointer"
                          required
                        >
                          <option value="">-- Choose Hospital --</option>
                          {hospitals.map(h => (
                            <option key={h.id} value={h.name}>{h.name}</option>
                          ))}
                        </select>
                        <div className="pr-4 pointer-events-none text-gray-400 text-xs">▼</div>
                      </div>
                    </div>
                  )}

                  {/* Conditional Village Selector */}
                  {regRole === 'asha' && (
                    <div className="space-y-2 animate-fadeIn">
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Select Village Area</label>
                      <div className="relative flex items-center border border-gray-300 rounded-xl bg-white focus-within:ring-2 focus-within:ring-[#1B6CA8] overflow-hidden">
                        <div className="pl-4 text-gray-400">
                          <Home size={16} />
                        </div>
                        <select
                          value={regVillage}
                          onChange={(e) => setRegVillage(e.target.value)}
                          className="w-full p-3 bg-transparent outline-none text-sm text-gray-700 appearance-none bg-white cursor-pointer"
                          required
                        >
                          <option value="">-- Choose Village --</option>
                          {villages.map(v => (
                            <option key={v.id} value={v.name}>{v.name}</option>
                          ))}
                        </select>
                        <div className="pr-4 pointer-events-none text-gray-400 text-xs">▼</div>
                      </div>
                    </div>
                  )}

                  {/* District & Language */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">District / City</label>
                      <div className="relative flex items-center border border-gray-300 rounded-xl bg-white focus-within:ring-2 focus-within:ring-[#1B6CA8] overflow-hidden">
                        <div className="pl-4 text-gray-400">
                          <MapPin size={16} />
                        </div>
                        <input
                          type="text"
                          value={regDistrict}
                          onChange={(e) => setRegDistrict(e.target.value)}
                          className="w-full p-3 pl-3 outline-none text-sm text-gray-700"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Language</label>
                      <div className="relative flex items-center border border-gray-300 rounded-xl bg-white focus-within:ring-2 focus-within:ring-[#1B6CA8] overflow-hidden">
                        <div className="pl-4 text-gray-400">
                          <Languages size={16} />
                        </div>
                        <select
                          value={regLanguage}
                          onChange={(e) => setRegLanguage(e.target.value)}
                          className="w-full p-3 bg-transparent outline-none text-sm text-gray-700 appearance-none bg-white cursor-pointer"
                        >
                          <option value="en">English</option>
                          <option value="ta">Tamil (தமிழ்)</option>
                          <option value="hi">Hindi (हिन्दी)</option>
                        </select>
                        <div className="pr-4 pointer-events-none text-gray-400 text-xs">▼</div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-3.5 rounded-xl font-bold text-sm shadow-md transition-all active:scale-[0.99] disabled:opacity-50"
                  >
                    {loading ? 'Creating Account...' : 'Complete Signup'}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* STEP 2: ENTER OTP SECURITY CODE */}
          {step === 2 && (
            <form onSubmit={handleVerifyOTP} className="space-y-6 animate-fadeIn">
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-gray-800 tracking-tight">Verify Identity</h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  We've sent a 6-digit code to <span className="font-bold text-gray-700">+91 {phone}</span>. Please enter it below.
                </p>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 text-center">
                  6-Digit OTP Security Code
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
                  className="w-full bg-[#1B6CA8] hover:bg-[#155A8A] text-white py-3.5 rounded-xl font-bold text-sm shadow-md transition-all active:scale-[0.99] disabled:opacity-50"
                >
                  {loading ? 'Verifying OTP...' : 'Verify Code & Log In'}
                </button>

                <div className="flex flex-col items-center gap-3 mt-4">
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

          {/* STEP 3: FORGOT PASSWORD REQUEST */}
          {step === 3 && (
            <form onSubmit={handleForgotPassword} className="space-y-6 animate-fadeIn">
              <div>
                <h3 className="text-xl font-extrabold text-gray-800">Forgot Password</h3>
                <p className="text-gray-400 text-xs mt-1">Provide your email address to recover your password details.</p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Email Address</label>
                <div className="relative flex items-center border border-gray-300 rounded-xl bg-white focus-within:ring-2 focus-within:ring-[#1B6CA8] overflow-hidden">
                  <div className="pl-4 text-gray-400">
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="e.g. user@ayudisha.org"
                    className="w-full p-3.5 pl-3 outline-none text-sm text-gray-700"
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#1B6CA8] hover:bg-[#155A8A] text-white py-3.5 rounded-xl font-bold text-sm shadow-md transition-all active:scale-[0.99] disabled:opacity-50"
                >
                  {loading ? 'Sending Request...' : 'Send Reset Code'}
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setError('');
                    setSuccessMsg('');
                  }}
                  className="w-full text-center text-gray-400 font-semibold text-xs hover:underline flex items-center justify-center gap-1"
                >
                  <ChevronLeft size={14} /> Back to Login / Sign In
                </button>
              </div>
            </form>
          )}

          {/* STEP 4: RESET PASSWORD VERIFICATION */}
          {step === 4 && (
            <form onSubmit={handleResetPassword} className="space-y-4 animate-fadeIn">
              <div>
                <h3 className="text-xl font-extrabold text-gray-800">Reset Password</h3>
                <p className="text-gray-400 text-xs mt-1">Enter your verification reset code to change your password.</p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Reset Code</label>
                <div className="relative flex items-center border border-gray-300 rounded-xl bg-white focus-within:ring-2 focus-within:ring-[#1B6CA8] overflow-hidden">
                  <div className="pl-4 text-gray-400">
                    <Key size={16} />
                  </div>
                  <input
                    type="text"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    placeholder="6-digit reset code"
                    className="w-full p-3.5 pl-3 outline-none text-sm text-gray-700 font-bold"
                    maxLength={6}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">New Password</label>
                <div className="relative flex items-center border border-gray-300 rounded-xl bg-white focus-within:ring-2 focus-within:ring-[#1B6CA8] overflow-hidden">
                  <div className="pl-4 text-gray-400">
                    <Lock size={16} />
                  </div>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full p-3.5 pl-3 outline-none text-sm text-gray-700"
                    minLength={6}
                    required
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3.5 rounded-xl font-bold text-sm shadow-md transition-all active:scale-[0.99] disabled:opacity-50"
                >
                  {loading ? 'Resetting Password...' : 'Change Password & Login'}
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setStep(3);
                    setError('');
                    setSuccessMsg('');
                  }}
                  className="w-full text-center text-gray-400 font-semibold text-xs hover:underline"
                >
                  Resend Code
                </button>
              </div>
            </form>
          )}

          {/* STEP 5: COMPLETE PROFILE ONBOARDING */}
          {step === 5 && (
            <form onSubmit={handleCompleteProfile} className="space-y-4 animate-fadeIn max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
              <div>
                <h3 className="text-xl font-extrabold text-gray-800">Complete Your Profile</h3>
                <p className="text-gray-400 text-xs mt-1">Set up your health portal details to access your dashboard.</p>
              </div>

              {/* Name */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Full Name</label>
                <div className="relative flex items-center border border-gray-300 rounded-xl bg-white focus-within:ring-2 focus-within:ring-[#1B6CA8] overflow-hidden">
                  <div className="pl-4 text-gray-400">
                    <User size={16} />
                  </div>
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full p-3.5 pl-3 outline-none text-sm text-gray-700"
                    required
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div className="space-y-2.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Your Health Role</label>
                <div className="grid grid-cols-1 gap-2">
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
                        className={`flex items-start justify-between p-3 rounded-xl border cursor-pointer transition-all duration-200 ${
                          isSelected 
                            ? 'border-[#1B6CA8] bg-blue-50/20 shadow-sm' 
                            : 'border-gray-100 hover:border-gray-200 bg-white'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                            isSelected ? 'bg-[#1B6CA8] text-white' : 'bg-gray-100 text-gray-400'
                          }`}>
                            <Icon size={16} />
                          </div>
                          <div className="text-left">
                            <p className={`text-xs font-extrabold ${isSelected ? 'text-[#1B6CA8]' : 'text-gray-700'}`}>{r.name}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5 leading-normal">{r.desc}</p>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="w-4.5 h-4.5 rounded-full bg-[#1B6CA8] flex items-center justify-center text-white text-[9px] mt-0.5">✓</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Conditional Hospital Selector */}
              {regRole === 'doctor' && (
                <div className="space-y-2 animate-fadeIn">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Select Clinical Hospital</label>
                  <div className="relative flex items-center border border-gray-300 rounded-xl bg-white focus-within:ring-2 focus-within:ring-[#1B6CA8] overflow-hidden">
                    <div className="pl-4 text-gray-400">
                      <Activity size={16} />
                    </div>
                    <select
                      value={regHospital}
                      onChange={(e) => setRegHospital(e.target.value)}
                      className="w-full p-3 bg-transparent outline-none text-sm text-gray-700 appearance-none bg-white cursor-pointer"
                      required
                    >
                      <option value="">-- Choose Hospital --</option>
                      {hospitals.map(h => (
                        <option key={h.id} value={h.name}>{h.name}</option>
                      ))}
                    </select>
                    <div className="pr-4 pointer-events-none text-gray-400 text-xs">▼</div>
                  </div>
                </div>
              )}

              {/* Conditional Village Selector */}
              {regRole === 'asha' && (
                <div className="space-y-2 animate-fadeIn">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Select Village Area</label>
                  <div className="relative flex items-center border border-gray-300 rounded-xl bg-white focus-within:ring-2 focus-within:ring-[#1B6CA8] overflow-hidden">
                    <div className="pl-4 text-gray-400">
                      <Home size={16} />
                    </div>
                    <select
                      value={regVillage}
                      onChange={(e) => setRegVillage(e.target.value)}
                      className="w-full p-3 bg-transparent outline-none text-sm text-gray-700 appearance-none bg-white cursor-pointer"
                      required
                    >
                      <option value="">-- Choose Village --</option>
                      {villages.map(v => (
                        <option key={v.id} value={v.name}>{v.name}</option>
                      ))}
                    </select>
                    <div className="pr-4 pointer-events-none text-gray-400 text-xs">▼</div>
                  </div>
                </div>
              )}

              {/* District & Language */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">District / City</label>
                  <div className="relative flex items-center border border-gray-300 rounded-xl bg-white focus-within:ring-2 focus-within:ring-[#1B6CA8] overflow-hidden">
                    <div className="pl-4 text-gray-400">
                      <MapPin size={16} />
                    </div>
                    <input
                      type="text"
                      value={regDistrict}
                      onChange={(e) => setRegDistrict(e.target.value)}
                      className="w-full p-3 outline-none text-sm text-gray-700"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Language</label>
                  <div className="relative flex items-center border border-gray-300 rounded-xl bg-white focus-within:ring-2 focus-within:ring-[#1B6CA8] overflow-hidden">
                    <div className="pl-4 text-gray-400">
                      <Languages size={16} />
                    </div>
                    <select
                      value={regLanguage}
                      onChange={(e) => setRegLanguage(e.target.value)}
                      className="w-full p-3 bg-transparent outline-none text-sm text-gray-700 appearance-none bg-white cursor-pointer"
                    >
                      <option value="en">English</option>
                      <option value="ta">Tamil (தமிழ்)</option>
                      <option value="hi">Hindi (हिन्दी)</option>
                    </select>
                    <div className="pr-4 pointer-events-none text-gray-400 text-xs">▼</div>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#1B6CA8] hover:bg-[#155A8A] text-white py-3.5 rounded-xl font-bold text-sm shadow-md transition-all active:scale-[0.99] disabled:opacity-50"
                >
                  {loading ? 'Completing Profile...' : 'Finish Registration'}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
