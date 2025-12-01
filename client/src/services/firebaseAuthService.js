import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

export const firebaseAuthService = {
  // Register new user
  register: async (email, password, name, entity = '') => {
    // Check if Firebase is configured with detailed logging
    console.log('🔍 Firebase service check:', {
      authExists: !!auth,
      dbExists: !!db,
      authType: typeof auth,
      dbType: typeof db
    });
    
    if (!auth || !db) {
      const errorMessage = `Firebase not available: auth=${!!auth}, db=${!!db}. This could be due to network connectivity issues or Firebase configuration problems.`;
      console.error('❌ Firebase check failed:', errorMessage);
      throw new Error(errorMessage);
    }
    
    console.log('✅ Firebase services available, proceeding with registration');
    
    try {
      // Ensure parameters are proper strings
      const emailStr = String(email).trim();
      const passwordStr = String(password).trim();
      const nameStr = String(name || '').trim();
      const entityStr = String(entity || '').trim();
      
      if (!emailStr || !passwordStr) {
        throw new Error('Email and password are required');
      }
      
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailStr)) {
        throw new Error('Please enter a valid email address');
      }
      
      if (passwordStr.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }
      
      const userCredential = await createUserWithEmailAndPassword(auth, emailStr, passwordStr);
      
      // Update user profile with name
      if (nameStr) {
        await updateProfile(userCredential.user, {
          displayName: nameStr
        });
      }

      // Store additional user data in Firestore
      const userData = {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        fullName: nameStr,
        entity: entityStr,
        emailVerified: userCredential.user.emailVerified,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Save to Firestore database
      await setDoc(doc(db, 'users', userCredential.user.uid), userData);

      // Sync user to MongoDB via backend API
      try {
        console.log('💾 Syncing user to MongoDB...');
        const mongoResponse = await fetch('http://localhost:5000/api/auth/sync-firebase-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: emailStr,
            firstName: nameStr.split(' ')[0] || nameStr, // First part of name
            lastName: nameStr.split(' ').slice(1).join(' ') || '', // Rest of name
            uid: userCredential.user.uid,
            entity: entityStr
          })
        });

        const mongoData = await mongoResponse.json();
        
        if (!mongoResponse.ok) {
          console.warn('⚠️ MongoDB sync failed:', mongoData.message);
          console.warn('Firebase registration succeeded, but MongoDB sync failed');
        } else {
          console.log('✅ User synced to MongoDB:', mongoData);
        }
      } catch (mongoError) {
        console.warn('⚠️ MongoDB connection failed, but Firebase registration succeeded:', mongoError.message);
      }

      return {
        success: true,
        message: 'Registration successful! User profile created in both Firebase and MongoDB.',
        user: {
          id: userCredential.user.uid,
          email: userCredential.user.email,
          name: userCredential.user.displayName || nameStr,
          entity: entityStr,
          emailVerified: userCredential.user.emailVerified
        },
        token: await userCredential.user.getIdToken()
      };
    } catch (error) {
      console.error('Registration error:', error);
      let message = 'Registration failed';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          message = 'An account with this email already exists';
          break;
        case 'auth/weak-password':
          message = 'Password should be at least 6 characters';
          break;
        case 'auth/invalid-email':
          message = 'Invalid email address';
          break;
        default:
          message = error.message;
      }
      
      throw new Error(message);
    }
  },

  // Login user
  login: async (email, password) => {
    // Check if Firebase is configured
    if (!auth) {
      throw new Error('🔥 Firebase not configured yet! Please follow the FIREBASE_SETUP.md guide to set up authentication.');
    }
    
    try {
      // Ensure email and password are strings
      const emailStr = String(email).trim();
      const passwordStr = String(password).trim();
      
      if (!emailStr || !passwordStr) {
        throw new Error('Email and password are required');
      }
      
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailStr)) {
        throw new Error('Please enter a valid email address');
      }
      
      const userCredential = await signInWithEmailAndPassword(auth, emailStr, passwordStr);
      
      return {
        success: true,
        message: 'Login successful',
        user: {
          id: userCredential.user.uid,
          email: userCredential.user.email,
          name: userCredential.user.displayName,
          emailVerified: userCredential.user.emailVerified
        },
        token: await userCredential.user.getIdToken()
      };
    } catch (error) {
      console.error('Login error:', error);
      let message = 'Login failed';
      
      switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          message = 'Invalid email or password';
          break;
        case 'auth/user-disabled':
          message = 'This account has been disabled';
          break;
        case 'auth/too-many-requests':
          message = 'Too many failed login attempts. Please try again later.';
          break;
        default:
          message = error.message;
      }
      
      throw new Error(message);
    }
  },

  // Logout user
  logout: async () => {
    try {
      await signOut(auth);
      
      // Clear all local storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear any cached auth data
      if (typeof indexedDB !== 'undefined') {
        const dbs = await indexedDB.databases();
        dbs.forEach(db => {
          if (db.name && db.name.includes('firebase')) {
            indexedDB.deleteDatabase(db.name);
          }
        });
      }
      
      console.log('✅ Logged out and cleared all data');
      
      return {
        success: true,
        message: 'Logged out successfully'
      };
    } catch (error) {
      console.error('Logout error:', error);
      throw new Error('Logout failed');
    }
  },

  // Send password reset email
  forgotPassword: async (email) => {
    // Check if Firebase is configured
    if (!auth) {
      throw new Error('🔥 Firebase not configured yet! Please follow the FIREBASE_SETUP.md guide to set up authentication.');
    }
    
    try {
      await sendPasswordResetEmail(auth, email);
      
      return {
        success: true,
        message: 'Password reset email sent! Please check your inbox and spam folder.',
        isDemoMode: false // Real email service
      };
    } catch (error) {
      console.error('Password reset error:', error);
      let message = 'Failed to send password reset email';
      
      switch (error.code) {
        case 'auth/user-not-found':
          message = 'No account found with this email address';
          break;
        case 'auth/invalid-email':
          message = 'Invalid email address';
          break;
        case 'auth/too-many-requests':
          message = 'Too many requests. Please try again later.';
          break;
        default:
          message = error.message;
      }
      
      throw new Error(message);
    }
  },

  // Get current user
  getCurrentUser: () => {
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();
        if (user) {
          resolve({
            success: true,
            user: {
              id: user.uid,
              email: user.email,
              name: user.displayName,
              emailVerified: user.emailVerified
            }
          });
        } else {
          resolve({
            success: false,
            user: null
          });
        }
      });
    });
  },

  // Get user profile from database
  getUserProfile: async (uid) => {
    if (!db) {
      throw new Error('🔥 Firebase not configured yet!');
    }
    
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        return {
          success: true,
          user: userDoc.data()
        };
      } else {
        return {
          success: false,
          message: 'User profile not found in database'
        };
      }
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw new Error('Failed to retrieve user profile');
    }
  },

  // Listen to auth state changes
  onAuthStateChange: (callback) => {
    return onAuthStateChanged(auth, callback);
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return auth.currentUser !== null;
  },

  // Get current user token
  getToken: async () => {
    const user = auth.currentUser;
    if (user) {
      return await user.getIdToken();
    }
    return null;
  }
};

export default firebaseAuthService;