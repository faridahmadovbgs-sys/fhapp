# 🔔 Notification System - Quick Reference

## What Changed?

### ❌ Before (Browser Notifications)
```javascript
// Old way - only works when tab is open
if ('Notification' in window) {
  Notification.requestPermission();
  new Notification('Title', { body: 'Message' });
}
```

**Problems:**
- Only works when browser tab is open
- No background notifications
- No mobile support
- Unreliable delivery

---

### ✅ Now (Firebase Cloud Messaging)
```javascript
// New way - works even when app is closed!
import notificationService from './services/notificationService';

// Initialize once per user
await notificationService.initialize(userId);

// Notifications now work in background!
```

**Benefits:**
- ✅ Works when app is closed
- ✅ Cross-platform (web + mobile)
- ✅ Reliable delivery
- ✅ Background sync

---

## Files Created/Modified

### ✨ New Files:
1. **`client/public/firebase-messaging-sw.js`** - Service worker for background notifications
2. **`client/src/services/notificationService.js`** - FCM client service
3. **`server/src/services/notificationService.example.js`** - Backend notification examples
4. **`FCM_SETUP_GUIDE.md`** - Complete setup instructions

### 📝 Modified Files:
1. **`client/src/config/firebase.js`** - Added FCM messaging import
2. **`client/src/pages/ChatPage.js`** - Using new notification service
3. **`README.md`** - Updated feature list

---

## Quick Setup (3 Steps)

### 1️⃣ Generate VAPID Key
```bash
# Go to Firebase Console
# Project Settings > Cloud Messaging > Web Push certificates
# Click "Generate key pair"
# Copy the key (starts with B...)
```

### 2️⃣ Update Code
```javascript
// In client/src/services/notificationService.js
const VAPID_KEY = 'BMlq...paste-your-key-here';
```

### 3️⃣ Test
```bash
npm start
# Login -> Allow notifications
# Check console for: "✅ FCM Token obtained"
```

---

## How It Works

### Client Side:
```
User Login → Request Permission → Get FCM Token → Save to Firestore
                                                          ↓
Service Worker ← Firebase Cloud ← Backend ← New Event (message/bill/etc)
       ↓
Show Notification (even if app closed!)
```

### Backend Side (Future):
```javascript
// When new message is posted
const admin = require('firebase-admin');

// Get user's FCM token from Firestore
const userDoc = await admin.firestore()
  .collection('users')
  .doc(userId)
  .get();
  
const tokens = userDoc.data().fcmTokens;

// Send notification
await admin.messaging().sendEachForMulticast({
  tokens,
  notification: {
    title: 'New Message',
    body: 'You have a new message'
  },
  data: {
    type: 'chat',
    organizationId: 'org-123'
  }
});
```

---

## Notification Types

| Type | Icon | Example |
|------|------|---------|
| Chat | 💬 | "John Doe in Tech Team: Hey there!" |
| Announcement | 📢 | "🚨 New Announcement: Team Meeting" |
| Bill | 💰 | "New Bill Posted: $50.00 - Monthly Membership" |
| Document | 📄 | "New Document: Meeting Minutes - Q4 2024" |
| Payment | ✅ | "Payment Received: $50.00 from John Doe" |

---

## Testing

### Test from Browser:
```javascript
// In browser console after logging in
console.log('Permission:', Notification.permission);
console.log('FCM Enabled:', notificationService.isEnabled());
```

### Test from Firebase Console:
1. Go to **Engage** → **Messaging**
2. Click **Send test message**
3. Paste FCM token from console
4. Send!

---

## Troubleshooting

### "No registration token"
- ✅ Check if VAPID key is set correctly
- ✅ Verify service worker registered (`/firebase-messaging-sw.js`)
- ✅ Try in incognito mode (no browser extensions)

### "Permission denied"
- ✅ User blocked notifications - clear site data and retry
- ✅ Check browser notification settings

### Notifications not arriving
- ✅ Check Firebase Console → Cloud Messaging → Metrics
- ✅ Verify FCM token saved in Firestore: `users/{userId}/fcmTokens`
- ✅ Test with Firebase Console test message

---

## Next Steps (Backend Integration)

### Install Firebase Admin SDK:
```bash
cd server
npm install firebase-admin
```

### Generate Service Account:
1. Firebase Console → Project Settings
2. Service Accounts tab
3. Generate New Private Key
4. Save JSON securely (don't commit!)

### Initialize Admin SDK:
```javascript
// server/src/config/firebaseAdmin.js
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

module.exports = admin;
```

### Send Notifications:
```javascript
// Use the example in server/src/services/notificationService.example.js
const notificationService = require('./services/notificationService');

// In your route handlers
await notificationService.notifyNewMessage({
  organizationId: 'org-123',
  senderId: 'user-456',
  senderName: 'John Doe',
  text: 'Hello team!'
});
```

---

## Current Status

✅ **Client-side FCM setup complete**
- Service worker registered
- Token management working
- Foreground message handling
- Permission flow implemented

⏳ **Backend integration pending**
- Need to install firebase-admin
- Need service account key
- Need to implement notification triggers

---

## Resources

- 📖 [FCM_SETUP_GUIDE.md](./FCM_SETUP_GUIDE.md) - Full setup guide
- 📝 [notificationService.example.js](./server/src/services/notificationService.example.js) - Backend examples
- 🔥 [Firebase FCM Docs](https://firebase.google.com/docs/cloud-messaging)
- 🌐 [Web Push Protocol](https://developers.google.com/web/fundamentals/push-notifications)

---

## Summary

🎯 **Problem**: Notifications only worked when app was open

✅ **Solution**: Firebase Cloud Messaging (FCM)

🚀 **Result**: Reliable background notifications that work even when app is closed

📱 **Bonus**: Ready for mobile app expansion (iOS/Android use same FCM infrastructure)
