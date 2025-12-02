import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import './App.css';
import Header from './components/Header';
import Login from './components/Login';
import ResetPassword from './components/ResetPassword';
import { PermissionProtectedRoute, PermissionGuard } from './components/ProtectedRoute';
import Home from './pages/Home';
import About from './pages/About';
import RegisteredUsers from './pages/RegisteredUsers';
import AdminPanel from './pages/AdminPanel';
import ChatPage from './pages/ChatPage';
import InvitationManager from './pages/InvitationManager';
import OrganizationMembers from './pages/OrganizationMembers';
import UserProfileForm from './components/UserProfileForm';
import BillingManagement from './pages/BillingManagement';
import MemberPayments from './pages/MemberPayments';
import Unauthorized from './pages/Unauthorized';
import DemoPermissions from './pages/DemoPermissions';
import AccountOwnerRegistration from './components/AccountOwnerRegistration';
import MemberRegistration from './pages/MemberRegistration';
import StorageTest from './components/StorageTest';
import PersonalDocuments from './pages/PersonalDocuments';
import OrganizationDocuments from './pages/OrganizationDocuments';
import MemberDocuments from './pages/MemberDocuments';
import AnnouncementManager from './pages/AnnouncementManager';
import ChatNotificationBadge from './components/ChatNotificationBadge';
import apiService from './services/apiService';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthorizationProvider } from './contexts/AuthorizationContext';
import { collection, query, where, onSnapshot, getDocs, orderBy } from 'firebase/firestore';
import { db } from './config/firebase';

// Main app content when user is authenticated
function MainApp() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [newDocumentsCount, setNewDocumentsCount] = useState(0);
  const [newAnnouncementsCount, setNewAnnouncementsCount] = useState(0);
  const [pendingBillsCount, setPendingBillsCount] = useState(0);
  const [newPaymentsCount, setNewPaymentsCount] = useState(0);
  const [unreadChatsCount, setUnreadChatsCount] = useState(0);
  const [newOrgDocsCount, setNewOrgDocsCount] = useState(0);
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated) {
      // Test API connection
      apiService.get('/api/health')
        .then(response => {
          setData(response.data);
          setLoading(false);
        })
        .catch(error => {
          console.error('API connection failed:', error);
          setLoading(false);
        });
    }
  }, [isAuthenticated]);

  // Listen for new documents shared with user
  useEffect(() => {
    if (!user?.id || !db) return;

    // Query documents where user is in sharedWith array
    const documentsQuery = query(
      collection(db, 'documents'),
      where('sharedWith', 'array-contains', user.id)
    );

    const unsubscribe = onSnapshot(documentsQuery, (snapshot) => {
      const newDocs = [];
      snapshot.forEach((doc) => {
        const docData = doc.data();
        // Only count if not created by current user and not viewed
        if (docData.userId !== user.id && !docData.viewedBy?.includes(user.id)) {
          newDocs.push(doc.id);
        }
      });
      setNewDocumentsCount(newDocs.length);
    });

    return () => unsubscribe();
  }, [user]);

  // Listen for new announcements
  useEffect(() => {
    if (!user?.id || !db) return;

    const announcementsQuery = query(
      collection(db, 'messages'),
      where('organizationId', '!=', null),
      where('isAnnouncement', '==', true),
      where('active', '==', true)
    );

    const unsubscribe = onSnapshot(announcementsQuery, (snapshot) => {
      const newAnnouncements = [];
      snapshot.forEach((doc) => {
        const announcementData = doc.data();
        // Count if not viewed by current user
        if (!announcementData.viewedBy?.includes(user.id)) {
          newAnnouncements.push(doc.id);
        }
      });
      setNewAnnouncementsCount(newAnnouncements.length);
    });

    return () => unsubscribe();
  }, [user]);

  // Listen for pending bills (for members)
  useEffect(() => {
    if (!user?.id || !db) return;

    const billsQuery = query(
      collection(db, 'bills'),
      where('status', '==', 'active')
    );

    const unsubscribe = onSnapshot(billsQuery, async (snapshot) => {
      let pendingCount = 0;
      for (const docSnap of snapshot.docs) {
        const billData = docSnap.data();
        // Check if bill is for this user and not paid
        if (billData.memberIds?.includes(user.id)) {
          // Check payment status
          const paymentsQuery = query(
            collection(db, 'payments'),
            where('billId', '==', docSnap.id),
            where('memberId', '==', user.id)
          );
          const paymentsSnap = await getDocs(paymentsQuery);
          if (paymentsSnap.empty) {
            pendingCount++;
          }
        }
      }
      setPendingBillsCount(pendingCount);
    });

    return () => unsubscribe();
  }, [user]);

  // Listen for new payments (for account owners/sub account owners)
  useEffect(() => {
    if (!user?.id || !db) return;

    const paymentsQuery = query(
      collection(db, 'payments'),
      orderBy('paidAt', 'desc')
    );

    const unsubscribe = onSnapshot(paymentsQuery, (snapshot) => {
      const newPayments = [];
      snapshot.forEach((doc) => {
        const paymentData = doc.data();
        // Count if not viewed by current user and created recently (within last 7 days)
        const paymentDate = paymentData.paidAt?.toDate();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        if (paymentDate && paymentDate > sevenDaysAgo && !paymentData.viewedBy?.includes(user.id)) {
          newPayments.push(doc.id);
        }
      });
      setNewPaymentsCount(newPayments.length);
    });

    return () => unsubscribe();
  }, [user]);

  // Listen for organization documents
  useEffect(() => {
    if (!user?.id || !db) return;

    const orgDocsQuery = query(
      collection(db, 'documents'),
      where('isOrganizationDocument', '==', true)
    );

    const unsubscribe = onSnapshot(orgDocsQuery, (snapshot) => {
      const newDocs = [];
      snapshot.forEach((doc) => {
        const docData = doc.data();
        // Count if not viewed by current user and not uploaded by current user
        if (docData.userId !== user.id && !docData.viewedBy?.includes(user.id)) {
          newDocs.push(doc.id);
        }
      });
      setNewOrgDocsCount(newDocs.length);
    });

    return () => unsubscribe();
  }, [user]);

  // Clear notification counts when viewing respective pages
  useEffect(() => {
    if (location.pathname === '/member-documents' && newDocumentsCount > 0) {
      const timer = setTimeout(() => setNewDocumentsCount(0), 1000);
      return () => clearTimeout(timer);
    }
    if (location.pathname === '/' && newAnnouncementsCount > 0) {
      const timer = setTimeout(() => setNewAnnouncementsCount(0), 1000);
      return () => clearTimeout(timer);
    }
    if (location.pathname === '/payments' && pendingBillsCount > 0) {
      const timer = setTimeout(() => setPendingBillsCount(0), 1000);
      return () => clearTimeout(timer);
    }
    if (location.pathname === '/billing' && newPaymentsCount > 0) {
      const timer = setTimeout(() => setNewPaymentsCount(0), 1000);
      return () => clearTimeout(timer);
    }
    if (location.pathname === '/org-documents' && newOrgDocsCount > 0) {
      const timer = setTimeout(() => setNewOrgDocsCount(0), 1000);
      return () => clearTimeout(timer);
    }
    if (location.pathname === '/chat' && unreadChatsCount > 0) {
      // Clear the count immediately when navigating to chat
      setUnreadChatsCount(0);
    }
  }, [location.pathname, newDocumentsCount, newAnnouncementsCount, pendingBillsCount, newPaymentsCount, newOrgDocsCount, unreadChatsCount]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <div className="App">
      <Header user={user} isMenuOpen={isMenuOpen} toggleMenu={toggleMenu} />
      {isMenuOpen && <div className="mobile-overlay" onClick={closeMenu}></div>}
      <div className="app-layout">
        <aside className={isMenuOpen ? 'sidebar-nav nav-open' : 'sidebar-nav'}>
          <nav>
            <ul>
              <li className="nav-item-with-badge">
                <Link to="/" onClick={closeMenu}>
                  Home
                  {newAnnouncementsCount > 0 && (
                    <span className="nav-notification-badge">{newAnnouncementsCount > 99 ? '99+' : newAnnouncementsCount}</span>
                  )}
                </Link>
              </li>
              <li className="nav-item-with-badge">
                <Link to="/chat" onClick={closeMenu}>
                  Chat
                  <ChatNotificationBadge 
                    userId={user?.id} 
                    onCountChange={(count) => setUnreadChatsCount(count)}
                  />
                </Link>
              </li>
              <li><Link to="/documents" onClick={closeMenu}>My Documents</Link></li>
              <li className="nav-item-with-badge">
                <Link to="/org-documents" onClick={closeMenu}>
                  Org Documents
                  {newOrgDocsCount > 0 && (
                    <span className="nav-notification-badge">{newOrgDocsCount > 99 ? '99+' : newOrgDocsCount}</span>
                  )}
                </Link>
              </li>
              <PermissionGuard requiredRoles={['account_owner', 'sub_account_owner']}>
                <li className="nav-item-with-badge">
                  <Link to="/member-documents" onClick={closeMenu}>
                    Member Documents
                    {newDocumentsCount > 0 && (
                      <span className="nav-notification-badge">{newDocumentsCount > 99 ? '99+' : newDocumentsCount}</span>
                    )}
                  </Link>
                </li>
              </PermissionGuard>
              <li><Link to="/demo-permissions" onClick={closeMenu}>Permissions Demo</Link></li>
              <PermissionGuard requiredPage="admin">
                <li><Link to="/registered-users" onClick={closeMenu}>Users</Link></li>
              </PermissionGuard>
              <PermissionGuard requiredPage="admin">
                <li><Link to="/admin" onClick={closeMenu}>Admin Panel</Link></li>
              </PermissionGuard>
              <PermissionGuard requiredRole="account_owner">
                <li><Link to="/announcements" onClick={closeMenu}>Announcements</Link></li>
              </PermissionGuard>
              <PermissionGuard requiredPage="invitations">
                <li><Link to="/invitations" onClick={closeMenu}>Invite Team</Link></li>
              </PermissionGuard>
              <PermissionGuard requiredPage="invitations">
                <li><Link to="/members" onClick={closeMenu}>Members</Link></li>
              </PermissionGuard>
              <PermissionGuard requiredPage="billing">
                <li className="nav-item-with-badge">
                  <Link to="/billing" onClick={closeMenu}>
                    Billing
                    {newPaymentsCount > 0 && (
                      <span className="nav-notification-badge">{newPaymentsCount > 99 ? '99+' : newPaymentsCount}</span>
                    )}
                  </Link>
                </li>
              </PermissionGuard>
              <li className="nav-item-with-badge">
                <Link to="/payments" onClick={closeMenu}>
                  Payments
                  {pendingBillsCount > 0 && (
                    <span className="nav-notification-badge">{pendingBillsCount > 99 ? '99+' : pendingBillsCount}</span>
                  )}
                </Link>
              </li>
              <li><Link to="/about" onClick={closeMenu}>About</Link></li>
            </ul>
          </nav>
        </aside>
        <main className="container">
          {loading ? (
            <div className="loading">Connecting to server...</div>
          ) : (
            <Routes>
              <Route path="/" element={<Home data={data} />} />
              <Route path="/about" element={<About />} />
              <Route path="/demo-permissions" element={<DemoPermissions />} />
              <Route path="/storage-test" element={<StorageTest />} />
            <Route 
              path="/registered-users" 
              element={
                <PermissionProtectedRoute requiredPage="admin">
                  <RegisteredUsers />
                </PermissionProtectedRoute>
              } 
            />
            <Route 
              path="/admin" 
              element={
                <PermissionProtectedRoute requiredPage="admin">
                  <AdminPanel />
                </PermissionProtectedRoute>
              } 
            />
            <Route 
              path="/announcements" 
              element={
                <PermissionProtectedRoute requiredRole="account_owner">
                  <AnnouncementManager />
                </PermissionProtectedRoute>
              } 
            />
            <Route 
              path="/chat" 
              element={
                <ChatPage />
              } 
            />
            <Route 
              path="/profile" 
              element={
                <UserProfileForm />
              } 
            />
            <Route 
              path="/invitations" 
              element={
                <PermissionProtectedRoute requiredPage="invitations">
                  <InvitationManager />
                </PermissionProtectedRoute>
              } 
            />
            <Route 
              path="/members" 
              element={
                <PermissionProtectedRoute requiredPage="invitations">
                  <OrganizationMembers />
                </PermissionProtectedRoute>
              } 
            />
            <Route 
              path="/billing" 
              element={
                <PermissionProtectedRoute requiredPage="billing">
                  <BillingManagement />
                </PermissionProtectedRoute>
              } 
            />
            <Route 
              path="/payments" 
              element={
                <MemberPayments />
              } 
            />
            <Route 
              path="/documents" 
              element={
                <PersonalDocuments />
              } 
            />
            <Route 
              path="/org-documents" 
              element={
                <OrganizationDocuments />
              } 
            />
            <Route 
              path="/member-documents" 
              element={
                <PermissionProtectedRoute requiredRoles={['account_owner', 'sub_account_owner']}>
                  <MemberDocuments />
                </PermissionProtectedRoute>
              } 
            />
            <Route path="/unauthorized" element={<Unauthorized />} />
          </Routes>
        )}
      </main>
      </div>
    </div>
  );
}

// App wrapper with authentication
function App() {
  return (
    <AuthProvider>
      <AuthorizationProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthorizationProvider>
    </AuthProvider>
  );
}

// Content component that handles login vs main app
function AppContent() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="App">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route 
        path="/reset-password" 
        element={<ResetPassword />} 
      />
      <Route 
        path="/register/owner" 
        element={<AccountOwnerRegistration />} 
      />
      <Route 
        path="/register/member" 
        element={<MemberRegistration />} 
      />
      <Route 
        path="/register/sub-owner" 
        element={<MemberRegistration />} 
      />
      <Route 
        path="/login" 
        element={<Login />} 
      />
      <Route 
        path="/*" 
        element={
          isAuthenticated ? <MainApp /> : <Login />
        } 
      />
    </Routes>
  );
}

export default App;