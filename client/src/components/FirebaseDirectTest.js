import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';

const FirebaseDirectTest = () => {
  const [result, setResult] = useState('');
  const [testing, setTesting] = useState(false);

  const testDirectFirebase = async () => {
    setTesting(true);
    setResult('Testing...');
    
    try {
      const testEmail = 'test' + Date.now() + '@example.com';
      const testPassword = 'Test123456';
      
      console.log('🧪 Direct test - Creating user:', testEmail);
      console.log('🧪 Auth object:', auth);
      console.log('🧪 Auth config:', auth.config);
      
      const userCredential = await createUserWithEmailAndPassword(auth, testEmail, testPassword);
      
      setResult(`✅ SUCCESS!\nEmail: ${userCredential.user.email}\nUID: ${userCredential.user.uid}`);
      console.log('✅ Success:', userCredential.user);
    } catch (error) {
      setResult(`❌ ERROR: ${error.code}\n${error.message}`);
      console.error('❌ Error:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2>🔥 Firebase Direct Test</h2>
      <p>This bypasses all your custom code and calls Firebase directly.</p>
      
      <button 
        onClick={testDirectFirebase}
        disabled={testing}
        style={{
          padding: '15px 30px',
          fontSize: '16px',
          backgroundColor: '#4285f4',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: testing ? 'not-allowed' : 'pointer',
          marginBottom: '20px'
        }}
      >
        {testing ? 'Testing...' : 'Test Firebase Registration'}
      </button>

      {result && (
        <pre style={{
          padding: '15px',
          backgroundColor: '#f5f5f5',
          borderRadius: '5px',
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word'
        }}>
          {result}
        </pre>
      )}
    </div>
  );
};

export default FirebaseDirectTest;
