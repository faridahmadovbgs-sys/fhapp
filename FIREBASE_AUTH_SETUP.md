# Firebase Authentication Setup Guide

## Current Issue
You're getting `auth/network-request-failed` error when trying to register. This is because **Email/Password authentication is not enabled** in your Firebase project.

## Quick Fix - Enable Email/Password Authentication

### Step 1: Go to Firebase Console
1. Open https://console.firebase.google.com/
2. Select your project: **fhapp-ca321**

### Step 2: Enable Email/Password Authentication
1. In the left sidebar, click **Authentication**
2. Click on the **Sign-in method** tab
3. Find **Email/Password** in the list of providers
4. Click on **Email/Password**
5. Toggle **Enable** to ON
6. Click **Save**

### Step 3: Verify Firestore Database
1. In the left sidebar, click **Firestore Database**
2. If not created, click **Create database**
3. Choose **Start in test mode** (for development)
4. Select a location (us-central or closest to you)
5. Click **Enable**

### Step 4: Update Firestore Rules (Optional for Development)
In Firestore Database > Rules, use these test rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow authenticated users to read/write organizations they belong to
    match /organizations/{orgId} {
      allow read, write: if request.auth != null;
    }
    
    // For development/testing - REMOVE IN PRODUCTION
    match /{document=**} {
      allow read, write: if request.time < timestamp.date(2025, 12, 31);
    }
  }
}
```

## Verify Setup

After enabling Email/Password authentication:

1. Refresh your app at http://localhost:3000
2. Try registering again
3. Check the Firebase Console > Authentication > Users to see if the user was created

## Troubleshooting

### Still getting network errors?
1. Check your internet connection
2. Verify you're using the correct Firebase config in `client/src/config/firebase.js`
3. Make sure your Firebase project is active (not in billing hold)
4. Try disabling any VPN or proxy

### Need to verify your config?
Your current Firebase project:
- **Project ID**: fhapp-ca321
- **Auth Domain**: fhapp-ca321.firebaseapp.com
- **Console URL**: https://console.firebase.google.com/project/fhapp-ca321

## Testing Registration

Once enabled, you should be able to:
1. Register as an Account Owner
2. See the user in Firebase Console > Authentication
3. See user data in Firestore Console > users collection
4. Login with the registered credentials
