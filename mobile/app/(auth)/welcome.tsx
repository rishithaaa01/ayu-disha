import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../../constants/colors';
import axios from 'axios';
import { useAuthStore } from '../../store/authStore';
import { Config } from '../../constants/Config';

export default function WelcomeScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.logo}>Ayu Disha</Text>
        <Text style={styles.tagline}>Your Health. Your Record. Everywhere.</Text>
      </View>
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push('/(auth)/phone')}
      >
        <Text style={styles.buttonText}>Get Started</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#F57F17' }]}
        onPress={async () => {
          Alert.alert("Connecting", "Attempting auto-login...");
          try {
            const res = await axios.post(`${Config.API_URL}/auth/verify-otp`, {
              firebase_token: "MOCK_9999999999",
              name: "Priya Sharma",
              role: "patient",
              language: "en"
            });
            console.log("Response:", res.data);

            await useAuthStore.getState().login(res.data.user, res.data.access_token);
            router.push('/(patient)/home');
          } catch (e: any) {
            console.error("Login bypass error:", e);
            Alert.alert(
              "Login Failed",
              `Error: ${e.message}\nCheck if your backend is running at ${Config.API_URL}`
            );
          }
        }}
      >
        <Text style={styles.buttonText}>[DEV] Auto-Login as Patient</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#1B6CA8' }]}
        onPress={async () => {
          Alert.alert("Connecting", "Attempting ASHA auto-login...");
          try {
            const res = await axios.post(`${Config.API_URL}/auth/verify-otp`, {
              firebase_token: "MOCK_9876543210",
              name: "Kavitha Devi",
              role: "asha",
              language: "en"
            });
            await useAuthStore.getState().login(res.data.user, res.data.access_token);
            router.push('/(asha)/village');
          } catch (e: any) {
            console.error("Login bypass error:", e);
            Alert.alert("Login Failed", `Error: ${e.message}`);
          }
        }}
      >
        <Text style={styles.buttonText}>[DEV] Auto-Login as ASHA Worker</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#D35400' }]}
        onPress={async () => {
          Alert.alert("Connecting", "Attempting Doctor auto-login...");
          try {
            const res = await axios.post(`${Config.API_URL}/auth/verify-otp`, {
              firebase_token: "MOCK_9876543211",
              name: "Dr. Ramesh Kumar",
              role: "doctor",
              language: "en"
            });
            await useAuthStore.getState().login(res.data.user, res.data.access_token);
            // Redirection to /(doctor)/home happens automatically via root index
            router.push('/');
          } catch (e: any) {
            console.error("Login bypass error:", e);
            Alert.alert("Login Failed", `Error: ${e.message}`);
          }
        }}
      >
        <Text style={styles.buttonText}>[DEV] Auto-Login as Doctor</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'space-between',
    padding: 24,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    fontSize: 42,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 16,
  },
  tagline: {
    fontSize: 18,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  button: {
    backgroundColor: Colors.primary,
    padding: 18,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 32,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  }
});
