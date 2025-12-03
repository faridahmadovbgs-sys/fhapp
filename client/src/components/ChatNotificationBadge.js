import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getUserMemberOrganizations } from '../services/organizationService';
import './ChatNotificationBadge.css';

const ChatNotificationBadge = ({ userId, onCountChange }) => {
  const [hasUnread, setHasUnread] = useState(false);
  const [userOrganization, setUserOrganization] = useState(null);
  const location = useLocation();
  const isOnChatPage = location.pathname === '/chat';
  const messageCountRef = useRef(0);
  const hasVisitedChatRef = useRef(false);

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

  // When on chat page, mark as visited and hide badge
  useEffect(() => {
    if (isOnChatPage) {
      hasVisitedChatRef.current = true;
      setHasUnread(false);
      if (onCountChange) {
        onCountChange(0);
      }
    }
  }, [isOnChatPage, onCountChange]);

  // Listen for NEW messages arriving in real-time
  useEffect(() => {
    if (!userId || !db || !userOrganization) return;

    const messagesQuery = query(
      collection(db, 'messages'),
      where('organizationId', '==', userOrganization.id),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const currentCount = snapshot.size;
        const previousCount = messageCountRef.current;

        // First load - just set the count, don't show badge
        if (previousCount === 0) {
          messageCountRef.current = currentCount;
          return;
        }

        // If count increased and we're NOT on chat page
        if (currentCount > previousCount && !isOnChatPage && hasVisitedChatRef.current) {
          const newMessages = [];
          snapshot.forEach((doc) => {
            const msg = doc.data();
            // Only show badge for other people's messages
            if (msg.userId !== userId && !msg.isAnnouncement) {
              newMessages.push(doc.id);
            }
          });
          
          if (newMessages.length > 0) {
            console.log('📬 New message arrived while away from chat');
            setHasUnread(true);
            if (onCountChange) {
              onCountChange(1);
            }
          }
        }

        messageCountRef.current = currentCount;
      },
      (error) => {
        console.error('❌ Badge listener error:', error);
      }
    );

    return () => {
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
