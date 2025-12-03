import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import './OrganizationListWithBadges.css';

const OrganizationListWithBadges = ({ organizations, userId, selectedOrgId, onSelectOrg }) => {
  const [notificationCounts, setNotificationCounts] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const isMountedRef = useRef(true);
  const countsMapRef = useRef({});

  useEffect(() => {
    if (!organizations || organizations.length === 0 || !userId || !db) {
      setIsLoading(false);
      return;
    }

    isMountedRef.current = true;
    const unsubscribers = [];

    console.log('🔔 Setting up notification badges for', organizations.length, 'organizations');

    // Helper to update org count
    const updateOrgCount = (orgId, countsRef) => {
      if (!isMountedRef.current) return;
      
      const total = Object.values(countsRef).reduce((sum, val) => sum + val, 0);
      countsMapRef.current[orgId] = total;
      
      setNotificationCounts({ ...countsMapRef.current });
      setIsLoading(false);
    };

    organizations.forEach((org) => {
      // Track counts for each organization
      const countsRef = {
        announcements: 0,
        orgDocs: 0,
        chat: 0,
        bills: 0,
        payments: 0
      };

      // Initialize count for this org
      countsMapRef.current[org.id] = 0;

      // 1. Announcements
      const announcementsQuery = query(
        collection(db, 'messages'),
        where('organizationId', '==', org.id),
        where('isAnnouncement', '==', true),
        limit(50)
      );

      const unsubAnnouncements = onSnapshot(announcementsQuery, (snapshot) => {
        let count = 0;
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (!data.viewedBy?.includes(userId)) count++;
        });
        countsRef.announcements = count;
        updateOrgCount(org.id, countsRef);
      }, (error) => console.error('Error listening announcements:', error));
      unsubscribers.push(unsubAnnouncements);

      // 2. Organization Documents
      const orgDocsQuery = query(
        collection(db, 'organizationDocuments'),
        where('organizationId', '==', org.id),
        limit(50)
      );

      const unsubOrgDocs = onSnapshot(orgDocsQuery, (snapshot) => {
        let count = 0;
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.uploadedBy !== userId && !data.viewedBy?.includes(userId)) count++;
        });
        countsRef.orgDocs = count;
        updateOrgCount(org.id, countsRef);
      }, (error) => console.error('Error listening org docs:', error));
      unsubscribers.push(unsubOrgDocs);

      // 3. Chat Messages
      const chatQuery = query(
        collection(db, 'messages'),
        where('organizationId', '==', org.id),
        limit(100)
      );

      const unsubChat = onSnapshot(chatQuery, (snapshot) => {
        let count = 0;
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.userId !== userId && !data.viewedBy?.includes(userId) && !data.isAnnouncement) {
            count++;
          }
        });
        countsRef.chat = count;
        updateOrgCount(org.id, countsRef);
      }, (error) => console.error('Error listening chat:', error));
      unsubscribers.push(unsubChat);

      // 4. Unpaid Bills
      const billsQuery = query(
        collection(db, 'bills'),
        where('organizationId', '==', org.id),
        where('paymentStatus', '==', 'unpaid'),
        limit(50)
      );

      const unsubBills = onSnapshot(billsQuery, (snapshot) => {
        let count = 0;
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (!data.viewedBy?.includes(userId)) count++;
        });
        countsRef.bills = count;
        updateOrgCount(org.id, countsRef);
      }, (error) => console.error('Error listening bills:', error));
      unsubscribers.push(unsubBills);

      // 5. Payments
      const paymentsQuery = query(
        collection(db, 'payments'),
        where('organizationId', '==', org.id),
        limit(50)
      );

      const unsubPayments = onSnapshot(paymentsQuery, (snapshot) => {
        let count = 0;
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (!data.viewedBy?.includes(userId)) count++;
        });
        countsRef.payments = count;
        updateOrgCount(org.id, countsRef);
      }, (error) => console.error('Error listening payments:', error));
      unsubscribers.push(unsubPayments);
    });

    return () => {
      console.log('🔕 Cleaning up notification listeners for all organizations');
      isMountedRef.current = false;
      unsubscribers.forEach(unsub => unsub());
      countsMapRef.current = {};
    };
  }, [organizations, userId]);

  return (
    <div className="organization-list-with-badges">
      <h3>Your Organizations</h3>
      <div className="org-list">
        {organizations.map((org) => (
          <div 
            key={org.id} 
            className={`org-list-item ${selectedOrgId === org.id ? 'selected' : ''}`}
            onClick={() => onSelectOrg(org)}
          >
            <div className="org-icon">🏢</div>
            <div className="org-details">
              <div className="org-name">{org.name}</div>
              <div className="org-role">
                {org.ownerId === userId ? 'Owner' : 'Member'}
              </div>
            </div>
            {notificationCounts[org.id] > 0 && (
              <span className="org-list-badge">
                {notificationCounts[org.id] > 99 ? '99+' : notificationCounts[org.id]}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrganizationListWithBadges;
