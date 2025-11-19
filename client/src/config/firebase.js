// Firebase configuration
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

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
let app, auth, db;

try {
  if (isFirebaseConfigured) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } else {
    // Provide null auth and db for demo mode
    auth = null;
    db = null;
  }
} catch (error) {
  console.error('Firebase initialization error:', error);
  auth = null;
  db = null;
}

export { auth, db };
export default app;