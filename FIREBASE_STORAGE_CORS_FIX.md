# Firebase Storage CORS Configuration Fix

## Problem
When uploading profile pictures from localhost, you get a CORS error:
```
Access to XMLHttpRequest at 'https://firebasestorage.googleapis.com/...' 
has been blocked by CORS policy
```

## Root Cause
Firebase Storage requires:
1. **Security Rules** to allow authenticated users to upload files
2. **CORS Configuration** to allow requests from your development domain (localhost:3000)

## Solution

### Step 1: Configure Firebase Storage Security Rules

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **fhapp-ca321**
3. Navigate to **Storage** → **Rules**
4. Replace the current rules with:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow authenticated users to upload to profile-pictures folder
    match /profile-pictures/{userId}/{filename} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
                      request.auth.uid == userId;
    }
    
    // Allow authenticated users to read/write to their own documents
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && 
                           request.auth.uid == userId;
    }
    
    // Deny all other access
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

5. Click **Publish** to save the rules

### Step 2: Configure CORS for Firebase Storage

Firebase Storage uses standard web API URLs that require CORS configuration. However, Firebase SDKv9+ (which you're using) should handle CORS automatically if Security Rules are properly configured.

**If you still get CORS errors after setting Security Rules:**

Use `gsutil` to configure CORS:

```bash
# Create a cors.json file
cat > cors.json << 'EOF'
[
  {
    "origin": ["http://localhost:3000", "http://localhost:3001"],
    "method": ["GET", "HEAD", "DELETE", "POST", "PUT"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
EOF

# Apply CORS configuration to your bucket
gsutil cors set cors.json gs://fhapp-ca321.firebasestorage.app
```

### Step 3: Verify Upload Works

1. Return to http://localhost:3000
2. Go to your Profile page
3. Try uploading a profile picture again
4. Should see: ✅ "Profile picture uploaded successfully!"

## Alternative: Test Upload Permissions

If uploads still fail, you can test permissions with this code in browser console:

```javascript
import { ref, uploadBytes } from "firebase/storage";
import { storage } from './config/firebase';

const testRef = ref(storage, `profile-pictures/test-${Date.now()}.txt`);
uploadBytes(testRef, new Blob(['test'], { type: 'text/plain' }))
  .then(() => console.log('✅ Upload successful'))
  .catch(err => console.error('❌ Upload failed:', err));
```

## Troubleshooting

### If you see "Firebase error permission-denied"
- Security Rules may need adjustment
- Ensure user is authenticated (check Firebase Auth logs)
- Verify user UID matches in rules

### If you see "CORS" errors after rule changes
- Clear browser cache (Ctrl+Shift+Delete)
- Wait 5 minutes for rule changes to propagate
- Try incognito/private window
- Check bucket name in firebase.js matches exactly

## For Production (Vercel)

Add your production domain to CORS and Security Rules:

```bash
gsutil cors set cors.json gs://fhapp-ca321.firebasestorage.app
```

Update CORS to include:
```json
{
  "origin": ["https://yourdomain.com"],
  "method": ["GET", "HEAD", "DELETE", "POST", "PUT"],
  "responseHeader": ["Content-Type"],
  "maxAgeSeconds": 3600
}
```

---

**References:**
- [Firebase Storage Security Rules](https://firebase.google.com/docs/storage/security)
- [Firebase Storage CORS Guide](https://firebase.google.com/docs/storage/web/download-files#cors_configuration)
- [Google Cloud CORS Configuration](https://cloud.google.com/storage/docs/configuring-cors)
