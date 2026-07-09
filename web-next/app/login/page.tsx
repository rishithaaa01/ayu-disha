'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import {
  ShieldCheck, UserCircle, Activity, Map, Home, Shield,
  ChevronLeft, User, Phone, Lock, RefreshCw, CheckCircle2,
  Languages, MapPin, Mail, Key
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const loginState = useAuthStore((s) => s.login);

  const [activeTab, setActiveTab] = useState<'login'|'register'>('login');
  const [loginMethod, setLoginMethod] = useState<'password'|'otp'>('password');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [tempToken, setTempToken] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otpArray, setOtpArray] = useState(['','','','','','']);
  const [countdown, setCountdown] = useState(0);
  const [canResend, setCanResend] = useState(false);

  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regRole, setRegRole] = useState('patient');
  const [regHospital, setRegHospital] = useState('');
  const [regVillage, setRegVillage] = useState('');
  const [regDistrict, setRegDistrict] = useState('Chennai');
  const [regLanguage, setRegLanguage] = useState('en');

  const [forgotEmail, setForgotEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [hospitals, setHospitals] = useState<any[]>([]);
  const [villages, setVillages] = useState<any[]>([]);

  useEffect(() => {
    api.get('/auth/hospitals').then(r => setHospitals(r.data || [])).catch(() => {});
    api.get('/auth/villages').then(r => setVillages(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    if (countdown > 0) t = setTimeout(() => setCountdown(c => c - 1), 1000);
    else if (countdown === 0 && step === 2) setCanResend(true);
    return () => clearTimeout(t);
  }, [countdown, step]);

  const handleSuccessfulLogin = (user: any, token: string) => {
    loginState(user, token);
    const routes: Record<string,string> = { patient:'/patient', asha:'/asha', doctor:'/clinician', admin:'/admin', pho:'/pho' };
    router.push(routes[user.role] ?? '/clinician');
  };

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError(''); setSuccessMsg('');
    try {
      const res = await api.post('/auth/login', { email, password });
      handleSuccessfulLogin(res.data.user, res.data.access_token);
    } catch (err: any) { setError(err.response?.data?.detail || 'Invalid email or password.'); }
    finally { setLoading(false); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError(''); setSuccessMsg('');
    if (regRole === 'doctor' && !regHospital) { setError('Please select your hospital'); setLoading(false); return; }
    if (regRole === 'asha' && !regVillage) { setError('Please select your assigned village'); setLoading(false); return; }
    try {
      const res = await api.post('/auth/register', {
        email: regEmail.trim(), password: regPassword, name: regName.trim(),
        mobile: regPhone.trim(), role: regRole, language: regLanguage, district: regDistrict,
        hospital: regRole === 'doctor' ? regHospital : null,
        village: regRole === 'asha' ? regVillage : null,
      });
      handleSuccessfulLogin(res.data.user, res.data.access_token);
    } catch (err: any) { setError(err.response?.data?.detail || 'Registration failed.'); }
    finally { setLoading(false); }
  };

  const triggerSendOTP = async (formattedPhone: string) => {
    setLoading(true); setError(''); setSuccessMsg('');
    try {
      const res = await api.post('/auth/send-otp', { mobile: formattedPhone });
      let msg = res.data.message || 'OTP sent!';
      if (res.data.otp) msg += ` [DEV - OTP: ${res.data.otp}]`;
      setSuccessMsg(msg); setCountdown(60); setCanResend(false); setStep(2);
    } catch (err: any) { setError(err.response?.data?.detail || 'Failed to send OTP.'); }
    finally { setLoading(false); }
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 10) { setError('Enter a valid 10-digit mobile number'); return; }
    await triggerSendOTP(phone.startsWith('+') ? phone : `+91${phone}`);
  };

  const handleResendOTP = async () => {
    if (!canResend) return;
    await triggerSendOTP(phone.startsWith('+') ? phone : `+91${phone}`);
    setOtpArray(['','','','','','']);
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpString = otpArray.join('');
    if (otpString.length < 6) { setError('Enter a valid 6-digit OTP'); return; }
    setLoading(true); setError('');
    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
    try {
      const res = await api.post('/auth/verify-otp', { mobile: formattedPhone, otp: otpString, language: regLanguage });
      if (res.data.needs_registration) {
        setTempToken(res.data.access_token); setRegPhone(formattedPhone);
        setStep(5); setSuccessMsg('Phone verified! Complete your profile below.');
      } else { handleSuccessfulLogin(res.data.user, res.data.access_token); }
    } catch (err: any) { setError(err.response?.data?.detail || 'Verification failed.'); }
    finally { setLoading(false); }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) { setError('Please enter your email.'); return; }
    setLoading(true); setError('');
    try {
      const res = await api.post('/auth/forgot-password', { email: forgotEmail.trim() });
      setSuccessMsg(res.data.message || 'Reset code sent!');
      if (res.data.reset_code) setSuccessMsg(`Reset code: ${res.data.reset_code}`);
      setStep(4);
    } catch (err: any) { setError(err.response?.data?.detail || 'Failed to send reset code.'); }
    finally { setLoading(false); }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetCode.trim() || !newPassword.trim()) { setError('Reset code and new password are required.'); return; }
    setLoading(true); setError('');
    try {
      const res = await api.post('/auth/reset-password', { email: forgotEmail.trim(), code: resetCode.trim(), new_password: newPassword });
      setSuccessMsg(res.data.message || 'Password reset! Please sign in.');
      setEmail(forgotEmail); setStep(1); setActiveTab('login'); setLoginMethod('password');
    } catch (err: any) { setError(err.response?.data?.detail || 'Failed to reset password.'); }
    finally { setLoading(false); }
  };

  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError(''); setSuccessMsg('');
    if (regRole === 'doctor' && !regHospital) { setError('Please select your hospital'); setLoading(false); return; }
    if (regRole === 'asha' && !regVillage) { setError('Please select your assigned village'); setLoading(false); return; }
    try {
      const res = await api.post('/auth/complete-profile', {
        name: regName.trim(), role: regRole, language: regLanguage, district: regDistrict,
        hospital: regRole === 'doctor' ? regHospital : null,
        village: regRole === 'asha' ? regVillage : null,
      }, { headers: { Authorization: `Bearer ${tempToken}` } });
      handleSuccessfulLogin(res.data, tempToken);
    } catch (err: any) { setError(err.response?.data?.detail || 'Failed to complete profile.'); }
    finally { setLoading(false); }
  };

  const handleOtpChange = (val: string, idx: number) => {
    const clean = val.replace(/\D/g,'');
    if (!clean) { const n=[...otpArray]; n[idx]=''; setOtpArray(n); return; }
    const n=[...otpArray]; n[idx]=clean.slice(-1); setOtpArray(n);
    if (idx < 5) document.getElementById(`otp-${idx+1}`)?.focus();
  };

  const handleOtpKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key==='Backspace' && !otpArray[idx] && idx>0) {
      const n=[...otpArray]; n[idx-1]=''; setOtpArray(n);
      document.getElementById(`otp-${idx-1}`)?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const d = e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6);
    if (d.length===6) { setOtpArray(d.split('')); setTimeout(()=>document.getElementById('otp-5')?.focus(),30); }
  };

  const roles = [
    { id:'patient', name:'Patient', desc:'Access medical history, prescriptions & book doctor visits', icon:UserCircle },
    { id:'doctor',  name:'Doctor',  desc:'Manage EMR, view OPD queue & write digital prescriptions', icon:Activity },
    { id:'asha',    name:'ASHA',    desc:'Perform field visits, log surveys & track community vitals', icon:Home },
    { id:'pho',     name:'PHO',     desc:'Monitor community disease dashboards & spatial heatmaps',  icon:Map },
    { id:'admin',   name:'Admin',   desc:'Configure hospital databases, clinician profiles & access logs', icon:Shield },
  ];

  const inputCls = "w-full p-3.5 pl-3 outline-none text-sm text-gray-700 font-medium bg-transparent";
  const fieldCls = "flex items-center border border-gray-300 rounded-xl bg-white focus-within:ring-2 focus-within:ring-[#1B6CA8] overflow-hidden";
  const labelCls = "block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1 mt-3";
  const btnCls   = "w-full bg-[#1B6CA8] hover:bg-[#155A8A] text-white py-3.5 rounded-xl font-bold text-sm shadow-md transition-all disabled:opacity-50 mt-4";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5EFE6] via-[#FDFBF7] to-[#EAE5DF] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-[#1B6CA8]/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-orange-600/5 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-[0_20px_50px_rgba(27,108,168,0.08)] overflow-hidden border border-gray-100/80 grid grid-cols-1 md:grid-cols-12 min-h-[600px]">

        {/* Left panel */}
        <div className="md:col-span-5 bg-gradient-to-br from-[#1B6CA8] via-[#155A8A] to-[#0E3E61] p-10 flex flex-col justify-between text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-5 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:14px_24px]" />
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <Activity className="text-white" size={20} />
            </div>
            <span className="text-xl font-bold tracking-wider uppercase">Ayu Disha</span>
          </div>
          <div className="relative z-10 space-y-4 my-auto">
            <h2 className="text-3xl font-extrabold tracking-tight leading-tight">Clinic-OS for rural healthcare in India</h2>
            <p className="text-blue-100/80 text-sm leading-relaxed">Bridging ASHA workers, clinics, and district supervisors on a unified platform.</p>
          </div>
          <div className="relative z-10 text-xs text-blue-200/50 flex justify-between border-t border-white/10 pt-4">
            <span>© 2026 Ayu Disha</span><span>National Health Mission</span>
          </div>
        </div>

        {/* Right panel */}
        <div className="md:col-span-7 p-8 md:p-12 flex flex-col justify-center bg-white overflow-y-auto max-h-screen">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-xl text-xs font-bold flex gap-2">
              <span>⚠️</span><span>{error}</span>
            </div>
          )}
          {successMsg && (
            <div className="mb-4 p-3 bg-green-50 border-l-4 border-green-500 text-green-700 rounded-xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 size={14} className="shrink-0" /><span>{successMsg}</span>
            </div>
          )}

          {/* STEP 1 — Login / Register tabs */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="flex border-b border-gray-100">
                {(['login','register'] as const).map(t => (
                  <button key={t} onClick={()=>{setActiveTab(t);setError('');setSuccessMsg('');}}
                    className={`pb-4 px-3 text-sm font-extrabold tracking-wide uppercase transition-all border-b-2 ${activeTab===t?'border-[#1B6CA8] text-gray-800':'border-transparent text-gray-400'}`}>
                    {t==='login'?'Workspace Login':'Register Account'}
                  </button>
                ))}
              </div>

              {activeTab==='login' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-extrabold text-gray-800">Sign In</h3>
                    <button onClick={()=>setLoginMethod(m=>m==='password'?'otp':'password')}
                      className="text-xs font-bold text-[#1B6CA8] hover:underline flex items-center gap-1">
                      {loginMethod==='password'?<><Phone size={13}/> Phone OTP</>:<><Mail size={13}/> Password</>}
                    </button>
                  </div>

                  {loginMethod==='password' && (
                    <form onSubmit={handleCredentialsLogin} className="space-y-1">
                      <label className={labelCls}>Email / Mobile</label>
                      <div className={fieldCls}><div className="pl-4 text-gray-400"><Mail size={16}/></div>
                        <input type="text" value={email} onChange={e=>setEmail(e.target.value)} placeholder="clinic@ayudisha.org" className={inputCls} required/>
                      </div>
                      <div className="flex justify-between items-center mt-3 mb-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Password</label>
                        <button type="button" onClick={()=>{setStep(3);setError('');setSuccessMsg('');}} className="text-xs text-[#1B6CA8] font-bold hover:underline">Forgot Password?</button>
                      </div>
                      <div className={fieldCls}><div className="pl-4 text-gray-400"><Lock size={16}/></div>
                        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" className={inputCls} required/>
                      </div>
                      <button type="submit" disabled={loading} className={btnCls}>{loading?'Signing In...':'Log In to Workspace'}</button>
                    </form>
                  )}

                  {loginMethod==='otp' && (
                    <form onSubmit={handleSendOTP} className="space-y-1">
                      <label className={labelCls}>Mobile Number</label>
                      <div className={fieldCls}>
                        <div className="flex items-center gap-1 pl-4 pr-3 py-3.5 bg-gray-50 border-r border-gray-200 text-gray-600 font-bold text-sm select-none">🇮🇳 +91</div>
                        <div className="pl-3 text-gray-400"><Phone size={16}/></div>
                        <input type="tel" value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,''))} placeholder="99999 99999" maxLength={10} className={inputCls} required/>
                      </div>
                      <button type="submit" disabled={loading} className={btnCls}>{loading?'Sending OTP...':'Get OTP Security Code'}</button>
                    </form>
                  )}
                </div>
              )}

              {activeTab==='register' && (
                <form onSubmit={handleRegister} className="space-y-1 max-h-[58vh] overflow-y-auto pr-1">
                  <h3 className="text-xl font-extrabold text-gray-800 mb-1">Register Account</h3>
                  <label className={labelCls}>Full Name</label>
                  <div className={fieldCls}><div className="pl-4 text-gray-400"><User size={16}/></div>
                    <input type="text" value={regName} onChange={e=>setRegName(e.target.value)} placeholder="Dr. Ramesh Kumar" className={inputCls} required/>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={labelCls}>Email</label>
                      <div className={fieldCls}><div className="pl-4 text-gray-400"><Mail size={16}/></div>
                        <input type="email" value={regEmail} onChange={e=>setRegEmail(e.target.value)} placeholder="name@example.com" className={inputCls} required/>
                      </div>
                    </div>
                    <div><label className={labelCls}>Password</label>
                      <div className={fieldCls}><div className="pl-4 text-gray-400"><Lock size={16}/></div>
                        <input type="password" value={regPassword} onChange={e=>setRegPassword(e.target.value)} placeholder="Min 6 chars" className={inputCls} minLength={6} required/>
                      </div>
                    </div>
                  </div>
                  <label className={labelCls}>Mobile</label>
                  <div className={fieldCls}>
                    <div className="flex items-center gap-1 pl-4 pr-3 py-3.5 bg-gray-50 border-r border-gray-200 text-gray-600 font-bold text-sm select-none">🇮🇳 +91</div>
                    <input type="tel" value={regPhone} onChange={e=>setRegPhone(e.target.value.replace(/\D/g,''))} placeholder="99999 99999" maxLength={10} className={inputCls} required/>
                  </div>
                  <label className={labelCls}>Role</label>
                  <div className="grid grid-cols-1 gap-2 mt-1">
                    {roles.map(r=>{const Icon=r.icon;const sel=regRole===r.id;return(
                      <div key={r.id} onClick={()=>{setRegRole(r.id);setRegHospital('');setRegVillage('');}}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${sel?'border-[#1B6CA8] bg-blue-50/20':'border-gray-100 hover:border-gray-200'}`}>
                        <div className={`p-2 rounded-lg shrink-0 ${sel?'bg-[#1B6CA8] text-white':'bg-gray-100 text-gray-400'}`}><Icon size={16}/></div>
                        <div><p className={`text-xs font-extrabold ${sel?'text-[#1B6CA8]':'text-gray-700'}`}>{r.name}</p>
                          <p className="text-[10px] text-gray-400 leading-normal">{r.desc}</p>
                        </div>
                      </div>
                    );})}
                  </div>
                  {regRole==='doctor' && (<><label className={labelCls}>Hospital</label>
                    <div className={fieldCls}><select value={regHospital} onChange={e=>setRegHospital(e.target.value)} className="w-full p-3 bg-transparent outline-none text-sm text-gray-700" required>
                      <option value="">-- Choose Hospital --</option>
                      {hospitals.map((h:any)=><option key={h.id} value={h.name}>{h.name}</option>)}
                    </select></div></>
                  )}
                  {regRole==='asha' && (<><label className={labelCls}>Village</label>
                    <div className={fieldCls}><select value={regVillage} onChange={e=>setRegVillage(e.target.value)} className="w-full p-3 bg-transparent outline-none text-sm text-gray-700" required>
                      <option value="">-- Choose Village --</option>
                      {villages.map((v:any)=><option key={v.id} value={v.name}>{v.name}</option>)}
                    </select></div></>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={labelCls}>District</label>
                      <div className={fieldCls}><div className="pl-4 text-gray-400"><MapPin size={16}/></div>
                        <input type="text" value={regDistrict} onChange={e=>setRegDistrict(e.target.value)} className={inputCls} required/>
                      </div>
                    </div>
                    <div><label className={labelCls}>Language</label>
                      <div className={fieldCls}><div className="pl-4 text-gray-400"><Languages size={16}/></div>
                        <select value={regLanguage} onChange={e=>setRegLanguage(e.target.value)} className="w-full p-3 bg-transparent outline-none text-sm text-gray-700">
                          <option value="en">English</option>
                          <option value="ta">Tamil</option>
                          <option value="hi">Hindi</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className={btnCls}>{loading?'Creating Account...':'Complete Signup'}</button>
                </form>
              )}
            </div>
          )}

          {/* STEP 2 — OTP Verify */}
          {step===2 && (
            <form onSubmit={handleVerifyOTP} className="space-y-5">
              <button type="button" onClick={()=>{setStep(1);setError('');}} className="flex items-center gap-1 text-xs font-bold text-[#1B6CA8] hover:underline mb-2"><ChevronLeft size={14}/>Back</button>
              <h3 className="text-xl font-extrabold text-gray-800">Verify OTP</h3>
              <p className="text-sm text-gray-500">Sent to +91 {phone}</p>
              <div className="flex justify-between gap-2 max-w-sm" onPaste={handleOtpPaste}>
                {otpArray.map((d,i)=>(
                  <input key={i} id={`otp-${i}`} type="text" inputMode="numeric" maxLength={1} value={d}
                    onChange={e=>handleOtpChange(e.target.value,i)} onKeyDown={e=>handleOtpKeyDown(e,i)}
                    className="w-12 h-14 border-2 border-gray-200 rounded-xl focus:border-[#1B6CA8] outline-none text-center text-xl font-extrabold text-gray-800 transition-all"
                    autoFocus={i===0} disabled={loading}/>
                ))}
              </div>
              <button type="submit" disabled={loading||otpArray.join('').length<6} className={btnCls}>{loading?'Verifying...':'Verify & Log In'}</button>
              <div className="text-sm text-center mt-2">
                {countdown>0 ? <span className="text-gray-400 flex items-center justify-center gap-1"><RefreshCw size={13} className="animate-spin"/>Resend in {countdown}s</span>
                  : <button type="button" onClick={handleResendOTP} disabled={!canResend||loading} className="text-[#1B6CA8] font-bold hover:underline">Resend OTP</button>}
              </div>
            </form>
          )}

          {/* STEP 3 — Forgot Password */}
          {step===3 && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <button type="button" onClick={()=>{setStep(1);setError('');}} className="flex items-center gap-1 text-xs font-bold text-[#1B6CA8] hover:underline"><ChevronLeft size={14}/>Back to Login</button>
              <h3 className="text-xl font-extrabold text-gray-800">Reset Password</h3>
              <p className="text-sm text-gray-500">Enter your registered email to receive a 6-digit code.</p>
              <label className={labelCls}>Email Address</label>
              <div className={fieldCls}><div className="pl-4 text-gray-400"><Mail size={16}/></div>
                <input type="email" value={forgotEmail} onChange={e=>setForgotEmail(e.target.value)} placeholder="name@example.com" className={inputCls} required/>
              </div>
              <button type="submit" disabled={loading} className={btnCls}>{loading?'Sending...':'Send Reset Code'}</button>
            </form>
          )}

          {/* STEP 4 — Reset with code */}
          {step===4 && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <button type="button" onClick={()=>{setStep(3);setError('');}} className="flex items-center gap-1 text-xs font-bold text-[#1B6CA8] hover:underline"><ChevronLeft size={14}/>Use different email</button>
              <h3 className="text-xl font-extrabold text-gray-800">Enter Reset Code</h3>
              <p className="text-sm text-gray-500">Check the message above for your code (also in Render logs).</p>
              <label className={labelCls}>6-Digit Code</label>
              <div className={fieldCls}><div className="pl-4 text-gray-400"><Key size={16}/></div>
                <input type="text" value={resetCode} onChange={e=>setResetCode(e.target.value.replace(/\D/g,''))} placeholder="123456" maxLength={6} className={`${inputCls} tracking-widest text-center text-lg font-bold`} required/>
              </div>
              <label className={labelCls}>New Password</label>
              <div className={fieldCls}><div className="pl-4 text-gray-400"><Lock size={16}/></div>
                <input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="Min 6 characters" className={inputCls} minLength={6} required/>
              </div>
              <button type="submit" disabled={loading} className={btnCls}>{loading?'Resetting...':'Reset Password'}</button>
            </form>
          )}

          {/* STEP 5 — Complete profile after OTP */}
          {step===5 && (
            <form onSubmit={handleCompleteProfile} className="space-y-3 max-h-[58vh] overflow-y-auto pr-1">
              <h3 className="text-xl font-extrabold text-gray-800">Complete Your Profile</h3>
              <p className="text-sm text-gray-500">Phone verified. Tell us who you are.</p>
              <label className={labelCls}>Full Name</label>
              <div className={fieldCls}><div className="pl-4 text-gray-400"><User size={16}/></div>
                <input type="text" value={regName} onChange={e=>setRegName(e.target.value)} placeholder="e.g. Kavitha Devi" className={inputCls} required/>
              </div>
              <label className={labelCls}>Role</label>
              <div className="grid grid-cols-1 gap-2 mt-1">
                {roles.map(r=>{const Icon=r.icon;const sel=regRole===r.id;return(
                  <div key={r.id} onClick={()=>{setRegRole(r.id);setRegHospital('');setRegVillage('');}}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${sel?'border-[#1B6CA8] bg-blue-50/20':'border-gray-100'}`}>
                    <div className={`p-2 rounded-lg shrink-0 ${sel?'bg-[#1B6CA8] text-white':'bg-gray-100 text-gray-400'}`}><Icon size={16}/></div>
                    <p className={`text-xs font-extrabold mt-2 ${sel?'text-[#1B6CA8]':'text-gray-700'}`}>{r.name}</p>
                  </div>
                );})}
              </div>
              {regRole==='doctor' && hospitals.length>0 && (<><label className={labelCls}>Hospital</label>
                <div className={fieldCls}><select value={regHospital} onChange={e=>setRegHospital(e.target.value)} className="w-full p-3 bg-transparent outline-none text-sm text-gray-700" required>
                  <option value="">-- Choose Hospital --</option>
                  {hospitals.map((h:any)=><option key={h.id} value={h.name}>{h.name}</option>)}
                </select></div></>
              )}
              {regRole==='asha' && villages.length>0 && (<><label className={labelCls}>Village</label>
                <div className={fieldCls}><select value={regVillage} onChange={e=>setRegVillage(e.target.value)} className="w-full p-3 bg-transparent outline-none text-sm text-gray-700" required>
                  <option value="">-- Choose Village --</option>
                  {villages.map((v:any)=><option key={v.id} value={v.name}>{v.name}</option>)}
                </select></div></>
              )}
              <button type="submit" disabled={loading} className={btnCls}>{loading?'Saving...':'Get Started'}</button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
