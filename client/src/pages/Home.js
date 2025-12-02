import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getUserMemberOrganizations } from '../services/organizationService';
import axios from 'axios';
import './Home.css';

const Home = ({ data }) => {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState(null);
  const [userOrganization, setUserOrganization] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user?.uid) return;

      try {
        // First try MongoDB backend API
        try {
          const response = await axios.get(`http://localhost:5000/api/users/uid/${user.uid}`);
          if (response.data.success && response.data.data) {
            setUserRole(response.data.data.role || 'user');
            console.log('✅ User role fetched from MongoDB:', response.data.data.role);
            return;
          }
        } catch (apiError) {
          console.log('⚠️ MongoDB API not available, trying Firebase...', apiError.message);
        }

        // Fallback to Firebase if MongoDB fails
        if (user?.id && db) {
          const userDoc = await getDoc(doc(db, 'users', user.id));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserRole(userData.role || 'user');
            console.log('✅ User role fetched from Firebase:', userData.role);
          }
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        setUserRole('user'); // Default to 'user' if all fails
      }
    };

    fetchUserRole();
  }, [user]);

  // Fetch user's organization
  useEffect(() => {
    const fetchOrganization = async () => {
      if (!user?.id) return;
      
      try {
        const result = await getUserMemberOrganizations(user.id);
        if (result.organizations.length > 0) {
          setUserOrganization(result.organizations[0]);
          console.log('✅ User organization fetched:', result.organizations[0].name);
        }
      } catch (error) {
        console.error('Error fetching user organization:', error);
      }
    };
    
    fetchOrganization();
  }, [user]);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      if (!db || !userOrganization) {
        console.log('No db instance or organization available');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        console.log('Fetching announcements for organization:', userOrganization.name);
        
        // Fetch messages (announcements) from the messages collection filtered by organization
        const messagesRef = collection(db, 'messages');
        const q = query(
          messagesRef,
          where('organizationId', '==', userOrganization.id),
          orderBy('createdAt', 'desc'),
          limit(5)
        );
        
        const snapshot = await getDocs(q);
        console.log('✅ Found', snapshot.docs.length, 'announcements for organization');
        
        const announcementsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          title: doc.data().text?.substring(0, 50) + (doc.data().text?.length > 50 ? '...' : ''),
          content: doc.data().text,
          author: doc.data().userName,
          createdAt: doc.data().createdAt || doc.data().timestamp
        }));
        
        setAnnouncements(announcementsList);
        
      } catch (error) {
        console.error('Error fetching announcements:', error);
        setAnnouncements([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, [userOrganization]);

  return (
    <div>
      <div className="hero">
        <h1>Welcome to Integrant Platform</h1>
        <p>Enterprise Organization Management</p>
        <p className="hero-subtitle">Streamline your business operations with automated billing, secure document management, and seamless team collaboration</p>
      </div>

      {/* Announcements Section */}
      <div className="announcements-section">
        <h2>📢 Announcements</h2>
        {loading ? (
          <p className="loading-text">Loading announcements...</p>
        ) : announcements.length > 0 ? (
          <div className="announcements-list">
            {announcements.map((announcement) => (
              <div key={announcement.id} className={`announcement-card ${announcement.priority || 'normal'}`}>
                <div className="announcement-header">
                  <h3>{announcement.title}</h3>
                  <span className="announcement-date">
                    {announcement.createdAt?.toDate?.()?.toLocaleDateString() || 'Recent'}
                  </span>
                </div>
                <p className="announcement-content">{announcement.content}</p>
                {announcement.author && (
                  <p className="announcement-author">— {announcement.author}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="no-announcements">
            <p>No announcements at this time.</p>
          </div>
        )}
      </div>

      <div className="features">
        <div className="feature">
          <h3>💰 Billing Management</h3>
          <p>Create and manage bills, track payments, and handle subscription billing for your organization members with automated payment tracking.</p>
        </div>
        <div className="feature">
          <h3>👥 Team Collaboration</h3>
          <p>Invite members, manage roles and permissions, share documents, and communicate in real-time with built-in chat functionality.</p>
        </div>
        <div className="feature">
          <h3>📁 Document Storage</h3>
          <p>Securely store and share personal and organization-wide documents with categorization, search, and easy access control.</p>
        </div>
      </div>

      {user && (
        <div className="user-info-section">
          <p className="user-greeting">
            Logged in as: <strong>{user.name || user.email}</strong>
          </p>
          {userRole && (
            <p className="user-role">
              Account Type: <strong className={`role-${userRole}`}>
                {userRole === 'account_owner' ? '👑 Account Owner' : 
                 userRole === 'sub_account_owner' ? '👑 Sub Account Owner' : 
                 userRole === 'admin' ? '⚙️ Administrator' : 
                 userRole === 'moderator' ? '🛡️ Moderator' : 
                 '👤 Member'}
              </strong>
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default Home;