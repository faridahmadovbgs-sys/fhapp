# 🏗️ Notification System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     FIREBASE CLOUD MESSAGING                         │
│                     (Notification Delivery)                          │
└─────────────────────────────────────────────────────────────────────┘
                              ▲         ▼
                              │         │
                    ┌─────────┘         └──────────┐
                    │                               │
                    │                               │
        ┌───────────▼──────────┐      ┌────────────▼──────────┐
        │   BACKEND SERVER     │      │   CLIENT BROWSER      │
        │   (Node.js/Express)  │      │   (React App)         │
        │                      │      │                       │
        │  Firebase Admin SDK  │      │  Firebase Client SDK  │
        │  - Send notifications│      │  - Receive tokens     │
        │  - Target users      │      │  - Request permission │
        │  - Track delivery    │      │  - Show notifications │
        └──────────┬───────────┘      └───────────┬───────────┘
                   │                               │
                   │                               │
                   │       ┌───────────────┐       │
                   └──────►│   FIRESTORE   │◄──────┘
                           │   (Database)  │
                           │               │
                           │  - User data  │
                           │  - FCM tokens │
                           │  - Messages   │
                           │  - Bills      │
                           └───────────────┘
```

---

## Data Flow

### 1. Token Registration Flow
```
User Opens App
     │
     ▼
Request Notification Permission ──► User Allows
     │
     ▼
Get FCM Token from Firebase
     │
     ▼
Save Token to Firestore
     │
     ▼
users/{userId}/fcmTokens: ["token1", "token2", ...]
```

### 2. Notification Sending Flow (Backend)
```
Event Occurs
(New message, bill, etc)
     │
     ▼
Backend Triggered
     │
     ▼
Query Firestore for User(s)
     │
     ▼
Get FCM Tokens
     │
     ▼
Send via Firebase Admin SDK
     │
     ▼
Firebase Cloud Messaging
     │
     ▼
User Device(s) Receive
     │
     ▼
Service Worker Shows Notification
(Even if app closed!)
```

### 3. User Interaction Flow
```
Notification Arrives
     │
     ▼
Service Worker Displays
     │
     ▼
User Clicks Notification
     │
     ▼
Browser Opens/Focuses App
     │
     ▼
Navigate to Relevant Page
(/chat, /bills, /documents)
```

---

## Component Breakdown

### Client-Side Components

```
client/
├── public/
│   └── firebase-messaging-sw.js ─────► Service Worker
│       • Runs in background           (Handles background msgs)
│       • Independent of main app
│       • Shows notifications
│
├── src/
│   ├── config/
│   │   └── firebase.js ──────────────► Firebase Config
│   │       • Initializes Firebase     (Auth, DB, Messaging)
│   │       • Exports messaging
│   │
│   ├── services/
│   │   └── notificationService.js ───► Notification Service
│   │       • Request permissions      (Token management)
│   │       • Get/save FCM tokens
│   │       • Handle foreground msgs
│   │
│   └── pages/
│       └── ChatPage.js ───────────────► UI Integration
│           • Initialize on login      (User-facing)
│           • Display notifications
│           • Handle clicks
```

### Backend Components (To be implemented)

```
server/
├── src/
│   ├── config/
│   │   ├── firebaseAdmin.js ─────────► Admin SDK Config
│   │   │   • Initialize Admin SDK    (Server-side Firebase)
│   │   │   • Load service account
│   │   │
│   │   └── serviceAccountKey.json ───► Credentials
│   │       • Private key              (DO NOT COMMIT!)
│   │       • Firebase permissions
│   │
│   └── services/
│       └── notificationService.js ───► Notification Logic
│           • Send to user             (Backend functions)
│           • Send to organization
│           • Message types
│           • Error handling
```

---

## Notification Types & Triggers

### Chat Messages
```
User B sends message
     │
     ▼
Save to Firestore (/messages)
     │
     ▼
Trigger: notifyNewMessage()
     │
     ▼
Get organization members
     │
     ▼
Send notification to all (except sender)
     │
     ▼
Users receive: "John in Tech Team: Hello!"
```

### Announcements
```
Admin creates announcement
     │
     ▼
Save to Firestore (/messages, isAnnouncement: true)
     │
     ▼
Trigger: notifyNewAnnouncement()
     │
     ▼
Get all organization members
     │
     ▼
Send to everyone
     │
     ▼
Users receive: "📢 New Announcement: Team Meeting"
```

### Bills
```
Owner creates bill
     │
     ▼
Save to Firestore (/bills)
     │
     ▼
Trigger: notifyNewBill()
     │
     ▼
Get assigned members
     │
     ▼
Send to specific members
     │
     ▼
Users receive: "💰 New Bill: $50.00 - Monthly Dues"
```

### Documents
```
User uploads document
     │
     ▼
Save to Firestore (/organizationDocuments)
     │
     ▼
Trigger: notifyNewDocument()
     │
     ▼
Get organization members
     │
     ▼
Send to all (except uploader)
     │
     ▼
Users receive: "📄 New Document: Q4 Report"
```

---

## State Management

### FCM Token States
```
No Permission ─► Request ─► Granted ─► Token Obtained ─► Saved
                    │
                    ▼
                  Denied ─► Show manual enable instructions
```

### Notification States
```
Sent ─► Delivered ─► Displayed ─► Clicked ─► App Opened
  │         │            │
  │         │            └─► Dismissed
  │         │
  │         └─► Failed (retry or log)
  │
  └─► Failed (check token validity)
```

### User Presence States
```
App Open (Foreground)
     │
     ├─► Notification via onMessage() listener
     │   Show in-app notification
     │
App Closed (Background)
     │
     └─► Notification via Service Worker
         Show system notification
```

---

## Database Schema

### Users Collection
```javascript
users/{userId}
{
  id: "user-123",
  email: "user@example.com",
  name: "John Doe",
  fcmTokens: [
    "BM...", // Desktop Chrome
    "dK...", // Mobile Chrome
    "fP..."  // Laptop Firefox
  ],
  lastTokenUpdate: "2025-12-02T10:30:00Z",
  notificationPreferences: {
    chat: true,
    announcements: true,
    bills: true,
    documents: true
  }
}
```

### Messages Collection
```javascript
messages/{messageId}
{
  id: "msg-456",
  organizationId: "org-123",
  userId: "user-789",
  text: "Hello team!",
  createdAt: Timestamp,
  viewedBy: ["user-111", "user-222"],
  isAnnouncement: false
}
```

---

## Security Rules

### Firestore Rules (Recommended)
```javascript
// Allow users to update their own tokens
match /users/{userId} {
  allow read: if request.auth.uid == userId;
  allow update: if request.auth.uid == userId 
                && request.resource.data.keys().hasOnly(['fcmTokens', 'lastTokenUpdate']);
}

// Messages readable by organization members
match /messages/{messageId} {
  allow read: if request.auth != null 
              && get(/databases/$(database)/documents/organizations/$(resource.data.organizationId))
                .data.members.hasAny([request.auth.uid]);
}
```

---

## Performance Considerations

### Token Management
- **Multiple Tokens**: Users can have tokens from multiple devices
- **Token Cleanup**: Remove invalid/expired tokens periodically
- **Token Refresh**: Update tokens when they change

### Batch Sending
```javascript
// Bad: Send one at a time
for (const token of tokens) {
  await admin.messaging().send({ token, ...payload });
}

// Good: Send in batch
await admin.messaging().sendEachForMulticast({
  tokens: tokens,
  ...payload
});
```

### Rate Limiting
- Max 1000 notifications per sendEachForMulticast()
- Implement queuing for large organizations
- Track notification frequency per user

---

## Monitoring & Analytics

### Key Metrics
```
┌─────────────────────────────────┐
│   Notification Metrics          │
├─────────────────────────────────┤
│  • Sent:       1,234            │
│  • Delivered:  1,180 (95.6%)    │
│  • Displayed:  1,150 (97.5%)    │
│  • Clicked:      345 (30.0%)    │
│  • Failed:        54  (4.4%)    │
└─────────────────────────────────┘
```

### Firebase Console Monitoring
- **Cloud Messaging** → View delivery stats
- **Analytics** → Track user engagement
- **Crashlytics** → Monitor service worker errors

---

## Error Handling

### Client-Side Errors
```javascript
try {
  const token = await getToken(messaging, { vapidKey });
} catch (error) {
  if (error.code === 'messaging/permission-blocked') {
    // Show instructions to enable
  } else if (error.code === 'messaging/token-subscribe-failed') {
    // Retry token fetch
  }
}
```

### Server-Side Errors
```javascript
try {
  await admin.messaging().send(message);
} catch (error) {
  if (error.code === 'messaging/registration-token-not-registered') {
    // Remove invalid token from Firestore
  } else if (error.code === 'messaging/invalid-argument') {
    // Log and fix payload format
  }
}
```

---

## Scaling Considerations

### Current (Small Scale)
```
< 1,000 users
• Send immediately
• No queuing needed
• Direct Firebase calls
```

### Medium Scale
```
1,000 - 10,000 users
• Batch sending (500-1000/batch)
• Simple queue (Array/Database)
• Basic retry logic
```

### Large Scale
```
> 10,000 users
• Message queue (Redis/RabbitMQ)
• Worker processes
• Advanced retry/circuit breaker
• Priority queuing
```

---

## Testing Strategy

### Unit Tests
```javascript
describe('NotificationService', () => {
  test('should get FCM token', async () => {
    const token = await notificationService.getFCMToken();
    expect(token).toBeTruthy();
  });
  
  test('should save token to Firestore', async () => {
    await notificationService.saveTokenToFirestore('user-123', 'token-abc');
    // Verify in Firestore
  });
});
```

### Integration Tests
```javascript
test('send notification end-to-end', async () => {
  // 1. Create message
  // 2. Trigger notification
  // 3. Verify delivery
  // 4. Check user received it
});
```

### Manual Testing
- [ ] Test on Chrome Desktop
- [ ] Test on Firefox Desktop
- [ ] Test on Mobile Chrome
- [ ] Test on Mobile Safari
- [ ] Test with app closed
- [ ] Test with multiple devices

---

## Future Enhancements

### Phase 1: Basic (Current)
- ✅ Client-side FCM setup
- ✅ Token management
- ✅ Service worker
- ⏳ Backend triggers

### Phase 2: Enhanced
- [ ] Notification preferences
- [ ] Rich notifications (images, actions)
- [ ] Notification history
- [ ] Read/unread tracking

### Phase 3: Advanced
- [ ] Mobile apps (iOS/Android)
- [ ] Desktop apps (Electron)
- [ ] Topic-based messaging
- [ ] A/B testing
- [ ] Personalization

---

## Resources

- 🔥 [Firebase FCM Docs](https://firebase.google.com/docs/cloud-messaging)
- 📱 [Web Push Protocol](https://web.dev/push-notifications-overview/)
- 🛠️ [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- 📊 [Notification Best Practices](https://web.dev/push-notifications-overview/#best-practices)

---

**Last Updated:** December 2, 2025  
**Version:** 1.0  
**Status:** Client-side complete, Backend integration pending
