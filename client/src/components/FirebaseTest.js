import React, { useEffect, useState } from 'react';
import { auth, db } from '../config/firebase';

const FirebaseTest = () => {
  const [status, setStatus] = useState('Testing Firebase connection...');

  useEffect(() => {
    const testFirebase = async () => {
      try {
        console.log('Testing Firebase connection...');
        console.log('Auth object:', auth);
        console.log('DB object:', db);
        
        if (!auth) {
          setStatus('❌ Firebase Auth not initialized - Check network connection');
          console.error('Firebase Auth is null - likely network or configuration issue');
          return;
        }
        
        if (!db) {
          setStatus('❌ Firebase Firestore not initialized - Check network connection');
          console.error('Firebase DB is null - likely network or configuration issue');
          return;
        }

        // Try to get current auth state
        const user = auth.currentUser;
        console.log('Current user:', user);
        
        // Test if we can actually connect to Firebase
        try {
          await auth.authStateReady();
          setStatus('✅ Firebase connection successful');
        } catch (connectError) {
          setStatus(`❌ Firebase connection failed: ${connectError.message}`);
        }
        
      } catch (error) {
        console.error('Firebase test error:', error);
        setStatus(`❌ Firebase error: ${error.message}`);
      }
    };

    testFirebase();
  }, []);

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', margin: '20px', borderRadius: '8px' }}>
      <h3>Firebase Connection Test</h3>
      <p>{status}</p>
      <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
        <p>Auth object exists: {auth ? 'Yes' : 'No'}</p>
        <p>DB object exists: {db ? 'Yes' : 'No'}</p>
      </div>
    </div>
  );
};

export default FirebaseTest;