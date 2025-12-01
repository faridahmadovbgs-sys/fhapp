import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import axios from 'axios';
import './Home.css';

const Home = ({ data }) => {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState(null);
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

  useEffect(() => {
    const fetchAnnouncements = async () => {
      if (!db) {
        console.log('No db instance available');
        return;
      }
      
      try {
        setLoading(true);
        console.log('Fetching announcements...');
        const announcementsRef = collection(db, 'announcements');
        
        // First try a simple query without composite index requirement
        console.log('Trying simple query first...');
        const simpleQuery = query(
          announcementsRef,
          orderBy('createdAt', 'desc'),
          limit(10)
        );
        
        const simpleSnapshot = await getDocs(simpleQuery);
        console.log('Simple query result:', simpleSnapshot.docs.length, 'docs');
        
        // Filter active announcements in memory
        const allAnnouncements = simpleSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        const activeAnnouncements = allAnnouncements.filter(ann => ann.active === true);
        console.log('Active announcements after filtering:', activeAnnouncements.length);
        
        // If simple query works, try the composite query
        try {
          console.log('Trying composite query...');
          const q = query(
            announcementsRef,
            where('active', '==', true),
            orderBy('createdAt', 'desc'),
            limit(5)
          );
          
          const snapshot = await getDocs(q);
          console.log('Composite query successful:', snapshot.docs.length, 'docs');
          
          const announcementsList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          setAnnouncements(announcementsList);
        } catch (compositeError) {
          console.warn('Composite query failed, using filtered results:', compositeError.message);
          setAnnouncements(activeAnnouncements.slice(0, 5));
        }
        
      } catch (error) {
        console.error('Error fetching announcements:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, []);

  return (
    <div>
      <div className="hero">
        <h1>Welcome to Integrant Platform</h1>
        <p>Enterprise Organization Management</p>
        <p className="hero-subtitle">Streamline your business operations with automated billing, secure document management, and seamless team collaboration</p>
      </div>

      {data && (
        <div className="status">
          <h3>Server Status</h3>
          <p>✅ Connected to backend API</p>
          <p>Message: {data.message || 'Server is running'}</p>
        </div>
      )}

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
                 userRole === 'admin' ? '⚙️ Administrator' : 
                 userRole === 'moderator' ? '🛡️ Moderator' : 
                 userRole === 'member' ? '👤 Member' : 
                 '👤 User'}
              </strong>
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default Home;