// Firebase configuration
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Your web app's Firebase config
// TODO: Replace with your actual Firebase config from Firebase Console
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "your-project-id.firebaseapp.com", 
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789",
  appId: "YOUR_ACTUAL_APP_ID"
};

// INSTRUCTIONS:
// 1. Go to https://console.firebase.google.com/
// 2. Create a new project or select existing
// 3. Go to Project Settings > Your apps > Web app 
// 4. Copy the config and replace the values above
// 5. Make sure to enable Authentication > Email/Password in Firebase Console

// Check if Firebase is properly configured
const isFirebaseConfigured = firebaseConfig.apiKey !== "YOUR_ACTUAL_API_KEY" && 
                             firebaseConfig.apiKey !== "your-api-key-here";

if (!isFirebaseConfigured) {
  console.warn('⚠️ Firebase not configured yet! Follow FIREBASE_SETUP.md to set up authentication.');
  console.warn('🔧 Using demo mode until Firebase is configured...');
}

// Initialize Firebase
let app, auth;

try {
  if (isFirebaseConfigured) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
  } else {
    // Provide null auth for demo mode
    auth = null;
  }
} catch (error) {
  console.error('Firebase initialization error:', error);
  auth = null;
}

export { auth };
export default app;