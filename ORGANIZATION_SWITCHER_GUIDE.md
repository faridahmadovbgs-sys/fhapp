# Organization Switcher Guide

## Overview
The Organization Switcher allows users to seamlessly switch between multiple organizations they belong to, displaying their role in each organization.

## Features

### 🏢 Organization Context (Global State)
- **OrganizationContext**: A new global context that manages all user organizations
- **Tracks**: 
  - All organizations user owns or is a member of
  - Current selected organization
  - User's role in each organization (Owner, Sub Owner, Member)
  - Sub-account owner relationships

### 🔄 Organization Switcher Component (Header)
Located in the header, the switcher appears when a user belongs to **2 or more** organizations.

**Features:**
- **Dropdown Button**: Shows current organization and your role
- **Role Badges**:
  - 👑 Owner (Green) - Account owner of the organization
  - 👤 Sub Owner (Blue) - Sub-account owner
  - 👥 Member (Gray) - Regular member
- **Organization List**: Click to see all organizations
- **Sub-Account Info**: Shows which sub-account you're under (if applicable)
- **Active Indicator**: Checkmark (✓) shows currently selected organization

## How to Use

### Switching Organizations

1. **Look at the Header**: You'll see a button with 🏢 icon showing your current organization
2. **Click the Button**: A dropdown will appear with all your organizations
3. **Select Organization**: Click on any organization to switch to it
4. **Role Display**: Each organization shows your role with a colored badge

### Understanding Your Roles

**As Account Owner (👑 Owner - Green):**
- You created this organization
- Full administrative access
- Can invite members and sub-account owners

**As Sub-Account Owner (👤 Sub Owner - Blue):**
- You joined or created as a sub-account owner
- Can manage members under your sub-account
- Shows which organization you're managing

**As Member (👥 Member - Gray):**
- You joined via invitation link
- Standard member access
- Shows which sub-account owner invited you (if applicable)

## Examples

### Example 1: Account Owner + Member
You are:
- **Owner** of "ABC Company" (your organization)
- **Member** of "XYZ Corp" (joined via invitation)

The switcher shows:
```
🏢 ABC Company
   👑 Owner

🏢 XYZ Corp
   👥 Member
   Under: John's Sub-Account
```

### Example 2: Multiple Organizations with Different Roles
You are:
- **Owner** of "My Business LLC"
- **Sub Owner** of "Consulting Group"
- **Member** of "Industry Association"

The switcher shows:
```
🏢 My Business LLC
   👑 Owner

🏢 Consulting Group
   👤 Sub Owner

🏢 Industry Association
   👥 Member
```

## Technical Details

### Context Structure
```javascript
{
  organizations: [...],          // Array of all user's organizations
  currentOrganization: {...},    // Currently selected organization
  currentOrgRole: "...",         // User's role in current org
  switchOrganization: () => {}, // Function to switch organizations
}
```

### Organization Object
```javascript
{
  id: "org123",
  name: "ABC Company",
  ownerId: "user456",
  userRole: "account_owner",     // Your role in this org
  subAccountOwner: "John Doe",   // If you're member, who invited you
  members: [...]
}
```

## Benefits

✅ **Easy Switching**: Switch between organizations with one click
✅ **Role Clarity**: Always see your role in each organization
✅ **Context Awareness**: Current organization persists across all pages
✅ **Visual Feedback**: Color-coded badges make roles instantly recognizable
✅ **Sub-Account Tracking**: Know which sub-account owner you're under

## Pages Affected

All pages now use the global `OrganizationContext` instead of local organization states:
- Home
- Chat
- Documents (Personal, Organization, Member)
- Billing & Payments
- Members
- Invitations
- Admin Panel
- Announcements
- About

## FAQ

**Q: What if I only have one organization?**
A: The switcher won't appear in the header. You'll automatically use that organization.

**Q: How do I join more organizations?**
A: Use the "Join Organization" page to enter an invitation link.

**Q: Can I be owner of multiple organizations?**
A: Yes! You can create multiple organizations and own all of them.

**Q: What happens when I switch organizations?**
A: The entire app context switches - all pages will show data for the selected organization.

**Q: Is my selection saved?**
A: Yes, the current organization is saved in localStorage and persists across sessions.

## Future Enhancements

- Organization search/filter in switcher dropdown
- Recently accessed organizations
- Organization favorites/pinning
- Quick actions per organization
