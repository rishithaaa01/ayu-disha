import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../../constants/colors';

export default function PhoneScreen() {
  const [phone, setPhone] = useState('');
  
  const handleSendOTP = () => {
    // Note: Actual Firebase integration happens here.
    // For Phase 1 we pass phone to OTP screen for mock verification
    const cleanPhone = phone.replace(/ /g, '');
    router.push(`/(auth)/otp?phone=%2B91${cleanPhone}`);
  };

  const isValidLength = phone.length === 10;

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Enter your mobile number</Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.prefix}>+91</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          maxLength={10}
          value={phone}
          onChangeText={setPhone}
          placeholder="0000000000"
        />
      </View>

      <TouchableOpacity 
        style={[styles.button, !isValidLength && styles.buttonDisabled]}
        onPress={handleSendOTP}
        disabled={!isValidLength}
      >
        <Text style={styles.buttonText}>Send OTP</Text>
      </TouchableOpacity>
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
    fontSize: 24,
    color: Colors.textDark,
    fontWeight: '600',
    marginBottom: 32,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    backgroundColor: Colors.white,
    height: 52,
    marginBottom: 32,
  },
  prefix: {
    paddingHorizontal: 16,
    fontSize: 18,
    color: Colors.textDark,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },
  input: {
    flex: 1,
    fontSize: 18,
    paddingHorizontal: 16,
    color: Colors.textDark,
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
  }
});
