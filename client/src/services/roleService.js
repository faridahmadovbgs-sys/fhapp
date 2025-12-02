import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

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
export const setUserRoleInDatabase = async (userId, email, role = 'admin', metadata = {}) => {
  try {
    console.log('🔍 Setting user role:', { userId, email, role, metadata, dbExists: !!db });

    if (!db) {
      const errorMsg = 'Firebase Firestore database not available. Check Firebase configuration and network connection.';
      console.error('❌ Database check failed:', errorMsg);
      throw new Error(errorMsg);
    }

    if (!userId) {
      const errorMsg = 'User ID is required to set role in database';
      console.error('❌ UserId check failed:', errorMsg);
      throw new Error(errorMsg);
    }

    console.log('✅ Database and userId available, creating user document...');

    const userDocRef = doc(db, 'users', userId);
    
    // Filter out undefined values from metadata to avoid Firestore errors
    const cleanMetadata = {};
    Object.keys(metadata).forEach(key => {
      if (metadata[key] !== undefined) {
        cleanMetadata[key] = metadata[key];
      }
    });
    
    const userData = {
      uid: userId,
      email: email,
      role: role,
      updatedAt: new Date(),
      createdAt: new Date(),
      ...cleanMetadata
    };

    await setDoc(userDocRef, userData, { merge: true });
    console.log('✅ User role set successfully:', { userId, role });
    return true;
  } catch (error) {
    console.error('❌ Error setting user role:', error);
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

const roleService = {
  getUserRoleFromDatabase,
  setUserRoleInDatabase,
  checkIsAdminFromDatabase
};

export default roleService;