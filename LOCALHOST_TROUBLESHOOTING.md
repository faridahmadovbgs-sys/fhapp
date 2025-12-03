# 🔧 Localhost Troubleshooting Guide

## Issue: FCM Not Working on Localhost

### Common Problems & Solutions:

### 1️⃣ Service Worker Not Loading in Development

**Problem**: React's development server doesn't serve custom service workers by default.

**Solution A - Use Build Mode** (Recommended for testing):
```bash
# Build the app
npm run build

# Serve the build folder
npx serve -s build

# Open http://localhost:3000
```

**Solution B - Use HTTPS Proxy** (For full development):
```bash
# Install local-ssl-proxy
npm install -g local-ssl-proxy

# In one terminal, start your app
npm start

# In another terminal, create HTTPS proxy
local-ssl-proxy --source 3001 --target 3000

# Open https://localhost:3001
```

**Solution C - Disable Service Worker Check** (Quick test):
Open browser DevTools → Application → Service Workers → Check "Bypass for network"

---

### 2️⃣ Notification Permission Blocked

**Problem**: Browser blocked notification permissions.

**Solution**:
1. Open DevTools (F12)
2. Go to Application → Storage
3. Click "Clear site data"
4. Reload page
5. Click "Allow" when prompted

**Alternative**:
- Chrome: Settings → Privacy → Site Settings → Notifications → Add `localhost:3000`
- Firefox: Address bar lock icon → Permissions → Notifications → Allow

---

### 3️⃣ Service Worker Registration Failed

**Check in Console**:
```javascript
// Open browser console and run:
navigator.serviceWorker.getRegistrations().then(registrations => {
  console.log('Registered workers:', registrations);
  if (registrations.length === 0) {
    console.log('❌ No service workers registered!');
  }
});
```

**Manual Registration Test**:
```javascript
// Test if service worker file is accessible
fetch('/firebase-messaging-sw.js')
  .then(response => {
    if (response.ok) {
      console.log('✅ Service worker file found');
    } else {
      console.log('❌ Service worker file not found:', response.status);
    }
  });
```

---

### 4️⃣ VAPID Key Issues

**Check**:
```javascript
// In browser console
console.log('VAPID Key length:', 'BPigdejm-Fh106m5qQojQ4A-T8RwpwntjnpU10FMNzhDhqK5QbUK8bO3psT7guA05hAa51i2TVyKN6JlM4OSfkI'.length);
// Should be 88 characters
```

---

### 5️⃣ Firebase Configuration Issues

**Verify Firebase Init**:
```javascript
// In browser console
import { messaging } from './config/firebase';
console.log('Messaging initialized:', !!messaging);
```

---

## ✅ Quick Test Steps

### Test 1: Check Service Worker Support
```javascript
// Browser console
console.log('Service Worker supported:', 'serviceWorker' in navigator);
console.log('Notifications supported:', 'Notification' in window);
console.log('Secure context:', window.isSecureContext);
console.log('Permission:', Notification.permission);
```

### Test 2: Manual Service Worker Registration
```javascript
// Browser console
navigator.serviceWorker.register('/firebase-messaging-sw.js')
  .then(reg => console.log('✅ Registered:', reg))
  .catch(err => console.error('❌ Failed:', err));
```

### Test 3: Check File Accessibility
```bash
# Open in browser:
http://localhost:3000/firebase-messaging-sw.js

# Should show the service worker code
# If you see React app instead, service worker isn't being served
```

---

## 🎯 Recommended Approach for Development

### Option 1: Build + Serve (Easiest)
```bash
cd client
npm run build
npx serve -s build -p 3000
```
✅ Service workers work perfectly  
✅ Matches production environment  
❌ Need to rebuild for every change

### Option 2: HTTPS in Development
```bash
# Terminal 1
cd client
HTTPS=true npm start

# Terminal 2 (if HTTPS doesn't work)
npm install -g local-ssl-proxy
local-ssl-proxy --source 3001 --target 3000
```
✅ Full development experience  
✅ Hot reload works  
❌ Requires HTTPS setup

### Option 3: Hybrid Approach
```bash
# Develop without FCM
npm start

# Test FCM when needed
npm run build && npx serve -s build
```
✅ Best of both worlds  
✅ Quick development  
✅ Proper FCM testing  

---

## 🐛 Debug Checklist

Run through this checklist:

- [ ] Browser console shows no errors
- [ ] `window.isSecureContext` returns `true` or hostname is `localhost`
- [ ] Service worker file loads at `/firebase-messaging-sw.js`
- [ ] Notification permission is "granted"
- [ ] VAPID key is 88 characters long
- [ ] Firebase messaging initialized
- [ ] Service worker registered successfully
- [ ] FCM token obtained
- [ ] Token saved to Firestore

---

## 📝 Console Debug Commands

Copy these into your browser console to diagnose:

```javascript
// Full diagnostic
console.log('=== FCM Diagnostic ===');
console.log('Secure Context:', window.isSecureContext);
console.log('Location:', window.location.href);
console.log('SW Support:', 'serviceWorker' in navigator);
console.log('Notification Support:', 'Notification' in window);
console.log('Permission:', Notification?.permission);

// Check service worker status
navigator.serviceWorker.getRegistrations().then(regs => {
  console.log('Service Workers:', regs.length);
  regs.forEach((reg, i) => {
    console.log(`  ${i + 1}. Scope:`, reg.scope);
    console.log(`     Active:`, !!reg.active);
  });
});

// Check Firebase
import { messaging } from './src/config/firebase';
console.log('Firebase Messaging:', !!messaging);
```

---

## 🎉 Expected Success Output

When everything works, you should see:

```
🔔 Initializing notification service for user: user-123
📱 Current notification permission: default
✅ Notification permission granted
✅ Service Worker registered: ServiceWorkerRegistration {...}
✅ Service Worker ready
✅ FCM Token obtained: BPigdejm-Fh106m5qQoj...
✅ FCM token saved to Firestore
🎉 Notification system fully initialized!
```

---

## 💡 If Still Not Working

1. **Check React Scripts Version**:
   ```bash
   npm list react-scripts
   # Should be 5.0.1 or higher
   ```

2. **Try in Production Build**:
   ```bash
   npm run build
   npx serve -s build
   ```

3. **Try Different Browser**:
   - Chrome (recommended)
   - Firefox
   - Edge

4. **Check Firestore Rules**:
   - Ensure users can write to their own document
   - Check `fcmTokens` field is allowed

5. **Verify Firebase Console**:
   - Cloud Messaging API enabled
   - VAPID key matches
   - No quota limits exceeded

---

## 🚀 Once Working

After fixing localhost issues, you should be able to:

1. ✅ Receive notification permission prompt
2. ✅ See FCM token in console
3. ✅ Send test notification from Firebase Console
4. ✅ Receive notifications even when tab is minimized
5. ✅ See badges update in real-time

**Still having issues?** Share the browser console output for more specific help!
