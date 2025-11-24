import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { PermissionGuard } from './ProtectedRoute';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const Header = ({ user }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [photoURL, setPhotoURL] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const fetchUserPhoto = async () => {
      if (!user?.id || !db) return;

      try {
        const userDoc = await getDoc(doc(db, 'users', user.id));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const newPhotoURL = userData.photoURL || userData.profilePictureUrl || null;
          setPhotoURL(newPhotoURL);
          console.log('Header: Loaded photo URL:', newPhotoURL ? 'Photo exists' : 'No photo');
        }
      } catch (error) {
        console.error('Error fetching user photo:', error);
      }
    };

    fetchUserPhoto();
    
    // Listen for storage events to refresh photo when updated
    const handleStorageChange = () => {
      console.log('Header: Storage change detected, refreshing photo...');
      setRefreshKey(prev => prev + 1);
      fetchUserPhoto();
    };

    window.addEventListener('profilePhotoUpdated', handleStorageChange);
    
    return () => {
      window.removeEventListener('profilePhotoUpdated', handleStorageChange);
    };
  }, [user, refreshKey]);

  const handleLogout = () => {
    logout();
  };

  const handleProfileClick = () => {
    navigate('/profile');
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <header>
      <div className="header-container">
        <div className="brand-section">
          <div className="brand-logo">
            <div className="logo-icon">I</div>
            <span className="brand-name">Integrant Platform</span>
          </div>
        </div>

        <button className="menu-toggle" onClick={toggleMenu} aria-label="Toggle menu">
          <span className={`hamburger ${isMenuOpen ? 'open' : ''}`}>
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>

        <nav className={isMenuOpen ? 'nav-open' : ''}>
          <ul>
            <li><Link to="/" onClick={closeMenu}>🏠 Home</Link></li>
            <li><Link to="/chat" onClick={closeMenu}>💬 Chat</Link></li>
            <li><Link to="/documents" onClick={closeMenu}>📁 My Documents</Link></li>
            <li><Link to="/org-documents" onClick={closeMenu}>🏢 Org Documents</Link></li>
            <li><Link to="/demo-permissions" onClick={closeMenu}>🔐 Permissions Demo</Link></li>
            <PermissionGuard requiredPage="admin">
              <li><Link to="/registered-users" onClick={closeMenu}>Users</Link></li>
            </PermissionGuard>
            <PermissionGuard requiredPage="admin">
              <li><Link to="/admin" onClick={closeMenu}>Admin Panel</Link></li>
            </PermissionGuard>
            <PermissionGuard requiredRole="account_owner">
              <li><Link to="/announcements" onClick={closeMenu}>📢 Announcements</Link></li>
            </PermissionGuard>
            <PermissionGuard requiredPage="invitations">
              <li><Link to="/invitations" onClick={closeMenu}>📤 Invite Team</Link></li>
            </PermissionGuard>
            <PermissionGuard requiredPage="invitations">
              <li><Link to="/members" onClick={closeMenu}>👥 Members</Link></li>
            </PermissionGuard>
            <PermissionGuard requiredPage="billing">
              <li><Link to="/billing" onClick={closeMenu}>💰 Billing</Link></li>
            </PermissionGuard>
            <li><Link to="/payments" onClick={closeMenu}>💳 Payments</Link></li>
            <li><Link to="/about" onClick={closeMenu}>ℹ️ About</Link></li>
          </ul>
        </nav>
        
        {user && (
          <div className="user-info">
            <div className="user-profile-section" onClick={handleProfileClick}>
              <span className="welcome-text">Welcome, {user.name || user.email}!</span>
              <div className="user-avatar-header">
                {photoURL ? (
                  <img src={photoURL} alt={user.name || user.email} className="user-avatar-photo-header" />
                ) : (
                  <div className="user-avatar-initial-header">
                    {(user.name || user.email)?.charAt(0).toUpperCase() || '?'}
                  </div>
                )}
              </div>
            </div>
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;