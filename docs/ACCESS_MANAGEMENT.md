# Access Management Guide

## Initial Admin Setup

### Method 1: Manual Database Setup (Recommended)
1. **Register your account** through the normal registration process
2. **Connect to MongoDB** and run:
   ```javascript
   db.users.updateOne(
     { email: "your-email@example.com" },
     { $set: { role: "admin" } }
   )
   ```
3. **Refresh your browser** - you'll now have admin access

### Method 2: Using Setup Script
1. **Update the email** in `server/setup-admin.js`
2. **Run the script**:
   ```bash
   cd server
   node setup-admin.js
   ```

### Method 3: Environment Variable Override
Add to your server `.env` file:
```
ADMIN_EMAILS=admin@example.com,owner@company.com
```

## Access Management Workflow

### For System Setup:
1. **First person registers** → Gets user role
2. **Manually promote to admin** (using methods above)  
3. **Admin logs in** → Can access Admin Panel
4. **Admin manages all other users** through UI

### For Day-to-Day Operations:
1. **New user registers** → Gets "user" role automatically
2. **Admin reviews** new users in Admin Panel (`/admin`)
3. **Admin assigns roles**:
   - `user` - Basic access (home, about, profile)
   - `moderator` - Can manage users and view reports  
   - `admin` - Full system access
4. **User gets immediate access** to new permissions

## Permission Levels

### User (Default)
- ✅ Home, About, Profile pages
- ❌ No management capabilities

### Moderator  
- ✅ Everything User has
- ✅ View/Edit users, Reports, Export data
- ❌ Cannot change roles or access admin settings

### Admin
- ✅ Everything Moderator has  
- ✅ Full user management, Role changes, System settings
- ✅ Access to Admin Panel

## Security Notes

⚠️ **Important**: 
- Always have at least 2 admin users
- Don't demote your own admin role
- Backend validates all permissions (frontend is UI only)
- Regular users cannot escalate their own permissions

## Quick Setup for Testing

For development/testing, you can temporarily add this to your registration logic:

```javascript
// In registration endpoint - REMOVE IN PRODUCTION!
if (email === "test-admin@example.com") {
  newUser.role = "admin";
}
```

This allows you to quickly create an admin account for testing.