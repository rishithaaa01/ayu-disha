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
  const [loading, setLoading] = useState(false);
  const [metaLoading, setMetaLoading] = useState(true);

  // Sign In States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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

  const handleSuccessfulLogin = async (user: any, token: string) => {
    await loginState(user, token);
    router.replace('/');
  };

  const handleCredentialsLogin = async () => {
    if (!email.trim() || !password.trim()) {
      return Alert.alert("Required", "Please fill in all email and password fields.");
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/login', {
        email: email.trim().toLowerCase(),
        password: password
      });
      await handleSuccessfulLogin(res.data.user, res.data.access_token);
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.detail || "Invalid credentials. Please try again.";
      Alert.alert("Login Failed", msg);
    } finally {
      setLoading(false);
    }
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
      await handleSuccessfulLogin(res.data.user, res.data.access_token);
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
            <TouchableOpacity onPress={() => router.push('/(auth)/phone')}>
              <Text style={styles.secondaryLink}>Sign in with Phone OTP</Text>
            </TouchableOpacity>
          </View>
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
});
