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
        onPress={() => router.push('/(auth)/login')}
      >
        <Text style={styles.buttonText}>Get Started</Text>
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
