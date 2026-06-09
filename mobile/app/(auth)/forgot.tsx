import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { Colors } from '../../constants/colors';

export default function ForgotPasswordScreen() {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestCode = async () => {
    if (!email.trim()) {
      return Alert.alert("Required", "Please enter your email address.");
    }
    
    setLoading(true);
    try {
      const response = await api.post('/auth/forgot-password', {
        email: email.trim().toLowerCase()
      });
      Alert.alert("Code Sent", "If this email is registered, a 6-digit reset code has been sent. Check your server console log!");
      setStep(2);
    } catch (e: any) {
      console.error(e);
      const msg = e.response?.data?.detail || "Failed to send reset code. Please try again.";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!code.trim() || !newPassword.trim()) {
      return Alert.alert("Required", "Please enter the verification code and your new password.");
    }
    if (newPassword.length < 6) {
      return Alert.alert("Weak Password", "Password must be at least 6 characters long.");
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        email: email.trim().toLowerCase(),
        code: code.trim(),
        new_password: newPassword
      });
      Alert.alert("Success", "Password has been reset successfully. Please log in with your new password.", [
        { text: "OK", onPress: () => router.replace('/(auth)/login') }
      ]);
    } catch (e: any) {
      console.error(e);
      const msg = e.response?.data?.detail || "Failed to reset password. Please check the code and try again.";
      Alert.alert("Reset Failed", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.logo}>Ayu Disha</Text>
      <Text style={styles.tagline}>Reset Password</Text>

      {step === 1 ? (
        <View style={styles.form}>
          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={styles.description}>
            Enter the email address associated with your account, and we'll send you a 6-digit verification code to reset your password.
          </Text>

          <Text style={styles.label}>Email Address</Text>
          <View style={styles.inputBox}>
            <Ionicons name="mail-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="name@example.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.disabledButton]}
            onPress={handleRequestCode}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.primaryButtonText}>Send Reset Code</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.replace('/(auth)/login')}
            disabled={loading}
          >
            <Ionicons name="arrow-back-outline" size={18} color={Colors.primary} />
            <Text style={styles.backButtonText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.form}>
          <Text style={styles.title}>Enter Verification Code</Text>
          <Text style={styles.description}>
            We've sent a 6-digit code to <Text style={styles.emailHighlight}>{email}</Text>. Check your server console output to retrieve it.
          </Text>

          <Text style={styles.label}>Verification Code</Text>
          <View style={styles.inputBox}>
            <Ionicons name="keypad-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g. 123456"
              value={code}
              onChangeText={setCode}
              keyboardType="numeric"
              maxLength={6}
              editable={!loading}
            />
          </View>

          <Text style={styles.label}>New Password</Text>
          <View style={styles.inputBox}>
            <Ionicons name="lock-closed-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Min 6 characters"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              autoCapitalize="none"
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.disabledButton]}
            onPress={handleResetPassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.primaryButtonText}>Reset Password</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => setStep(1)}
            disabled={loading}
          >
            <Ionicons name="arrow-back-outline" size={18} color={Colors.primary} />
            <Text style={styles.backButtonText}>Use Different Email</Text>
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
    paddingTop: 80,
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
    marginBottom: 40,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  form: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: Colors.textDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.textDark,
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: Colors.textMuted,
    lineHeight: 20,
    marginBottom: 24,
  },
  emailHighlight: {
    fontWeight: 'bold',
    color: Colors.textDark,
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
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    padding: 8,
    gap: 8,
  },
  backButtonText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: 'bold',
  },
});
