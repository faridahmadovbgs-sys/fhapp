import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAccount } from '../contexts/AccountContext';
import { useOrganization } from '../contexts/OrganizationContext';
import OrganizationSwitcher from './OrganizationSwitcher';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const Header = ({ user, isMenuOpen, toggleMenu, unreadChatsCount = 0 }) => {
  const { logout } = useAuth();
  const { activeAccount, operatingAsUser } = useAccount();
  const { organizations } = useOrganization();
  const navigate = useNavigate();
  const [photoURL, setPhotoURL] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

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

  const handleBrandClick = () => {
    navigate('/');
  };

  return (
    <header>
      <div className="header-container">
        <div className="brand-section">
          <div className="brand-logo" onClick={handleBrandClick}>
            <div className="logo-icon">I</div>
            <span className="brand-name">Integrant Platform</span>
          </div>
          {operatingAsUser ? (
            <div className="active-account-header user-mode-header">
              <span className="account-name">User Mode</span>
            </div>
          ) : activeAccount ? (
            <div className="active-account-header">
              <span className="account-name">{activeAccount.accountName}</span>
            </div>
          ) : null}
        </div>

        <button className="menu-toggle" onClick={toggleMenu} aria-label="Toggle menu">
          <span className={`hamburger ${isMenuOpen ? 'open' : ''}`}>
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>

        <div style={{ flex: 1 }}></div>

        {user && (
          <>
            {/* Organization Switcher - Shows org and role */}
            {organizations && organizations.length > 0 && (
              <OrganizationSwitcher />
            )}

            {unreadChatsCount > 0 && (
              <button 
                className="header-chat-badge" 
                onClick={() => navigate('/chat')}
                aria-label={`${unreadChatsCount} unread messages`}
                title={`${unreadChatsCount} unread message${unreadChatsCount > 1 ? 's' : ''}`}
              >
                <span className="header-chat-icon">💬</span>
                <span className="header-chat-count">
                  {unreadChatsCount > 99 ? '99+' : unreadChatsCount}
                </span>
              </button>
            )}
            <div className="user-info">
              <div className="user-profile-section" onClick={handleProfileClick}>
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
          </>
        )}
      </div>
    </header>
  );
};

export default Header;