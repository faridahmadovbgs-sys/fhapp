import React, { useState } from 'react';
import { PermissionGuard } from '../components/ProtectedRoute';
import { usePermissions, useActionPermission, useFieldPermission } from '../hooks/usePermissions';

const DemoPermissions = () => {
  const [formData, setFormData] = useState({ name: '', email: '', role: 'user' });
  
  // Using the comprehensive permissions hook
  const {
    isAdmin,
    isModerator,
    canManageUsers,
    canViewAnalytics,
    canExportData,
    hasPagePermission,
    hasActionPermission,
    userRole
  } = usePermissions();

  // Using specific permission hooks
  const { hasPermission: canCreateUser } = useActionPermission('create_user');
  const { hasPermission: canEditUser } = useActionPermission('edit_user');
  const { hasPermission: canDeleteUser } = useActionPermission('delete_user');

  // Using field permission hook for form controls
  const { canEditField, getFieldProps } = useFieldPermission();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (canCreateUser) {
      console.log('Creating user:', formData);
      // API call to create user
    } else {
      alert('You don\'t have permission to create users');
    }
  };

  const handleExport = () => {
    if (canExportData) {
      console.log('Exporting data...');
      // Export logic
    } else {
      alert('You don\'t have permission to export data');
    }
  };

  return (
    <div className="demo-permissions" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Permission System Demo</h1>
      
      {/* User Role and Status Display */}
      <div style={{ marginBottom: '30px', padding: '15px', background: '#f8f9fa', borderRadius: '5px' }}>
        <h3>Your Current Status:</h3>
        <p><strong>Role:</strong> {userRole}</p>
        <p><strong>Is Admin:</strong> {isAdmin() ? 'Yes' : 'No'}</p>
        <p><strong>Is Moderator:</strong> {isModerator() ? 'Yes' : 'No'}</p>
        <p><strong>Can Manage Users:</strong> {canManageUsers() ? 'Yes' : 'No'}</p>
        <p><strong>Can View Analytics:</strong> {canViewAnalytics() ? 'Yes' : 'No'}</p>
      </div>

      {/* Conditional Buttons Based on Permissions */}
      <div style={{ marginBottom: '30px' }}>
        <h3>Available Actions:</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <PermissionGuard requiredAction="create_user">
            <button className="btn btn-primary">Create User</button>
          </PermissionGuard>
          
          <PermissionGuard requiredAction="edit_user">
            <button className="btn btn-secondary">Edit Users</button>
          </PermissionGuard>
          
          <PermissionGuard requiredAction="delete_user">
            <button className="btn btn-danger" style={{ background: '#dc3545' }}>Delete Users</button>
          </PermissionGuard>
          
          <PermissionGuard requiredAction="export_data">
            <button className="btn btn-success" onClick={handleExport} style={{ background: '#28a745' }}>
              Export Data
            </button>
          </PermissionGuard>
          
          <PermissionGuard requiredAction="view_analytics">
            <button className="btn btn-info" style={{ background: '#17a2b8' }}>View Analytics</button>
          </PermissionGuard>
        </div>
      </div>

      {/* Form with Field-Level Permissions */}
      <PermissionGuard 
        requiredAction="create_user" 
        fallback={
          <div style={{ padding: '20px', background: '#fff3cd', border: '1px solid #ffeaa7', borderRadius: '5px' }}>
            <p>You don't have permission to create users. This form is disabled.</p>
          </div>
        }
      >
        <div style={{ marginBottom: '30px' }}>
          <h3>Create New User Form</h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <label>Name:</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                {...getFieldProps('name', 'create_user')}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>
            
            <div>
              <label>Email:</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                {...getFieldProps('email', 'create_user')}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>
            
            <div>
              <label>Role:</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                {...getFieldProps('role', 'manage_roles')}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              >
                <option value="user">User</option>
                <option value="moderator">Moderator</option>
                <option value="admin">Admin</option>
              </select>
              {!canEditField('role', 'manage_roles') && (
                <small style={{ color: '#666' }}>Only admins can set user roles</small>
              )}
            </div>
            
            <button 
              type="submit" 
              className="btn btn-primary"
              style={{ alignSelf: 'flex-start', padding: '10px 20px' }}
            >
              Create User
            </button>
          </form>
        </div>
      </PermissionGuard>

      {/* Page Access Examples */}
      <div style={{ marginBottom: '30px' }}>
        <h3>Page Access Status:</h3>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li style={{ padding: '5px 0', display: 'flex', justifyContent: 'space-between' }}>
            <span>Home Page:</span>
            <span style={{ color: hasPagePermission('home') ? 'green' : 'red' }}>
              {hasPagePermission('home') ? '✓ Allowed' : '✗ Denied'}
            </span>
          </li>
          <li style={{ padding: '5px 0', display: 'flex', justifyContent: 'space-between' }}>
            <span>Users Page:</span>
            <span style={{ color: hasPagePermission('users') ? 'green' : 'red' }}>
              {hasPagePermission('users') ? '✓ Allowed' : '✗ Denied'}
            </span>
          </li>
          <li style={{ padding: '5px 0', display: 'flex', justifyContent: 'space-between' }}>
            <span>Admin Panel:</span>
            <span style={{ color: hasPagePermission('admin') ? 'green' : 'red' }}>
              {hasPagePermission('admin') ? '✓ Allowed' : '✗ Denied'}
            </span>
          </li>
          <li style={{ padding: '5px 0', display: 'flex', justifyContent: 'space-between' }}>
            <span>Reports Page:</span>
            <span style={{ color: hasPagePermission('reports') ? 'green' : 'red' }}>
              {hasPagePermission('reports') ? '✓ Allowed' : '✗ Denied'}
            </span>
          </li>
        </ul>
      </div>

      {/* Action Permissions Examples */}
      <div>
        <h3>Action Permissions Status:</h3>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li style={{ padding: '5px 0', display: 'flex', justifyContent: 'space-between' }}>
            <span>Create User:</span>
            <span style={{ color: hasActionPermission('create_user') ? 'green' : 'red' }}>
              {hasActionPermission('create_user') ? '✓ Allowed' : '✗ Denied'}
            </span>
          </li>
          <li style={{ padding: '5px 0', display: 'flex', justifyContent: 'space-between' }}>
            <span>Edit User:</span>
            <span style={{ color: hasActionPermission('edit_user') ? 'green' : 'red' }}>
              {hasActionPermission('edit_user') ? '✓ Allowed' : '✗ Denied'}
            </span>
          </li>
          <li style={{ padding: '5px 0', display: 'flex', justifyContent: 'space-between' }}>
            <span>Delete User:</span>
            <span style={{ color: hasActionPermission('delete_user') ? 'green' : 'red' }}>
              {hasActionPermission('delete_user') ? '✓ Allowed' : '✗ Denied'}
            </span>
          </li>
          <li style={{ padding: '5px 0', display: 'flex', justifyContent: 'space-between' }}>
            <span>Manage Roles:</span>
            <span style={{ color: hasActionPermission('manage_roles') ? 'green' : 'red' }}>
              {hasActionPermission('manage_roles') ? '✓ Allowed' : '✗ Denied'}
            </span>
          </li>
          <li style={{ padding: '5px 0', display: 'flex', justifyContent: 'space-between' }}>
            <span>Export Data:</span>
            <span style={{ color: hasActionPermission('export_data') ? 'green' : 'red' }}>
              {hasActionPermission('export_data') ? '✓ Allowed' : '✗ Denied'}
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default DemoPermissions;