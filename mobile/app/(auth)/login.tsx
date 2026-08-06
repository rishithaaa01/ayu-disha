import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/store/authStore';
import api from '../../src/services/api';
import { useRouter } from 'expo-router';
import { Mail, Lock, User as UserIcon, Phone, MapPin, Key } from 'lucide-react-native';

const SPECIALITIES = [
  'General Medicine', 'Gynaecology', 'Obstetrics', 'Paediatrics',
  'Orthopaedics', 'Cardiology', 'Gastroenterology', 'Dermatology',
  'Ophthalmology', 'ENT', 'Neurology', 'Psychiatry', 'Oncology'
];

export default function LoginScreen() {
  const router = useRouter();
  const loginState = useAuthStore((state) => state.login);
  
  // Onboarding UI State Control
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [loginMethod, setLoginMethod] = useState<'password' | 'email-otp'>('password');
  const [step, setStep] = useState(1); // 1: main, 2: OTP, 3: Forgot Password, 4: Reset Password
  const [loading, setLoading] = useState(false);

  // Password Credentials State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Passwordless / OTP State
  const [phone, setPhone] = useState('');
  const [emailOTP, setEmailOTP] = useState('');
  const [otpArray, setOtpArray] = useState(['', '', '', '', '', '']);
  const otpInputs = useRef<Array<TextInput | null>>([]);
  
  // Register state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regRole, setRegRole] = useState('patient');
  const [regHospital, setRegHospital] = useState('');
  const [regVillage, setRegVillage] = useState('');
  const [regSpeciality, setRegSpeciality] = useState('');

  // Forgot / Reset Password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Metadata
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [villages, setVillages] = useState<any[]>([]);

  useEffect(() => {
    fetchMetadata();
  }, []);

  const fetchMetadata = async () => {
    try {
      const [hospRes, villRes] = await Promise.all([
        api.get('/auth/hospitals'),
        api.get('/auth/villages')
      ]);
      setHospitals(hospRes.data || []);
      setVillages(villRes.data || []);
    } catch (e) {
      console.log("Failed to load metadata");
    }
  };

  const handleSuccessfulLogin = (user: any, token: string, refreshToken: string) => {
    loginState(user, token, refreshToken);
    // AuthGuard in _layout will automatically redirect based on role
  };

  const handleCredentialsLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      handleSuccessfulLogin(res.data.user, res.data.access_token, res.data.refresh_token);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!regName || !regEmail || !regPassword || !regPhone) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }
    if ((regRole === 'doctor' || regRole === 'lab') && !regHospital) {
      Alert.alert('Error', 'Please select your hospital');
      return;
    }
    if (regRole === 'doctor' && !regSpeciality) {
      Alert.alert('Error', 'Please select your medical speciality');
      return;
    }
    if (regRole === 'asha' && !regVillage) {
      Alert.alert('Error', 'Please select your assigned village');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        email: regEmail.trim(),
        password: regPassword,
        name: regName.trim(),
        mobile: regPhone.trim(),
        role: regRole,
        language: 'en',
        district: 'Chennai',
        hospital: (regRole === 'doctor' || regRole === 'lab') ? regHospital : null,
        village: regRole === 'asha' ? regVillage : null,
        speciality: regRole === 'doctor' ? regSpeciality : null
      };
      const res = await api.post('/auth/register', payload);
      handleSuccessfulLogin(res.data.user, res.data.access_token, res.data.refresh_token);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const triggerSendOTP = async (identifier: string, isEmail = false) => {
    setLoading(true);
    try {
      const payload = isEmail ? { email: identifier } : { mobile: identifier };
      const res = await api.post('/auth/send-otp', payload);
      Alert.alert('OTP Sent', res.data.message || 'OTP sent successfully!');
      setStep(2);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async () => {
    if (loginMethod === 'email-otp') {
      if (!emailOTP) return Alert.alert('Error', 'Enter a valid email address');
      await triggerSendOTP(emailOTP, true);
    } else {
      if (!phone) return Alert.alert('Error', 'Enter a valid mobile number');
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
      await triggerSendOTP(formattedPhone, false);
    }
  };

  const handleVerifyOTP = async () => {
    const otpString = otpArray.join('');
    if (otpString.length < 6) return Alert.alert('Error', 'Enter a valid 6-digit OTP');
    setLoading(true);
    try {
      let payload;
      if (loginMethod === 'email-otp') {
        payload = { email: emailOTP, otp: otpString, language: 'en' };
      } else {
        const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
        payload = { mobile: formattedPhone, otp: otpString, language: 'en' };
      }
      
      const res = await api.post('/auth/verify-otp', payload);
      api.defaults.headers.common['Authorization'] = `Bearer ${res.data.access_token}`;

      if (res.data.needs_registration) {
        // Not supporting full phone registration flow in UI for brevity - just error out
        Alert.alert('Error', 'Phone verification successful, but profile completion requires the web app.');
      } else {
        handleSuccessfulLogin(res.data.user, res.data.access_token, res.data.refresh_token);
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail) return Alert.alert('Error', 'Please enter your email.');
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email: forgotEmail.trim() });
      let message = res.data.message || 'Reset code sent successfully!';
      if (res.data.reset_code) message += ` Code: ${res.data.reset_code}`;
      Alert.alert('Success', message);
      setStep(4);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to submit password reset request.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetCode || !newPassword) return Alert.alert('Error', 'All fields are required.');
    setLoading(true);
    try {
      const res = await api.post('/auth/reset-password', {
        email: forgotEmail.trim(),
        code: resetCode.trim(),
        new_password: newPassword
      });
      Alert.alert('Success', res.data.message || 'Password reset successfully!');
      setEmail(forgotEmail);
      setStep(1);
      setActiveTab('login');
      setLoginMethod('password');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otpArray];
    newOtp[index] = value;
    setOtpArray(newOtp);
    if (value && index < 5) {
      otpInputs.current[index + 1]?.focus();
    }
  };

  const roles = [
    { id: 'patient', name: 'Patient' },
    { id: 'doctor', name: 'Doctor' },
    { id: 'lab', name: 'Lab Tech' },
    { id: 'admin', name: 'Admin' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
          
          <View className="items-center mb-8">
            <View className="w-16 h-16 bg-[#1B6CA8] rounded-2xl items-center justify-center mb-4 shadow-lg">
              <Text className="text-white text-3xl font-bold">AD</Text>
            </View>
            <Text className="text-3xl font-bold text-slate-800 tracking-tight">Ayu Disha</Text>
            <Text className="text-slate-500 mt-2 text-center text-base">Rural Healthcare Clinic-OS</Text>
          </View>

          <View className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100">
            {step === 1 && (
              <>
                <View className="flex-row mb-6 border-b border-slate-100">
                  <TouchableOpacity 
                    className={`flex-1 pb-4 items-center ${activeTab === 'login' ? 'border-b-2 border-[#1B6CA8]' : ''}`}
                    onPress={() => setActiveTab('login')}
                  >
                    <Text className={`font-semibold ${activeTab === 'login' ? 'text-[#1B6CA8]' : 'text-slate-400'}`}>Sign In</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    className={`flex-1 pb-4 items-center ${activeTab === 'register' ? 'border-b-2 border-[#1B6CA8]' : ''}`}
                    onPress={() => setActiveTab('register')}
                  >
                    <Text className={`font-semibold ${activeTab === 'register' ? 'text-[#1B6CA8]' : 'text-slate-400'}`}>Register</Text>
                  </TouchableOpacity>
                </View>

                {activeTab === 'login' ? (
                  <View className="space-y-4">
                    <View className="flex-row gap-2 mb-2">
                      <TouchableOpacity 
                        onPress={() => setLoginMethod('password')}
                        className={`px-3 py-1.5 rounded-lg ${loginMethod === 'password' ? 'bg-[#1B6CA8]' : 'bg-blue-50'}`}
                      >
                        <Text className={`text-xs font-bold ${loginMethod === 'password' ? 'text-white' : 'text-[#1B6CA8]'}`}>Password</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={() => setLoginMethod('email-otp')}
                        className={`px-3 py-1.5 rounded-lg ${loginMethod === 'email-otp' ? 'bg-[#1B6CA8]' : 'bg-blue-50'}`}
                      >
                        <Text className={`text-xs font-bold ${loginMethod === 'email-otp' ? 'text-white' : 'text-[#1B6CA8]'}`}>Email OTP</Text>
                      </TouchableOpacity>
                    </View>

                    {loginMethod === 'password' ? (
                      <>
                        <View className="bg-slate-50 border border-slate-200 rounded-xl flex-row items-center px-4 h-14">
                          <Mail color="#94a3b8" size={20} />
                          <TextInput
                            className="flex-1 ml-3 text-slate-800 text-base"
                            placeholder="Email Address"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                          />
                        </View>
                        <View className="bg-slate-50 border border-slate-200 rounded-xl flex-row items-center px-4 h-14">
                          <Lock color="#94a3b8" size={20} />
                          <TextInput
                            className="flex-1 ml-3 text-slate-800 text-base"
                            placeholder="Password"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                          />
                        </View>
                        <TouchableOpacity onPress={() => setStep(3)} className="self-end mt-2">
                          <Text className="text-xs text-[#1B6CA8] font-bold">Forgot Password?</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          className="bg-[#1B6CA8] h-14 rounded-xl items-center justify-center mt-4"
                          onPress={handleCredentialsLogin}
                          disabled={loading}
                        >
                          {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-base">Sign In</Text>}
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        <View className="bg-slate-50 border border-slate-200 rounded-xl flex-row items-center px-4 h-14">
                          <Mail color="#94a3b8" size={20} />
                          <TextInput
                            className="flex-1 ml-3 text-slate-800 text-base"
                            placeholder="Email Address"
                            value={emailOTP}
                            onChangeText={setEmailOTP}
                            autoCapitalize="none"
                          />
                        </View>
                        <TouchableOpacity 
                          className="bg-[#1B6CA8] h-14 rounded-xl items-center justify-center mt-4"
                          onPress={handleSendOTP}
                          disabled={loading}
                        >
                          {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-base">Send OTP</Text>}
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                ) : (
                  <View className="space-y-4">
                    <View className="bg-slate-50 border border-slate-200 rounded-xl flex-row items-center px-4 h-12">
                      <UserIcon color="#94a3b8" size={18} />
                      <TextInput
                        className="flex-1 ml-3 text-slate-800 text-sm"
                        placeholder="Full Name"
                        value={regName}
                        onChangeText={setRegName}
                      />
                    </View>
                    <View className="bg-slate-50 border border-slate-200 rounded-xl flex-row items-center px-4 h-12">
                      <Mail color="#94a3b8" size={18} />
                      <TextInput
                        className="flex-1 ml-3 text-slate-800 text-sm"
                        placeholder="Email Address"
                        value={regEmail}
                        onChangeText={setRegEmail}
                        autoCapitalize="none"
                      />
                    </View>
                    <View className="bg-slate-50 border border-slate-200 rounded-xl flex-row items-center px-4 h-12">
                      <Lock color="#94a3b8" size={18} />
                      <TextInput
                        className="flex-1 ml-3 text-slate-800 text-sm"
                        placeholder="Password"
                        value={regPassword}
                        onChangeText={setRegPassword}
                        secureTextEntry
                      />
                    </View>
                    <View className="bg-slate-50 border border-slate-200 rounded-xl flex-row items-center px-4 h-12">
                      <Text className="text-slate-500 font-semibold mr-2">+91</Text>
                      <TextInput
                        className="flex-1 text-slate-800 text-sm"
                        placeholder="Mobile Number"
                        value={regPhone}
                        onChangeText={setRegPhone}
                        keyboardType="phone-pad"
                      />
                    </View>

                    <Text className="text-slate-500 text-xs font-bold mt-2">Select Role</Text>
                    <View className="flex-row flex-wrap gap-2">
                      {roles.map((r) => (
                        <TouchableOpacity
                          key={r.id}
                          onPress={() => setRegRole(r.id)}
                          className={`px-3 py-1.5 rounded-full border ${regRole === r.id ? 'bg-blue-50 border-[#1B6CA8]' : 'bg-white border-slate-200'}`}
                        >
                          <Text className={`text-xs ${regRole === r.id ? 'text-[#1B6CA8] font-bold' : 'text-slate-600'}`}>{r.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Role Specific Fields */}
                    {(regRole === 'doctor' || regRole === 'lab') && (
                      <View className="mt-2 space-y-2">
                        <Text className="text-slate-500 text-xs font-bold">Select Hospital</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                          {hospitals.map((h, i) => (
                            <TouchableOpacity key={i} onPress={() => setRegHospital(h.name)} className={`mr-2 px-3 py-2 rounded-lg border ${regHospital === h.name ? 'bg-blue-50 border-[#1B6CA8]' : 'bg-white border-slate-200'}`}>
                              <Text className={`text-xs ${regHospital === h.name ? 'text-[#1B6CA8] font-bold' : 'text-slate-600'}`}>{h.name}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}

                    {regRole === 'doctor' && (
                      <View className="mt-2 space-y-2">
                        <Text className="text-slate-500 text-xs font-bold">Select Speciality</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                          {SPECIALITIES.map((s, i) => (
                            <TouchableOpacity key={i} onPress={() => setRegSpeciality(s)} className={`mr-2 px-3 py-2 rounded-lg border ${regSpeciality === s ? 'bg-blue-50 border-[#1B6CA8]' : 'bg-white border-slate-200'}`}>
                              <Text className={`text-xs ${regSpeciality === s ? 'text-[#1B6CA8] font-bold' : 'text-slate-600'}`}>{s}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}

                    <TouchableOpacity 
                      className="bg-[#1B6CA8] h-12 rounded-xl items-center justify-center mt-4"
                      onPress={handleRegister}
                      disabled={loading}
                    >
                      {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-sm">Register</Text>}
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}

            {step === 2 && (
              <View className="space-y-6">
                <Text className="text-2xl font-bold text-slate-800 text-center">Enter OTP</Text>
                <Text className="text-slate-500 text-center">We sent a verification code to {loginMethod === 'email-otp' ? emailOTP : phone}</Text>
                
                <View className="flex-row justify-between px-2 mt-4">
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <TextInput
                      key={index}
                      ref={(ref) => { otpInputs.current[index] = ref; }}
                      className="w-12 h-14 bg-slate-50 border border-slate-200 rounded-xl text-center text-xl font-bold text-slate-800"
                      maxLength={1}
                      keyboardType="number-pad"
                      value={otpArray[index]}
                      onChangeText={(v) => handleOtpChange(v, index)}
                    />
                  ))}
                </View>

                <TouchableOpacity 
                  className="bg-[#1B6CA8] h-14 rounded-xl items-center justify-center mt-6"
                  onPress={handleVerifyOTP}
                  disabled={loading}
                >
                  {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-base">Verify OTP</Text>}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setStep(1)} className="mt-4">
                  <Text className="text-slate-500 text-center font-semibold">Cancel</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 3 && (
              <View className="space-y-4">
                <Text className="text-xl font-bold text-slate-800 mb-2">Reset Password</Text>
                <View className="bg-slate-50 border border-slate-200 rounded-xl flex-row items-center px-4 h-14">
                  <Mail color="#94a3b8" size={20} />
                  <TextInput
                    className="flex-1 ml-3 text-slate-800 text-base"
                    placeholder="Enter your email"
                    value={forgotEmail}
                    onChangeText={setForgotEmail}
                    autoCapitalize="none"
                  />
                </View>
                <TouchableOpacity 
                  className="bg-[#1B6CA8] h-14 rounded-xl items-center justify-center mt-2"
                  onPress={handleForgotPassword}
                  disabled={loading}
                >
                  {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-base">Send Reset Code</Text>}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setStep(1)} className="mt-2">
                  <Text className="text-slate-500 text-center font-semibold">Back to Login</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 4 && (
              <View className="space-y-4">
                <Text className="text-xl font-bold text-slate-800 mb-2">Create New Password</Text>
                <View className="bg-slate-50 border border-slate-200 rounded-xl flex-row items-center px-4 h-14">
                  <Key color="#94a3b8" size={20} />
                  <TextInput
                    className="flex-1 ml-3 text-slate-800 text-base"
                    placeholder="6-Digit Reset Code"
                    value={resetCode}
                    onChangeText={setResetCode}
                  />
                </View>
                <View className="bg-slate-50 border border-slate-200 rounded-xl flex-row items-center px-4 h-14">
                  <Lock color="#94a3b8" size={20} />
                  <TextInput
                    className="flex-1 ml-3 text-slate-800 text-base"
                    placeholder="New Password"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry
                  />
                </View>
                <TouchableOpacity 
                  className="bg-[#1B6CA8] h-14 rounded-xl items-center justify-center mt-2"
                  onPress={handleResetPassword}
                  disabled={loading}
                >
                  {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-base">Reset Password</Text>}
                </TouchableOpacity>
              </View>
            )}

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
