import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/apiService';

const AdminPromotion = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isPromoted, setIsPromoted] = useState(false);

  // Security: Only allow in development environment
  if (process.env.NODE_ENV === 'production') {
    return (
      <div style={{ 
        padding: '20px', 
        background: '#f8d7da', 
        border: '1px solid #f5c6cb', 
        borderRadius: '8px',
        margin: '20px 0',
        textAlign: 'center'
      }}>
        <h3>🚫 Access Denied</h3>
        <p>Admin promotion tool is disabled in production for security.</p>
        <p>Use Firebase Console or contact system administrator.</p>
      </div>
    );
  }

  const promoteToAdmin = async () => {
    if (!user) {
      setMessage('❌ You must be logged in to promote to admin');
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.post('/api/users/promote-to-admin', {
        email: user.email,
        userID: user.id
      });

      if (response.data.success) {
        // Store admin status locally for Firebase users
        localStorage.setItem(`admin_${user.id}`, 'true');
        localStorage.setItem(`role_${user.id}`, 'admin');
        
        setMessage(`✅ Success! ${user.email} has been promoted to admin`);
        setIsPromoted(true);
        
        // Refresh the page after 2 seconds to reload with admin permissions
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setMessage('❌ Failed to promote to admin');
      }
    } catch (error) {
      console.error('Promotion error:', error);
      setMessage('❌ Error promoting to admin: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  if (isPromoted) {
    return (
      <div style={{ 
        padding: '20px', 
        background: '#d4edda', 
        border: '1px solid #c3e6cb', 
        borderRadius: '8px',
        margin: '20px 0',
        textAlign: 'center'
      }}>
        <h3>🎉 Admin Promotion Successful!</h3>
        <p>You now have admin privileges. The page will refresh automatically.</p>
        <p><strong>You can now access:</strong></p>
        <ul style={{ textAlign: 'left', maxWidth: '300px', margin: '0 auto' }}>
          <li>Admin Panel (/admin)</li>
          <li>User Management</li>
          <li>Permission Control</li>
          <li>Role Management</li>
        </ul>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '20px', 
      background: '#f8f9fa', 
      border: '1px solid #dee2e6', 
      borderRadius: '8px',
      margin: '20px 0'
    }}>
      <h3>🔐 Admin Promotion Tool</h3>
      <p>Use this tool to give yourself admin privileges for the first time.</p>
      
      {user ? (
        <div style={{ marginBottom: '20px' }}>
          <p><strong>Current User:</strong> {user.name} ({user.email})</p>
          <p><strong>Current ID:</strong> {user.id}</p>
        </div>
      ) : (
        <p style={{ color: '#dc3545' }}>⚠️ You must be logged in to use this tool.</p>
      )}

      {message && (
        <div style={{ 
          padding: '10px', 
          marginBottom: '15px',
          background: message.includes('✅') ? '#d4edda' : '#f8d7da',
          border: `1px solid ${message.includes('✅') ? '#c3e6cb' : '#f5c6cb'}`,
          borderRadius: '4px',
          color: message.includes('✅') ? '#155724' : '#721c24'
        }}>
          {message}
        </div>
      )}

      <button
        onClick={promoteToAdmin}
        disabled={loading || !user}
        style={{
          padding: '10px 20px',
          backgroundColor: loading ? '#6c757d' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading || !user ? 'not-allowed' : 'pointer',
          fontSize: '16px',
          fontWeight: 'bold'
        }}
      >
        {loading ? '⏳ Promoting...' : '🚀 Promote Me to Admin'}
      </button>

      <div style={{ marginTop: '15px', fontSize: '14px', color: '#666' }}>
        <p><strong>⚠️ Important Notes:</strong></p>
        <ul style={{ textAlign: 'left', paddingLeft: '20px' }}>
          <li>This is for initial setup only</li>
          <li>After promotion, you can manage other users through the Admin Panel</li>
          <li>This tool should be removed in production</li>
          <li>Only use this if you're the system owner</li>
        </ul>
      </div>
    </div>
  );
};

export default AdminPromotion;