import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
let firebaseApp;

if (!admin.apps.length) {
  // Try to initialize with service account or default credentials
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      // Initialize with service account key (JSON string)
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID || "fhapp-ca321"
      });
    } else {
      // Initialize with minimal config for demo/dev purposes
      firebaseApp = admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || "fhapp-ca321"
      });
    }
    console.log('✅ Firebase Admin initialized');
  } catch (error) {
    console.error('❌ Firebase Admin initialization error:', error.message);
    console.log('⚠️ Server will continue without Firebase Admin features');
  }
} else {
  firebaseApp = admin.app();
  console.log('✅ Using existing Firebase Admin instance');
}

// Export auth instance
const auth = admin.auth();

export { firebaseApp, auth };
export default auth;
