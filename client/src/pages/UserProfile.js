import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import UserProfileForm from '../components/UserProfileForm';
import './UserProfile.css';

const UserProfile = () => {
  const { user, logout } = useAuth();

  if (!user) {
    return (
      <div className="user-profile-page">
        <div className="auth-required">
          <h2>Authentication Required</h2>
          <p>Please log in to access your profile.</p>
          <Link to="/" className="btn-back">Back to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="user-profile-page">
      <div className="profile-container">
        <div className="profile-header">
          <h1>My Profile</h1>
          <p>Manage your account settings and profile information</p>
        </div>

        <div className="profile-content">
          <div className="profile-section">
            <h2>Account Information</h2>
            <div className="info-grid">
              <div className="info-item">
                <label>Name</label>
                <p>{user.name || 'Not set'}</p>
              </div>
              <div className="info-item">
                <label>Email</label>
                <p>{user.email || 'Not set'}</p>
              </div>
              <div className="info-item">
                <label>Status</label>
                <p className="status-badge">
                  {user.emailVerified ? '✓ Verified' : '⚠ Unverified'}
                </p>
              </div>
            </div>
          </div>

          <UserProfileForm />

          <div className="profile-section">
            <h2>Account Actions</h2>
            <div className="action-buttons">
              <button onClick={logout} className="btn btn-danger">
                Logout
              </button>
            </div>
          </div>
        </div>

        <div className="profile-footer">
          <Link to="/" className="btn-back">← Back to Home</Link>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
