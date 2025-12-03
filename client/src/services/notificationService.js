// Firebase Cloud Messaging Notification Service
import { messaging, getToken, onMessage } from '../config/firebase';
import { doc, setDoc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

// VAPID key for web push (you'll need to generate this in Firebase Console)
// Go to: Project Settings > Cloud Messaging > Web Push certificates > Generate key pair
const VAPID_KEY = 'BPigdejm-Fh106m5qQojQ4A-T8RwpwntjnpU10FMNzhDhqK5QbUK8bO3psT7guA05hAa51i2TVyKN6JlM4OSfkI';

class NotificationService {
  constructor() {
    this.currentToken = null;
    this.notificationPermission = 'default';
  }

  /**
   * Initialize notification service and request permission
   */
  async initialize(userId) {
    console.log('🔔 Initializing notification service for user:', userId);
    
    if (!messaging) {
      console.warn('⚠️ Firebase Messaging not available');
      return { success: false, message: 'Messaging not configured' };
    }

    // Check if running in secure context
    if (!window.isSecureContext && window.location.hostname !== 'localhost') {
      console.error('❌ FCM requires HTTPS or localhost');
      return { success: false, message: 'FCM requires HTTPS or localhost' };
    }

    // Check browser support
    if (!('Notification' in window)) {
      console.error('❌ Notifications not supported in this browser');
      return { success: false, message: 'Notifications not supported' };
    }

    try {
      console.log('📱 Current notification permission:', Notification.permission);
      
      // Request notification permission
      this.notificationPermission = await Notification.requestPermission();
      
      if (this.notificationPermission === 'granted') {
        console.log('✅ Notification permission granted');
        
        // Get FCM token
        const token = await this.getFCMToken();
        
        if (token && userId) {
          // Save token to Firestore for this user
          await this.saveTokenToFirestore(userId, token);
          console.log('🎉 Notification system fully initialized!');
          return { success: true, token, message: 'Notifications enabled' };
        } else if (!token) {
          console.error('❌ Failed to get FCM token');
          return { success: false, message: 'Failed to get FCM token' };
        }
      } else if (this.notificationPermission === 'denied') {
        console.error('❌ Notification permission denied by user');
        console.log('💡 To enable: Clear site data and reload, or check browser settings');
        return { success: false, message: 'Notification permission denied' };
      } else {
        console.log('⚠️ Notification permission not granted');
        return { success: false, message: 'Notification permission not granted' };
      }
    } catch (error) {
      console.error('❌ Error initializing notifications:', error);
      console.error('Stack trace:', error.stack);
      return { success: false, message: error.message };
    }
  }

  /**
   * Get FCM token for this device
   */
  async getFCMToken() {
    if (!messaging) return null;

    try {
      // Check if service workers are supported
      if (!('serviceWorker' in navigator)) {
        console.error('❌ Service Workers not supported in this browser');
        return null;
      }

      // Register service worker with proper scope
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/'
      });
      
      console.log('✅ Service Worker registered:', registration);

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;
      console.log('✅ Service Worker ready');

      // Get token
      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration
      });

      if (token) {
        console.log('✅ FCM Token obtained:', token.substring(0, 20) + '...');
        this.currentToken = token;
        return token;
      } else {
        console.log('⚠️ No registration token available. Check:');
        console.log('  1. Notification permission granted?', Notification.permission);
        console.log('  2. VAPID key correct?', VAPID_KEY.substring(0, 20) + '...');
        console.log('  3. Service worker active?', registration.active);
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting FCM token:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        name: error.name
      });
      
      // Provide helpful error messages
      if (error.code === 'messaging/permission-blocked') {
        console.error('💡 Solution: User blocked notifications. Clear site data and try again.');
      } else if (error.code === 'messaging/registration-token-not-registered') {
        console.error('💡 Solution: Check VAPID key is correct in Firebase Console.');
      } else if (error.message?.includes('service worker')) {
        console.error('💡 Solution: Service worker registration failed. Check browser console for errors.');
      }
      
      return null;
    }
  }

  /**
   * Save FCM token to Firestore
   */
  async saveTokenToFirestore(userId, token) {
    if (!db || !token) return;

    const userRef = doc(db, 'users', userId);

    try {
      await updateDoc(userRef, {
        fcmTokens: arrayUnion(token),
        lastTokenUpdate: new Date().toISOString()
      });

      console.log('✅ FCM token saved to Firestore');
    } catch (error) {
      // If document doesn't exist, create it
      if (error.code === 'not-found') {
        await setDoc(userRef, {
          fcmTokens: [token],
          lastTokenUpdate: new Date().toISOString()
        }, { merge: true });
      } else {
        console.error('Error saving token:', error);
      }
    }
  }

  /**
   * Listen for foreground messages (when app is open)
   */
  onForegroundMessage(callback) {
    if (!messaging) return () => {};

    return onMessage(messaging, (payload) => {
      console.log('📬 Foreground message received:', payload);
      
      // Dispatch custom event for badge refresh
      window.dispatchEvent(new CustomEvent('fcmNotificationReceived', {
        detail: payload
      }));
      
      // Show notification even when app is in foreground
      if (Notification.permission === 'granted' && document.hidden) {
        const notificationTitle = payload.notification?.title || 'New Message';
        const notificationOptions = {
          body: payload.notification?.body || '',
          icon: payload.notification?.icon || '/logo192.png',
          badge: '/logo192.png',
          tag: payload.data?.type || 'general',
          data: payload.data,
          requireInteraction: false,
          vibrate: [200, 100, 200]
        };

        const notification = new Notification(notificationTitle, notificationOptions);
        
        // Auto close after 5 seconds
        setTimeout(() => notification.close(), 5000);
        
        // Handle click
        notification.onclick = () => {
          window.focus();
          notification.close();
          
          // Navigate based on notification type
          const clickAction = payload.data?.clickAction;
          if (clickAction) {
            window.location.href = clickAction;
          }
        };
      }

      // Call custom callback
      if (callback) {
        callback(payload);
      }
    });
  }

  /**
   * Trigger manual badge refresh
   */
  refreshBadges() {
    console.log('🔄 Triggering badge refresh');
    window.dispatchEvent(new CustomEvent('refreshNotificationBadges'));
  }

  /**
   * Send chat notification to specific user
   * @param {Object} options - Notification options
   * @param {string} options.title - Notification title
   * @param {string} options.body - Notification body
   * @param {string} options.receiverId - Receiver user ID
   * @param {string} options.senderId - Sender user ID
   * @param {string} options.conversationId - Conversation ID
   */
  async sendChatNotification({ title, body, receiverId, senderId, conversationId }) {
    try {
      // Get receiver's FCM token from Firestore
      const userDoc = await getDoc(doc(db, 'users', receiverId));
      if (!userDoc.exists()) {
        console.log('Receiver user document not found');
        return;
      }

      const receiverData = userDoc.data();
      const receiverToken = receiverData.fcmToken;

      if (!receiverToken) {
        console.log('Receiver does not have FCM token');
        return;
      }

      // Create notification payload
      const notificationPayload = {
        notification: {
          title: title,
          body: body,
          icon: '/logo192.png',
          badge: '/logo192.png',
          tag: `chat-${conversationId}`,
          requireInteraction: false
        },
        data: {
          type: 'private-chat',
          conversationId: conversationId,
          senderId: senderId,
          receiverId: receiverId,
          clickAction: '/chat'
        },
        token: receiverToken
      };

      console.log('📤 Sending chat notification to:', receiverId);
      
      // Note: In a real application, this should be done via backend/Cloud Functions
      // For now, we'll use the browser's Notification API directly
      if (this.notificationPermission === 'granted') {
        const notification = new Notification(title, {
          body: body,
          icon: '/logo192.png',
          badge: '/logo192.png',
          tag: `chat-${conversationId}`,
          requireInteraction: false
        });

        notification.onclick = () => {
          window.focus();
          window.location.href = '/chat';
          notification.close();
        };

        setTimeout(() => notification.close(), 8000);
      }

      return notificationPayload;
    } catch (error) {
      console.error('Error sending chat notification:', error);
      throw error;
    }
  }

  /**
   * Check if notifications are enabled
   */
  isEnabled() {
    return this.notificationPermission === 'granted' && !!this.currentToken;
  }

  /**
   * Get current permission status
   */
  getPermissionStatus() {
    if ('Notification' in window) {
      return Notification.permission;
    }
    return 'unsupported';
  }
}

// Export singleton instance
const notificationService = new NotificationService();
export default notificationService;

/**
 * Send notification to specific user(s)
 * Note: This should be called from backend using Firebase Admin SDK
 * This is just a reference for the payload structure
 */
export const sendNotificationPayload = {
  notification: {
    title: 'Message Title',
    body: 'Message body',
    icon: '/logo192.png'
  },
  data: {
    type: 'chat', // 'chat', 'announcement', 'bill', 'document'
    organizationId: 'org-id',
    senderId: 'user-id',
    clickAction: '/chat'
  },
  // Token(s) to send to
  token: 'user-fcm-token' // or tokens: ['token1', 'token2']
};
