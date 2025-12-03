import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import notificationService from '../services/notificationService';
import './ChatNotificationBadge.css';

const ChatNotificationBadge = ({ userId, onCountChange }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const isMountedRef = useRef(true);
  const countTimeoutRef = useRef(null);

  useEffect(() => {
    console.log('🔔 ChatNotificationBadge useEffect triggered. userId:', userId, 'db:', !!db);
    
    if (!userId || !db) {
      console.log('❌ Missing userId or db, aborting badge setup');
      setIsLoading(false);
      return;
    }

    console.log('✅ Setting up chat notification badge for user:', userId);
    isMountedRef.current = true;

    // Function to count unread messages
    const countUnreadMessages = async () => {
      if (!isMountedRef.current || !userId || !db) return;

      try {
        let totalUnread = 0;

        // Count unread private messages from all conversations
        try {
          const conversationsQuery = query(
            collection(db, 'conversations'),
            where('participants', 'array-contains', userId)
          );
          const conversationsSnapshot = await getDocs(conversationsQuery);
          
          console.log(`📊 Found ${conversationsSnapshot.size} conversations`);
          
          if (conversationsSnapshot.size === 0) {
            console.log('⚠️ No conversations found. Possible reasons:');
            console.log('   - No messages have been sent yet');
            console.log('   - User is not a participant in any conversations');
            console.log('   - Firestore permissions may be blocking access');
          }
          
          for (const convDoc of conversationsSnapshot.docs) {
            const conversationId = convDoc.id;
            const convData = convDoc.data();
            console.log(`🔍 Checking conversation: ${conversationId}`, {
              participants: convData.participants,
              lastMessage: convData.lastMessage
            });
            
            try {
              const messagesSnapshot = await getDocs(
                collection(db, `conversations/${conversationId}/messages`)
              );
              
              let convUnread = 0;
              messagesSnapshot.forEach((msgDoc) => {
                const data = msgDoc.data();
                // Count messages NOT sent by current user AND not viewed by current user
                if (data.senderId !== userId && !data.viewedBy?.includes(userId)) {
                  convUnread++;
                  totalUnread++;
                }
              });
              
              if (convUnread > 0) {
                console.log(`📬 Conversation ${conversationId}: ${convUnread} unread`);
              }
            } catch (error) {
              console.log(`Error reading messages in conversation ${conversationId}:`, error.message);
            }
          }
        } catch (error) {
          console.log('Error querying conversations:', error.message);
        }

        // Count unread group messages
        try {
          const groupsQuery = query(
            collection(db, 'groups'),
            where('members', 'array-contains', userId)
          );
          const groupsSnapshot = await getDocs(groupsQuery);
          
          console.log(`📊 Found ${groupsSnapshot.size} groups`);
          
          for (const groupDoc of groupsSnapshot.docs) {
            const groupId = groupDoc.id;
            
            try {
              const messagesSnapshot = await getDocs(
                collection(db, `groups/${groupId}/messages`)
              );
              
              let groupUnread = 0;
              messagesSnapshot.forEach((msgDoc) => {
                const data = msgDoc.data();
                if (data.senderId !== userId && !data.viewedBy?.includes(userId)) {
                  groupUnread++;
                  totalUnread++;
                }
              });
              
              if (groupUnread > 0) {
                console.log(`📬 Group ${groupId}: ${groupUnread} unread`);
              }
            } catch (error) {
              console.log(`Error reading messages in group ${groupId}:`, error.message);
            }
          }
        } catch (error) {
          console.log('Error querying groups:', error.message);
        }

        if (isMountedRef.current) {
          setUnreadCount(totalUnread);
          setIsLoading(false);
          
          if (onCountChange) {
            onCountChange(totalUnread);
          }
          
          console.log('💬 Chat badge updated - Total unread:', totalUnread);
        }
      } catch (error) {
        console.error('❌ Error counting unread messages:', error);
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    // Debounced count function
    const scheduleCount = () => {
      if (countTimeoutRef.current) {
        clearTimeout(countTimeoutRef.current);
      }
      
      countTimeoutRef.current = setTimeout(() => {
        console.log('🔄 Recounting unread messages...');
        countUnreadMessages();
      }, 500);
    };

    // Initial count
    countUnreadMessages();

    // Listen for changes in conversations
    const conversationsQuery = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', userId)
    );

    const unsubConversations = onSnapshot(
      conversationsQuery,
      (snapshot) => {
        console.log(`🔔 Conversations changed: ${snapshot.size} conversations`);
        
        // Check for new messages and send notifications
        snapshot.docChanges().forEach(async (change) => {
          if (change.type === 'modified' || change.type === 'added') {
            const convData = change.doc.data();
            const conversationId = change.doc.id;
            
            // Listen to new messages in this conversation
            const messagesQuery = query(
              collection(db, `conversations/${conversationId}/messages`)
            );
            
            onSnapshot(messagesQuery, (msgSnapshot) => {
              msgSnapshot.docChanges().forEach((msgChange) => {
                if (msgChange.type === 'added') {
                  const msgData = msgChange.doc.data();
                  
                  // Only notify if message is from someone else and not already viewed
                  if (msgData.senderId !== userId && !msgData.viewedBy?.includes(userId)) {
                    // Check if user is not on chat page
                    if (!window.location.pathname.includes('/chat')) {
                      const senderName = msgData.senderName || 'Someone';
                      const messageText = msgData.text || 'New message';
                      
                      // Send browser notification
                      if (notificationService.isEnabled() && 'Notification' in window && Notification.permission === 'granted') {
                        const notification = new Notification(`New message from ${senderName}`, {
                          body: messageText.substring(0, 100),
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
                        console.log('🔔 Sent browser notification for new message');
                      }
                    }
                  }
                }
              });
            });
          }
        });
        
        scheduleCount();
      },
      (error) => {
        console.log('Conversations listener error:', error.message);
      }
    );

    // Listen for changes in groups
    const groupsQuery = query(
      collection(db, 'groups'),
      where('members', 'array-contains', userId)
    );

    const unsubGroups = onSnapshot(
      groupsQuery,
      (snapshot) => {
        console.log(`🔔 Groups changed: ${snapshot.size} groups`);
        scheduleCount();
      },
      (error) => {
        console.log('Groups listener error:', error.message);
      }
    );

    // Listen for custom badge refresh events
    const handleRefresh = () => {
      console.log('🔄 Badge refresh requested');
      countUnreadMessages();
    };

    window.addEventListener('refreshChatBadge', handleRefresh);
    
    // More aggressive refresh - check every 3 seconds for new messages
    const intervalId = setInterval(() => {
      console.log('⏰ Periodic badge refresh (3s interval)');
      countUnreadMessages();
    }, 3000);

    return () => {
      clearInterval(intervalId);
      console.log('🔕 Cleaning up chat notification badge');
      isMountedRef.current = false;
      
      if (countTimeoutRef.current) {
        clearTimeout(countTimeoutRef.current);
      }
      
      window.removeEventListener('refreshChatBadge', handleRefresh);
      unsubConversations();
      unsubGroups();
    };
  }, [userId, onCountChange]);

  if (isLoading || unreadCount === 0) {
    return null;
  }

  return (
    <span className="chat-notification-badge" title={`${unreadCount} unread message${unreadCount !== 1 ? 's' : ''}`}>
      {unreadCount > 99 ? '99+' : unreadCount}
    </span>
  );
};

export default ChatNotificationBadge;
