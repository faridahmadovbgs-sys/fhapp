import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';

const DebugPermissions = () => {
  const { user } = useAuth();
  const { 
    isAdmin, 
    userRole, 
    permissions, 
    hasPagePermission,
    hasActionPermission,
    loading 
  } = usePermissions();

  if (!user) return null;

  const localAdminStatus = localStorage.getItem(`admin_${user.id}`);
  const localUserRole = localStorage.getItem(`role_${user.id}`);

  const clearLocalAdmin = () => {
    localStorage.removeItem(`admin_${user.id}`);
    localStorage.removeItem(`role_${user.id}`);
    window.location.reload();
  };

  const setLocalAdmin = () => {
    localStorage.setItem(`admin_${user.id}`, 'true');
    localStorage.setItem(`role_${user.id}`, 'admin');
    window.location.reload();
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: '#f8f9fa',
      border: '1px solid #dee2e6',
      borderRadius: '8px',
      padding: '15px',
      minWidth: '300px',
      fontSize: '12px',
      zIndex: 1000,
      boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
    }}>
      <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>🐛 Debug Permissions</h4>
      
      <div style={{ marginBottom: '10px' }}>
        <strong>User Info:</strong><br/>
        Email: {user.email}<br/>
        ID: {user.id}<br/>
        Loading: {loading ? 'Yes' : 'No'}
      </div>

      <div style={{ marginBottom: '10px' }}>
        <strong>Local Storage:</strong><br/>
        Admin Status: {localAdminStatus || 'Not Set'}<br/>
        Role: {localUserRole || 'Not Set'}
      </div>

      <div style={{ marginBottom: '10px' }}>
        <strong>Current State:</strong><br/>
        Role: {userRole}<br/>
        Is Admin: {isAdmin() ? 'Yes' : 'No'}<br/>
        Admin Page Access: {hasPagePermission('admin') ? 'Yes' : 'No'}<br/>
        Manage Roles: {hasActionPermission('manage_roles') ? 'Yes' : 'No'}
      </div>

      <div style={{ display: 'flex', gap: '5px', flexDirection: 'column' }}>
        <button
          onClick={setLocalAdmin}
          style={{
            padding: '5px 10px',
            background: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px'
          }}
        >
          🚀 Force Admin
        </button>
        <button
          onClick={clearLocalAdmin}
          style={{
            padding: '5px 10px',
            background: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px'
          }}
        >
          🗑️ Clear Local Admin
        </button>
      </div>
    </div>
  );
};

export default DebugPermissions;