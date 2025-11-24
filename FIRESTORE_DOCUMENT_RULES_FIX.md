# Fix Firestore Permissions for Documents

## The Issue
You're getting "Missing or insufficient permissions" because Firestore security rules don't include the new document collections.

## Solution - Deploy Updated Firestore Rules

### Option 1: Firebase Console (Quick Fix)

1. **Go to Firebase Console**
   - Visit: https://console.firebase.google.com
   - Select your project: **fhapp-ca321**

2. **Navigate to Firestore Database**
   - Click **Firestore Database** in the left sidebar
   - Click the **Rules** tab at the top

3. **Copy and paste these rules:**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function to check if user is authenticated
    function isSignedIn() {
      return request.auth != null;
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn() && request.auth.uid == userId;
      allow update: if isSignedIn() && request.auth.uid == userId;
      allow delete: if isSignedIn() && request.auth.uid == userId;
    }
    
    // Organizations collection
    match /organizations/{orgId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn();
      allow update: if isSignedIn();
      allow delete: if isSignedIn() && request.auth.uid == resource.data.ownerId;
    }
    
    // Public messages
    match /messages/{messageId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn();
      allow update, delete: if isSignedIn() && request.auth.uid == resource.data.userId;
    }
    
    // Private conversations
    match /conversations/{conversationId}/messages/{messageId} {
      allow read, write: if isSignedIn();
    }
    
    // Groups
    match /groups/{groupId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn();
      allow update, delete: if isSignedIn();
      
      match /messages/{messageId} {
        allow read, write: if isSignedIn();
      }
    }
    
    // Invitations
    match /invitations/{invitationId} {
      allow read: if true;
      allow create: if isSignedIn();
      allow update: if isSignedIn();
      allow delete: if isSignedIn();
    }
    
    // Bills
    match /bills/{billId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn();
      allow update, delete: if isSignedIn() && request.auth.uid == resource.data.ownerId;
    }
    
    // Payments
    match /payments/{paymentId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn();
      allow update, delete: if isSignedIn() && request.auth.uid == resource.data.memberId;
    }
    
    // Personal Documents - users can only access their own
    match /personalDocuments/{documentId} {
      allow read: if isSignedIn() && request.auth.uid == resource.data.userId;
      allow create: if isSignedIn() && request.auth.uid == request.resource.data.userId;
      allow update: if isSignedIn() && request.auth.uid == resource.data.userId;
      allow delete: if isSignedIn() && request.auth.uid == resource.data.userId;
    }
    
    // Organization Documents - shared across org
    match /organizationDocuments/{documentId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn();
      allow update: if isSignedIn() && request.auth.uid == resource.data.uploadedBy;
      allow delete: if isSignedIn() && request.auth.uid == resource.data.uploadedBy;
    }
  }
}
```

4. **Click "Publish"**
   - Review the changes
   - Click the blue "Publish" button

5. **Test Upload Again**
   - Go back to your app
   - Try uploading a document
   - Should work now! ✅

---

### Option 2: Firebase CLI (If you have it installed)

```bash
# Login to Firebase
firebase login

# Deploy rules only
firebase deploy --only firestore:rules
```

---

## What the Rules Do

### Personal Documents (`/personalDocuments`)
- ✅ Users can only see/edit/delete **their own** documents
- ✅ Complete privacy - no one else can access your files

### Organization Documents (`/organizationDocuments`)
- ✅ **All authenticated users** can view and download
- ✅ **All org members** can upload new documents
- ✅ **Only uploader** can delete their documents
- ✅ Shared across the organization

---

## Testing After Deploy

1. **Personal Documents** (`/documents`)
   - Upload a file
   - Should see: "✅ Document uploaded successfully!"

2. **Organization Documents** (`/org-documents`)
   - Upload a file
   - Should see: "✅ Document uploaded successfully and shared with organization!"

3. **Check Firestore Console**
   - Go to Firestore Database → Data
   - Look for `personalDocuments` or `organizationDocuments` collection
   - Should see your uploaded documents

---

## Troubleshooting

### Still getting permission errors?
1. Make sure you clicked "Publish" in Firebase Console
2. Wait 10-30 seconds for rules to propagate
3. Refresh your app page
4. Check browser console for detailed error messages

### Rules not saving?
- Make sure you're logged into the correct Firebase project
- Check that you have "Owner" or "Editor" role in Firebase

### Need to verify rules are active?
1. Firebase Console → Firestore Database → Rules
2. Look at the timestamp - should say "Last published: [recent time]"

---

## Quick Link
🔗 **Firebase Console Rules:** https://console.firebase.google.com/project/fhapp-ca321/firestore/rules

Deploy the rules and your document uploads will work! 🚀
