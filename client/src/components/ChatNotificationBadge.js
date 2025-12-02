import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getUserMemberOrganizations } from '../services/organizationService';
import './ChatNotificationBadge.css';

const ChatNotificationBadge = ({ userId, onCountChange }) => {
  const [unreadMessages, setUnreadMessages] = useState([]);
  const [userOrganization, setUserOrganization] = useState(null);

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

  // Listen for unread messages
  useEffect(() => {
    if (!userId || !db || !userOrganization) return;

    console.log('📬 Setting up chat notification listener for user:', userId);

    // Query for messages in user's organization - without orderBy to avoid index issues
    const messagesQuery = query(
      collection(db, 'messages'),
      where('organizationId', '==', userOrganization.id),
      limit(100)
    );

    const unsubscribe = onSnapshot(
      messagesQuery, 
      (snapshot) => {
        const unread = [];
        
        snapshot.forEach((doc) => {
          const messageData = doc.data();
          
          // Only count messages:
          // 1. Not sent by current user
          // 2. Not viewed by current user
          // 3. Not announcements (handled separately)
          if (messageData.userId !== userId && 
              !messageData.viewedBy?.includes(userId) &&
              !messageData.isAnnouncement) {
            
            unread.push({
              id: doc.id,
              ...messageData,
              createdAt: messageData.createdAt?.toDate()
            });
          }
        });

        // Sort by createdAt in memory (most recent first)
        unread.sort((a, b) => {
          if (!a.createdAt || !b.createdAt) return 0;
          return b.createdAt - a.createdAt;
        });

        console.log('📬 Chat badge - Unread messages updated:', unread.length);
        setUnreadMessages(unread);
        if (onCountChange) {
          onCountChange(unread.length);
        }
      },
      (error) => {
        console.error('❌ Error in chat notification listener:', error);
        // Set empty array on error to prevent UI issues
        setUnreadMessages([]);
        if (onCountChange) {
          onCountChange(0);
        }
      }
    );

    return () => {
      console.log('📬 Cleaning up chat notification listener');
      unsubscribe();
    };
  }, [userId, userOrganization, onCountChange]);

  if (unreadMessages.length === 0) {
    return null;
  }

  return (
    <div className="chat-notification-container">
      <span 
        className="nav-notification-badge chat-badge"
      >
        {unreadMessages.length > 99 ? '99+' : unreadMessages.length}
      </span>
    </div>
  );
};

export default ChatNotificationBadge;
