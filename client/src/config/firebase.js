// Firebase configuration
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

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
let app, auth, db, storage;

try {
  if (isFirebaseConfigured) {
    console.log('🔥 Initializing Firebase with config:', {
      projectId: firebaseConfig.projectId,
      authDomain: firebaseConfig.authDomain
    });
    
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    
    console.log('✅ Firebase initialized successfully', {
      app: !!app,
      auth: !!auth,
      db: !!db,
      storage: !!storage
    });
  } else {
    console.warn('⚠️ Firebase not configured - using demo mode');
    // Provide null services for demo mode
    auth = null;
    db = null;
    storage = null;
  }
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
  console.error('Error details:', {
    message: error.message,
    code: error.code,
    stack: error.stack
  });
  auth = null;
  db = null;
  storage = null;
}

export { auth, db, storage };
export default app;