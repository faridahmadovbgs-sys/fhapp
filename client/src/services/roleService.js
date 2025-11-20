import { doc, getDoc, setDoc, getFirestore } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';

// Initialize Firebase directly in this service
const firebaseConfig = {
  apiKey: "AIzaSyBYG7mANiuKWSHvZKOTuR-Jjgx0ZwTgcvE",
  authDomain: "fhapp-ca321.firebaseapp.com",
  projectId: "fhapp-ca321",
  storageBucket: "fhapp-ca321.firebasestorage.app",
  messagingSenderId: "321828975722",
  appId: "1:321828975722:web:b1c8e8ab6462f74eb8c613",
  measurementId: "G-C13GEDVMBF"
};

let db;
try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} catch (error) {
  console.error('Firebase initialization error:', error);
  db = null;
}

// Direct database operations for user roles
export const getUserRoleFromDatabase = async (userId) => {
  try {
    if (!db || !userId) {
      return 'user';
    }

    const userDocRef = doc(db, 'users', userId);
    const userDocSnap = await getDoc(userDocRef);
    
    if (userDocSnap.exists()) {
      const userData = userDocSnap.data();
      return userData.role || 'user';
    } else {
      return 'user';
    }
  } catch (error) {
    console.error('Error getting user role:', error);
    return 'user';
  }
};

// Set user role directly in database
export const setUserRoleInDatabase = async (userId, email, role = 'admin') => {
  try {
    if (!db || !userId) {
      throw new Error('No database connection or user ID');
    }

    const userDocRef = doc(db, 'users', userId);
    const userData = {
      uid: userId,
      email: email,
      role: role,
      updatedAt: new Date(),
      createdAt: new Date()
    };

    await setDoc(userDocRef, userData, { merge: true });
    return true;
  } catch (error) {
    console.error('Error setting user role:', error);
    throw error;
  }
};

// Check if user is admin directly from database
export const checkIsAdminFromDatabase = async (userId) => {
  try {
    const role = await getUserRoleFromDatabase(userId);
    return role === 'admin';
  } catch (error) {
    console.error('❌ Error checking admin status:', error);
    return false;
  }
};

export default {
  getUserRoleFromDatabase,
  setUserRoleInDatabase,
  checkIsAdminFromDatabase
};