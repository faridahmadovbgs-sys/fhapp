import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../config/firebase';

const OrganizationNotificationBadge = ({ organizationId, userId }) => {
  const [notificationCount, setNotificationCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const countsRef = useRef({
    announcements: 0,
    orgDocs: 0,
    chat: 0,
    bills: 0,
    payments: 0
  });
  const isMountedRef = useRef(true);

  useEffect(() => {
    if (!organizationId || !userId || !db) {
      setIsLoading(false);
      return;
    }

    isMountedRef.current = true;
    console.log('🔔 Setting up org notification listener for org:', organizationId);

    const unsubscribers = [];

    // Helper to update count safely
    const updateCount = (type, count) => {
      if (!isMountedRef.current) return;
      
      countsRef.current[type] = count;
      const total = Object.values(countsRef.current).reduce((sum, val) => sum + val, 0);
      setNotificationCount(total);
      setIsLoading(false);
      
      console.log(`📊 Org ${organizationId} badge update:`, {
        type,
        count,
        total,
        breakdown: countsRef.current
      });
    };

    // 1. Listen for unread announcements
    const announcementsQuery = query(
      collection(db, 'messages'),
      where('organizationId', '==', organizationId),
      where('isAnnouncement', '==', true),
      limit(50)
    );

    const unsubAnnouncements = onSnapshot(
      announcementsQuery,
      (snapshot) => {
        let count = 0;
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (!data.viewedBy?.includes(userId)) {
            count++;
          }
        });
        updateCount('announcements', count);
      },
      (error) => {
        console.error('Error listening to announcements:', error);
      }
    );
    unsubscribers.push(unsubAnnouncements);

    // 2. Listen for unread organization documents
    const orgDocsQuery = query(
      collection(db, 'organizationDocuments'),
      where('organizationId', '==', organizationId),
      limit(50)
    );

    const unsubOrgDocs = onSnapshot(
      orgDocsQuery,
      (snapshot) => {
        let count = 0;
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.uploadedBy !== userId && !data.viewedBy?.includes(userId)) {
            count++;
          }
        });
        updateCount('orgDocs', count);
      },
      (error) => {
        console.error('Error listening to org docs:', error);
      }
    );
    unsubscribers.push(unsubOrgDocs);

    // 3. Chat messages are now handled by ChatNotificationBadge component
    // Set chat count to 0 to avoid confusion with private chat badges
    updateCount('chat', 0);

    // 4. Listen for unpaid bills
    const billsQuery = query(
      collection(db, 'bills'),
      where('organizationId', '==', organizationId),
      where('paymentStatus', '==', 'unpaid'),
      limit(50)
    );

    const unsubBills = onSnapshot(
      billsQuery,
      (snapshot) => {
        let count = 0;
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (!data.viewedBy?.includes(userId)) {
            count++;
          }
        });
        updateCount('bills', count);
      },
      (error) => {
        console.error('Error listening to bills:', error);
      }
    );
    unsubscribers.push(unsubBills);

    // 5. Listen for unviewed payments
    const paymentsQuery = query(
      collection(db, 'payments'),
      where('organizationId', '==', organizationId),
      limit(50)
    );

    const unsubPayments = onSnapshot(
      paymentsQuery,
      (snapshot) => {
        let count = 0;
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (!data.viewedBy?.includes(userId)) {
            count++;
          }
        });
        updateCount('payments', count);
      },
      (error) => {
        console.error('Error listening to payments:', error);
      }
    );
    unsubscribers.push(unsubPayments);

    return () => {
      console.log('🔕 Cleaning up org notification listeners for org:', organizationId);
      isMountedRef.current = false;
      unsubscribers.forEach(unsub => unsub());
    };
  }, [organizationId, userId]);

  if (isLoading || notificationCount === 0) {
    return null;
  }

  return (
    <span 
      className="org-notification-badge"
      title={`${notificationCount} unread notification${notificationCount !== 1 ? 's' : ''}`}
    >
      {notificationCount > 99 ? '99+' : notificationCount}
    </span>
  );
};

export default OrganizationNotificationBadge;
