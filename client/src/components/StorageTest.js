import React, { useState } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

const StorageTest = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState('');
  const [testResult, setTestResult] = useState(null);

  const testStorageConnection = async () => {
    setStatus('🔄 Testing Firebase Storage connection...');
    setTestResult(null);

    try {
      // Check if storage is initialized
      if (!storage) {
        throw new Error('Firebase Storage is not initialized');
      }

      setStatus('✅ Storage object exists');

      // Check if user is authenticated
      if (!user) {
        throw new Error('User must be logged in to test storage');
      }

      setStatus('✅ User is authenticated: ' + user.email);

      // Try to create a reference
      const testRef = ref(storage, `profile-pictures/${user.id}/test-${Date.now()}.txt`);
      setStatus('✅ Storage reference created');

      // Try to upload a small test file
      const testBlob = new Blob(['Test upload at ' + new Date().toISOString()], { 
        type: 'text/plain' 
      });

      setStatus('🔄 Uploading test file...');
      const uploadResult = await uploadBytes(testRef, testBlob);
      setStatus('✅ Upload successful!');

      // Try to get download URL
      setStatus('🔄 Getting download URL...');
      const downloadURL = await getDownloadURL(testRef);
      setStatus('✅ Download URL obtained!');

      setTestResult({
        success: true,
        message: 'All storage operations working correctly!',
        details: {
          uploadedFile: uploadResult.metadata.name,
          fullPath: uploadResult.metadata.fullPath,
          downloadURL: downloadURL,
          contentType: uploadResult.metadata.contentType,
          size: uploadResult.metadata.size
        }
      });

    } catch (error) {
      console.error('Storage test error:', error);
      setTestResult({
        success: false,
        message: 'Storage test failed',
        error: {
          code: error.code,
          message: error.message,
          details: error.serverResponse || 'No additional details'
        }
      });
      setStatus('❌ Error: ' + error.message);
    }
  };

  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '600px', 
      margin: '20px auto',
      border: '1px solid #ddd',
      borderRadius: '8px',
      backgroundColor: '#f9f9f9'
    }}>
      <h3>🧪 Firebase Storage Test</h3>
      
      <button 
        onClick={testStorageConnection}
        style={{
          padding: '10px 20px',
          backgroundColor: '#4285f4',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '16px'
        }}
      >
        Test Storage Connection
      </button>

      {status && (
        <div style={{ 
          marginTop: '15px', 
          padding: '10px',
          backgroundColor: 'white',
          borderRadius: '4px',
          whiteSpace: 'pre-wrap'
        }}>
          <strong>Status:</strong> {status}
        </div>
      )}

      {testResult && (
        <div style={{ 
          marginTop: '15px',
          padding: '15px',
          backgroundColor: testResult.success ? '#d4edda' : '#f8d7da',
          color: testResult.success ? '#155724' : '#721c24',
          borderRadius: '4px'
        }}>
          <h4>{testResult.success ? '✅ Success!' : '❌ Failed'}</h4>
          <p>{testResult.message}</p>
          
          {testResult.details && (
            <div style={{ marginTop: '10px' }}>
              <strong>Details:</strong>
              <pre style={{ 
                marginTop: '5px',
                padding: '10px',
                backgroundColor: 'rgba(0,0,0,0.1)',
                borderRadius: '4px',
                fontSize: '12px',
                overflow: 'auto'
              }}>
                {JSON.stringify(testResult.details, null, 2)}
              </pre>
            </div>
          )}

          {testResult.error && (
            <div style={{ marginTop: '10px' }}>
              <strong>Error Details:</strong>
              <pre style={{ 
                marginTop: '5px',
                padding: '10px',
                backgroundColor: 'rgba(0,0,0,0.1)',
                borderRadius: '4px',
                fontSize: '12px',
                overflow: 'auto'
              }}>
                {JSON.stringify(testResult.error, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      <div style={{ 
        marginTop: '20px',
        padding: '15px',
        backgroundColor: '#fff3cd',
        borderRadius: '4px',
        fontSize: '14px'
      }}>
        <strong>⚠️ Required Setup:</strong>
        <ol style={{ marginTop: '10px', marginBottom: 0 }}>
          <li>Firebase Storage must be enabled in Firebase Console</li>
          <li>You must be logged in</li>
          <li>Storage rules must allow authenticated users to write to profile-pictures path</li>
        </ol>
      </div>

      <div style={{ 
        marginTop: '15px',
        padding: '15px',
        backgroundColor: '#e7f3ff',
        borderRadius: '4px',
        fontSize: '14px'
      }}>
        <strong>📋 Expected Storage Rules:</strong>
        <pre style={{ 
          marginTop: '10px',
          padding: '10px',
          backgroundColor: 'rgba(0,0,0,0.05)',
          borderRadius: '4px',
          fontSize: '11px',
          overflow: 'auto'
        }}>
{`rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /profile-pictures/{userId}/{filename} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}`}
        </pre>
      </div>
    </div>
  );
};

export default StorageTest;
