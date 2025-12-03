# Firebase Cloud Messaging (FCM) Setup Guide

## 🎯 Why FCM Instead of Browser Notifications?

### Current Issues with Browser Notifications:
- ❌ Only work when browser tab is open
- ❌ No background notifications
- ❌ Can't send to mobile devices
- ❌ No cross-device sync
- ❌ Unreliable delivery

### Benefits of Firebase Cloud Messaging:
- ✅ **Background notifications** - Work even when app is closed
- ✅ **Cross-platform** - Web, iOS, Android
- ✅ **Reliable delivery** - Firebase server infrastructure
- ✅ **Token-based** - Target specific users/devices
- ✅ **Rich notifications** - Images, actions, data payload
- ✅ **Analytics** - Track notification performance

---

## 🚀 Setup Steps

### Step 1: Generate Web Push Certificate (VAPID Key)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **fhapp-ca321**
3. Click ⚙️ **Project Settings**
4. Go to **Cloud Messaging** tab
5. Scroll to **Web Push certificates** section
6. Click **Generate key pair**
7. Copy the generated key (starts with `B...`)

### Step 2: Update VAPID Key in Code

Open `client/src/services/notificationService.js` and replace:

```javascript
const VAPID_KEY = 'YOUR_VAPID_KEY_HERE';
```

With your actual VAPID key:

```javascript
const VAPID_KEY = 'BMlqZ4h3z...your-actual-key-here';
```

### Step 3: Enable Cloud Messaging API

1. In Firebase Console, go to **Project Settings**
2. Navigate to **Cloud Messaging** tab
3. Make sure **Firebase Cloud Messaging API (V1)** is **enabled**
4. Note your **Sender ID** (should be: `321828975722`)

### Step 4: Test Notifications

1. Start your app: `npm start`
2. Login as a user
3. You should see a browser prompt to allow notifications
4. Click **Allow**
5. Check browser console for:
   ```
   ✅ FCM Token obtained: BM...
   ✅ FCM token saved to Firestore
   ✅ FCM Notifications initialized
   ```

---

## 📱 How It Works

### Client-Side Flow:

1. **User logs in** → Request notification permission
2. **Permission granted** → Get FCM token from Firebase
3. **Save token** → Store in Firestore under user document
4. **Service Worker** → Registers to handle background messages
5. **Foreground messages** → Handled by `onMessage` listener
6. **Background messages** → Handled by service worker

### Server-Side Flow (Future Implementation):

```javascript
// Send notification using Firebase Admin SDK
const message = {
  notification: {
    title: 'New Message',
    body: 'You have a new message from John'
  },
  data: {
    type: 'chat',
    organizationId: 'org-123',
    senderId: 'user-456'
  },
  token: userFCMToken // Get from Firestore
};

await admin.messaging().send(message);
```

---

## 🔧 Backend Integration (Next Steps)

To send notifications from your backend, you need **Firebase Admin SDK**:

### 1. Install Firebase Admin SDK

```bash
cd server
npm install firebase-admin
```

### 2. Generate Service Account Key

1. Go to Firebase Console → Project Settings
2. Click **Service Accounts** tab
3. Click **Generate New Private Key**
4. Save the JSON file securely (DO NOT commit to git)

### 3. Initialize Admin SDK

Create `server/src/config/firebaseAdmin.js`:

```javascript
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'fhapp-ca321'
});

module.exports = admin;
```

### 4. Create Notification Service

Create `server/src/services/notificationService.js`:

```javascript
const admin = require('../config/firebaseAdmin');
const { getFirestore } = require('firebase-admin/firestore');

const db = getFirestore();

/**
 * Send notification to specific user
 */
async function sendToUser(userId, notification, data) {
  try {
    // Get user's FCM tokens from Firestore
    const userDoc = await db.collection('users').doc(userId).get();
    const tokens = userDoc.data()?.fcmTokens || [];

    if (tokens.length === 0) {
      console.log('No FCM tokens for user:', userId);
      return { success: false, message: 'No tokens' };
    }

    // Send to all user's devices
    const messages = tokens.map(token => ({
      notification,
      data,
      token
    }));

    const response = await admin.messaging().sendEach(messages);
    console.log('Notifications sent:', response.successCount);

    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount
    };
  } catch (error) {
    console.error('Error sending notification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send notification to organization members
 */
async function sendToOrganization(organizationId, notification, data, excludeUserId) {
  try {
    // Get organization members
    const orgDoc = await db.collection('organizations').doc(organizationId).get();
    const members = orgDoc.data()?.members || [];

    // Filter out excluded user
    const targetMembers = excludeUserId 
      ? members.filter(m => m.userId !== excludeUserId)
      : members;

    // Send to each member
    const results = await Promise.all(
      targetMembers.map(member => sendToUser(member.userId, notification, data))
    );

    return {
      success: true,
      sent: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    };
  } catch (error) {
    console.error('Error sending to organization:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendToUser,
  sendToOrganization
};
```

### 5. Trigger Notifications on Events

Example: Send notification when new message is posted

```javascript
// In your chat message handler
const notificationService = require('./services/notificationService');

// After saving message to Firestore
await notificationService.sendToOrganization(
  organizationId,
  {
    title: `${senderName} in ${orgName}`,
    body: messageText
  },
  {
    type: 'chat',
    organizationId,
    senderId,
    messageId: newMessageId
  },
  senderId // Don't notify sender
);
```

---

## 🎨 Notification Types

### Chat Message
```javascript
{
  notification: {
    title: "John Doe in Tech Team",
    body: "Hey, are you free for a meeting?"
  },
  data: {
    type: "chat",
    organizationId: "org-123",
    senderId: "user-456",
    clickAction: "/chat"
  }
}
```

### Announcement
```javascript
{
  notification: {
    title: "📢 New Announcement",
    body: "Important update from admin"
  },
  data: {
    type: "announcement",
    organizationId: "org-123",
    announcementId: "ann-789",
    clickAction: "/announcements"
  }
}
```

### Bill/Payment
```javascript
{
  notification: {
    title: "💰 New Bill Posted",
    body: "$50.00 - Monthly Membership"
  },
  data: {
    type: "bill",
    organizationId: "org-123",
    billId: "bill-321",
    clickAction: "/billing"
  }
}
```

### Document
```javascript
{
  notification: {
    title: "📄 New Document",
    body: "Meeting Minutes - Q4 2024"
  },
  data: {
    type: "document",
    organizationId: "org-123",
    documentId: "doc-654",
    clickAction: "/documents"
  }
}
```

---

## 🧪 Testing Notifications

### Test from Firebase Console:

1. Go to **Engage** → **Messaging** in Firebase Console
2. Click **Create your first campaign** or **New campaign**
3. Select **Firebase Notification messages**
4. Enter title and body
5. Click **Send test message**
6. Enter your FCM token (from console log)
7. Click **Test**

### Test Programmatically:

Use the Firebase Admin SDK in a test script:

```javascript
// test-notification.js
const admin = require('./config/firebaseAdmin');

async function testNotification(token) {
  const message = {
    notification: {
      title: 'Test Notification',
      body: 'This is a test from Firebase'
    },
    token
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('✅ Notification sent:', response);
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run: node test-notification.js <fcm-token>
testNotification(process.argv[2]);
```

---

## 🐛 Troubleshooting

### "No registration token available"
- Check if service worker is registered
- Verify VAPID key is correct
- Check browser console for errors
- Try in incognito mode (no extensions)

### "Permission denied"
- User blocked notifications
- Clear site data and try again
- Check browser notification settings

### "Service worker registration failed"
- Verify `firebase-messaging-sw.js` is in `/public` folder
- Check file has correct Firebase config
- Must be served over HTTPS (or localhost)

### "Token not saving to Firestore"
- Check Firestore security rules
- Verify user document exists
- Check browser console for errors

### Notifications not arriving
- Verify FCM token is valid
- Check Firebase Console → Cloud Messaging → Metrics
- Ensure device is online
- Test with Firebase Console test message

---

## 📊 Monitoring & Analytics

### Check Delivery Stats:
1. Firebase Console → **Engage** → **Messaging**
2. View sent, delivered, and opened counts
3. Track conversion rates

### Debug Logs:
- Client: Check browser console
- Server: Check server logs for Admin SDK errors
- Firebase: Check Firebase Console logs

---

## 🔒 Security Notes

1. **Never expose service account key** - Keep it secure on server only
2. **Validate tokens** - Check tokens belong to authenticated users
3. **Rate limiting** - Prevent notification spam
4. **User preferences** - Allow users to mute notifications
5. **Data payload** - Don't send sensitive data in notifications

---

## ✅ Quick Checklist

- [ ] VAPID key generated in Firebase Console
- [ ] VAPID key updated in `notificationService.js`
- [ ] Service worker file in `/public` folder
- [ ] Cloud Messaging API enabled
- [ ] User granted notification permission
- [ ] FCM token saved to Firestore
- [ ] Test notification sent successfully
- [ ] Firebase Admin SDK installed (for backend)
- [ ] Service account key generated (for backend)
- [ ] Notification service created (backend)

---

## 🎉 You're Ready!

Once configured, your app will have:
- ✅ **Background notifications** when app is closed
- ✅ **Cross-device support** for web and mobile
- ✅ **Reliable delivery** through Firebase infrastructure
- ✅ **Real-time updates** for all notification types
- ✅ **Professional notification system** for production use

Need help? Check Firebase [FCM Documentation](https://firebase.google.com/docs/cloud-messaging)
