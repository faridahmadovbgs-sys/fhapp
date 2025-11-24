import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import './Home.css';

const Home = ({ data }) => {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user?.id || !db) return;

      try {
        const userDoc = await getDoc(doc(db, 'users', user.id));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserRole(userData.role || 'user');
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
      }
    };

    fetchUserRole();
  }, [user]);

  return (
    <div>
      <div className="hero">
        <h1>Welcome to Integrant Platform</h1>
        <p>Enterprise Organization Management</p>
        <p className="hero-subtitle">Streamline your business operations with automated billing, secure document management, and seamless team collaboration</p>
      </div>

      {data && (
        <div className="status">
          <h3>Server Status</h3>
          <p>✅ Connected to backend API</p>
          <p>Message: {data.message || 'Server is running'}</p>
        </div>
      )}

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
                 userRole === 'admin' ? '⚙️ Administrator' : 
                 userRole === 'moderator' ? '🛡️ Moderator' : 
                 userRole === 'member' ? '👤 Member' : 
                 '👤 User'}
              </strong>
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default Home;