import React, { useState, useEffect } from 'react';
import { useAuthorization } from '../contexts/AuthorizationContext';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/apiService';
import { getAllUserOrganizations, createOrganization } from '../services/organizationService';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import '../components/AdminPanel.css';

const AdminPanel = () => {
  const { 
    hasPagePermission, 
    hasActionPermission, 
    getAllPermissions, 
    getAllRoles,
    rolePermissions,
    updateUserPermissions,
    updateUserRole,
    userRole
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
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [selectedRoleTemplate, setSelectedRoleTemplate] = useState('admin');

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
        
        if (!db) {
          throw new Error('Firestore not available');
        }

        // For account owners, fetch their organizations first
        if (userRole === 'account_owner' || userRole === 'sub_account_owner') {
          const orgsResult = await getAllUserOrganizations(currentUser.id);
          const orgs = orgsResult.organizations || [];
          setOrganizations(orgs);
          
          // Auto-select first organization if not selected
          if (orgs.length > 0 && !selectedOrg) {
            setSelectedOrg(orgs[0]);
          }
          
          // If no organizations, show empty list
          if (orgs.length === 0) {
            setFirebaseUsers([]);
            setFirebaseLoading(false);
            return;
          }
          
          // Get the current selected organization or first one
          const currentOrg = selectedOrg || orgs[0];
          const memberIds = currentOrg.members || [];
          
          console.log('🔍 Organization:', currentOrg.name);
          console.log('📋 Member IDs in organization:', memberIds);
          
          // Fetch only organization members (both users and sub-profiles)
          const usersList = [];
          
          // Fetch all users
          const usersSnapshot = await getDocs(collection(db, 'users'));
          const usersMap = new Map();
          usersSnapshot.forEach((doc) => {
            const userData = doc.data();
            usersMap.set(userData.uid, {
              id: doc.id,
              uid: userData.uid,
              email: userData.email || 'N/A',
              name: userData.name || userData.fullName || userData.email?.split('@')[0] || 'Unknown',
              emailVerified: userData.emailVerified || false,
              role: userData.role || 'user',
              isActive: true,
              createdAt: userData.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
              lastSignIn: userData.lastSignIn?.toDate?.()?.toISOString() || userData.lastLoginAt?.toDate?.()?.toISOString() || null,
              photoURL: userData.photoURL || userData.profilePictureUrl || null,
              organizationId: userData.organizationId || currentOrg.id,
              subAccountName: userData.subAccountName || null,
              invitedBy: userData.invitedBy || null,
              ownerUserId: userData.ownerUserId || null,
              permissions: rolePermissions[userData.role || 'user'] || rolePermissions.user
            });
          });
          
          // Fetch all sub-profiles
          const subProfilesSnapshot = await getDocs(collection(db, 'subProfiles'));
          const subProfilesMap = new Map();
          subProfilesSnapshot.forEach((doc) => {
            const profileData = doc.data();
            console.log('📝 Sub Profile:', doc.id, profileData.accountName);
            subProfilesMap.set(doc.id, {
              id: doc.id,
              userId: profileData.userId,
              email: profileData.email || 'N/A',
              name: `${profileData.accountName} (${profileData.accountType || 'Sub Profile'})`,
              displayName: profileData.accountName,
              accountType: profileData.accountType,
              entityName: profileData.entityName,
              isSubProfile: true,
              emailVerified: true,
              role: 'member',
              isActive: true,
              createdAt: profileData.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
              permissions: rolePermissions.member || rolePermissions.user
            });
          });
          
          // Now match memberIds with users or sub-profiles
          memberIds.forEach((memberId) => {
            console.log('🔎 Checking member ID:', memberId);
            // Check if it's a user
            if (usersMap.has(memberId)) {
              const userData = usersMap.get(memberId);
              console.log('✅ Found as user:', userData.name);
              usersList.push(userData);
            }
            // Check if it's a sub-profile
            else if (subProfilesMap.has(memberId)) {
              const profileData = subProfilesMap.get(memberId);
              console.log('✅ Found as sub-profile:', profileData.name);
              usersList.push(profileData);
            }
            else {
              console.log('❌ Not found in users or sub-profiles');
            }
          });
          
          // Sort users: account_owner first, then others
          usersList.sort((a, b) => {
            if (a.role === 'account_owner' && b.role !== 'account_owner') return -1;
            if (a.role !== 'account_owner' && b.role === 'account_owner') return 1;
            return 0;
          });
          
          setFirebaseUsers(usersList);
          setError('');
          setFirebaseLoading(false);
          return;
        }

        // For admins, fetch all users
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const usersList = [];
        
        usersSnapshot.forEach((doc) => {
          const userData = doc.data();
          usersList.push({
            id: doc.id,
            email: userData.email || 'N/A',
            name: userData.name || userData.fullName || userData.email?.split('@')[0] || 'Unknown',
            emailVerified: userData.emailVerified || false,
            role: userData.role || 'user',
            isActive: true,
            createdAt: userData.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
            lastSignIn: userData.lastSignIn?.toDate?.()?.toISOString() || userData.lastLoginAt?.toDate?.()?.toISOString() || null,
            photoURL: userData.photoURL || userData.profilePictureUrl || null,
            subAccountName: userData.subAccountName || null,
            invitedBy: userData.invitedBy || null,
            ownerUserId: userData.ownerUserId || null,
            permissions: rolePermissions[userData.role || 'user'] || rolePermissions.user
          });
        });

        // Sort users: account_owner first, then others
        usersList.sort((a, b) => {
          if (a.role === 'account_owner' && b.role !== 'account_owner') return -1;
          if (a.role !== 'account_owner' && b.role === 'account_owner') return 1;
          return 0;
        });

        setFirebaseUsers(usersList);
        setError('');
      } catch (err) {
        console.error('Error fetching users from Firestore:', err);
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
  }, [activeTab, currentUser, rolePermissions, selectedOrg]);

  // Fetch user's organizations
  const fetchOrganizations = async () => {
    if (!currentUser) return;
    
    try {
      setOrgLoading(true);
      const result = await getAllUserOrganizations(currentUser.id);
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
      // Find the target user
      const targetUser = firebaseUsers.find(u => u.id === userId);
      
      // Only admins can change account owner roles
      if (targetUser?.role === 'account_owner' && userRole !== 'admin') {
        setError('Only admins can change account owner privileges');
        setTimeout(() => setError(''), 3000);
        return;
      }
      
      // Prevent changing to account_owner unless you're an admin
      if (newRole === 'account_owner' && userRole !== 'admin') {
        setError('Only admins can promote users to account owner');
        setTimeout(() => setError(''), 3000);
        return;
      }
      
      // Update role directly in Firestore
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        role: newRole
      });
      
      setSuccess(`User role updated to ${newRole.replace('_', ' ')}`);
      setTimeout(() => setSuccess(''), 3000);
      
      // Reload users list to reflect changes
      const updatedUsers = firebaseUsers.map(u => 
        u.id === userId ? { ...u, role: newRole, permissions: rolePermissions[newRole] || rolePermissions.user } : u
      );
      setFirebaseUsers(updatedUsers);
    } catch (err) {
      console.error('Error updating role:', err);
      setError('Failed to update user role: ' + err.message);
      setTimeout(() => setError(''), 3000);
    }
  };

  const handlePermissionChange = async (userId, permissionType, permissionName, value) => {
    try {
      const user = firebaseUsers.find(u => u.id === userId);
      if (!user) return;

      // Only admins can change account owner permissions
      if (user.role === 'account_owner' && userRole !== 'admin') {
        setError('Only admins can change account owner permissions');
        setTimeout(() => setError(''), 3000);
        return;
      }

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

  // Filter and sort users based on search, role, and hierarchy
  const getFilteredUsers = (usersList) => {
    const filtered = usersList.filter(user => {
      const matchesSearch = !searchTerm || 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRole = filterRole === 'all' || user.role === filterRole;
      
      return matchesSearch && matchesRole;
    });

    // Sort by hierarchy: Account Owner → Sub Account Owners → Members, then by registration date
    return filtered.sort((a, b) => {
      // Define role hierarchy order
      const roleOrder = {
        'account_owner': 1,
        'sub_account_owner': 2,
        'user': 3,
        'admin': 0 // Admins first if they exist
      };

      const aOrder = roleOrder[a.role] || 999;
      const bOrder = roleOrder[b.role] || 999;

      // First sort by role hierarchy
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }

      // Within same role, sort by registration date (oldest first)
      const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return aDate - bDate;
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
        {/* Organization Selector for Account Owners */}
        {(userRole === 'account_owner' || userRole === 'sub_account_owner') && organizations.length > 0 && (
          <div className="organization-selector" style={{
            padding: '12px 15px',
            background: '#f8f9fa',
            borderRadius: '6px',
            border: '1px solid #e0e0e0',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap'
          }}>
            <label style={{fontWeight: '600', color: '#252423', fontSize: '13px'}}>
              Select Organization:
            </label>
            <select
              value={selectedOrg?.id || ''}
              onChange={(e) => {
                const org = organizations.find(o => o.id === e.target.value);
                setSelectedOrg(org);
              }}
              style={{
                padding: '7px 12px',
                borderRadius: '4px',
                border: '1px solid #d0d0d0',
                fontSize: '13px',
                minWidth: '220px',
                background: 'white'
              }}
            >
              {organizations.map(org => (
                <option key={org.id} value={org.id}>
                  {org.name} ({org.members?.length || 0} members)
                </option>
              ))}
            </select>
            <span style={{color: '#605e5c', fontSize: '13px'}}>
              Managing users in: <strong>{selectedOrg?.name}</strong>
            </span>
          </div>
        )}
        
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
                {role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' ')}
              </option>
            ))}
          </select>
          
          <div className="user-stats">
            <span className="stat">
              Total Users: {firebaseUsers.length}
            </span>
            <span className="stat">
              Filtered: {getFilteredUsers(firebaseUsers).length}
            </span>
          </div>
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
                <th>Hierarchy</th>
                <th>Activity</th>
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
                          {user.role === 'sub_account_owner' && user.subAccountName && (
                            <span style={{
                              display: 'block',
                              fontSize: '12px',
                              color: '#0078d4',
                              fontWeight: '600',
                              marginTop: '2px'
                            }}>
                              📋 {user.subAccountName}
                            </span>
                          )}
                          {user.role === 'user' && user.invitedBy && (() => {
                            const inviter = firebaseUsers.find(u => u.id === user.invitedBy);
                            if (inviter?.subAccountName) {
                              return (
                                <span style={{
                                  display: 'block',
                                  fontSize: '11px',
                                  color: '#666',
                                  fontStyle: 'italic',
                                  marginTop: '2px'
                                }}>
                                  Under: {inviter.subAccountName}
                                </span>
                              );
                            }
                            return null;
                          })()}
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
                          disabled={isCurrentUser || (user.role === 'account_owner' && userRole !== 'admin')}
                        >
                          {(userRole === 'account_owner' || userRole === 'sub_account_owner') ? (
                            // Account owners can only set member or sub_account_owner
                            <>
                              <option value="user">Member</option>
                              <option value="sub_account_owner">Sub Account Owner</option>
                            </>
                          ) : (
                            // Admins see all roles
                            getAllRoles().map(role => (
                              <option key={role} value={role}>
                                {role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' ')}
                              </option>
                            ))
                          )}
                        </select>
                        <span className={`status ${user.isActive ? 'active' : 'inactive'}`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                        {isCurrentUser && (
                          <small className="role-note">Cannot change your own role</small>
                        )}
                        {user.role === 'account_owner' && userRole !== 'admin' && !isCurrentUser && (
                          <small className="role-note">Only admins can modify account owners</small>
                        )}
                      </div>
                    </td>
                    
                    <td>
                      <div className="hierarchy-info" style={{
                        fontSize: '13px',
                        color: '#605e5c'
                      }}>
                        {user.role === 'account_owner' ? (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 10px',
                            backgroundColor: '#fff4e5',
                            borderRadius: '6px',
                            border: '1px solid #ffd700',
                            fontWeight: '600'
                          }}>
                            <span style={{ fontSize: '16px' }}>👑</span>
                            <span>Organization Owner</span>
                          </div>
                        ) : user.role === 'sub_account_owner' ? (
                          <div>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 10px',
                              backgroundColor: '#e3f2fd',
                              borderRadius: '6px',
                              border: '1px solid #2196f3',
                              fontWeight: '600',
                              marginBottom: '6px'
                            }}>
                              <span style={{ fontSize: '14px' }}>👤</span>
                              <span>Sub Account Owner</span>
                            </div>
                            {user.invitedBy && (
                              <div style={{ paddingLeft: '8px', fontSize: '12px' }}>
                                <span style={{ color: '#999' }}>Invited by:</span>
                                <br />
                                <span style={{ fontWeight: '500' }}>
                                  {(() => {
                                    const inviter = firebaseUsers.find(u => u.id === user.invitedBy);
                                    return inviter ? inviter.name : 'Account Owner';
                                  })()}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 10px',
                              backgroundColor: '#f5f5f5',
                              borderRadius: '6px',
                              border: '1px solid #ddd',
                              marginBottom: '6px'
                            }}>
                              <span style={{ fontSize: '14px' }}>👥</span>
                              <span>Member</span>
                            </div>
                            {user.invitedBy && (
                              <div style={{ paddingLeft: '8px', fontSize: '12px' }}>
                                <span style={{ color: '#999' }}>Invited by:</span>
                                <br />
                                <span style={{ fontWeight: '500' }}>
                                  {(() => {
                                    const inviter = firebaseUsers.find(u => u.id === user.invitedBy);
                                    if (!inviter) return 'Account Owner';
                                    return inviter.subAccountName || inviter.name;
                                  })()}
                                </span>
                              </div>
                            )}
                          </div>
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
                      <div className="action-buttons">
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

  const renderRolePermissions = () => {
    const selectedPermissions = rolePermissions[selectedRoleTemplate] || rolePermissions.user;
    
    return (
      <div className="role-permissions">
        <div className="list-header">
          <h3>Role Permissions Templates</h3>
          <p className="header-description">
            View default permissions for each role template
          </p>
        </div>

        {/* Role Selector */}
        <div className="role-selector" style={{
          marginBottom: '20px',
          padding: '15px',
          background: '#f8f9fa',
          borderRadius: '6px',
          border: '1px solid #e0e0e0',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <label style={{fontWeight: '600', color: '#252423', fontSize: '13px'}}>
            Select Role:
          </label>
          <select
            value={selectedRoleTemplate}
            onChange={(e) => setSelectedRoleTemplate(e.target.value)}
            style={{
              padding: '7px 12px',
              borderRadius: '4px',
              border: '1px solid #d0d0d0',
              fontSize: '13px',
              minWidth: '200px',
              background: 'white'
            }}
          >
            {Object.keys(rolePermissions).map(role => (
              <option key={role} value={role}>
                {role.charAt(0).toUpperCase() + role.slice(1).replace(/_/g, ' ')}
              </option>
            ))}
          </select>
          <span style={{color: '#605e5c', fontSize: '13px'}}>
            Viewing permissions for: <strong>{selectedRoleTemplate.replace(/_/g, ' ')}</strong>
          </span>
        </div>

        {/* Page Permissions Table */}
        <div style={{ marginBottom: '25px' }}>
          <h4 style={{ marginBottom: '12px', fontSize: '15px', fontWeight: '600', color: '#333' }}>
            Page Access Permissions
          </h4>
          <div className="users-table">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '50%' }}>Page</th>
                  <th style={{ width: '25%', textAlign: 'center' }}>Access</th>
                  <th style={{ width: '25%', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(selectedPermissions.pages).map(([page, hasAccess]) => (
                  <tr key={page}>
                    <td>
                      <strong style={{ fontSize: '13px', color: '#333' }}>
                        {page.charAt(0).toUpperCase() + page.slice(1).replace(/_/g, ' ')}
                      </strong>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: '18px' }}>
                        {hasAccess ? '✓' : '✗'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge ${hasAccess ? 'badge-success' : 'badge-secondary'}`}>
                        {hasAccess ? 'Allowed' : 'Denied'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Permissions Table */}
        <div>
          <h4 style={{ marginBottom: '12px', fontSize: '15px', fontWeight: '600', color: '#333' }}>
            Action Permissions
          </h4>
          <div className="users-table">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '50%' }}>Action</th>
                  <th style={{ width: '25%', textAlign: 'center' }}>Access</th>
                  <th style={{ width: '25%', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(selectedPermissions.actions).map(([action, hasAccess]) => (
                  <tr key={action}>
                    <td>
                      <strong style={{ fontSize: '13px', color: '#333' }}>
                        {action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </strong>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: '18px' }}>
                        {hasAccess ? '✓' : '✗'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge ${hasAccess ? 'badge-success' : 'badge-secondary'}`}>
                        {hasAccess ? 'Allowed' : 'Denied'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

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
          {userRole === 'admin' && (
            <button
              className={`tab ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              Database Users
            </button>
          )}
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
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="admin-content">
        {activeTab === 'firebase-users' && renderFirebaseUsersList()}
        {activeTab === 'users' && userRole === 'admin' && renderUsersList()}
        {activeTab === 'roles' && renderRolePermissions()}
        {activeTab === 'organizations' && renderOrganizations()}
        {selectedUser && renderUserPermissionEditor()}
      </div>
    </div>
  );
};

export default AdminPanel;