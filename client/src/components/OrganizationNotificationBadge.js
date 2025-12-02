import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../config/firebase';

const OrganizationNotificationBadge = ({ organizationId, userId }) => {
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    if (!organizationId || !userId || !db) return;

    console.log('🔔 Setting up org notification listener for org:', organizationId);

    const unsubscribers = [];

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

    // 3. Listen for unread chat messages
    const chatQuery = query(
      collection(db, 'messages'),
      where('organizationId', '==', organizationId),
      limit(100)
    );

    const unsubChat = onSnapshot(
      chatQuery,
      (snapshot) => {
        let count = 0;
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.userId !== userId && !data.viewedBy?.includes(userId) && !data.isAnnouncement) {
            count++;
          }
        });
        updateCount('chat', count);
      },
      (error) => {
        console.error('Error listening to chat:', error);
      }
    );
    unsubscribers.push(unsubChat);

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
      unsubscribers.forEach(unsub => unsub());
    };
  }, [organizationId, userId]);

  // Track counts by type
  const countsRef = React.useRef({
    announcements: 0,
    orgDocs: 0,
    chat: 0,
    bills: 0,
    payments: 0
  });

  const updateCount = (type, count) => {
    countsRef.current[type] = count;
    const total = Object.values(countsRef.current).reduce((sum, val) => sum + val, 0);
    setNotificationCount(total);
  };

  if (notificationCount === 0) {
    return null;
  }

  return (
    <span className="org-notification-badge">
      {notificationCount > 99 ? '99+' : notificationCount}
    </span>
  );
};

export default OrganizationNotificationBadge;
