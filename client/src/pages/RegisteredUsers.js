import React, { useState, useEffect } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../config/firebase';
import './RegisteredUsers.css';

const RegisteredUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (!db) {
        throw new Error('Database not configured');
      }

      // Query users collection ordered by creation date
      const usersQuery = query(
        collection(db, 'users'),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(usersQuery);
      const usersData = [];
      
      querySnapshot.forEach((doc) => {
        usersData.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to load registered users: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    
    try {
      // Handle Firestore timestamp
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <div className="registered-users-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading registered users...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="registered-users-container">
        <div className="error-message">
          <h2>⚠️ Error Loading Users</h2>
          <p>{error}</p>
          <button onClick={fetchUsers} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="registered-users-container">
      <div className="page-header">
        <h1>👥 Registered Users</h1>
        <p>Total users: <strong>{users.length}</strong></p>
        <button onClick={fetchUsers} className="refresh-button">
          🔄 Refresh Data
        </button>
      </div>

      {users.length === 0 ? (
        <div className="no-users">
          <h3>No users registered yet</h3>
          <p>When users sign up, they'll appear here with their profile information.</p>
        </div>
      ) : (
        <div className="users-grid">
          {users.map((user, index) => (
            <div key={user.id} className="user-card">
              <div className="user-header">
                <div className="user-number">#{index + 1}</div>
                <div className="user-status">
                  {user.emailVerified ? (
                    <span className="verified">✅ Verified</span>
                  ) : (
                    <span className="unverified">⚠️ Unverified</span>
                  )}
                </div>
              </div>
              
              <div className="user-details">
                <h3 className="user-name">
                  {user.fullName || 'No name provided'}
                </h3>
                
                <div className="user-info">
                  <div className="info-row">
                    <span className="label">📧 Email:</span>
                    <span className="value">{user.email}</span>
                  </div>
                  
                  {user.entity && (
                    <div className="info-row">
                      <span className="label">🏢 Entity:</span>
                      <span className="value">{user.entity}</span>
                    </div>
                  )}
                  
                  <div className="info-row">
                    <span className="label">📅 Registered:</span>
                    <span className="value">{formatDate(user.createdAt)}</span>
                  </div>
                  
                  <div className="info-row">
                    <span className="label">🆔 User ID:</span>
                    <span className="value user-id">{user.uid || user.id}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RegisteredUsers;