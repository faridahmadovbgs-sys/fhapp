// Example: Backend Notification Service using Firebase Admin SDK
// This file shows how to send notifications from your Node.js backend

const admin = require('firebase-admin');

// Note: You need to setup Firebase Admin SDK first
// See FCM_SETUP_GUIDE.md for detailed instructions

/**
 * Send notification when new chat message is posted
 */
async function notifyNewMessage(messageData) {
  const { organizationId, senderId, senderName, text } = messageData;
  
  try {
    // Get organization members
    const orgDoc = await admin.firestore()
      .collection('organizations')
      .doc(organizationId)
      .get();
    
    const members = orgDoc.data()?.members || [];
    
    // Get FCM tokens for all members except sender
    const tokens = [];
    for (const member of members) {
      if (member.userId !== senderId) {
        const userDoc = await admin.firestore()
          .collection('users')
          .doc(member.userId)
          .get();
        
        const userTokens = userDoc.data()?.fcmTokens || [];
        tokens.push(...userTokens);
      }
    }
    
    if (tokens.length === 0) {
      console.log('No tokens to send notification to');
      return;
    }
    
    // Create notification payload
    const payload = {
      notification: {
        title: `${senderName} in ${orgDoc.data()?.name || 'Chat'}`,
        body: text.length > 100 ? text.substring(0, 97) + '...' : text,
        icon: '/logo192.png'
      },
      data: {
        type: 'chat',
        organizationId,
        senderId,
        clickAction: '/chat'
      }
    };
    
    // Send to all tokens
    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      ...payload
    });
    
    console.log(`✅ Sent ${response.successCount} notifications, ${response.failureCount} failed`);
    
    return response;
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
}

/**
 * Send notification for new announcement
 */
async function notifyNewAnnouncement(announcementData) {
  const { organizationId, title, priority } = announcementData;
  
  try {
    const orgDoc = await admin.firestore()
      .collection('organizations')
      .doc(organizationId)
      .get();
    
    const members = orgDoc.data()?.members || [];
    
    // Get all member tokens
    const tokens = [];
    for (const member of members) {
      const userDoc = await admin.firestore()
        .collection('users')
        .doc(member.userId)
        .get();
      
      const userTokens = userDoc.data()?.fcmTokens || [];
      tokens.push(...userTokens);
    }
    
    if (tokens.length === 0) return;
    
    // Priority emoji
    const priorityEmoji = {
      urgent: '🚨',
      high: '❗',
      normal: '📢'
    };
    
    const payload = {
      notification: {
        title: `${priorityEmoji[priority] || '📢'} New Announcement`,
        body: title,
        icon: '/logo192.png'
      },
      data: {
        type: 'announcement',
        organizationId,
        priority,
        clickAction: '/announcements'
      }
    };
    
    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      ...payload
    });
    
    console.log(`✅ Announcement notification sent to ${response.successCount} devices`);
    
    return response;
  } catch (error) {
    console.error('Error sending announcement notification:', error);
    throw error;
  }
}

/**
 * Send notification for new bill
 */
async function notifyNewBill(billData) {
  const { organizationId, title, amount, memberIds } = billData;
  
  try {
    // Get tokens only for affected members
    const tokens = [];
    for (const memberId of memberIds) {
      const userDoc = await admin.firestore()
        .collection('users')
        .doc(memberId)
        .get();
      
      const userTokens = userDoc.data()?.fcmTokens || [];
      tokens.push(...userTokens);
    }
    
    if (tokens.length === 0) return;
    
    const payload = {
      notification: {
        title: '💰 New Bill Posted',
        body: `${title} - $${amount.toFixed(2)}`,
        icon: '/logo192.png'
      },
      data: {
        type: 'bill',
        organizationId,
        amount: amount.toString(),
        clickAction: '/billing'
      }
    };
    
    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      ...payload
    });
    
    console.log(`✅ Bill notification sent to ${response.successCount} members`);
    
    return response;
  } catch (error) {
    console.error('Error sending bill notification:', error);
    throw error;
  }
}

/**
 * Send notification for new document
 */
async function notifyNewDocument(documentData) {
  const { organizationId, title, uploadedBy } = documentData;
  
  try {
    const orgDoc = await admin.firestore()
      .collection('organizations')
      .doc(organizationId)
      .get();
    
    const members = orgDoc.data()?.members || [];
    
    // Get tokens for all members except uploader
    const tokens = [];
    for (const member of members) {
      if (member.userId !== uploadedBy) {
        const userDoc = await admin.firestore()
          .collection('users')
          .doc(member.userId)
          .get();
        
        const userTokens = userDoc.data()?.fcmTokens || [];
        tokens.push(...userTokens);
      }
    }
    
    if (tokens.length === 0) return;
    
    const payload = {
      notification: {
        title: '📄 New Document Uploaded',
        body: title,
        icon: '/logo192.png'
      },
      data: {
        type: 'document',
        organizationId,
        clickAction: '/documents'
      }
    };
    
    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      ...payload
    });
    
    console.log(`✅ Document notification sent to ${response.successCount} members`);
    
    return response;
  } catch (error) {
    console.error('Error sending document notification:', error);
    throw error;
  }
}

/**
 * Send notification to specific user
 */
async function notifyUser(userId, notification, data) {
  try {
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(userId)
      .get();
    
    const tokens = userDoc.data()?.fcmTokens || [];
    
    if (tokens.length === 0) {
      console.log('No tokens for user:', userId);
      return;
    }
    
    const payload = {
      notification,
      data
    };
    
    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      ...payload
    });
    
    console.log(`✅ Notification sent to user ${userId}`);
    
    return response;
  } catch (error) {
    console.error('Error sending notification to user:', error);
    throw error;
  }
}

module.exports = {
  notifyNewMessage,
  notifyNewAnnouncement,
  notifyNewBill,
  notifyNewDocument,
  notifyUser
};

// Example usage in your routes:
/*

const notificationService = require('./services/notificationService');

// In chat message route
app.post('/api/messages', async (req, res) => {
  try {
    // Save message to Firestore
    const messageRef = await admin.firestore()
      .collection('messages')
      .add(messageData);
    
    // Send notification
    await notificationService.notifyNewMessage({
      organizationId: messageData.organizationId,
      senderId: req.user.id,
      senderName: req.user.name,
      text: messageData.text
    });
    
    res.json({ success: true, messageId: messageRef.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// In announcement route
app.post('/api/announcements', async (req, res) => {
  try {
    // Save announcement
    const announcementRef = await admin.firestore()
      .collection('messages')
      .add(announcementData);
    
    // Send notification
    await notificationService.notifyNewAnnouncement({
      organizationId: announcementData.organizationId,
      title: announcementData.title,
      priority: announcementData.priority
    });
    
    res.json({ success: true, announcementId: announcementRef.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

*/
