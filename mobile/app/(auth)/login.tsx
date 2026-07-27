import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { Colors } from '../../constants/colors';

type Role = 'patient' | 'asha' | 'doctor';

export default function LoginScreen() {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [loginMethod, setLoginMethod] = useState<'password' | 'email-otp'>('email-otp'); // Changed default to email-otp
  const [loading, setLoading] = useState(false);
  const [metaLoading, setMetaLoading] = useState(true);
  const [otpSent, setOtpSent] = useState(false);

  // Password Login States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Email OTP States
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [countdown, setCountdown] = useState(0);

  // Sign Up States
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regRole, setRegRole] = useState<Role>('patient');
  const [regHospital, setRegHospital] = useState('');
  const [regVillage, setRegVillage] = useState('');
  const [regDistrict, setRegDistrict] = useState('Chennai');

  // Metadata Lists
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [villages, setVillages] = useState<any[]>([]);

  const loginState = useAuthStore((state) => state.login);

  useEffect(() => {
    loadMetaData();
  }, []);

  // Countdown timer for OTP
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const loadMetaData = async () => {
    try {
      const [hospRes, villRes] = await Promise.all([
        api.get('/auth/hospitals'),
        api.get('/auth/villages')
      ]);
      setHospitals(hospRes.data || []);
      setVillages(villRes.data || []);
    } catch (e) {
      console.error("Failed to load metadata in mobile login", e);
    } finally {
      setMetaLoading(false);
    }
  };

  const handleSuccessfulLogin = async (user: any, token: string, refreshToken?: string) => {
    await loginState(user, token, refreshToken);
    router.replace('/');
  };

  const handleCredentialsLogin = async () => {
    if (!email.trim() || !password.trim()) {
      return Alert.alert("Required", "Please fill in all email and password fields.");
    }
    setLoading(true);
    try {
      console.log('[LOGIN] Attempting login with email:', email.trim().toLowerCase());
      console.log('[LOGIN] API URL:', Config.API_URL);
      
      const res = await api.post('/auth/login', {
        email: email.trim().toLowerCase(),
        password: password
      });
      
      console.log('[LOGIN] Success! User:', res.data.user);
      await handleSuccessfulLogin(res.data.user, res.data.access_token, res.data.refresh_token);
    } catch (err: any) {
      console.error('[LOGIN] Error:', err);
      console.error('[LOGIN] Error response:', err.response?.data);
      console.error('[LOGIN] Error status:', err.response?.status);
      
      const msg = err.response?.data?.detail || "Invalid credentials. Please try again.";
      Alert.alert("Login Failed", msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmailOTP = async () => {
    if (!otpEmail.trim() || !otpEmail.includes('@')) {
      return Alert.alert("Invalid Email", "Please enter a valid email address.");
    }
    setLoading(true);
    try {
      await api.post('/auth/send-otp', { email: otpEmail.trim().toLowerCase() });
      setOtpSent(true);
      setCountdown(60);
      Alert.alert("Success", "OTP sent to your email. Please check your inbox.");
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.detail || "Failed to send OTP. Please try again.";
      Alert.alert("OTP Error", msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmailOTP = async () => {
    if (!otpCode.trim() || otpCode.length !== 6) {
      return Alert.alert("Invalid OTP", "Please enter the 6-digit OTP code.");
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/verify-otp', {
        email: otpEmail.trim().toLowerCase(),
        otp: otpCode.trim(),
        language: 'en'
      });
      await handleSuccessfulLogin(res.data.user, res.data.access_token, res.data.refresh_token);
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.detail || "Invalid OTP. Please try again.";
      Alert.alert("Verification Failed", msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;
    await handleSendEmailOTP();
  };

  const handleRegister = async () => {
    if (!regName.trim() || !regEmail.trim() || !regPassword.trim() || !regPhone.trim()) {
      return Alert.alert("Required", "Please fill in all registration fields.");
    }
    if (regRole !== 'patient' && (regRole === 'doctor' ? !regHospital : !regVillage)) {
      return Alert.alert("Required", `Please select your assigned ${regRole === 'doctor' ? 'hospital' : 'village'}`);
    }

    setLoading(true);
    try {
      const payload: any = {
        email: regEmail.trim().toLowerCase(),
        password: regPassword,
        name: regName.trim(),
        mobile: regPhone.trim(),
        role: regRole,
        language: 'en',
        district: regDistrict,
        hospital: regRole === 'doctor' ? regHospital : null,
        village: regRole === 'asha' ? regVillage : null
      };
      const res = await api.post('/auth/register', payload);
      Alert.alert("Success", "Account created successfully!");
      await handleSuccessfulLogin(res.data.user, res.data.access_token, res.data.refresh_token);
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.detail || "Registration failed. Please try again.";
      Alert.alert("Registration Error", msg);
    } finally {
      setLoading(false);
    }
  };

  if (metaLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Initializing Workspace Setup...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.logo}>Ayu Disha</Text>
      <Text style={styles.tagline}>Clinic-OS Portal</Text>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'login' && styles.activeTab]}
          onPress={() => setActiveTab('login')}
        >
          <Text style={[styles.tabText, activeTab === 'login' && styles.activeTabText]}>Login</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'register' && styles.activeTab]}
          onPress={() => setActiveTab('register')}
        >
          <Text style={[styles.tabText, activeTab === 'register' && styles.activeTabText]}>Register</Text>
        </TouchableOpacity>
      </View>

      {/* A. LOGIN TAB */}
      {activeTab === 'login' && (
        <View style={styles.form}>
          {/* Login Method Toggle */}
          <View style={styles.methodRow}>
            <TouchableOpacity
              style={[styles.methodButton, loginMethod === 'password' && styles.activeMethod]}
              onPress={() => { setLoginMethod('password'); setOtpSent(false); }}
            >
              <Ionicons name="lock-closed" size={16} color={loginMethod === 'password' ? Colors.white : Colors.primary} />
              <Text style={[styles.methodText, loginMethod === 'password' && styles.activeMethodText]}>Password</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.methodButton, loginMethod === 'email-otp' && styles.activeMethod]}
              onPress={() => { setLoginMethod('email-otp'); setOtpSent(false); }}
            >
              <Ionicons name="mail" size={16} color={loginMethod === 'email-otp' ? Colors.white : Colors.primary} />
              <Text style={[styles.methodText, loginMethod === 'email-otp' && styles.activeMethodText]}>Email OTP</Text>
            </TouchableOpacity>
          </View>

          {/* 1. Password Login */}
          {loginMethod === 'password' && (
            <>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputBox}>
                <Ionicons name="mail-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. doctor@ayudisha.org"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!loading}
                />
              </View>

              <Text style={styles.label}>Password</Text>
              <View style={styles.inputBox}>
                <Ionicons name="lock-closed-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  editable={!loading}
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.disabledButton]}
                onPress={handleCredentialsLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.primaryButtonText}>Log In to Workspace</Text>
                )}
              </TouchableOpacity>

              <View style={styles.secondaryRow}>
                <TouchableOpacity onPress={() => router.push('/(auth)/forgot')}>
                  <Text style={styles.secondaryLink}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* 2. Email OTP Login */}
          {loginMethod === 'email-otp' && !otpSent && (
            <>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputBox}>
                <Ionicons name="mail-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  value={otpEmail}
                  onChangeText={setOtpEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!loading}
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.disabledButton]}
                onPress={handleSendEmailOTP}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.primaryButtonText}>Send OTP to Email</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* 3. OTP Verification Screen */}
          {loginMethod === 'email-otp' && otpSent && (
            <>
              <Text style={styles.label}>Enter 6-Digit OTP</Text>
              <Text style={styles.helperText}>We sent a code to {otpEmail}</Text>
              <View style={styles.inputBox}>
                <Ionicons name="key-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="000000"
                  value={otpCode}
                  onChangeText={setOtpCode}
                  keyboardType="numeric"
                  maxLength={6}
                  editable={!loading}
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.disabledButton]}
                onPress={handleVerifyEmailOTP}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.primaryButtonText}>Verify & Login</Text>
                )}
              </TouchableOpacity>

              <View style={styles.secondaryRow}>
                <TouchableOpacity onPress={() => setOtpSent(false)}>
                  <Text style={styles.secondaryLink}>← Change Email</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleResendOTP} disabled={countdown > 0}>
                  <Text style={[styles.secondaryLink, countdown > 0 && styles.disabledLink]}>
                    {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      )}

      {/* B. REGISTER TAB */}
      {activeTab === 'register' && (
        <View style={styles.form}>
          <Text style={styles.label}>Full Name</Text>
          <View style={styles.inputBox}>
            <Ionicons name="person-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g. Priya Sharma"
              value={regName}
              onChangeText={setRegName}
              editable={!loading}
            />
          </View>

          <Text style={styles.label}>Email Address</Text>
          <View style={styles.inputBox}>
            <Ionicons name="mail-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="name@example.com"
              value={regEmail}
              onChangeText={setRegEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
            />
          </View>

          <Text style={styles.label}>Password</Text>
          <View style={styles.inputBox}>
            <Ionicons name="lock-closed-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Min 6 characters"
              value={regPassword}
              onChangeText={setRegPassword}
              secureTextEntry
              autoCapitalize="none"
              editable={!loading}
            />
          </View>

          <Text style={styles.label}>Mobile Number</Text>
          <View style={styles.inputBox}>
            <Text style={styles.phonePrefix}>+91</Text>
            <TextInput
              style={styles.input}
              placeholder="99999 99999"
              value={regPhone}
              onChangeText={(text) => setRegPhone(text.replace(/\D/g, ''))}
              keyboardType="numeric"
              maxLength={10}
              editable={!loading}
            />
          </View>

          {/* Role Selection */}
          <Text style={styles.label}>Workspace Role</Text>
          <View style={styles.roleRow}>
            {(['patient', 'asha', 'doctor'] as Role[]).map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.roleCard, regRole === r && styles.activeRole]}
                onPress={() => { setRegRole(r); setRegHospital(''); setRegVillage(''); }}
              >
                <Ionicons 
                  name={r === 'patient' ? 'person' : r === 'asha' ? 'home' : 'medical'} 
                  size={20} 
                  color={regRole === r ? Colors.white : Colors.textDark} 
                />
                <Text style={[styles.roleLabel, regRole === r && { color: Colors.white }]}>
                  {r.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Conditional Hospital Selector */}
          {regRole === 'doctor' && (
            <View style={styles.section}>
              <Text style={styles.label}>Select Clinical Hospital</Text>
              {hospitals.map(h => (
                <TouchableOpacity 
                  key={h.id} 
                  style={[styles.locationItem, regHospital === h.name && styles.activeLocation]}
                  onPress={() => setRegHospital(h.name)}
                >
                  <Text style={[styles.locationText, regHospital === h.name && { color: '#fff' }]}>{h.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {regRole === 'asha' && (
            <View style={styles.section}>
              <Text style={styles.label}>Select Village Area</Text>
              {villages.map(v => (
                <TouchableOpacity 
                  key={v.id} 
                  style={[styles.locationItem, regVillage === v.name && styles.activeLocation]}
                  onPress={() => setRegVillage(v.name)}
                >
                  <Text style={[styles.locationText, regVillage === v.name && { color: '#fff' }]}>{v.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.label}>District</Text>
          <View style={styles.inputBox}>
            <Ionicons name="map-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g. Chennai"
              value={regDistrict}
              onChangeText={setRegDistrict}
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.disabledButton]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.primaryButtonText}>Complete Signup</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 24,
    paddingTop: 64,
  },
  logo: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.primary,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 32,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: 24,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textMuted,
  },
  activeTabText: {
    color: Colors.textDark,
  },
  form: {
    gap: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.textDark,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
    marginTop: 12,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    height: 48,
    marginBottom: 16,
  },
  inputIcon: {
    paddingHorizontal: 12,
  },
  phonePrefix: {
    paddingHorizontal: 12,
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textDark,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.textDark,
    paddingHorizontal: 12,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  disabledButton: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 32,
  },
  secondaryLink: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 16,
    color: Colors.textMuted,
    fontSize: 16,
    fontWeight: '600',
  },
  roleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  roleCard: {
    flex: 1,
    backgroundColor: Colors.white,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activeRole: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  roleLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 6,
    color: Colors.textDark,
  },
  section: {
    marginBottom: 16,
  },
  locationItem: {
    backgroundColor: Colors.white,
    padding: 12,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activeLocation: {
    backgroundColor: Colors.action,
    borderColor: Colors.action,
  },
  locationText: {
    fontSize: 14,
    color: Colors.textDark,
  },
  methodRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
    backgroundColor: Colors.white,
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  methodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  activeMethod: {
    backgroundColor: Colors.primary,
  },
  methodText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  activeMethodText: {
    color: Colors.white,
  },
  helperText: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 12,
    marginTop: -8,
  },
  disabledLink: {
    opacity: 0.5,
  },
});
