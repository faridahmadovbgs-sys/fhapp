# Firebase Storage Profile Photo Upload - Setup & Testing Guide

## ✅ Changes Made

### 1. Fixed Storage Path
- Updated `ProfilePhotoUpload.js` to use `profile-pictures` instead of `profile-photos`
- This matches the Firebase Storage security rules

### 2. Added Storage Test Component
- Created `StorageTest.js` - a diagnostic tool to verify Firebase Storage is working
- Accessible at: `http://localhost:3000/storage-test`

---

## 🧪 Testing Firebase Storage

### Step 1: Run the Storage Test

1. **Start your development server** (if not running):
   ```bash
   npm start
   ```

2. **Login to your app** at `http://localhost:3000`

3. **Navigate to the storage test page**:
   ```
   http://localhost:3000/storage-test
   ```

4. **Click "Test Storage Connection"**

5. **Check the results:**
   - ✅ Green = Storage is working perfectly!
   - ❌ Red = There's an issue (see error details below)

### Step 2: Common Errors & Solutions

#### Error: "storage/unauthenticated"
**Cause:** User is not logged in  
**Solution:** Make sure you're logged in before testing

#### Error: "storage/unauthorized" or "Permission denied"
**Cause:** Firebase Storage rules don't allow uploads  
**Solution:** Update your Firebase Storage Rules (see below)

#### Error: "Firebase Storage is not initialized"
**Cause:** Storage module not configured  
**Solution:** Check `client/src/config/firebase.js` has `getStorage()` imported

---

## 🔐 Firebase Storage Security Rules

### Required Rules in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **fhapp-ca321**
3. Click **Storage** in the left sidebar
4. Click **Rules** tab
5. Replace with these rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Profile pictures - allow authenticated users to upload
    match /profile-pictures/{userId}/{filename} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
                      request.resource.size < 5 * 1024 * 1024 &&
                      request.resource.contentType.matches('image/.*');
    }
    
    // Deny everything else by default
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

6. Click **Publish**

### Rules Explanation:
- `allow read: if request.auth != null` - Any logged-in user can view profile pictures
- `allow write: if request.auth != null` - Any logged-in user can upload
- `request.resource.size < 5 * 1024 * 1024` - Max file size 5MB
- `request.resource.contentType.matches('image/.*')` - Only image files allowed

---

## 📸 Testing Profile Photo Upload

Once the storage test passes:

### Method 1: Via Profile Page
1. Navigate to `http://localhost:3000/profile`
2. Click **"Upload Photo"** or **"Change Photo"**
3. Select an image (JPG, PNG, GIF - max 5MB)
4. Wait for upload confirmation
5. Photo should appear immediately

### Method 2: Via Header
1. Click your profile icon in the header
2. Should see "Profile Settings" option
3. Upload photo from there

---

## 🔍 Debugging Checklist

If uploads still fail after the test passes:

### Check Browser Console
- Press F12 to open developer tools
- Look for red error messages
- Common issues:
  - ❌ `CORS error` - Usually means storage rules issue
  - ❌ `auth/unauthenticated` - User not logged in
  - ❌ `storage/unauthorized` - Rules don't allow upload

### Check Firebase Console
1. Go to **Storage** → **Files**
2. Look for `profile-pictures/` folder
3. Should see test files if test passed
4. Check if files have download URLs

### Check Firestore Database
1. Go to **Firestore Database**
2. Find `users` collection
3. Find your user document
4. Check if `photoURL` or `profilePictureUrl` field exists

---

## 📝 Code Flow

When you upload a photo:

1. **User selects image** → `ProfilePhotoUpload.js` component
2. **Image compression** → Resizes to 200x200px, compresses to <500KB
3. **Upload to Storage** → `profile-pictures/{userId}/{timestamp}.jpg`
4. **Get download URL** → From Firebase Storage
5. **Save to Firestore** → Updates user document with `photoURL`
6. **Display photo** → Shows in header and chat

---

## 🚀 Production Checklist

Before deploying to production:

### Storage Rules
- [ ] Rules restrict uploads by user ID (currently allows any authenticated user)
- [ ] Add rate limiting if needed
- [ ] Consider adding file size validation

### Update Rules for Production:
```javascript
match /profile-pictures/{userId}/{filename} {
  allow read: if request.auth != null;
  allow write: if request.auth != null && 
                  request.auth.uid == userId &&  // Only own profile
                  request.resource.size < 5 * 1024 * 1024 &&
                  request.resource.contentType.matches('image/.*');
}
```

### Environment Variables
Make sure these are set in production (Vercel/Netlify):
- `REACT_APP_FIREBASE_API_KEY`
- `REACT_APP_FIREBASE_AUTH_DOMAIN`
- `REACT_APP_FIREBASE_PROJECT_ID`
- `REACT_APP_FIREBASE_STORAGE_BUCKET`
- `REACT_APP_FIREBASE_MESSAGING_SENDER_ID`
- `REACT_APP_FIREBASE_APP_ID`

---

## 📊 Storage Quotas (Free Tier)

Firebase Spark (Free) Plan includes:
- **5 GB** total storage
- **1 GB/day** download bandwidth
- **20,000** uploads per day
- **50,000** downloads per day

For production, consider upgrading to Blaze (Pay-as-you-go) plan.

---

## 🆘 Still Having Issues?

1. **Run the storage test** at `/storage-test` and copy the error message
2. **Check Firebase Console** → Storage → Files for any test uploads
3. **Verify rules** in Storage → Rules tab
4. **Check browser console** for detailed error messages
5. **Ensure you're logged in** as an authenticated user

The test component provides detailed diagnostics to help identify the exact issue!
