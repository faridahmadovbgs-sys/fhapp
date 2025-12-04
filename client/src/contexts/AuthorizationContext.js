import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { getUserRoleFromDatabase } from '../services/roleService';
import apiService from '../services/apiService';

// Create the AuthorizationContext
const AuthorizationContext = createContext();

// Custom hook to use the AuthorizationContext
export const useAuthorization = () => {
  const context = useContext(AuthorizationContext);
  if (!context) {
    throw new Error('useAuthorization must be used within an AuthorizationProvider');
  }
  return context;
};

// Default permissions structure
const defaultPermissions = {
  pages: {
    home: true,
    about: true,
    profile: true,
    admin: false,
    users: false,
    reports: false,
    settings: false
  },
  actions: {
    create_user: false,
    edit_user: false,
    delete_user: false,
    view_users: false,
    manage_roles: false,
    export_data: false,
    view_analytics: false,
    system_settings: false
  }
};

// Role-based default permissions
const rolePermissions = {
  user: {
    pages: {
      home: true,
      about: true,
      profile: true,
      admin: false,
      users: false,
      reports: false,
      settings: false
    },
    actions: {
      create_user: false,
      edit_user: false,
      delete_user: false,
      view_users: false,
      manage_roles: false,
      export_data: false,
      view_analytics: false,
      system_settings: false
    }
  },
  admin: {
    pages: {
      home: true,
      about: true,
      profile: true,
      admin: true,
      users: true,
      reports: true,
      settings: true
    },
    actions: {
      create_user: true,
      edit_user: true,
      delete_user: true,
      view_users: true,
      manage_roles: true,
      export_data: true,
      view_analytics: true,
      system_settings: true
    }
  },
  account_owner: {
    pages: {
      home: true,
      about: true,
      profile: true,
      admin: true,
      users: true,
      reports: true,
      settings: true,
      invitations: true,
      billing: true,
      account_owner: true
    },
    actions: {
      create_user: true,
      edit_user: true,
      delete_user: true,
      view_users: true,
      manage_roles: true,
      export_data: true,
      view_analytics: true,
      system_settings: true,
      manage_invitations: true,
      manage_billing: true,
      delete_account: false,
      transfer_ownership: false
    }
  },
  sub_account_owner: {
    pages: {
      home: true,
      about: true,
      profile: true,
      admin: false,
      users: false,
      reports: false,
      settings: false,
      invitations: true,
      billing: true,
      account_owner: false
    },
    actions: {
      create_user: false,
      edit_user: false,
      delete_user: false,
      view_users: false,
      manage_roles: false,
      export_data: false,
      view_analytics: false,
      system_settings: false,
      manage_invitations: true,
      manage_billing: true,
      delete_account: false,
      transfer_ownership: false
    }
  }
};

// AuthorizationProvider component
export const AuthorizationProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [permissions, setPermissions] = useState(defaultPermissions);
  const [userRole, setUserRole] = useState('user');
  const [loading, setLoading] = useState(true);

  // Fetch user permissions when user changes
  useEffect(() => {
    const fetchUserPermissions = async () => {
      if (isAuthenticated && user) {
        try {
          // Handle both uid and id properties
          const userId = user.uid || user.id;
          
          if (!userId) {
            setUserRole('user');
            setPermissions(rolePermissions.user);
            return;
          }
          
          // Get role directly from Firebase database
          console.log('🔍 Fetching role for user:', userId);
          const roleFromDB = await getUserRoleFromDatabase(userId);
          console.log('✅ Role fetched from DB:', roleFromDB);
          
          setUserRole(roleFromDB);
          setPermissions(rolePermissions[roleFromDB] || rolePermissions.user);
          console.log('✅ Permissions set for role:', roleFromDB, rolePermissions[roleFromDB]);
          
          // Store in localStorage for faster subsequent loads
          localStorage.setItem(`role_${userId}`, roleFromDB);
          if (roleFromDB === 'admin') {
            localStorage.setItem(`admin_${userId}`, 'true');
          }
          
        } catch (error) {
          console.error('Error fetching user role:', error);
          setUserRole('user');
          setPermissions(rolePermissions.user);
        }
      } else {
        // Reset permissions for unauthenticated users
        setPermissions(defaultPermissions);
        setUserRole('user');
      }
      setLoading(false);
    };

    fetchUserPermissions();
  }, [user, isAuthenticated]);

  // Listen for organization role changes
  useEffect(() => {
    const handleOrgRoleChange = (event) => {
      const { role } = event.detail;
      if (role) {
        console.log('🔄 [AuthContext] Organization role changed to:', role);
        setUserRole(role);
        setPermissions(rolePermissions[role] || rolePermissions.user);
      }
    };

    window.addEventListener('organizationRoleChanged', handleOrgRoleChange);
    
    return () => {
      window.removeEventListener('organizationRoleChanged', handleOrgRoleChange);
    };
  }, []);

  // Check if user has permission for a specific page
  const hasPagePermission = (pageName) => {
    if (!isAuthenticated) return false;
    return permissions?.pages?.[pageName] || false;
  };

  // Check if user has permission for a specific action
  const hasActionPermission = (actionName) => {
    if (!isAuthenticated) return false;
    return permissions?.actions?.[actionName] || false;
  };

  // Check if user has a specific role
  const hasRole = (roleName) => {
    if (!isAuthenticated) return false;
    return userRole === roleName;
  };

  // Check if user has any of the specified roles
  const hasAnyRole = (roleNames) => {
    if (!isAuthenticated || !Array.isArray(roleNames)) return false;
    return roleNames.includes(userRole);
  };

  // Update user permissions (for admin use)
  const updateUserPermissions = async (userId, newPermissions) => {
    try {
      const response = await apiService.put(`/api/users/${userId}/permissions`, {
        permissions: newPermissions
      });
      
      // If updating current user, refresh permissions
      if (userId === user?.id) {
        setPermissions(newPermissions);
      }
      
      return response.data;
    } catch (error) {
      console.error('Failed to update user permissions:', error);
      throw error;
    }
  };

  // Update user role (for admin use)
  const updateUserRole = async (userId, newRole) => {
    try {
      const response = await apiService.put(`/api/users/${userId}/role`, {
        role: newRole
      });
      
      // If updating current user, refresh permissions
      if (userId === user?.id) {
        setUserRole(newRole);
        setPermissions(rolePermissions[newRole] || rolePermissions.user);
      }
      
      return response.data;
    } catch (error) {
      console.error('Failed to update user role:', error);
      throw error;
    }
  };

  // Get all available permissions
  const getAllPermissions = () => {
    return {
      pages: Object.keys(defaultPermissions.pages),
      actions: Object.keys(defaultPermissions.actions)
    };
  };

  // Get all available roles
  const getAllRoles = () => {
    return Object.keys(rolePermissions);
  };

  // Update role permissions (for admin use)
  const updateRolePermissions = async (role, newPermissions) => {
    try {
      // In a real application, you would save this to a backend or Firestore
      // For now, we'll update the local state
      
      // Update the rolePermissions object
      rolePermissions[role] = newPermissions;
      
      // If the current user has this role, update their permissions too
      if (userRole === role) {
        setPermissions(newPermissions);
      }
      
      console.log(`Updated permissions for role: ${role}`, newPermissions);
      return true;
    } catch (error) {
      console.error('Failed to update role permissions:', error);
      throw error;
    }
  };

  // Update role for organization context (called when switching orgs)
  const setOrganizationRole = (orgRole) => {
    if (!orgRole) return;
    
    console.log('🔄 [AuthContext] Setting organization role:', orgRole);
    setUserRole(orgRole);
    setPermissions(rolePermissions[orgRole] || rolePermissions.user);
  };

  const value = {
    permissions,
    userRole,
    loading,
    hasPagePermission,
    hasActionPermission,
    hasRole,
    hasAnyRole,
    updateUserPermissions,
    updateUserRole,
    setOrganizationRole,
    getAllPermissions,
    getAllRoles,
    rolePermissions,
    updateRolePermissions
  };

  return (
    <AuthorizationContext.Provider value={value}>
      {children}
    </AuthorizationContext.Provider>
  );
};

export default AuthorizationContext;