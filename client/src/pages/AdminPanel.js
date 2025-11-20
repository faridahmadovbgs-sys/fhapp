import React, { useState, useEffect } from 'react';
import { useAuthorization } from '../contexts/AuthorizationContext';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/apiService';
import { getUserOrganizations, createOrganization } from '../services/organizationService';
import OrganizationMembers from './OrganizationMembers';
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
  const [organizations, setOrganizations] = useState([]);
  const [orgLoading, setOrgLoading] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');

  // Fetch all users
  useEffect(() => {
    const fetchUsersData = async () => {
      try {
        setLoading(true);
        const response = await apiService.get('/api/users');
        // Backend returns { success, message }, not an array
        // Fallback to Firebase users list for now
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
        setUsers(Array.isArray(response.data) ? response.data : mockUsers);
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
          }
        ];
        setUsers(mockUsers);
        console.error('Error fetching users:', err);
      } finally {
        setLoading(false);
      }
    };

    const fetchFirebaseUsersData = async () => {
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

    if (activeTab === 'users') {
      fetchUsersData();
    } else if (activeTab === 'firebase-users') {
      fetchFirebaseUsersData();
    } else if (activeTab === 'organizations') {
      fetchOrganizations();
    }
  }, [activeTab, currentUser, rolePermissions]);

  // Fetch user's organizations
  const fetchOrganizations = async () => {
    if (!currentUser) return;
    
    try {
      setOrgLoading(true);
      const result = await getUserOrganizations(currentUser.id);
      setOrganizations(result.organizations);
    } catch (err) {
      console.error('Error fetching organizations:', err);
      setError('Failed to load organizations');
    } finally {
      setOrgLoading(false);
    }
  };

  // Create new organization
  const handleCreateOrganization = async (e) => {
    e.preventDefault();
    if (!newOrgName.trim()) {
      setError('Organization name is required');
      return;
    }

    try {
      setOrgLoading(true);
      await createOrganization(currentUser.id, currentUser.email, newOrgName.trim());
      setSuccess(`Organization "${newOrgName}" created successfully!`);
      setNewOrgName('');
      await fetchOrganizations();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error creating organization:', err);
      setError('Failed to create organization');
      setTimeout(() => setError(''), 3000);
    } finally {
      setOrgLoading(false);
    }
  };

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

  const handleRoleChange = async (userId, newRole) => {
    try {
      await updateUserRole(userId, newRole);
      setSuccess(`User role updated to ${newRole}`);
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

  const renderOrganizations = () => (
    <div className="organizations-management">
      <div className="list-header">
        <h3>My Organizations</h3>
        <p className="header-description">
          Create and manage your organizations. Each organization can have its own teams and members.
        </p>
      </div>

      {/* Create New Organization Form */}
      <div className="create-org-section" style={{
        background: '#f8f9fa',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h4>Create New Organization</h4>
        <form onSubmit={handleCreateOrganization} style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
          <input
            type="text"
            value={newOrgName}
            onChange={(e) => setNewOrgName(e.target.value)}
            placeholder="Enter organization name..."
            disabled={orgLoading}
            style={{
              flex: 1,
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          />
          <button
            type="submit"
            disabled={orgLoading || !newOrgName.trim()}
            style={{
              padding: '10px 24px',
              background: '#6264a7',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: orgLoading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            {orgLoading ? 'Creating...' : 'Create Organization'}
          </button>
        </form>
      </div>

      {/* Organizations List */}
      {orgLoading && organizations.length === 0 ? (
        <div className="loading">Loading organizations...</div>
      ) : organizations.length === 0 ? (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          background: '#f8f9fa',
          borderRadius: '8px',
          color: '#666'
        }}>
          <p>You haven't created any organizations yet.</p>
          <p><small>Create your first organization above to get started!</small></p>
        </div>
      ) : (
        <div className="organizations-list">
          {organizations.map((org) => (
            <div key={org.id} style={{
              border: '1px solid #e1dfdd',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '15px',
              background: 'white'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <h4 style={{ margin: '0 0 10px 0', color: '#252423' }}>{org.name}</h4>
                  <div style={{ fontSize: '14px', color: '#605e5c' }}>
                    <p style={{ margin: '5px 0' }}>
                      <strong>Organization ID:</strong> {org.id}
                    </p>
                    <p style={{ margin: '5px 0' }}>
                      <strong>Members:</strong> {org.members?.length || 0}
                    </p>
                    <p style={{ margin: '5px 0' }}>
                      <strong>Created:</strong> {org.createdAt?.toDate ? new Date(org.createdAt.toDate()).toLocaleDateString() : 'N/A'}
                    </p>
                    <p style={{ margin: '5px 0' }}>
                      <strong>Status:</strong> <span style={{
                        padding: '2px 8px',
                        borderRadius: '12px',
                        background: org.status === 'active' ? '#d4edda' : '#f8d7da',
                        color: org.status === 'active' ? '#155724' : '#721c24',
                        fontSize: '12px'
                      }}>{org.status || 'active'}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

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
          <button
            className={`tab ${activeTab === 'organizations' ? 'active' : ''}`}
            onClick={() => setActiveTab('organizations')}
          >
            My Organizations
          </button>
          <button
            className={`tab ${activeTab === 'members' ? 'active' : ''}`}
            onClick={() => setActiveTab('members')}
          >
            Organization Members
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="admin-content">
        {activeTab === 'firebase-users' && renderFirebaseUsersList()}
        {activeTab === 'users' && renderUsersList()}
        {activeTab === 'roles' && renderRolePermissions()}
        {activeTab === 'organizations' && renderOrganizations()}
        {activeTab === 'members' && <OrganizationMembers />}
        {selectedUser && renderUserPermissionEditor()}
      </div>
    </div>
  );
};

export default AdminPanel;