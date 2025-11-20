import { useAuthorization } from '../contexts/AuthorizationContext';
import { useAuth } from '../contexts/AuthContext';

// Hook for checking page permissions
export const usePagePermission = (pageName) => {
  const { hasPagePermission, loading } = useAuthorization();
  
  return {
    hasPermission: hasPagePermission(pageName),
    loading
  };
};

// Hook for checking action permissions
export const useActionPermission = (actionName) => {
  const { hasActionPermission, loading } = useAuthorization();
  
  return {
    hasPermission: hasActionPermission(actionName),
    loading
  };
};

// Hook for checking role permissions
export const useRolePermission = (roleName) => {
  const { hasRole, loading } = useAuthorization();
  
  return {
    hasRole: hasRole(roleName),
    loading
  };
};

// Hook for checking multiple roles
export const useAnyRolePermission = (roleNames) => {
  const { hasAnyRole, loading } = useAuthorization();
  
  return {
    hasAnyRole: hasAnyRole(roleNames),
    loading
  };
};

// Comprehensive permission hook
export const usePermissions = () => {
  const { isAuthenticated } = useAuth();
  const {
    hasPagePermission,
    hasActionPermission,
    hasRole,
    hasAnyRole,
    permissions,
    userRole,
    loading
  } = useAuthorization();

  // Check if user can perform a specific action
  const canPerform = (action) => {
    if (!isAuthenticated) return false;
    return hasActionPermission(action);
  };

  // Check if user can access a specific page
  const canAccess = (page) => {
    if (!isAuthenticated) return false;
    return hasPagePermission(page);
  };

  // Check if user has admin privileges
  const isAdmin = () => {
    return hasRole('admin');
  };

  // Check if user has moderator or admin privileges
  const isModerator = () => {
    return hasAnyRole(['admin', 'moderator']);
  };

  // Check if user can manage other users
  const canManageUsers = () => {
    return canPerform('manage_roles') || canPerform('edit_user');
  };

  // Check if user can view analytics/reports
  const canViewAnalytics = () => {
    return canPerform('view_analytics') || canAccess('reports');
  };

  // Check if user can export data
  const canExportData = () => {
    return canPerform('export_data');
  };

  // Check if user can access system settings
  const canAccessSettings = () => {
    return canPerform('system_settings') || canAccess('settings');
  };

  return {
    // Raw permission functions
    hasPagePermission,
    hasActionPermission,
    hasRole,
    hasAnyRole,
    
    // User info
    permissions,
    userRole,
    isAuthenticated,
    loading,
    
    // Convenience functions
    canPerform,
    canAccess,
    isAdmin,
    isModerator,
    canManageUsers,
    canViewAnalytics,
    canExportData,
    canAccessSettings
  };
};

// Hook for conditional API calls based on permissions
export const usePermissionedAPI = () => {
  const { hasActionPermission, loading } = useAuthorization();
  const { isAuthenticated } = useAuth();

  const executeIfPermitted = async (actionName, apiCall) => {
    if (!isAuthenticated) {
      throw new Error('User not authenticated');
    }

    if (!hasActionPermission(actionName)) {
      throw new Error(`Permission denied for action: ${actionName}`);
    }

    return await apiCall();
  };

  return {
    executeIfPermitted,
    loading
  };
};

// Hook for form field permissions
export const useFieldPermission = () => {
  const { hasActionPermission, hasRole } = useAuthorization();

  const canEditField = (fieldName, requiredAction = null, requiredRole = null) => {
    if (requiredRole && !hasRole(requiredRole)) {
      return false;
    }

    if (requiredAction && !hasActionPermission(requiredAction)) {
      return false;
    }

    return true;
  };

  const getFieldProps = (fieldName, requiredAction = null, requiredRole = null) => {
    const canEdit = canEditField(fieldName, requiredAction, requiredRole);
    
    return {
      disabled: !canEdit,
      readOnly: !canEdit,
      'data-permission-restricted': !canEdit
    };
  };

  return {
    canEditField,
    getFieldProps
  };
};

export default usePermissions;