import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getMemberBills } from '../services/billingService';
import './OrganizationHome.css';

const OrganizationHome = () => {
  const { organizationId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [organization, setOrganization] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [billsDue, setBillsDue] = useState([]);
  const [activeTab, setActiveTab] = useState('home');
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);

  // Fetch organization details
  useEffect(() => {
    const fetchOrganization = async () => {
      if (!organizationId) return;

      try {
        const orgDoc = await getDoc(doc(db, 'organizations', organizationId));
        if (orgDoc.exists()) {
          const orgData = { id: orgDoc.id, ...orgDoc.data() };
          setOrganization(orgData);

          // Determine user's role in this organization
          const userId = user?.id || user?.uid;
          if (orgData.accountOwnerId === userId) {
            setUserRole('account_owner');
          } else if (orgData.subAccountOwners?.includes(userId)) {
            setUserRole('sub_account_owner');
          } else if (orgData.members?.includes(userId)) {
            setUserRole('member');
          }
        }
      } catch (error) {
        console.error('Error fetching organization:', error);
      }
    };

    fetchOrganization();
  }, [organizationId, user]);

  // Fetch announcements
  useEffect(() => {
    const fetchAnnouncements = async () => {
      if (!organizationId || !db) {
        setLoading(false);
        return;
      }

      try {
        const q = query(
          collection(db, 'messages'),
          where('organizationId', '==', organizationId),
          where('isAnnouncement', '==', true),
          where('active', '==', true),
          limit(10)
        );

        const querySnapshot = await getDocs(q);
        const announcementsData = [];

        querySnapshot.forEach((doc) => {
          announcementsData.push({
            id: doc.id,
            ...doc.data()
          });
        });

        // Sort by priority and date
        const priorityOrder = { urgent: 3, high: 2, normal: 1 };
        announcementsData.sort((a, b) => {
          const priorityDiff = (priorityOrder[b.priority] || 1) - (priorityOrder[a.priority] || 1);
          if (priorityDiff !== 0) return priorityDiff;
          const dateA = a.createdAt?.toDate?.() || new Date(0);
          const dateB = b.createdAt?.toDate?.() || new Date(0);
          return dateB - dateA;
        });

        setAnnouncements(announcementsData);
      } catch (error) {
        console.error('Error fetching announcements:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, [organizationId]);

  // Fetch bills
  useEffect(() => {
    const fetchBills = async () => {
      const userId = user?.id || user?.uid;
      if (!userId || !organizationId || !userRole) return;

      try {
        const result = await getMemberBills(userId, organizationId, userRole);
        const now = new Date();
        const upcomingBills = result.bills.filter(bill => {
          const dueDate = bill.dueDate?.toDate?.() || null;
          return dueDate && dueDate >= now;
        });
        setBillsDue(upcomingBills.slice(0, 5));
      } catch (error) {
        console.error('Error fetching bills:', error);
      }
    };

    fetchBills();
  }, [user, organizationId, userRole]);

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div className="org-home-content">
            {/* Organization Header */}
            <div className="org-header-card">
              <div className="org-header-content">
                <div className="org-icon-large">🏢</div>
                <div className="org-info">
                  <h1>{organization?.name}</h1>
                  {organization?.ein && <p className="org-ein">EIN: {organization.ein}</p>}
                  <div className="org-meta">
                    <span className="org-meta-item">
                      👥 {organization?.memberCount || 0} Members
                    </span>
                    {userRole && (
                      <span className="org-role-badge">
                        {userRole === 'account_owner' && '👑 Owner'}
                        {userRole === 'sub_account_owner' && '⭐ Sub-Account Owner'}
                        {userRole === 'member' && '👤 Member'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Dashboard Grid */}
            <div className="org-dashboard-grid">
              {/* Announcements Section */}
              <div className="org-section announcements-section">
                <div className="section-header">
                  <h2>📢 Announcements</h2>
                  {userRole === 'account_owner' && (
                    <button 
                      className="btn-manage-section"
                      onClick={() => navigate('/announcements')}
                    >
                      Manage
                    </button>
                  )}
                </div>
                {loading ? (
                  <p className="loading-text">Loading announcements...</p>
                ) : announcements.length > 0 ? (
                  <div className="announcements-list">
                    {announcements.map((announcement) => (
                      <div 
                        key={announcement.id} 
                        className={`announcement-card ${announcement.priority || 'normal'}`}
                      >
                        <div className="announcement-header">
                          <h3>
                            {announcement.title || 
                             announcement.text?.substring(0, 50) + 
                             (announcement.text?.length > 50 ? '...' : '') || 
                             'Announcement'}
                          </h3>
                          <span className="announcement-date">
                            {announcement.createdAt?.toDate?.()?.toLocaleDateString() || 'Recent'}
                          </span>
                        </div>
                        <p className="announcement-content">
                          {announcement.content || announcement.text || 'No content'}
                        </p>
                        {(announcement.author || announcement.userName) && (
                          <p className="announcement-author">
                            — {announcement.author || announcement.userName}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-content">
                    <p>📭 No announcements at this time.</p>
                  </div>
                )}
              </div>

              {/* Bills Due Section */}
              <div className="org-section bills-section">
                <div className="section-header">
                  <h2>💰 Bills Due</h2>
                  <button 
                    className="btn-view-all"
                    onClick={() => setActiveTab('payment')}
                  >
                    View All
                  </button>
                </div>
                {billsDue.length > 0 ? (
                  <div className="bills-list">
                    {billsDue.map((bill) => {
                      const dueDate = bill.dueDate?.toDate?.() || null;
                      const isOverdue = dueDate && dueDate < new Date();
                      const daysUntilDue = dueDate 
                        ? Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24)) 
                        : null;
                      
                      return (
                        <div key={bill.id} className={`bill-card ${isOverdue ? 'overdue' : ''}`}>
                          <div className="bill-header">
                            <h3>{bill.description || 'Bill Payment'}</h3>
                            <span className="bill-amount">
                              ${bill.amount?.toFixed(2) || '0.00'}
                            </span>
                          </div>
                          <div className="bill-details">
                            <strong>Due:</strong> {dueDate?.toLocaleDateString() || 'N/A'}
                            {daysUntilDue !== null && (
                              <span className={`days-until ${isOverdue ? 'overdue' : ''}`}>
                                {isOverdue 
                                  ? `${Math.abs(daysUntilDue)} days overdue` 
                                  : `${daysUntilDue} days left`}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="no-content">
                    <p>✅ No bills due at this time.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'chat':
        return (
          <div className="org-content-placeholder">
            <div className="placeholder-icon">💬</div>
            <h2>Organization Chat</h2>
            <p>Chat functionality will be available here.</p>
            <button 
              className="btn-primary"
              onClick={() => navigate('/chat')}
            >
              Go to Chat
            </button>
          </div>
        );

      case 'docs':
        return (
          <div className="org-content-placeholder">
            <div className="placeholder-icon">📄</div>
            <h2>My Documents</h2>
            <p>Your organization documents will appear here.</p>
            <button 
              className="btn-primary"
              onClick={() => navigate('/org-documents')}
            >
              View Documents
            </button>
          </div>
        );

      case 'payment':
        return (
          <div className="org-content-placeholder">
            <div className="placeholder-icon">💳</div>
            <h2>Payments</h2>
            <p>View and manage your organization payments.</p>
            <button 
              className="btn-primary"
              onClick={() => navigate('/member-payments')}
            >
              Go to Payments
            </button>
          </div>
        );

      case 'about':
        return (
          <div className="org-about-content">
            <h2>About {organization?.name}</h2>
            <div className="about-section">
              <h3>Organization Details</h3>
              {organization?.ein && (
                <p><strong>EIN:</strong> {organization.ein}</p>
              )}
              <p><strong>Members:</strong> {organization?.memberCount || 0}</p>
              {organization?.createdAt && (
                <p>
                  <strong>Created:</strong>{' '}
                  {organization.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                </p>
              )}
            </div>
            {userRole === 'account_owner' && (
              <button 
                className="btn-primary"
                onClick={() => navigate('/admin')}
              >
                Manage Organization
              </button>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  if (!organization) {
    return (
      <div className="org-home-container">
        <div className="loading-screen">
          <p>Loading organization...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="org-home-container">
      {/* Top Navigation Bar */}
      <div className="org-nav-bar">
        <div className="org-nav-left">
          <button 
            className="btn-back"
            onClick={() => navigate('/')}
          >
            ← Back to Home
          </button>
          <div className="org-nav-title">
            <span className="org-nav-icon">🏢</span>
            <span>{organization?.name}</span>
          </div>
        </div>
        
        <div className="org-nav-menu">
          <button
            className={`nav-menu-item ${activeTab === 'home' ? 'active' : ''}`}
            onClick={() => setActiveTab('home')}
          >
            🏠 Home
          </button>
          <button
            className={`nav-menu-item ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            💬 Chat
          </button>
          <button
            className={`nav-menu-item ${activeTab === 'docs' ? 'active' : ''}`}
            onClick={() => setActiveTab('docs')}
          >
            📄 My Docs
          </button>
          <button
            className={`nav-menu-item ${activeTab === 'payment' ? 'active' : ''}`}
            onClick={() => setActiveTab('payment')}
          >
            💳 Payment
          </button>
          <button
            className={`nav-menu-item ${activeTab === 'about' ? 'active' : ''}`}
            onClick={() => setActiveTab('about')}
          >
            ℹ️ About
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="org-main-content">
        {renderContent()}
      </div>
    </div>
  );
};

export default OrganizationHome;
