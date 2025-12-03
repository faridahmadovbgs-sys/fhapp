# 🔔 Notification System Migration Checklist

## ✅ Completed (Automatic)

These changes have been implemented automatically:

- [x] Created Firebase Cloud Messaging service worker
- [x] Created notification service module
- [x] Updated Firebase configuration with messaging
- [x] Modified ChatPage to use new notification service
- [x] Created backend notification examples
- [x] Created comprehensive documentation
- [x] Updated README with new features
- [x] Code passes all linting checks

## 📋 Manual Steps Required

### 🔴 Critical (Required for notifications to work)

#### 1. Generate VAPID Key (5 minutes)
- [ ] Open [Firebase Console](https://console.firebase.google.com/)
- [ ] Select project: **fhapp-ca321**
- [ ] Go to ⚙️ Project Settings
- [ ] Click **Cloud Messaging** tab
- [ ] Scroll to **Web Push certificates**
- [ ] Click **Generate key pair** button
- [ ] Copy the generated key (starts with `B`)

#### 2. Update VAPID Key in Code (1 minute)
- [ ] Open `client/src/services/notificationService.js`
- [ ] Find line: `const VAPID_KEY = 'YOUR_VAPID_KEY_HERE';`
- [ ] Replace with: `const VAPID_KEY = 'BMlq...your-key-here';`
- [ ] Save file

#### 3. Test Notifications (5 minutes)
- [ ] Run `npm start` (or restart dev server)
- [ ] Open browser and login
- [ ] Click **Allow** when prompted for notifications
- [ ] Check browser console for:
  - `✅ Service Worker registered`
  - `✅ FCM Token obtained`
  - `✅ FCM token saved to Firestore`
  - `✅ FCM Notifications initialized`
- [ ] Verify token saved in Firestore:
  - Firebase Console → Firestore → `users/{your-user-id}`
  - Should see `fcmTokens` array with token

#### 4. Test Background Notifications (5 minutes)
- [ ] Keep app logged in
- [ ] Minimize or close browser window (app in background)
- [ ] From Firebase Console → Engage → Messaging
- [ ] Click **Send test message**
- [ ] Paste your FCM token from console
- [ ] Click **Test**
- [ ] Should see notification appear even with app closed! 🎉

---

### 🟡 Recommended (For full functionality)

#### 5. Install Firebase Admin SDK (10 minutes)
```bash
cd server
npm install firebase-admin
```
- [ ] Run command above
- [ ] Verify installation in `server/package.json`

#### 6. Generate Service Account Key (5 minutes)
- [ ] Firebase Console → Project Settings
- [ ] **Service Accounts** tab
- [ ] Click **Generate new private key**
- [ ] Save file as `server/src/config/serviceAccountKey.json`
- [ ] Add to `.gitignore`: `serviceAccountKey.json`
- [ ] **IMPORTANT**: Never commit this file!

#### 7. Initialize Firebase Admin (10 minutes)
- [ ] Create `server/src/config/firebaseAdmin.js`:
```javascript
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'fhapp-ca321'
});

module.exports = admin;
```
- [ ] Test initialization:
```javascript
const admin = require('./config/firebaseAdmin');
console.log('Admin SDK initialized:', !!admin.messaging());
```

#### 8. Create Notification Service (15 minutes)
- [ ] Copy `server/src/services/notificationService.example.js`
- [ ] Rename to `server/src/services/notificationService.js`
- [ ] Review and customize notification functions

#### 9. Add Notification Triggers (30 minutes)
Integrate notifications into your event handlers:

**Chat Messages:**
- [ ] Open `server/src/routes/messages.js` (or equivalent)
- [ ] After saving message, add:
```javascript
const notificationService = require('../services/notificationService');
await notificationService.notifyNewMessage(messageData);
```

**Announcements:**
- [ ] Open announcement creation route
- [ ] Add notification trigger

**Bills:**
- [ ] Open bill creation route
- [ ] Add notification trigger

**Documents:**
- [ ] Open document upload route
- [ ] Add notification trigger

#### 10. Test End-to-End (15 minutes)
- [ ] Restart server with Admin SDK
- [ ] Login as User A
- [ ] Note User A's FCM token
- [ ] Login as User B (different browser/device)
- [ ] User B posts a message
- [ ] User A should receive notification (even if app closed)
- [ ] Test with all notification types:
  - [ ] Chat messages
  - [ ] Announcements
  - [ ] Bills
  - [ ] Documents

---

### 🟢 Optional (Enhancement)

#### 11. Add Notification Preferences (1-2 hours)
- [ ] Create UI for notification settings
- [ ] Allow users to enable/disable by type
- [ ] Save preferences to Firestore
- [ ] Check preferences before sending

#### 12. Notification History (1-2 hours)
- [ ] Create collection to store sent notifications
- [ ] Add UI to view notification history
- [ ] Mark notifications as read/unread

#### 13. Rich Notifications (30 minutes)
- [ ] Add images to notifications
- [ ] Add action buttons
- [ ] Customize icons per type

#### 14. Analytics (30 minutes)
- [ ] Track notification delivery rates
- [ ] Monitor click-through rates
- [ ] Set up alerts for failures

#### 15. Mobile Apps (Long-term)
- [ ] Build iOS app with FCM
- [ ] Build Android app with FCM
- [ ] Use same backend notification service

---

## 🔍 Verification Tests

### Client-Side Tests:
```javascript
// In browser console after login
console.log('Permission:', Notification.permission); // Should be 'granted'
console.log('Messaging:', !!messaging); // Should be true
console.log('Token:', notificationService.currentToken); // Should show token
```

### Backend Tests (after Admin SDK setup):
```javascript
// Test script: server/test-notification.js
const admin = require('./src/config/firebaseAdmin');

async function test(token) {
  const message = {
    notification: { title: 'Test', body: 'Hello!' },
    token
  };
  
  const result = await admin.messaging().send(message);
  console.log('Sent:', result);
}

test('your-fcm-token-here');
```

Run:
```bash
node server/test-notification.js
```

---

## 📊 Progress Tracker

### Overall Progress:
```
Setup:        ████████░░ 80% (automation complete)
Testing:      ░░░░░░░░░░  0% (manual steps needed)
Backend:      ░░░░░░░░░░  0% (optional)
Enhancement:  ░░░░░░░░░░  0% (optional)
```

### Time Estimates:
- **Critical Steps**: ~15-20 minutes
- **Full Functionality**: ~1.5-2 hours
- **All Enhancements**: ~4-6 hours

---

## 🚨 Common Issues & Solutions

### Issue: "No registration token available"
**Solution:**
- Check VAPID key is correct
- Verify service worker registered
- Clear browser cache and retry

### Issue: "Permission denied"
**Solution:**
- User blocked notifications
- Clear site data in browser settings
- Grant permission again

### Issue: "Service worker registration failed"
**Solution:**
- File must be at `/public/firebase-messaging-sw.js`
- Check file has correct Firebase config
- Must use HTTPS (or localhost)

### Issue: Notifications not arriving
**Solution:**
- Check Firebase Console → Cloud Messaging → Metrics
- Verify FCM token in Firestore
- Test with Firebase Console test message
- Check browser notification settings

### Issue: "Firebase Admin SDK error"
**Solution:**
- Verify service account key is valid
- Check file path in require() statement
- Ensure key has correct permissions

---

## 📚 Reference Documents

- 📖 [NOTIFICATION_UPGRADE_SUMMARY.md](./NOTIFICATION_UPGRADE_SUMMARY.md) - Overview
- 📝 [FCM_SETUP_GUIDE.md](./FCM_SETUP_GUIDE.md) - Detailed setup
- 🔔 [NOTIFICATION_SYSTEM.md](./NOTIFICATION_SYSTEM.md) - Quick reference
- 💻 [notificationService.example.js](./server/src/services/notificationService.example.js) - Code examples

---

## ✅ Sign-off Checklist

Before considering migration complete:

- [ ] VAPID key generated and configured
- [ ] Notifications working when app is open
- [ ] Notifications working when app is closed
- [ ] FCM tokens saved to Firestore
- [ ] Service worker registered successfully
- [ ] Test message received from Firebase Console
- [ ] Documentation reviewed
- [ ] Team trained on new system (if applicable)

---

## 🎉 You're Done!

Once you complete the **Critical Steps** (1-4), your notification system will be fully functional!

The **Recommended** and **Optional** steps add backend automation and enhancements.

**Current Status:** ✅ Code ready, waiting for VAPID key configuration

**Next Action:** Generate VAPID key (Step 1)

---

**Need Help?**
- Check `FCM_SETUP_GUIDE.md` for detailed instructions
- Review console logs for specific errors
- Test with Firebase Console messaging tool
- Check Firestore for saved tokens

**Last Updated:** December 2, 2025
