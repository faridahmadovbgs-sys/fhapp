import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
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
import AnnouncementManager from './pages/AnnouncementManager';
import apiService from './services/apiService';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthorizationProvider } from './contexts/AuthorizationContext';

// Main app content when user is authenticated
function MainApp() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isAuthenticated, user } = useAuth();

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
              <li><Link to="/" onClick={closeMenu}>Home</Link></li>
              <li><Link to="/chat" onClick={closeMenu}>Chat</Link></li>
              <li><Link to="/documents" onClick={closeMenu}>My Documents</Link></li>
              <li><Link to="/org-documents" onClick={closeMenu}>Org Documents</Link></li>
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
                <li><Link to="/billing" onClick={closeMenu}>Billing</Link></li>
              </PermissionGuard>
              <li><Link to="/payments" onClick={closeMenu}>Payments</Link></li>
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