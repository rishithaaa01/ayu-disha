import { Platform } from 'react-native';

let firebaseAuth: any = null;
let isFirebaseAvailable = false;
let confirmationResult: any = null;

try {
  // Try loading React Native Firebase Auth native module
  // Using require() prevents immediate import crashes if native modules aren't linked/present
  const authModule = require('@react-native-firebase/auth');
  firebaseAuth = authModule.default || authModule;
  isFirebaseAvailable = true;
  console.log("🔥 React Native Firebase Auth module loaded successfully.");
} catch (e) {
  console.log("ℹ️ React Native Firebase Auth native module not loaded/available. Falling back to DB-backed OTP.");
}

export const setConfirmationResult = (result: any) => {
  confirmationResult = result;
};

export const getConfirmationResult = () => {
  return confirmationResult;
};

export { firebaseAuth, isFirebaseAvailable };
