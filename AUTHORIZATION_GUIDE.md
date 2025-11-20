# Authorization System Documentation

## Overview

This authorization system provides comprehensive role-based and permission-based access control for your React application. It supports:

- **Role-based Access Control (RBAC)**: Users have roles (user, moderator, admin) with predefined permissions
- **Custom Permissions**: Granular control over individual pages and actions
- **Page-level Protection**: Restrict access to entire pages/routes
- **Component-level Protection**: Show/hide components based on permissions
- **Function-level Protection**: Control access to specific actions
- **Form Field Protection**: Enable/disable form fields based on permissions

## Architecture

### Core Components

1. **AuthorizationContext** (`src/contexts/AuthorizationContext.js`)
   - Manages user permissions and roles
   - Provides permission checking functions
   - Handles permission updates

2. **ProtectedRoute Components** (`src/components/ProtectedRoute.js`)
   - `ProtectedRoute`: Basic authentication requirement
   - `PermissionProtectedRoute`: Permission-based route protection
   - `PermissionGuard`: Conditional component rendering
   - `withPermission`: Higher-order component wrapper

3. **Permission Hooks** (`src/hooks/usePermissions.js`)
   - Various hooks for checking permissions in components
   - Convenience functions for common permission patterns

4. **Admin Panel** (`src/pages/AdminPanel.js`)
   - UI for managing user roles and permissions
   - Real-time permission updates

## Usage Examples

### 1. Basic Setup

Wrap your app with the AuthorizationProvider:

```jsx
import { AuthorizationProvider } from './contexts/AuthorizationContext';

function App() {
  return (
    <AuthProvider>
      <AuthorizationProvider>
        <Router>
          {/* Your app content */}
        </Router>
      </AuthorizationProvider>
    </AuthProvider>
  );
}
```

### 2. Page-Level Protection

Protect entire routes based on permissions:

```jsx
import { PermissionProtectedRoute } from './components/ProtectedRoute';

// Protect by page permission
<Route 
  path="/admin" 
  element={
    <PermissionProtectedRoute requiredPage="admin">
      <AdminPanel />
    </PermissionProtectedRoute>
  } 
/>

// Protect by action permission
<Route 
  path="/users" 
  element={
    <PermissionProtectedRoute requiredAction="view_users">
      <UsersList />
    </PermissionProtectedRoute>
  } 
/>

// Protect by role
<Route 
  path="/reports" 
  element={
    <PermissionProtectedRoute requiredRole="admin">
      <Reports />
    </PermissionProtectedRoute>
  } 
/>

// Protect by multiple roles
<Route 
  path="/moderation" 
  element={
    <PermissionProtectedRoute requiredRoles={["admin", "moderator"]}>
      <ModerationPanel />
    </PermissionProtectedRoute>
  } 
/>
```

### 3. Component-Level Protection

Show/hide components based on permissions:

```jsx
import { PermissionGuard } from './components/ProtectedRoute';

function MyComponent() {
  return (
    <div>
      <h1>Dashboard</h1>
      
      {/* Show button only if user can create users */}
      <PermissionGuard requiredAction="create_user">
        <button onClick={createUser}>Create User</button>
      </PermissionGuard>
      
      {/* Show admin section only for admins */}
      <PermissionGuard requiredRole="admin">
        <AdminSection />
      </PermissionGuard>
      
      {/* Show fallback if no permission */}
      <PermissionGuard 
        requiredPage="reports" 
        fallback={<p>You need reports access to see this content</p>}
      >
        <ReportsWidget />
      </PermissionGuard>
    </div>
  );
}
```

### 4. Using Permission Hooks

Use hooks to check permissions programmatically:

```jsx
import { usePermissions, useActionPermission, useFieldPermission } from './hooks/usePermissions';

function UserForm() {
  const {
    isAdmin,
    canManageUsers,
    hasActionPermission,
    userRole
  } = usePermissions();
  
  const { hasPermission: canCreateUser } = useActionPermission('create_user');
  const { canEditField, getFieldProps } = useFieldPermission();

  const handleSubmit = () => {
    if (canCreateUser) {
      // Create user logic
    } else {
      alert('No permission to create users');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        name="username"
        {...getFieldProps('username', 'create_user')}
      />
      
      <select
        name="role"
        {...getFieldProps('role', 'manage_roles')}
      >
        <option value="user">User</option>
        {isAdmin() && <option value="admin">Admin</option>}
      </select>
      
      <button 
        type="submit"
        disabled={!canCreateUser}
      >
        Create User
      </button>
    </form>
  );
}
```

### 5. Navigation with Permissions

Show navigation items based on permissions:

```jsx
import { PermissionGuard } from './components/ProtectedRoute';

function Navigation() {
  return (
    <nav>
      <Link to="/">Home</Link>
      <Link to="/about">About</Link>
      
      <PermissionGuard requiredPage="users">
        <Link to="/users">Users</Link>
      </PermissionGuard>
      
      <PermissionGuard requiredPage="admin">
        <Link to="/admin">Admin Panel</Link>
      </PermissionGuard>
    </nav>
  );
}
```

## Permission Structure

### Default Roles and Permissions

#### User Role
- **Pages**: home, about, profile
- **Actions**: None (read-only access)

#### Moderator Role
- **Pages**: home, about, profile, users, reports
- **Actions**: edit_user, view_users, export_data, view_analytics

#### Admin Role
- **Pages**: All pages
- **Actions**: All actions

### Custom Permissions

You can override role-based permissions with custom permissions for individual users through the Admin Panel.

### Available Permissions

#### Page Permissions
- `home` - Access to home page
- `about` - Access to about page
- `profile` - Access to user profile
- `admin` - Access to admin panel
- `users` - Access to users management
- `reports` - Access to reports
- `settings` - Access to system settings

#### Action Permissions
- `create_user` - Create new users
- `edit_user` - Edit existing users
- `delete_user` - Delete users
- `view_users` - View user lists
- `manage_roles` - Change user roles
- `export_data` - Export system data
- `view_analytics` - Access analytics
- `system_settings` - Modify system settings

## API Endpoints

### Get User Permissions
```
GET /api/users/:id/permissions
```

### Update User Permissions (Admin only)
```
PUT /api/users/:id/permissions
Body: { permissions: { pages: {...}, actions: {...} } }
```

### Update User Role (Admin only)
```
PUT /api/users/:id/role
Body: { role: "user|moderator|admin" }
```

### Toggle User Status (Admin only)
```
PUT /api/users/:id/status
```

## Best Practices

1. **Always check permissions on both frontend and backend**
   - Frontend permissions are for UX only
   - Backend must validate all permissions for security

2. **Use the most specific permission check**
   - Check action permissions for specific actions
   - Check page permissions for page access
   - Check roles only when role-specific logic is needed

3. **Provide meaningful fallbacks**
   - Show appropriate messages when access is denied
   - Redirect to meaningful pages

4. **Test with different roles**
   - Use the demo page to test permissions
   - Create test users with different roles

5. **Keep permissions granular**
   - Break down large permissions into smaller ones
   - Allow fine-grained control

## Extending the System

### Adding New Permissions

1. Add to the default permissions in `AuthorizationContext.js`
2. Update role-based permissions
3. Add to server-side validation
4. Update the Admin Panel UI

### Adding New Roles

1. Update the role enum in the User model
2. Add role permissions in `AuthorizationContext.js`
3. Update server-side role validation
4. Add to the Admin Panel dropdown

## Troubleshooting

### Common Issues

1. **Permissions not updating**: Clear localStorage and re-login
2. **Admin panel access denied**: Ensure user has admin role and required permissions
3. **Routes not protecting**: Check that PermissionProtectedRoute is used correctly
4. **Components always hidden**: Verify permission names match exactly

### Debug Tips

- Use the Permissions Demo page to check current permissions
- Check browser console for permission-related errors
- Verify API responses for permission data
- Test with different user accounts

## Security Notes

⚠️ **Important**: This system provides UI-level access control only. All sensitive operations must be validated on the server-side. Never rely solely on frontend permissions for security.