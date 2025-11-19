// Firebase configuration
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Your web app's Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBYG7mANiuKWSHvZKOTuR-Jjgx0ZwTgcvE",
  authDomain: "fhapp-ca321.firebaseapp.com",
  projectId: "fhapp-ca321",
  storageBucket: "fhapp-ca321.firebasestorage.app",
  messagingSenderId: "321828975722",
  appId: "1:321828975722:web:b1c8e8ab6462f74eb8c613",
  measurementId: "G-C13GEDVMBF"
};

// Firebase is now properly configured
const isFirebaseConfigured = true;

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