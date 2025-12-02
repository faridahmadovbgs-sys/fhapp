import React, { useState } from 'react';
import { usePermissions } from '../hooks/usePermissions';
import { useAuthorization } from '../contexts/AuthorizationContext';
import './DemoPermissions.css';

const DemoPermissions = () => {
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

  const { rolePermissions, updateRolePermissions, getAllRoles } = useAuthorization();
  
  const [selectedRole, setSelectedRole] = useState('user');
  const [isEditing, setIsEditing] = useState(false);
  const [editedPermissions, setEditedPermissions] = useState(null);
  const [saveMessage, setSaveMessage] = useState('');

  const pages = [
    { name: 'Home', key: 'home' },
    { name: 'About', key: 'about' },
    { name: 'Profile', key: 'profile' },
    { name: 'Admin Panel', key: 'admin' },
    { name: 'Users', key: 'users' },
    { name: 'Reports', key: 'reports' },
    { name: 'Settings', key: 'settings' },
    { name: 'Invitations', key: 'invitations' },
    { name: 'Billing', key: 'billing' }
  ];

  const actions = [
    { name: 'Create User', key: 'create_user' },
    { name: 'Edit User', key: 'edit_user' },
    { name: 'Delete User', key: 'delete_user' },
    { name: 'View Users', key: 'view_users' },
    { name: 'Manage Roles', key: 'manage_roles' },
    { name: 'Export Data', key: 'export_data' },
    { name: 'View Analytics', key: 'view_analytics' },
    { name: 'System Settings', key: 'system_settings' },
    { name: 'Manage Invitations', key: 'manage_invitations' },
    { name: 'Manage Billing', key: 'manage_billing' }
  ];

  const handleRoleChange = (role) => {
    setSelectedRole(role);
    setIsEditing(false);
    setEditedPermissions(null);
  };

  const startEditing = () => {
    const currentPerms = rolePermissions[selectedRole];
    setEditedPermissions(JSON.parse(JSON.stringify(currentPerms)));
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditedPermissions(null);
  };

  const togglePagePermission = (pageKey) => {
    setEditedPermissions(prev => ({
      ...prev,
      pages: {
        ...prev.pages,
        [pageKey]: !prev.pages[pageKey]
      }
    }));
  };

  const toggleActionPermission = (actionKey) => {
    setEditedPermissions(prev => ({
      ...prev,
      actions: {
        ...prev.actions,
        [actionKey]: !prev.actions[actionKey]
      }
    }));
  };

  const savePermissions = async () => {
    try {
      await updateRolePermissions(selectedRole, editedPermissions);
      setIsEditing(false);
      setEditedPermissions(null);
      setSaveMessage('✅ Permissions updated successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error saving permissions:', error);
      setSaveMessage('❌ Failed to save permissions');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const getCurrentPermissions = () => {
    return isEditing ? editedPermissions : rolePermissions[selectedRole];
  };

  const currentPermissions = getCurrentPermissions();
  const isAdminUser = isAdmin();

  return (
    <div className="demo-permissions-container">
      <div className="page-header">
        <h1>🔐 Permissions Dashboard</h1>
        <p className="subtitle">
          {isAdminUser ? 'Manage role permissions and view your access levels' : 'View your current role and permission levels'}
        </p>
      </div>

      {/* Role Status Card - Your Personal Role */}
      <div className="status-card">
        <h2>👤 Your Role</h2>
        <div className="role-display">
          <div className={`role-badge role-${userRole}`}>
            {userRole === 'admin' && '⚙️ Admin'}
            {userRole === 'account_owner' && '👑 Account Owner'}
            {userRole === 'sub_account_owner' && '👑 Sub Account Owner'}
            {userRole === 'moderator' && '🛡️ Moderator'}
            {(userRole === 'user' || !userRole) && '👤 Member'}
          </div>
        </div>
        
        <div className="role-info-grid">
          <div className="info-item">
            <span className="label">Admin Access:</span>
            <span className={`value ${isAdminUser ? 'yes' : 'no'}`}>
              {isAdminUser ? '✅ Yes' : '❌ No'}
            </span>
          </div>
          <div className="info-item">
            <span className="label">Moderator Access:</span>
            <span className={`value ${isModerator() ? 'yes' : 'no'}`}>
              {isModerator() ? '✅ Yes' : '❌ No'}
            </span>
          </div>
          <div className="info-item">
            <span className="label">Manage Users:</span>
            <span className={`value ${canManageUsers() ? 'yes' : 'no'}`}>
              {canManageUsers() ? '✅ Yes' : '❌ No'}
            </span>
          </div>
          <div className="info-item">
            <span className="label">View Analytics:</span>
            <span className={`value ${canViewAnalytics() ? 'yes' : 'no'}`}>
              {canViewAnalytics() ? '✅ Yes' : '❌ No'}
            </span>
          </div>
        </div>
      </div>

      {/* Admin Role Permission Editor */}
      {isAdminUser && (
        <>
          <div className="role-editor-card">
            <div className="editor-header">
              <div>
                <h2>⚙️ Role Permission Editor</h2>
                <p className="editor-subtitle">Customize permissions for each role</p>
              </div>
              <div className="editor-controls">
                <select 
                  value={selectedRole} 
                  onChange={(e) => handleRoleChange(e.target.value)}
                  className="role-selector"
                  disabled={isEditing}
                >
                  {getAllRoles().map(role => (
                    <option key={role} value={role}>
                      {role === 'account_owner' ? 'Account Owner' : 
                       role === 'sub_account_owner' ? 'Sub Account Owner' : 
                       role.charAt(0).toUpperCase() + role.slice(1)}
                    </option>
                  ))}
                </select>
                {!isEditing ? (
                  <button onClick={startEditing} className="edit-btn">
                    ✏️ Edit Permissions
                  </button>
                ) : (
                  <>
                    <button onClick={savePermissions} className="save-btn">
                      💾 Save Changes
                    </button>
                    <button onClick={cancelEditing} className="cancel-btn">
                      ❌ Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
            {saveMessage && (
              <div className={`save-message ${saveMessage.includes('✅') ? 'success' : 'error'}`}>
                {saveMessage}
              </div>
            )}
          </div>

          <div className="permissions-grid">
            {/* Page Permissions */}
            <div className="permissions-card">
              <h3>📄 Page Access</h3>
              <div className="permissions-list">
                {pages.map(page => (
                  <div key={page.key} className="permission-item editable">
                    <span className="permission-name">{page.name}</span>
                    {isEditing ? (
                      <input
                        type="checkbox"
                        checked={currentPermissions?.pages?.[page.key] || false}
                        onChange={() => togglePagePermission(page.key)}
                        className="permission-checkbox"
                      />
                    ) : (
                      <span className={`permission-status ${currentPermissions?.pages?.[page.key] ? 'allowed' : 'denied'}`}>
                        {currentPermissions?.pages?.[page.key] ? '✅ Allowed' : '❌ Denied'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Action Permissions */}
            <div className="permissions-card">
              <h3>⚡ Action Permissions</h3>
              <div className="permissions-list">
                {actions.map(action => (
                  <div key={action.key} className="permission-item editable">
                    <span className="permission-name">{action.name}</span>
                    {isEditing ? (
                      <input
                        type="checkbox"
                        checked={currentPermissions?.actions?.[action.key] || false}
                        onChange={() => toggleActionPermission(action.key)}
                        className="permission-checkbox"
                      />
                    ) : (
                      <span className={`permission-status ${currentPermissions?.actions?.[action.key] ? 'allowed' : 'denied'}`}>
                        {currentPermissions?.actions?.[action.key] ? '✅ Allowed' : '❌ Denied'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Non-Admin View - Just Show Your Permissions */}
      {!isAdminUser && (
        <div className="permissions-grid">
          {/* Page Permissions */}
          <div className="permissions-card">
            <h3>📄 Your Page Access</h3>
            <div className="permissions-list">
              {pages.map(page => (
                <div key={page.key} className="permission-item">
                  <span className="permission-name">{page.name}</span>
                  <span className={`permission-status ${hasPagePermission(page.key) ? 'allowed' : 'denied'}`}>
                    {hasPagePermission(page.key) ? '✅ Allowed' : '❌ Denied'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Permissions */}
          <div className="permissions-card">
            <h3>⚡ Your Action Permissions</h3>
            <div className="permissions-list">
              {actions.map(action => (
                <div key={action.key} className="permission-item">
                  <span className="permission-name">{action.name}</span>
                  <span className={`permission-status ${hasActionPermission(action.key) ? 'allowed' : 'denied'}`}>
                    {hasActionPermission(action.key) ? '✅ Allowed' : '❌ Denied'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="info-box">
        <strong>💡 Note:</strong> {isAdminUser 
          ? 'As an admin, you can modify role permissions. Changes affect all users with the selected role.' 
          : 'This page shows your current permission levels. Contact an administrator if you need different access levels.'}
      </div>
    </div>
  );
};

export default DemoPermissions;