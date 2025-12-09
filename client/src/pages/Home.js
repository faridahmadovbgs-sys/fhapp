import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAccount } from '../contexts/AccountContext';
import { doc, getDoc, collection, query, orderBy, limit, getDocs, where, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getUserMemberOrganizations } from '../services/organizationService';
import { getMemberBills } from '../services/billingService';
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
  const [billsDue, setBillsDue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingBills, setLoadingBills] = useState(true);

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

  // Fetch bills due for the user
  useEffect(() => {
    const fetchBillsDue = async () => {
      const userId = user?.id || user?.uid;
      if (!userId || !userOrganization) {
        setLoadingBills(false);
        return;
      }

      setLoadingBills(true);
      try {
        console.log('💰 Fetching bills for user:', userId, 'in organization:', userOrganization.id);
        const result = await getMemberBills(userId, userOrganization.id, userRole);
        
        if (result.success) {
          // Filter for unpaid bills and sort by due date
          const unpaidBills = result.bills
            .filter(bill => {
              const payment = bill.payments?.find(p => p.memberId === userId);
              return !payment || payment.status !== 'paid';
            })
            .sort((a, b) => {
              const dateA = a.dueDate?.toDate?.() || new Date();
              const dateB = b.dueDate?.toDate?.() || new Date();
              return dateA - dateB; // Earliest due date first
            })
            .slice(0, 5); // Show only next 5 bills
          
          console.log(`✅ Found ${unpaidBills.length} unpaid bills`);
          setBillsDue(unpaidBills);
        }
      } catch (error) {
        console.error('❌ Error fetching bills:', error);
        setBillsDue([]);
      } finally {
        setLoadingBills(false);
      }
    };

    fetchBillsDue();
  }, [user, userOrganization, userRole]);

  return (
    <div>
      <div className="home-controls-grid">
        {/* Account Switcher */}
        {!loadingAccounts && (
          <div className="profile-switcher-home">
            <div className="profile-switcher-header">
              <h3>Operating Mode</h3>
              <button 
                className="btn-manage-profiles"
              onClick={() => navigate('/accounts')}
            >
              Manage Sub Profiles
            </button>
          </div>
          
          {/* User Mode / Account Mode Toggle */}
          <div className="operating-mode-toggle">
            <button
              className={`mode-btn ${operatingAsUser ? 'active' : ''}`}
              onClick={switchToUserMode}
            >
              <div className="mode-info">
                <div className="mode-label">User Mode</div>
                <div className="mode-desc">Operate as yourself</div>
              </div>
            </button>
            <button
              className={`mode-btn ${!operatingAsUser && activeAccount ? 'active' : ''}`}
              onClick={() => switchToAccountMode()}
            >
              <div className="mode-info">
                <div className="mode-label">Sub Profile Mode</div>
                <div className="mode-desc">Operate as a sub profile</div>
              </div>
            </button>
          </div>

          {/* Show active mode status */}
          {operatingAsUser ? (
            <div className="current-mode-status user-mode">
              <strong>Operating as:</strong> {user?.name || user?.displayName || user?.email}
            </div>
          ) : activeAccount ? (
            <div className="current-mode-status account-mode">
              <strong>Operating as:</strong> {activeAccount.accountName}
              {activeAccount.entityName && <span className="entity-name"> ({activeAccount.entityName})</span>}
            </div>
          ) : (
            <div className="current-mode-status no-account">
              <strong>No sub profile selected</strong>
              <p>Please select a sub profile or switch to user mode</p>
            </div>
          )}
          
          {/* Show sub profile selection only when in sub profile mode */}
          {!operatingAsUser && (
            <>
              {accounts.length === 0 ? (
                <div className="no-profiles-card">
                  <p>No sub profiles yet.</p>
                  <button 
                    className="btn-add-profile"
                    onClick={() => navigate('/accounts')}
                  >
                    + Create Your First Sub Profile
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
                        <span className="profile-active-check">Active</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
      </div>

      {/* Dashboard Grid */}
      <div className="dashboard-grid">
        {/* Announcements Section */}
        <div className="announcements-section">
          <div className="section-header">
            <h2>📢 Announcements</h2>
            {userRole === 'account_owner' && (
              <button className="btn-manage-section" onClick={() => navigate('/announcements')}>Manage</button>
            )}
          </div>
          {loading ? (
            <p className="loading-text">Loading announcements...</p>
          ) : announcements.length > 0 ? (
            <div className="announcements-list">
              {announcements.map((announcement) => (
                <div key={announcement.id} className={`announcement-card ${announcement.priority || 'normal'}`}>
                  <div className="announcement-header">
                    <h3>{announcement.title || announcement.text?.substring(0, 50) + (announcement.text?.length > 50 ? '...' : '') || 'Announcement'}</h3>
                    <span className="announcement-date">
                      {announcement.createdAt?.toDate?.()?.toLocaleDateString() || 'Recent'}
                    </span>
                  </div>
                  <p className="announcement-content">{announcement.content || announcement.text || 'No content'}</p>
                  {(announcement.author || announcement.userName) && (
                    <p className="announcement-author">— {announcement.author || announcement.userName}</p>
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

        {/* Bills Due Section */}
        <div className="bills-due-section">
          <div className="section-header">
            <h2>💰 Bills Due</h2>
            <button className="btn-manage-section" onClick={() => navigate('/member-payments')}>View All</button>
          </div>
          {loadingBills ? (
            <p className="loading-text">Loading bills...</p>
          ) : billsDue.length > 0 ? (
            <div className="bills-due-list">
              {billsDue.map((bill) => {
                const dueDate = bill.dueDate?.toDate?.();
                const isOverdue = dueDate && dueDate < new Date();
                const daysUntilDue = dueDate ? Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24)) : null;
                
                return (
                  <div key={bill.id} className={`bill-due-card ${isOverdue ? 'overdue' : ''}`}>
                    <div className="bill-due-header">
                      <h3>{bill.description || 'Bill Payment'}</h3>
                      <span className={`bill-amount ${isOverdue ? 'overdue' : ''}`}>
                        ${bill.amount?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                    <div className="bill-due-details">
                      <div className="bill-due-date">
                        <strong>Due:</strong> {dueDate?.toLocaleDateString() || 'N/A'}
                        {daysUntilDue !== null && (
                          <span className={`days-until ${isOverdue ? 'overdue' : daysUntilDue <= 3 ? 'urgent' : ''}`}>
                            {isOverdue ? `${Math.abs(daysUntilDue)} days overdue` : `${daysUntilDue} days left`}
                          </span>
                        )}
                      </div>
                      {bill.category && (
                        <div className="bill-category">
                          <strong>Category:</strong> {bill.category}
                        </div>
                      )}
                    </div>
                    <button 
                      className="btn-pay-bill"
                      onClick={() => navigate('/member-payments')}
                    >
                      Pay Now
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="no-bills">
              <p>✅ No bills due at this time.</p>
            </div>
          )}
        </div>
      </div>

      {/* User Membership Information */}
      <div className="user-membership-section">
        <h2>👥 Your Memberships</h2>

        {/* Sub Profiles Switcher */}
        <div className="membership-card subprofiles-card">
          <div className="membership-header">
            <h3>Operating As</h3>
          </div>
          <div className="membership-content">
            <select 
              className="subprofile-dropdown"
              value={activeAccount?.id || 'user'}
              onChange={(e) => {
                if (e.target.value === 'user') {
                  switchToUserMode();
                } else {
                  const selectedAccount = accounts.find(acc => acc.id === e.target.value);
                  if (selectedAccount) {
                    switchAccount(selectedAccount);
                  }
                }
              }}
            >
              <option value="user">
                👤 {user?.name || user?.displayName || user?.email || 'You'} (User)
              </option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {getAccountIcon(account.accountType)} {account.accountName}
                  {account.isDefault ? ' (Default)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Organizations Display - Only show when operating as user */}
        {operatingAsUser && userOrganizations.length > 0 && (
          <div className="membership-card organizations-card">
            <div className="membership-header">
              <h3>Organizations ({userOrganizations.length})</h3>
            </div>
            <div className="membership-content">
              <div className="organizations-list">
                {userOrganizations.map((org) => (
                  <div 
                    key={org.id} 
                    className="organization-item"
                    onClick={() => navigate(`/organization/${org.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="org-main-info">
                      <div className="org-name">
                        <strong>{org.name}</strong>
                        {userOrganization?.id === org.id && (
                          <span className="active-org-badge">Active</span>
                        )}
                      </div>
                      <div className="org-role">
                        {org.role === 'account_owner' && <span className="org-role-badge owner">Owner</span>}
                        {org.role === 'sub_account_owner' && <span className="org-role-badge sub-owner">Sub-Account Owner</span>}
                        {org.role === 'member' && <span className="org-role-badge member">Member</span>}
                      </div>
                    </div>
                    
                    {/* Show sub-account owner if user is under one */}
                    {org.subAccountOwner && (
                      <div className="org-sub-account-info">
                        <span className="sub-account-label">📎 Under:</span>
                        <span className="sub-account-owner-name">{org.subAccountOwner}</span>
                      </div>
                    )}
                    
                    {/* Show member count for owners */}
                    {(org.role === 'account_owner' || org.role === 'sub_account_owner') && org.memberCount && (
                      <div className="org-member-count">
                        👥 {org.memberCount} member{org.memberCount !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* No Organizations Message - Only show when operating as user */}
        {operatingAsUser && userOrganizations.length === 0 && (
          <div className="membership-card no-orgs-card">
            <div className="membership-content">
              <p>You are not a member of any organizations yet.</p>
              <button 
                className="btn-join-org"
                onClick={() => navigate('/join-organization')}
              >
                Join an Organization
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;