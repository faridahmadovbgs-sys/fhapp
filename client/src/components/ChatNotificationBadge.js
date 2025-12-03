import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { collection, query, where, onSnapshot, limit, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getUserMemberOrganizations } from '../services/organizationService';
import './ChatNotificationBadge.css';

// Use shared timestamp storage with ChatPage
window.chatLastViewedTimes = window.chatLastViewedTimes || {};

const ChatNotificationBadge = ({ userId, onCountChange }) => {
  const [hasUnread, setHasUnread] = useState(false);
  const [userOrganization, setUserOrganization] = useState(null);
  const location = useLocation();
  const isOnChatPage = location.pathname === '/chat';
  const checkIntervalRef = useRef(null);

  // Fetch user's organization
  useEffect(() => {
    if (!userId) return;

    const fetchOrganization = async () => {
      try {
        const result = await getUserMemberOrganizations(userId);
        if (result.organizations.length > 0) {
          setUserOrganization(result.organizations[0]);
        }
      } catch (error) {
        console.error('Error fetching organization:', error);
      }
    };

    fetchOrganization();
  }, [userId]);

  // Clear badge and update timestamp when on chat page
  useEffect(() => {
    if (isOnChatPage && userId && userOrganization) {
      const key = `${userId}_${userOrganization.id}`;
      window.chatLastViewedTimes[key] = Date.now();
      setHasUnread(false);
      if (onCountChange) {
        onCountChange(0);
      }
      console.log('📬 Chat viewed, timestamp updated:', new Date(window.chatLastViewedTimes[key]).toISOString());
    }
  }, [isOnChatPage, userId, userOrganization, onCountChange]);

  // Listen for messages when NOT on chat page
  useEffect(() => {
    if (!userId || !db || !userOrganization) return;

    // Don't show badge on chat page
    if (isOnChatPage) {
      setHasUnread(false);
      if (onCountChange) {
        onCountChange(0);
      }
      return;
    }

    const key = `${userId}_${userOrganization.id}`;

    console.log('📬 Setting up badge listener');

    const messagesQuery = query(
      collection(db, 'messages'),
      where('organizationId', '==', userOrganization.id),
      limit(100)
    );

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        if (!snapshot || snapshot.empty) {
          setHasUnread(false);
          if (onCountChange) onCountChange(0);
          return;
        }

        // Re-read the timestamp on EVERY snapshot check
        const lastViewed = window.chatLastViewedTimes[key];
        console.log('📬 Checking messages. Last viewed:', lastViewed ? new Date(lastViewed).toISOString() : 'Never');

        let newMessagesFound = false;
        const now = Date.now();
        let debugMessages = [];

        snapshot.forEach((doc) => {
          const msg = doc.data();
          
          // Skip own messages and announcements
          if (msg.userId === userId || msg.isAnnouncement) {
            return;
          }

          // Get message timestamp
          let msgTime = 0;
          if (msg.createdAt) {
            if (msg.createdAt.toMillis) {
              msgTime = msg.createdAt.toMillis();
            } else if (msg.createdAt instanceof Date) {
              msgTime = msg.createdAt.getTime();
            }
          }

          // If we have a last viewed time, check if message is newer
          if (lastViewed) {
            if (msgTime > lastViewed) {
              debugMessages.push({
                id: doc.id,
                msgTime: new Date(msgTime).toISOString(),
                text: msg.text?.substring(0, 30)
              });
              newMessagesFound = true;
            }
          } else {
            // No last viewed time - show badge for recent messages (last 1 hour)
            const oneHourAgo = now - (60 * 60 * 1000);
            if (msgTime > oneHourAgo) {
              newMessagesFound = true;
            }
          }
        });

        if (debugMessages.length > 0) {
          console.log('📬 New messages found:', debugMessages);
        }
        
        console.log('📬 Badge check result. Has unread:', newMessagesFound);
        setHasUnread(newMessagesFound);
        if (onCountChange) {
          onCountChange(newMessagesFound ? 1 : 0);
        }
      },
      (error) => {
        console.error('❌ Badge listener error:', error);
        setHasUnread(false);
        if (onCountChange) {
          onCountChange(0);
        }
      }
    );

    return () => {
      console.log('📬 Cleaning up badge listener');
      unsubscribe();
    };
  }, [userId, userOrganization, isOnChatPage, onCountChange]);

  if (!hasUnread || isOnChatPage) {
    return null;
  }

  return (
    <span className="nav-notification-badge chat-badge"></span>
  );
};

export default ChatNotificationBadge;
