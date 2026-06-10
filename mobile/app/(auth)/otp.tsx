import { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Colors } from '../../constants/colors';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { getConfirmationResult, isFirebaseAvailable } from '../../services/firebaseAuth';

export default function OTPScreen() {
  const { phone, useFirebase } = useLocalSearchParams();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const login = useAuthStore(state => state.login);

  useEffect(() => {
    let timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleVerify = async () => {
    if (!otp || otp.length < 6) {
      Alert.alert("Error", "Please enter a valid 6-digit OTP");
      return;
    }

    setLoading(true);
    try {
      let payload: any = { language: 'en' };

      if (useFirebase === 'true' && isFirebaseAvailable) {
        console.log('Verifying OTP via Firebase confirmation session...');
        const confirmation = getConfirmationResult();
        if (!confirmation) {
          throw new Error("Firebase confirmation session not found. Please request OTP again.");
        }
        const userCredential = await confirmation.confirm(otp);
        const firebaseToken = await userCredential.user.getIdToken();
        payload.firebase_token = firebaseToken;
      } else {
        console.log('Verifying OTP via DB-backed flow...');
        payload.mobile = String(phone);
        payload.otp = otp;
      }

      const response = await api.post('/auth/verify-otp', payload);
      
      const { access_token, user, needs_registration } = response.data;
      await login(user, access_token);
      
      if (needs_registration) {
        router.replace('/(auth)/register');
      } else {
        router.replace('/');
      }
    } catch (e: any) {
      const errorMsg = e.response?.data?.detail || e.message || "Unknown Error";
      console.error("Login Error:", errorMsg);
      Alert.alert("Verification Failed", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Enter the OTP sent to {phone}</Text>
      
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        maxLength={6}
        value={otp}
        onChangeText={setOtp}
        placeholder="000000"
        textAlign="center"
      />

      <TouchableOpacity 
        style={[styles.button, otp.length < 6 && styles.buttonDisabled]}
        onPress={handleVerify}
        disabled={otp.length < 6 || loading}
      >
        {loading ? (
           <ActivityIndicator color={Colors.white} />
        ) : (
           <Text style={styles.buttonText}>Verify</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.timerText}>
        {countdown > 0 ? `Resend OTP in ${countdown}s` : <Text style={styles.resendText}>Resend OTP</Text>}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 24,
    justifyContent: 'center',
  },
  heading: {
    fontSize: 20,
    color: Colors.textDark,
    marginBottom: 32,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    backgroundColor: Colors.white,
    height: 64,
    fontSize: 32,
    letterSpacing: 8,
    marginBottom: 32,
  },
  button: {
    backgroundColor: Colors.primary,
    padding: 18,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: Colors.textMuted,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  timerText: {
    marginTop: 24,
    textAlign: 'center',
    color: Colors.textMuted,
  },
  resendText: {
    color: Colors.action,
    fontWeight: 'bold'
  }
});
