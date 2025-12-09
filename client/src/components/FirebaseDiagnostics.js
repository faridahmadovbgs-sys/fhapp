import React, { useState, useEffect } from 'react';
import { auth, db } from '../config/firebase';
import { testFirebaseConnection } from '../utils/testFirebase';

const FirebaseDiagnostics = () => {
  const [diagnostics, setDiagnostics] = useState(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    setTesting(true);
    
    const results = {
      timestamp: new Date().toISOString(),
      firebaseConfig: {
        projectId: auth?.app?.options?.projectId || 'Not configured',
        authDomain: auth?.app?.options?.authDomain || 'Not configured',
        apiKey: auth?.app?.options?.apiKey ? '✅ Set' : '❌ Missing',
      },
      services: {
        auth: !!auth,
        firestore: !!db,
      },
      connectivity: await testFirebaseConnection(),
      browser: {
        userAgent: navigator.userAgent,
        online: navigator.onLine,
      }
    };

    setDiagnostics(results);
    setTesting(false);
  };

  if (testing) {
    return (
      <div style={{ padding: '20px', fontFamily: 'monospace' }}>
        <h2>Running Firebase Diagnostics...</h2>
      </div>
    );
  }

  if (!diagnostics) return null;

  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'monospace',
      backgroundColor: '#f5f5f5',
      maxWidth: '800px',
      margin: '20px auto',
      borderRadius: '8px'
    }}>
      <h2>🔥 Firebase Diagnostics</h2>
      
      <div style={{ marginTop: '20px' }}>
        <h3>Configuration</h3>
        <pre style={{ backgroundColor: 'white', padding: '10px', borderRadius: '4px' }}>
          {JSON.stringify(diagnostics.firebaseConfig, null, 2)}
        </pre>
      </div>

      <div style={{ marginTop: '20px' }}>
        <h3>Services Status</h3>
        <ul>
          <li>Auth: {diagnostics.services.auth ? '✅ Available' : '❌ Not configured'}</li>
          <li>Firestore: {diagnostics.services.firestore ? '✅ Available' : '❌ Not configured'}</li>
        </ul>
      </div>

      <div style={{ marginTop: '20px' }}>
        <h3>Connectivity Test</h3>
        <pre style={{ backgroundColor: 'white', padding: '10px', borderRadius: '4px' }}>
          {JSON.stringify(diagnostics.connectivity, null, 2)}
        </pre>
      </div>

      <div style={{ marginTop: '20px' }}>
        <h3>Browser Info</h3>
        <ul>
          <li>Online: {diagnostics.browser.online ? '✅ Yes' : '❌ No'}</li>
          <li>User Agent: {diagnostics.browser.userAgent}</li>
        </ul>
      </div>

      <div style={{ 
        marginTop: '20px', 
        padding: '15px', 
        backgroundColor: '#fff3cd', 
        borderRadius: '4px',
        border: '1px solid #ffc107'
      }}>
        <h3>⚠️ Common Issues</h3>
        <ol>
          <li><strong>Email/Password not enabled:</strong> Go to Firebase Console → Authentication → Sign-in method → Enable Email/Password</li>
          <li><strong>Firestore not created:</strong> Go to Firebase Console → Firestore Database → Create database</li>
          <li><strong>Network blocked:</strong> Check firewall, VPN, or proxy settings</li>
        </ol>
        <p style={{ marginTop: '10px' }}>
          <strong>Firebase Console:</strong>{' '}
          <a 
            href={`https://console.firebase.google.com/project/${diagnostics.firebaseConfig.projectId}`}
            target="_blank" 
            rel="noopener noreferrer"
            style={{ color: '#007bff' }}
          >
            Open Project Settings
          </a>
        </p>
      </div>

      <button 
        onClick={runDiagnostics}
        style={{
          marginTop: '20px',
          padding: '10px 20px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Re-run Diagnostics
      </button>
    </div>
  );
};

export default FirebaseDiagnostics;
