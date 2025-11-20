import { auth } from '../config/firebase';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';

class FirebaseUserManagementService {
  // Get current user
  getCurrentUser() {
    return auth.currentUser;
  }

  // Listen to auth state changes
  onAuthStateChange(callback) {
    return onAuthStateChanged(auth, callback);
  }

  // Get user token for API calls
  async getToken() {
    if (auth.currentUser) {
      return await auth.currentUser.getIdToken();
    }
    return null;
  }

  // Get user claims (includes custom claims like roles)
  async getUserClaims() {
    if (auth.currentUser) {
      const tokenResult = await auth.currentUser.getIdTokenResult();
      return tokenResult.claims;
    }
    return null;
  }

  // Format user data for admin panel
  formatUserForAdmin(firebaseUser) {
    return {
      id: firebaseUser.uid,
      email: firebaseUser.email,
      name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Unknown',
      emailVerified: firebaseUser.emailVerified,
      createdAt: firebaseUser.metadata.creationTime,
      lastSignIn: firebaseUser.metadata.lastSignInTime,
      photoURL: firebaseUser.photoURL,
      // Default role if not set in custom claims
      role: 'user',
      isActive: !firebaseUser.disabled,
      // Default permissions (will be overridden by server data)
      permissions: null
    };
  }

  // Login
  async login(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return {
        success: true,
        user: this.formatUserForAdmin(userCredential.user)
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Register
  async register(email, password, name) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update profile with display name
      if (name) {
        await updateProfile(userCredential.user, {
          displayName: name
        });
      }

      return {
        success: true,
        user: this.formatUserForAdmin(userCredential.user)
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Logout
  async logout() {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Send password reset email
  async forgotPassword(email) {
    try {
      await sendPasswordResetEmail(auth, email);
      return {
        success: true,
        message: 'Password reset email sent'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

const firebaseUserManagementService = new FirebaseUserManagementService();
export default firebaseUserManagementService;