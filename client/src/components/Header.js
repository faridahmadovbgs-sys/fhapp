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

  useEffect(() => {
    const fetchUserPhoto = async () => {
      if (!user?.id || !db) return;

      try {
        const userDoc = await getDoc(doc(db, 'users', user.id));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setPhotoURL(userData.photoURL || userData.profilePictureUrl || null);
        }
      } catch (error) {
        console.error('Error fetching user photo:', error);
      }
    };

    fetchUserPhoto();
  }, [user]);

  const handleLogout = () => {
    logout();
  };

  const handleProfileClick = () => {
    navigate('/profile');
  };

  return (
    <header>
      <div className="container">
        <nav>
          <ul>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/about">About</Link></li>
            <li><Link to="/chat">💬 Chat</Link></li>
            <li><Link to="/demo-permissions">Permissions Demo</Link></li>
            <PermissionGuard requiredPage="admin">
              <li><Link to="/registered-users">Users</Link></li>
            </PermissionGuard>
            <PermissionGuard requiredPage="admin">
              <li><Link to="/admin">Admin Panel</Link></li>
            </PermissionGuard>
            <PermissionGuard requiredPage="admin">
              <li><Link to="/invitations">📤 Invite Team</Link></li>
            </PermissionGuard>
            <PermissionGuard requiredPage="admin">
              <li><Link to="/members">👥 Members</Link></li>
            </PermissionGuard>
            <PermissionGuard requiredPage="admin">
              <li><Link to="/billing">💰 Billing</Link></li>
            </PermissionGuard>
            <li><Link to="/payments">💳 Payments</Link></li>
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