# Firestore Index Creation Required

## Current Status
✅ FCM notifications are working and token is saved
❌ Missing Firestore indexes causing query failures

## Errors Detected

### 1. Messages Query (Chat Page)
**Error**: `The query requires an index`
**Query**: `organizationId`, `isAnnouncement`, `__name__`

**Click to create index**:
https://console.firebase.google.com/v1/r/project/fhapp-ca321/firestore/indexes?create_composite=Ckxwcm9qZWN0cy9maGFwcC1jYTMyMS9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvbWVzc2FnZXMvaW5kZXhlcy9fEAEaEgoOb3JnYW5pemF0aW9uSWQQARoSCg5pc0Fubm91bmNlbWVudBABGgwKCF9fbmFtZV9fEAE

### 2. Announcements Query (Home Page)
**Error**: `The query requires an index`
**Query**: `active`, `isAnnouncement`, `organizationId`, `priority`, `createdAt`

**Click to create index**:
https://console.firebase.google.com/v1/r/project/fhapp-ca321/firestore/indexes?create_composite=Ckxwcm9qZWN0cy9maGFwcC1jYTMyMS9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvbWVzc2FnZXMvaW5kZXhlcy9fEAEaCgoGYWN0aXZlEAEaEgoOaXNBbm5vdW5jZW1lbnQQARoSCg5vcmdhbml6YXRpb25JZBABGgwKCHByaW9yaXR5EAIaDQoJY3JlYXRlZEF0EAIaDAoIX19uYW1lX18QAg

### 3. Chat Badge Query (Background)
**Error**: `The query requires an index`
**Query**: `active`, `isAnnouncement`, `organizationId`, `__name__`

**Click to create index**:
https://console.firebase.google.com/v1/r/project/fhapp-ca321/firestore/indexes?create_composite=Ckxwcm9qZWN0cy9maGFwcC1jYTMyMS9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvbWVzc2FnZXMvaW5kZXhlcy9fEAEaCgoGYWN0aXZlEAEaEgoOaXNBbm5vdW5jZW1lbnQQARoSCg5vcmdhbml6YXRpb25JZBABGgwKCF9fbmFtZV9fEAE

## Steps to Fix

### Option 1: Quick Fix (Click Links)
1. Click each URL above (opens Firebase Console)
2. Click **"Create Index"** button
3. Wait 1-2 minutes for index to build
4. Refresh your app

### Option 2: Manual Creation
1. Go to [Firebase Console](https://console.firebase.google.com/project/fhapp-ca321/firestore/indexes)
2. Click **"Create Index"**
3. Select `messages` collection group
4. Add fields for each index as shown in errors
5. Click **"Create"**

### Option 3: Update firestore.indexes.json
Add these to `c:\repo-fhapp\firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "messages",
      "queryScope": "COLLECTION_GROUP",
      "fields": [
        { "fieldPath": "organizationId", "order": "ASCENDING" },
        { "fieldPath": "isAnnouncement", "order": "ASCENDING" },
        { "fieldPath": "__name__", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "messages",
      "queryScope": "COLLECTION_GROUP",
      "fields": [
        { "fieldPath": "active", "order": "ASCENDING" },
        { "fieldPath": "isAnnouncement", "order": "ASCENDING" },
        { "fieldPath": "organizationId", "order": "ASCENDING" },
        { "fieldPath": "priority", "order": "DESCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "messages",
      "queryScope": "COLLECTION_GROUP",
      "fields": [
        { "fieldPath": "active", "order": "ASCENDING" },
        { "fieldPath": "isAnnouncement", "order": "ASCENDING" },
        { "fieldPath": "organizationId", "order": "ASCENDING" },
        { "fieldPath": "__name__", "order": "ASCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

Then deploy:
```bash
firebase deploy --only firestore:indexes
```

## Impact
- **Chat messages won't load** until index is created
- **Announcements won't show** until index is created
- **Notification badges work** but may have incomplete counts
- **FCM tokens are saved** ✅ (no index needed)

## Verification
After creating indexes:
1. Go to Firebase Console → Firestore → Indexes
2. Wait for status to change from "Building" to "Enabled"
3. Refresh app at http://localhost:3000
4. Check console for successful message loading

## Timeline
- Index creation: **1-2 minutes** for small datasets
- Index creation: **5-15 minutes** for larger datasets (1000+ documents)

---
**Priority**: HIGH - Blocking chat and announcements functionality
**FCM Status**: ✅ Working independently of indexes
