import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAuthorization } from '../contexts/AuthorizationContext';

// Component for pages that require authentication
export const ProtectedRoute = ({ children, requireAuth = true, redirectTo = '/login' }) => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  
  if (authLoading) {
    return <div className="loading">Loading...</div>;
  }
  
  if (requireAuth && !isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }
  
  return children;
};

// Component for pages that require specific permissions
export const PermissionProtectedRoute = ({ 
  children, 
  requiredPage = null,
  requiredAction = null,
  requiredRole = null,
  requiredRoles = null,
  fallback = null,
  redirectTo = '/unauthorized'
}) => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { 
    hasPagePermission, 
    hasActionPermission, 
    hasRole, 
    hasAnyRole, 
    loading: authzLoading 
  } = useAuthorization();
  
  if (authLoading || authzLoading) {
    return <div className="loading">Loading...</div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // Check page permission
  if (requiredPage && !hasPagePermission(requiredPage)) {
    return fallback || <Navigate to={redirectTo} replace />;
  }
  
  // Check action permission
  if (requiredAction && !hasActionPermission(requiredAction)) {
    return fallback || <Navigate to={redirectTo} replace />;
  }
  
  // Check specific role
  if (requiredRole && !hasRole(requiredRole)) {
    return fallback || <Navigate to={redirectTo} replace />;
  }
  
  // Check any of multiple roles
  if (requiredRoles && !hasAnyRole(requiredRoles)) {
    return fallback || <Navigate to={redirectTo} replace />;
  }
  
  return children;
};

// Component for conditional rendering based on permissions
export const PermissionGuard = ({ 
  children, 
  requiredPage = null,
  requiredAction = null,
  requiredRole = null,
  requiredRoles = null,
  fallback = null,
  hideIfNoPermission = true
}) => {
  const { isAuthenticated } = useAuth();
  const { 
    hasPagePermission, 
    hasActionPermission, 
    hasRole, 
    hasAnyRole, 
    loading: authzLoading 
  } = useAuthorization();
  
  if (authzLoading) {
    return <div className="loading">Loading permissions...</div>;
  }
  
  if (!isAuthenticated) {
    return hideIfNoPermission ? null : fallback;
  }
  
  // Check page permission
  if (requiredPage && !hasPagePermission(requiredPage)) {
    return hideIfNoPermission ? null : fallback;
  }
  
  // Check action permission
  if (requiredAction && !hasActionPermission(requiredAction)) {
    return hideIfNoPermission ? null : fallback;
  }
  
  // Check specific role
  if (requiredRole && !hasRole(requiredRole)) {
    return hideIfNoPermission ? null : fallback;
  }
  
  // Check any of multiple roles
  if (requiredRoles && !hasAnyRole(requiredRoles)) {
    return hideIfNoPermission ? null : fallback;
  }
  
  return children;
};

// Higher-order component for permission checking
export const withPermission = (
  WrappedComponent, 
  permissionConfig = {}
) => {
  return function PermissionWrappedComponent(props) {
    return (
      <PermissionGuard {...permissionConfig}>
        <WrappedComponent {...props} />
      </PermissionGuard>
    );
  };
};

export default ProtectedRoute;