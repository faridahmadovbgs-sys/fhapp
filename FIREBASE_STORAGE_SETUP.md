# Firebase Storage Setup - Profile Pictures

## Enable Firebase Storage

### 1. Firebase Console Setup
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (fhapp-ca321)
3. In the left sidebar, click **Build** → **Storage**
4. Click **Create bucket**
5. Use default location: `us-central1`
6. Click **Done**

### 2. Configure Storage Security Rules

In Firebase Console, go to **Storage** → **Rules** and replace with:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow authenticated users to read and write their own profile pictures
    match /profile-pictures/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
                      request.resource.size < 5 * 1024 * 1024 &&
                      request.resource.contentType.matches('image/.*');
    }
    
    // Deny all other access
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

**Rules Explanation:**
- `allow read`: Authenticated users can view any profile picture
- `allow write`: Authenticated users can upload their own profile pictures
- `size < 5MB`: Limits file size to 5MB
- `matches('image/.*')`: Only allows image files
- Other paths: Denied by default

### 3. Test Storage Access

In your app, users can now:

1. **Upload a Profile Picture:**
   - Click **👤 Profile** in header
   - Click "Choose Image"
   - Select JPG, PNG, or GIF (max 5MB)
   - Click "Upload Picture"

2. **View Profile Pictures:**
   - Profile pictures appear in chat messages
   - Shows in public, direct, and group chats
   - Automatically falls back to initials if no picture

### 4. Verify Storage Quotas

Firebase Storage Free Tier includes:
- **5 GB** total storage
- **1 GB** daily download limit
- **20,000** writes per day
- **50,000** reads per day

For production apps, consider upgrading to Blaze plan for higher limits.

## Troubleshooting

### Error: "Permission denied" when uploading
**Solution:** 
1. Ensure user is authenticated (logged in)
2. Check Storage security rules in Firebase Console
3. Verify user has proper Firebase authentication token

### Error: "CORS error" in browser console
**Solution:**
1. CORS is not needed for Firebase Storage (handled automatically)
2. Check browser console for specific errors
3. Ensure Firebase config is correct in `client/src/config/firebase.js`

### Storage bucket not appearing
**Solution:**
1. Refresh Firebase Console
2. Check project region and try another region if issues persist
3. Ensure billing is enabled (even for free tier usage)

### Images not displaying in chat
**Solution:**
1. Verify upload was successful (check Vercel logs)
2. Ensure download URL is stored in Firestore
3. Check browser console for CORS or 404 errors
4. Verify image file still exists in Storage bucket

## Environment Variables (for Vercel)

Make sure these are set in Vercel Project Settings:

```
REACT_APP_FIREBASE_API_KEY=AIzaSyBYG7mANiuKWSHvZKOTuR-Jjgx0ZwTgcvE
REACT_APP_FIREBASE_AUTH_DOMAIN=fhapp-ca321.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=fhapp-ca321
REACT_APP_FIREBASE_STORAGE_BUCKET=fhapp-ca321.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=321828975722
REACT_APP_FIREBASE_APP_ID=1:321828975722:web:b1c8e8ab6462f74eb8c613
REACT_APP_FIREBASE_MEASUREMENT_ID=G-C13GEDVMBF
```

## Performance Tips

1. **Image Compression:**
   - Compress images before uploading
   - Recommended: 400x400px max for profile pictures
   - File size: 50-200KB optimal

2. **Caching:**
   - Firebase CDN automatically caches images
   - URLs are permanent and globally cached

3. **Monitoring Usage:**
   - Firebase Console → Storage → Usage
   - Monitor daily operations and adjust rules as needed

## References

- Firebase Storage Docs: https://firebase.google.com/docs/storage
- Security Rules Guide: https://firebase.google.com/docs/storage/security
- Quotas and Limits: https://firebase.google.com/docs/storage/quotas
