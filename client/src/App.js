import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import Header from './components/Header';
import Login from './components/Login';
import ResetPassword from './components/ResetPassword';
import { PermissionProtectedRoute } from './components/ProtectedRoute';
import Home from './pages/Home';
import About from './pages/About';
import RegisteredUsers from './pages/RegisteredUsers';
import AdminPanel from './pages/AdminPanel';
import ChatPage from './pages/ChatPage';
import InvitationManager from './pages/InvitationManager';
import OrganizationMembers from './pages/OrganizationMembers';
import Unauthorized from './pages/Unauthorized';
import DemoPermissions from './pages/DemoPermissions';
import AccountOwnerRegistration from './components/AccountOwnerRegistration';
import MemberRegistration from './pages/MemberRegistration';
import apiService from './services/apiService';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthorizationProvider } from './contexts/AuthorizationContext';

// Main app content when user is authenticated
function MainApp() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
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

  return (
    <div className="App">
      <Header user={user} />
      <main className="container">
        {loading ? (
          <div className="loading">Connecting to server...</div>
        ) : (
          <Routes>
            <Route path="/" element={<Home data={data} />} />
            <Route path="/about" element={<About />} />
            <Route path="/demo-permissions" element={<DemoPermissions />} />
            <Route 
              path="/registered-users" 
              element={
                <PermissionProtectedRoute requiredPage="users">
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
              path="/chat" 
              element={
                <ChatPage />
              } 
            />
            <Route 
              path="/invitations" 
              element={
                <PermissionProtectedRoute requiredPage="admin">
                  <InvitationManager />
                </PermissionProtectedRoute>
              } 
            />
            <Route 
              path="/members" 
              element={
                <PermissionProtectedRoute requiredPage="admin">
                  <OrganizationMembers />
                </PermissionProtectedRoute>
              } 
            />
            <Route path="/unauthorized" element={<Unauthorized />} />
          </Routes>
        )}
      </main>
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