# Sub Profile Migration Guide

## Overview
We've renamed "Account" to "Sub Profile" throughout the application to better reflect the multi-profile functionality. This guide explains the changes and how to migrate existing data.

## Database Changes

### Collection Name Change
- **Old Collection:** `userAccounts`
- **New Collection:** `subProfiles`

### Field Names (remain the same)
The field structure stays the same to maintain compatibility:
- `userId` - User who owns this sub profile
- `accountName` - Display name of the sub profile
- `accountType` - Type: personal, llc, trust, corporation, partnership, nonprofit, other
- `entityName` - Official business/entity name
- `ein` - Employer Identification Number
- `taxId` - Tax ID
- `address`, `city`, `state`, `zipCode` - Address information
- `phone`, `email` - Contact information
- `isDefault` - Boolean indicating default sub profile
- `createdAt`, `updatedAt` - Timestamps

## Code Changes Made

### 1. Context Updates
- **File:** `client/src/contexts/AccountContext.js`
- **Changes:**
  - Updated all collection references from `userAccounts` to `subProfiles`
  - Updated console logs and comments to use "sub profile" terminology
  - Functions remain the same: `switchAccount()`, `setAsDefault()`, etc.

### 2. UI Components
- **File:** `client/src/pages/AccountManager.js`
- **Changes:**
  - Page title: "My Accounts" → "My Sub Profiles"
  - Button text: "Add Account" → "Add Sub Profile"
  - All labels: "Account Name" → "Profile Name", "Account Type" → "Profile Type"
  - Success/error messages updated
  - Collection references: `userAccounts` → `subProfiles`

### 3. Navigation
- **File:** `client/src/App.js`
- **Changes:**
  - Navigation menu: "My Accounts" → "My Sub Profiles"

### 4. Dashboard
- **File:** `client/src/pages/Home.js`
- **Changes:**
  - Button: "Manage Accounts" → "Manage Sub Profiles"
  - Mode toggle: "Account Mode" → "Sub Profile Mode"
  - Status messages: "No account selected" → "No sub profile selected"
  - Empty state: "No accounts yet" → "No sub profiles yet"

## Data Migration

### Option 1: Firestore Console (Recommended for Small Datasets)
1. Open Firebase Console
2. Go to Firestore Database
3. Navigate to `userAccounts` collection
4. Create new `subProfiles` collection
5. For each document in `userAccounts`:
   - Copy the document
   - Paste into `subProfiles` collection
   - Keep the same document ID

### Option 2: Migration Script (Recommended for Large Datasets)
Create a Node.js script to migrate data:

```javascript
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

async function migrateUserAccountsToSubProfiles() {
  try {
    console.log('Starting migration from userAccounts to subProfiles...');
    
    const snapshot = await db.collection('userAccounts').get();
    console.log(`Found ${snapshot.size} documents to migrate`);
    
    const batch = db.batch();
    let count = 0;
    
    snapshot.forEach((doc) => {
      const newDocRef = db.collection('subProfiles').doc(doc.id);
      batch.set(newDocRef, doc.data());
      count++;
      
      // Firestore batch limit is 500 operations
      if (count % 500 === 0) {
        console.log(`Prepared ${count} documents for migration...`);
      }
    });
    
    await batch.commit();
    console.log(`✅ Successfully migrated ${count} documents to subProfiles collection`);
    console.log('⚠️  Please verify the data before deleting userAccounts collection');
    
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

migrateUserAccountsToSubProfiles();
```

### Option 3: Run Both Collections Simultaneously (Zero Downtime)
1. Keep `userAccounts` collection as backup
2. Application now reads/writes to `subProfiles`
3. After confirming everything works, delete `userAccounts`

## Testing Checklist

After migration, test these features:

- [ ] Login and view sub profiles on Home page
- [ ] Switch between User Mode and Sub Profile Mode
- [ ] Navigate to Sub Profile Manager page
- [ ] Create a new sub profile
- [ ] Edit existing sub profile (if implemented)
- [ ] Delete a sub profile
- [ ] Set a sub profile as default
- [ ] Switch between different sub profiles
- [ ] Verify sub profile information displays correctly
- [ ] Check console logs for any errors referencing old names

## Rollback Plan

If issues occur:

1. **Code Rollback:**
   ```bash
   git revert HEAD
   ```

2. **Database Rollback:**
   - If you kept `userAccounts` collection, just change collection name back in code
   - If you deleted `userAccounts`, restore from Firebase backup

## Important Notes

1. **No Breaking Changes:** The actual field names (`accountName`, `accountType`, etc.) remain the same for compatibility
2. **Context Name:** `AccountContext` and `useAccount()` hook names remain unchanged to avoid breaking imports throughout the codebase
3. **URL Routes:** The route `/accounts` remains the same to avoid breaking bookmarks
4. **CSS Classes:** CSS class names like `account-manager-container` remain unchanged (internal implementation)

## Files Modified

- `client/src/contexts/AccountContext.js` - Collection references
- `client/src/pages/AccountManager.js` - UI labels and collection references
- `client/src/pages/Home.js` - UI labels
- `client/src/App.js` - Navigation menu label

## Future Considerations

Consider these additional updates in future releases:

1. Rename field names: `accountName` → `subProfileName`, `accountType` → `subProfileType`
2. Rename context: `AccountContext` → `SubProfileContext`
3. Rename route: `/accounts` → `/subprofiles`
4. Create migration for existing field names
5. Update CSS class names for consistency

## Support

If you encounter issues:
1. Check browser console for errors
2. Verify Firebase rules allow access to `subProfiles` collection
3. Confirm data migration completed successfully
4. Check that all documents have required fields

## Timeline

- **Phase 1 (Complete):** UI terminology updates, collection name change
- **Phase 2 (Future):** Field name updates, context renaming
- **Phase 3 (Future):** Route updates, complete terminology standardization
