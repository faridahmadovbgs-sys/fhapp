import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAccount } from '../contexts/AccountContext';
import { doc, getDoc, collection, query, orderBy, limit, getDocs, where, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getUserMemberOrganizations } from '../services/organizationService';
import OrganizationNotificationBadge from '../components/OrganizationNotificationBadge';
import '../components/OrganizationNotificationBadge.css';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Home.css';

const Home = ({ data }) => {
  const { user } = useAuth();
  const { 
    accounts, 
    activeAccount, 
    operatingAsUser,
    loading: loadingAccounts, 
    switchAccount,
    switchToUserMode,
    switchToAccountMode
  } = useAccount();
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState(null);
  const [userOrganizations, setUserOrganizations] = useState([]);
  const [userOrganization, setUserOrganization] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  const getAccountIcon = (type) => {
    const icons = {
      'personal': '👤',
      'llc': '🏢',
      'trust': '🏛️',
      'corporation': '🏭',
      'partnership': '🤝',
      'nonprofit': '❤️',
      'other': '📋'
    };
    return icons[type] || '📋';
  };

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

      try {
        // Try to fetch with index-based query first
        const q = query(
          collection(db, 'messages'),
          where('organizationId', '==', userOrganization.id),
          where('isAnnouncement', '==', true),
          where('active', '==', true),
          orderBy('priority', 'desc'),
          orderBy('createdAt', 'desc'),
          limit(10)
        );

        const querySnapshot = await getDocs(q);
        const announcementsData = [];

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          announcementsData.push({
            id: doc.id,
            ...data
          });
          
          // Mark announcement as viewed
          if (!data.viewedBy?.includes(user.id)) {
            markAnnouncementAsViewed(doc.id);
          }
        });

        console.log(`✅ [Home] Loaded ${announcementsData.length} announcements`);
        setAnnouncements(announcementsData);
      } catch (error) {
        console.error('❌ [Home] Error fetching announcements with index query:', error);
        console.log('🔄 [Home] Trying fallback query without orderBy...');

        // Fallback query without orderBy
        try {
          const fallbackQuery = query(
            collection(db, 'messages'),
            where('organizationId', '==', userOrganization.id),
            where('isAnnouncement', '==', true),
            where('active', '==', true)
          );

          const querySnapshot = await getDocs(fallbackQuery);
          const announcementsData = [];

          querySnapshot.forEach((doc) => {
            const data = doc.data();
            announcementsData.push({
              id: doc.id,
              ...data,
              priority: data.priority || 'normal' // Ensure priority field exists
            });
            
            // Mark announcement as viewed
            if (!data.viewedBy?.includes(user.id)) {
              markAnnouncementAsViewed(doc.id);
            }
          });

          // Sort in memory by priority and date
          const priorityOrder = { urgent: 3, high: 2, normal: 1 };
          announcementsData.sort((a, b) => {
            const priorityDiff = (priorityOrder[b.priority] || 1) - (priorityOrder[a.priority] || 1);
            if (priorityDiff !== 0) return priorityDiff;

            const dateA = a.createdAt?.toDate?.() || new Date(0);
            const dateB = b.createdAt?.toDate?.() || new Date(0);
            return dateB - dateA;
          });

          console.log(`✅ [Home] Loaded ${announcementsData.length} announcements (fallback query, client-side sorted)`);
          setAnnouncements(announcementsData);
        } catch (fallbackError) {
          console.error('❌ [Home] Fallback query also failed:', fallbackError);
          setAnnouncements([]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, [userOrganization, user]);

  const markAnnouncementAsViewed = async (announcementId) => {
    try {
      const announcementRef = doc(db, 'messages', announcementId);
      await updateDoc(announcementRef, {
        viewedBy: arrayUnion(user.id)
      });
      console.log('Marked announcement as viewed:', announcementId);
    } catch (error) {
      console.error('Error marking announcement as viewed:', error);
    }
  };

  return (
    <div>
      <div className="hero">
        <h1>Welcome to Integrant Platform</h1>
        {operatingAsUser ? (
          <p className="active-account-welcome">
            👤 Operating as: <strong>{user?.displayName || user?.email}</strong>
          </p>
        ) : activeAccount ? (
          <>
            <p className="active-account-welcome">
              {getAccountIcon(activeAccount.accountType)} Operating as: <strong>{activeAccount.accountName}</strong>
            </p>
            {activeAccount.entityName && (
              <p className="active-account-entity">{activeAccount.entityName}</p>
            )}
          </>
        ) : (
          <p>Enterprise Organization Management</p>
        )}
        <p className="hero-subtitle">Streamline your business operations with automated billing, secure document management, and seamless team collaboration</p>
      </div>

      {/* Account Switcher */}
      {!loadingAccounts && (
        <div className="profile-switcher-home">
          <div className="profile-switcher-header">
            <h3>💼 Operating Mode</h3>
            <button 
              className="btn-manage-profiles"
              onClick={() => navigate('/accounts')}
            >
              Manage Accounts
            </button>
          </div>
          
          {/* User Mode / Account Mode Toggle */}
          <div className="operating-mode-toggle">
            <button
              className={`mode-btn ${operatingAsUser ? 'active' : ''}`}
              onClick={switchToUserMode}
            >
              <span className="mode-icon">👤</span>
              <div className="mode-info">
                <div className="mode-label">User Mode</div>
                <div className="mode-desc">Operate as yourself</div>
              </div>
            </button>
            <button
              className={`mode-btn ${!operatingAsUser && activeAccount ? 'active' : ''}`}
              onClick={() => switchToAccountMode()}
            >
              <span className="mode-icon">🏢</span>
              <div className="mode-info">
                <div className="mode-label">Account Mode</div>
                <div className="mode-desc">Operate as an account</div>
              </div>
            </button>
          </div>

          {/* Show active mode status */}
          {operatingAsUser ? (
            <div className="current-mode-status user-mode">
              <strong>👤 Operating as:</strong> {user?.displayName || user?.email}
            </div>
          ) : activeAccount ? (
            <div className="current-mode-status account-mode">
              <strong>{getAccountIcon(activeAccount.accountType)} Operating as:</strong> {activeAccount.accountName}
              {activeAccount.entityName && <span className="entity-name"> ({activeAccount.entityName})</span>}
            </div>
          ) : (
            <div className="current-mode-status no-account">
              <strong>⚠️ No account selected</strong>
              <p>Please select an account or switch to user mode</p>
            </div>
          )}
          
          {/* Show account selection only when in account mode */}
          {!operatingAsUser && (
            <>
              {accounts.length === 0 ? (
                <div className="no-profiles-card">
                  <p>📋 No accounts yet.</p>
                  <button 
                    className="btn-add-profile"
                    onClick={() => navigate('/accounts')}
                  >
                    + Create Your First Account
                  </button>
                </div>
              ) : (
                <div className="profiles-quick-switch">
                  {accounts.map((account) => (
                    <div
                      key={account.id}
                      className={`profile-quick-card ${activeAccount?.id === account.id ? 'active' : ''}`}
                      onClick={() => switchAccount(account)}
                    >
                      <div className="profile-quick-icon">
                        {account.accountType === 'personal' && '👤'}
                        {account.accountType === 'llc' && '🏢'}
                        {account.accountType === 'trust' && '🏛️'}
                        {account.accountType === 'corporation' && '🏭'}
                        {account.accountType === 'partnership' && '🤝'}
                        {account.accountType === 'nonprofit' && '❤️'}
                        {account.accountType === 'other' && '📋'}
                      </div>
                      <div className="profile-quick-info">
                        <div className="profile-quick-name">{account.accountName}</div>
                        <div className="profile-quick-type">
                          {account.entityName || account.accountType}
                        </div>
                      </div>
                      {account.isDefault && (
                        <span className="profile-default-tag">Default</span>
                      )}
                      {activeAccount?.id === account.id && (
                        <span className="profile-active-check">✓</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {userRole === 'account_owner' && userOrganizations.length > 1 && (
        <div className="organization-selector-home">
          <div className="org-selector-header">
            <label htmlFor="org-select-home">
              <strong>📊 Select Organization:</strong>
            </label>
            <button 
              className="btn-manage-orgs"
              onClick={() => navigate('/admin')}
            >
              Manage Organizations
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
            {userOrganizations.map((org) => (
              userOrganization?.id === org.id && (
                <OrganizationNotificationBadge 
                  key={org.id}
                  organizationId={org.id} 
                  userId={user?.id || user?.uid}
                />
              )
            ))}
          </div>
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