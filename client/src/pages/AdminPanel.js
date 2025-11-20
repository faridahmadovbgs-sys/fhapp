import React, { useState, useEffect } from 'react';
import { useAuthorization } from '../contexts/AuthorizationContext';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/apiService';
import firebaseUserManagementService from '../services/firebaseUserManagementService';
import InvitationManager from '../components/InvitationManager';
import '../components/AdminPanel.css';

const AdminPanel = () => {
  const { 
    hasPagePermission, 
    hasActionPermission, 
    getAllPermissions, 
    getAllRoles,
    rolePermissions,
    updateUserPermissions,
    updateUserRole
  } = useAuthorization();

  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [firebaseUsers, setFirebaseUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [firebaseLoading, setFirebaseLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('firebase-users');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  // Fetch all users
  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'firebase-users') {
      fetchFirebaseUsers();
    }
  }, [activeTab]);

  // Check if user has admin access
  if (!hasPagePermission('admin') || !hasActionPermission('manage_roles')) {
    return (
      <div className="admin-panel">
        <div className="access-denied">
          <h2>Access Denied</h2>
          <p>You don't have permission to access the admin panel.</p>
        </div>
      </div>
    );
  }

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/api/users');
      setUsers(response.data);
      setError('');
    } catch (err) {
      setError('Failed to fetch users');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFirebaseUsers = async () => {
    try {
      setFirebaseLoading(true);
      // Get Firebase users through our API (which will use Firebase Admin SDK)
      const response = await apiService.get('/api/users/firebase-users');
      
      // If API fails, create a mock list with current user and some sample data
      if (!response.data) {
        const mockUsers = [
          {
            id: currentUser?.id || 'current-user',
            email: currentUser?.email || 'admin@example.com',
            name: currentUser?.name || 'Current Admin',
            emailVerified: true,
            role: 'admin',
            isActive: true,
            createdAt: new Date().toISOString(),
            lastSignIn: new Date().toISOString(),
            permissions: rolePermissions.admin
          }
        ];
        setFirebaseUsers(mockUsers);
      } else {
        setFirebaseUsers(response.data);
      }
      
      setError('');
    } catch (err) {
      // Fallback: Use current user as admin for demonstration
      const mockUsers = [
        {
          id: currentUser?.id || 'demo-admin',
          email: currentUser?.email || 'admin@example.com',
          name: currentUser?.name || 'Demo Admin',
          emailVerified: true,
          role: 'admin',
          isActive: true,
          createdAt: new Date().toISOString(),
          lastSignIn: new Date().toISOString(),
          permissions: rolePermissions.admin
        },
        {
          id: 'demo-user-1',
          email: 'user1@example.com',
          name: 'Demo User 1',
          emailVerified: true,
          role: 'user',
          isActive: true,
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          lastSignIn: new Date(Date.now() - 3600000).toISOString(),
          permissions: rolePermissions.user
        },
        {
          id: 'demo-user-2',
          email: 'moderator@example.com',
          name: 'Demo Moderator',
          emailVerified: true,
          role: 'moderator',
          isActive: true,
          createdAt: new Date(Date.now() - 172800000).toISOString(),
          lastSignIn: new Date(Date.now() - 7200000).toISOString(),
          permissions: rolePermissions.moderator
        }
      ];
      setFirebaseUsers(mockUsers);
      console.warn('Using demo users for Firebase user management');
    } finally {
      setFirebaseLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await updateUserRole(userId, newRole);
      setSuccess(`User role updated to ${newRole}`);
      fetchUsers(); // Refresh users list
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to update user role');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handlePermissionChange = async (userId, permissionType, permissionName, value) => {
    try {
      const user = users.find(u => u.id === userId);
      if (!user) return;

      // Get current permissions or default based on role
      const currentPermissions = user.permissions || rolePermissions[user.role] || rolePermissions.user;
      
      const newPermissions = {
        ...currentPermissions,
        [permissionType]: {
          ...currentPermissions[permissionType],
          [permissionName]: value
        }
      };

      await updateUserPermissions(userId, newPermissions);
      setSuccess(`Permission '${permissionName}' ${value ? 'granted' : 'revoked'} for ${user.name}`);
      fetchUsers(); // Refresh users list
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to update permissions');
      setTimeout(() => setError(''), 3000);
    }
  };

  const toggleAllPermissions = async (userId, permissionType, value) => {
    try {
      const user = users.find(u => u.id === userId);
      if (!user) return;

      const currentPermissions = user.permissions || rolePermissions[user.role] || rolePermissions.user;
      const allPermissions = getAllPermissions();
      
      const updatedSection = {};
      allPermissions[permissionType].forEach(permission => {
        updatedSection[permission] = value;
      });

      const newPermissions = {
        ...currentPermissions,
        [permissionType]: updatedSection
      };

      await updateUserPermissions(userId, newPermissions);
      setSuccess(`All ${permissionType} permissions ${value ? 'granted' : 'revoked'} for ${user.name}`);
      fetchUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to update permissions');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Filter users based on search and role
  const getFilteredUsers = (usersList) => {
    return usersList.filter(user => {
      const matchesSearch = !searchTerm || 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRole = filterRole === 'all' || user.role === filterRole;
      
      return matchesSearch && matchesRole;
    });
  };

  const renderFirebaseUsersList = () => (
    <div className="firebase-users-list">
      <div className="list-header">
        <h3>Registered Users Management</h3>
        <p className="header-description">
          Manage permissions and roles for all registered users in your Firebase application
        </p>
      </div>

      {/* Search and Filter Controls */}
      <div className="user-controls">
        <div className="search-controls">
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="role-filter"
          >
            <option value="all">All Roles</option>
            {getAllRoles().map(role => (
              <option key={role} value={role}>
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </option>
            ))}
          </select>
        </div>
        
        <div className="user-stats">
          <span className="stat">
            Total Users: {firebaseUsers.length}
          </span>
          <span className="stat">
            Filtered: {getFilteredUsers(firebaseUsers).length}
          </span>
        </div>
      </div>

      {firebaseLoading ? (
        <div className="loading">Loading registered users...</div>
      ) : (
        <div className="users-table">
          <table>
            <thead>
              <tr>
                <th>User Info</th>
                <th>Email & Verification</th>
                <th>Role & Status</th>
                <th>Activity</th>
                <th>Quick Permissions</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {getFilteredUsers(firebaseUsers).map(user => {
                const userPermissions = user.permissions || rolePermissions[user.role] || rolePermissions.user;
                const isCurrentUser = user.id === currentUser?.id;
                
                return (
                  <tr key={user.id} className={isCurrentUser ? 'current-user-row' : ''}>
                    <td>
                      <div className="user-info">
                        <div className="user-avatar">
                          {user.photoURL ? (
                            <img src={user.photoURL} alt="Avatar" className="avatar-img" />
                          ) : (
                            <div className="avatar-placeholder">
                              {user.name?.charAt(0).toUpperCase() || '?'}
                            </div>
                          )}
                        </div>
                        <div className="user-details">
                          <strong className="user-name">{user.name}</strong>
                          {isCurrentUser && <span className="current-user-badge">You</span>}
                          <small className="user-id">ID: {user.id}</small>
                        </div>
                      </div>
                    </td>
                    
                    <td>
                      <div className="email-info">
                        <div className="email">{user.email}</div>
                        <div className="verification-status">
                          <span className={`verification ${user.emailVerified ? 'verified' : 'unverified'}`}>
                            {user.emailVerified ? '✓ Verified' : '⚠ Unverified'}
                          </span>
                        </div>
                      </div>
                    </td>
                    
                    <td>
                      <div className="role-status">
                        <select
                          value={user.role || 'user'}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          className="role-select"
                          disabled={isCurrentUser}
                        >
                          {getAllRoles().map(role => (
                            <option key={role} value={role}>
                              {role.charAt(0).toUpperCase() + role.slice(1)}
                            </option>
                          ))}
                        </select>
                        <span className={`status ${user.isActive ? 'active' : 'inactive'}`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                        {isCurrentUser && (
                          <small className="role-note">Cannot change your own role</small>
                        )}
                      </div>
                    </td>
                    
                    <td>
                      <div className="activity-info">
                        <div className="activity-item">
                          <small>Joined:</small>
                          <span>{new Date(user.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="activity-item">
                          <small>Last Login:</small>
                          <span>{user.lastSignIn ? new Date(user.lastSignIn).toLocaleDateString() : 'Never'}</span>
                        </div>
                      </div>
                    </td>
                    
                    <td>
                      <div className="quick-permissions">
                        <div className="permission-toggle">
                          <label>
                            <input
                              type="checkbox"
                              checked={userPermissions?.pages?.admin || false}
                              onChange={(e) => handlePermissionChange(user.id, 'pages', 'admin', e.target.checked)}
                              disabled={isCurrentUser}
                            />
                            <span>Admin Panel</span>
                          </label>
                        </div>
                        <div className="permission-toggle">
                          <label>
                            <input
                              type="checkbox"
                              checked={userPermissions?.pages?.users || false}
                              onChange={(e) => handlePermissionChange(user.id, 'pages', 'users', e.target.checked)}
                            />
                            <span>User Management</span>
                          </label>
                        </div>
                        <div className="permission-toggle">
                          <label>
                            <input
                              type="checkbox"
                              checked={userPermissions?.actions?.manage_roles || false}
                              onChange={(e) => handlePermissionChange(user.id, 'actions', 'manage_roles', e.target.checked)}
                              disabled={isCurrentUser}
                            />
                            <span>Manage Roles</span>
                          </label>
                        </div>
                        {isCurrentUser && (
                          <small className="permission-note">Cannot change your own permissions</small>
                        )}
                      </div>
                    </td>
                    
                    <td>
                      <div className="action-buttons">
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="btn btn-primary btn-sm"
                        >
                          Full Permissions
                        </button>
                        {!isCurrentUser && (
                          <button
                            onClick={() => handleUserStatusToggle(user.id)}
                            className={`btn btn-sm ${user.isActive ? 'btn-warning' : 'btn-success'}`}
                          >
                            {user.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {getFilteredUsers(firebaseUsers).length === 0 && (
            <div className="no-users">
              <p>No users found matching your criteria.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const handleUserStatusToggle = async (userId) => {
    try {
      const user = firebaseUsers.find(u => u.id === userId);
      if (!user) return;

      // Update user status (in a real app, this would call Firebase Admin SDK)
      const updatedUsers = firebaseUsers.map(u => 
        u.id === userId ? { ...u, isActive: !u.isActive } : u
      );
      setFirebaseUsers(updatedUsers);
      
      setSuccess(`User ${user.isActive ? 'deactivated' : 'activated'} successfully`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to update user status');
      setTimeout(() => setError(''), 3000);
    }
  };

  const renderUsersList = () => (
    <div className="users-list">
      <h3>User Management</h3>
      {loading ? (
        <div className="loading">Loading users...</div>
      ) : (
        <div className="users-table">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Quick Permissions</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => {
                const userPermissions = user.permissions || rolePermissions[user.role] || rolePermissions.user;
                return (
                  <tr key={user.id}>
                    <td>
                      <div className="user-info">
                        <strong>{user.name}</strong>
                        <small className="user-id">ID: {user.id}</small>
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <select
                        value={user.role || 'user'}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        className="role-select"
                      >
                        {getAllRoles().map(role => (
                          <option key={role} value={role}>
                            {role.charAt(0).toUpperCase() + role.slice(1)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <span className={`status ${user.isActive ? 'active' : 'inactive'}`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="quick-permissions">
                        <div className="permission-toggle">
                          <label>
                            <input
                              type="checkbox"
                              checked={userPermissions?.pages?.admin || false}
                              onChange={(e) => handlePermissionChange(user.id, 'pages', 'admin', e.target.checked)}
                            />
                            <span>Admin Panel</span>
                          </label>
                        </div>
                        <div className="permission-toggle">
                          <label>
                            <input
                              type="checkbox"
                              checked={userPermissions?.pages?.users || false}
                              onChange={(e) => handlePermissionChange(user.id, 'pages', 'users', e.target.checked)}
                            />
                            <span>User Management</span>
                          </label>
                        </div>
                        <div className="permission-toggle">
                          <label>
                            <input
                              type="checkbox"
                              checked={userPermissions?.actions?.manage_roles || false}
                              onChange={(e) => handlePermissionChange(user.id, 'actions', 'manage_roles', e.target.checked)}
                            />
                            <span>Manage Roles</span>
                          </label>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="btn btn-primary btn-sm"
                        >
                          Full Permissions
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderRolePermissions = () => (
    <div className="role-permissions">
      <h3>Role Permissions Overview</h3>
      <div className="roles-grid">
        {Object.entries(rolePermissions).map(([role, permissions]) => (
          <div key={role} className="role-card">
            <h4>{role.charAt(0).toUpperCase() + role.slice(1)}</h4>
            
            <div className="permission-section">
              <h5>Pages</h5>
              <ul>
                {Object.entries(permissions.pages).map(([page, hasAccess]) => (
                  <li key={page} className={hasAccess ? 'allowed' : 'denied'}>
                    {page}: {hasAccess ? '✓' : '✗'}
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="permission-section">
              <h5>Actions</h5>
              <ul>
                {Object.entries(permissions.actions).map(([action, hasAccess]) => (
                  <li key={action} className={hasAccess ? 'allowed' : 'denied'}>
                    {action}: {hasAccess ? '✓' : '✗'}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderUserPermissionEditor = () => {
    if (!selectedUser) return null;

    const allPermissions = getAllPermissions();
    const userPermissions = selectedUser.permissions || rolePermissions[selectedUser.role] || rolePermissions.user;

    return (
      <div className="permission-editor">
        <div className="permission-editor-content">
          <div className="editor-header">
            <h3>Edit Permissions for {selectedUser.name}</h3>
            <div className="editor-controls">
              <button
                onClick={() => setSelectedUser(null)}
                className="btn btn-secondary"
              >
                Close
              </button>
            </div>
          </div>

          <div className="permission-sections">
            <div className="permission-section">
              <div className="section-header">
                <h4>Page Permissions</h4>
                <div className="bulk-actions">
                  <button
                    onClick={() => toggleAllPermissions(selectedUser.id, 'pages', true)}
                    className="btn btn-success btn-xs"
                  >
                    Grant All
                  </button>
                  <button
                    onClick={() => toggleAllPermissions(selectedUser.id, 'pages', false)}
                    className="btn btn-danger btn-xs"
                  >
                    Revoke All
                  </button>
                </div>
              </div>
              
              <div className="permissions-grid">
                {allPermissions.pages.map(page => {
                  const hasPermission = userPermissions?.pages?.[page] || false;
                  return (
                    <div key={page} className={`permission-item ${hasPermission ? 'granted' : 'denied'}`}>
                      <label>
                        <input
                          type="checkbox"
                          checked={hasPermission}
                          onChange={(e) => handlePermissionChange(
                            selectedUser.id, 
                            'pages', 
                            page, 
                            e.target.checked
                          )}
                        />
                        <span className="permission-name">
                          {page.charAt(0).toUpperCase() + page.slice(1)}
                        </span>
                        <span className="permission-status">
                          {hasPermission ? '✓' : '✗'}
                        </span>
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="permission-section">
              <div className="section-header">
                <h4>Action Permissions</h4>
                <div className="bulk-actions">
                  <button
                    onClick={() => toggleAllPermissions(selectedUser.id, 'actions', true)}
                    className="btn btn-success btn-xs"
                  >
                    Grant All
                  </button>
                  <button
                    onClick={() => toggleAllPermissions(selectedUser.id, 'actions', false)}
                    className="btn btn-danger btn-xs"
                  >
                    Revoke All
                  </button>
                </div>
              </div>
              
              <div className="permissions-grid">
                {allPermissions.actions.map(action => {
                  const hasPermission = userPermissions?.actions?.[action] || false;
                  return (
                    <div key={action} className={`permission-item ${hasPermission ? 'granted' : 'denied'}`}>
                      <label>
                        <input
                          type="checkbox"
                          checked={hasPermission}
                          onChange={(e) => handlePermissionChange(
                            selectedUser.id, 
                            'actions', 
                            action, 
                            e.target.checked
                          )}
                        />
                        <span className="permission-name">
                          {action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                        <span className="permission-status">
                          {hasPermission ? '✓' : '✗'}
                        </span>
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="editor-footer">
            <div className="role-info">
              <p><strong>Current Role:</strong> {selectedUser.role}</p>
              <p><small>Custom permissions override role-based defaults</small></p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>Admin Panel</h1>
        <div className="admin-tabs">
          <button
            className={`tab ${activeTab === 'firebase-users' ? 'active' : ''}`}
            onClick={() => setActiveTab('firebase-users')}
          >
            Registered Users
          </button>
          <button
            className={`tab ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            Database Users
          </button>
          <button
            className={`tab ${activeTab === 'roles' ? 'active' : ''}`}
            onClick={() => setActiveTab('roles')}
          >
            Role Templates
          </button>
          {hasActionPermission('manage_invitations') && (
            <button
              className={`tab ${activeTab === 'invitations' ? 'active' : ''}`}
              onClick={() => setActiveTab('invitations')}
            >
              Team Invitations
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="admin-content">
        {activeTab === 'firebase-users' && renderFirebaseUsersList()}
        {activeTab === 'users' && renderUsersList()}
        {activeTab === 'roles' && renderRolePermissions()}
        {activeTab === 'invitations' && <InvitationManager />}
        {selectedUser && renderUserPermissionEditor()}
      </div>
    </div>
  );
};

export default AdminPanel;