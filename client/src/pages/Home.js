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
  const [userOrganizations, setUserOrganizations] = useState([]);
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
      const userId = user?.id || user?.uid;
      if (!userId) {
        console.log('⚠️ No user ID available for fetching organization');
        return;
      }
      
      try {
        console.log('🔍 Fetching organizations for user:', userId);
        const result = await getUserMemberOrganizations(userId);
        console.log('📦 Organizations result:', result);
        
        if (result.organizations.length > 0) {
          setUserOrganizations(result.organizations);
          setUserOrganization(result.organizations[0]);
          console.log('✅ User organizations loaded:', result.organizations.length);
          console.log('✅ Selected organization:', result.organizations[0].name, 'ID:', result.organizations[0].id);
        } else {
          console.log('⚠️ No organizations found for user:', userId);
        }
      } catch (error) {
        console.error('❌ Error fetching user organization:', error);
      }
    };
    
    fetchOrganization();
  }, [user]);

  const handleOrganizationChange = (e) => {
    const selectedOrgId = e.target.value;
    const selectedOrg = userOrganizations.find(org => org.id === selectedOrgId);
    if (selectedOrg) {
      setUserOrganization(selectedOrg);
      console.log('🔄 [Home] Switched to organization:', selectedOrg.name, 'ID:', selectedOrg.id);
    }
  };

  useEffect(() => {
    const fetchAnnouncements = async () => {
      if (!db || !userOrganization) {
        console.log('⚠️ [Home] No db instance or organization available - db:', !!db, 'org:', !!userOrganization);
        setLoading(false);
        return;
      }
      
      setLoading(true);
      console.log('📥 [Home] Fetching announcements for organization:', userOrganization.name, 'ID:', userOrganization.id);
      
      // Try with orderBy first
      try {
        const messagesRef = collection(db, 'messages');
        const q = query(
          messagesRef,
          where('organizationId', '==', userOrganization.id),
          orderBy('createdAt', 'desc'),
          limit(5)
        );
        
        const snapshot = await getDocs(q);
        console.log('📊 [Home] Query result: Found', snapshot.docs.length, 'announcements');
        
        const announcementsList = snapshot.docs.map(doc => {
          const data = doc.data();
          console.log('📄 [Home] Announcement:', doc.id, 'OrgID:', data.organizationId);
          return {
            id: doc.id,
            ...data,
            title: data.text?.substring(0, 50) + (data.text?.length > 50 ? '...' : ''),
            content: data.text,
            author: data.userName,
            createdAt: data.createdAt || data.timestamp
          };
        });
        
        setAnnouncements(announcementsList);
        console.log('✅ [Home] Announcements loaded successfully:', announcementsList.length);
        setLoading(false);
      } catch (indexError) {
        // Fallback: Query without orderBy and sort client-side
        console.log('⚠️ [Home] Index error, trying fallback query...', indexError.message);
        
        try {
          const messagesRef = collection(db, 'messages');
          const fallbackQuery = query(
            messagesRef,
            where('organizationId', '==', userOrganization.id)
          );
          
          const snapshot = await getDocs(fallbackQuery);
          console.log('📊 [Home] Fallback query: Found', snapshot.docs.length, 'announcements');
          
          let announcementsList = snapshot.docs.map(doc => {
            const data = doc.data();
            console.log('📄 [Home] Announcement (fallback):', doc.id, 'OrgID:', data.organizationId);
            return {
              id: doc.id,
              ...data,
              title: data.text?.substring(0, 50) + (data.text?.length > 50 ? '...' : ''),
              content: data.text,
              author: data.userName,
              createdAt: data.createdAt || data.timestamp
            };
          });
          
          // Sort client-side
          announcementsList.sort((a, b) => {
            const timeA = a.createdAt?.toMillis?.() || 0;
            const timeB = b.createdAt?.toMillis?.() || 0;
            return timeB - timeA;
          });
          
          // Limit to 5
          announcementsList = announcementsList.slice(0, 5);
          
          setAnnouncements(announcementsList);
          console.log('✅ [Home] Announcements loaded via fallback:', announcementsList.length);
        } catch (fallbackError) {
          console.error('❌ [Home] Fallback query also failed:', fallbackError);
          setAnnouncements([]);
        } finally {
          setLoading(false);
        }
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

      {userRole === 'account_owner' && userOrganizations.length > 1 && (
        <div className="organization-selector-home">
          <label htmlFor="org-select-home">
            <strong>📊 Select Organization:</strong>
          </label>
          <select
            id="org-select-home"
            value={userOrganization?.id || ''}
            onChange={handleOrganizationChange}
            className="org-dropdown-home"
          >
            {userOrganizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
          <p className="org-info-home">
            Viewing announcements for: <strong>{userOrganization?.name}</strong>
          </p>
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