// Test Firebase connectivity
import { auth } from '../config/firebase';

export const testFirebaseConnection = async () => {
  try {
    console.log('🧪 Testing Firebase connection...');
    console.log('Auth instance:', auth);
    console.log('Auth app:', auth?.app);
    console.log('Auth config:', auth?.config);
    
    // Try to get the current auth state
    const currentUser = auth.currentUser;
    console.log('Current user:', currentUser);
    
    // Test if we can reach Firebase servers
    await auth.authStateReady();
    console.log('✅ Firebase Auth is ready and reachable');
    
    return {
      success: true,
      message: 'Firebase connection successful',
      details: {
        authReady: true,
        projectId: auth.app.options.projectId,
        authDomain: auth.app.options.authDomain
      }
    };
  } catch (error) {
    console.error('❌ Firebase connection test failed:', error);
    return {
      success: false,
      message: 'Firebase connection failed',
      error: error.message
    };
  }
};
