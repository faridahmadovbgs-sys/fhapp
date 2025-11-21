import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
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

      // Fetch all users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData = [];
      
      usersSnapshot.forEach((doc) => {
        usersData.push({
          id: doc.id,
          ...doc.data()
        });
      });

      // Fetch all organizations
      const orgsSnapshot = await getDocs(collection(db, 'organizations'));
      const orgsMap = {};
      
      orgsSnapshot.forEach((doc) => {
        const orgData = doc.data();
        orgsMap[doc.id] = {
          id: doc.id,
          name: orgData.name,
          members: orgData.members || [],
          ownerId: orgData.ownerId
        };
      });

      // Enrich users with organization data
      const enrichedUsers = usersData.map(user => {
        const userOrgs = [];
        Object.values(orgsMap).forEach(org => {
          if (org.members.includes(user.id) || org.ownerId === user.id) {
            userOrgs.push({
              id: org.id,
              name: org.name,
              isOwner: org.ownerId === user.id
            });
          }
        });
        
        return {
          ...user,
          organizations: userOrgs,
          primaryOrg: userOrgs[0]?.name || 'No Organization'
        };
      });

      // Sort by organization name, then by user name
      enrichedUsers.sort((a, b) => {
        const orgCompare = a.primaryOrg.localeCompare(b.primaryOrg);
        if (orgCompare !== 0) return orgCompare;
        const nameA = a.fullName || a.email || '';
        const nameB = b.fullName || b.email || '';
        return nameA.localeCompare(nameB);
      });
      
      setUsers(enrichedUsers);
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
          <p>When users register, they'll appear here with their profile information.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Email</th>
                <th>Organization(s)</th>
                <th>Role</th>
                <th>Status</th>
                <th>Registered</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, index) => (
                <tr key={user.id}>
                  <td className="number-cell">{index + 1}</td>
                  <td className="name-cell">
                    <strong>{user.fullName || 'No name'}</strong>
                  </td>
                  <td className="email-cell">{user.email}</td>
                  <td className="org-cell">
                    {user.organizations && user.organizations.length > 0 ? (
                      <div className="org-list">
                        {user.organizations.map((org, idx) => (
                          <span key={idx} className="org-badge">
                            {org.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="no-org">No organization</span>
                    )}
                  </td>
                  <td className="role-cell">
                    {user.organizations && user.organizations.some(org => org.isOwner) ? (
                      <span className="role-badge owner">👑 Owner</span>
                    ) : user.organizations && user.organizations.length > 0 ? (
                      <span className="role-badge member">👤 Member</span>
                    ) : (
                      <span className="role-badge none">—</span>
                    )}
                  </td>
                  <td className="status-cell">
                    {user.emailVerified ? (
                      <span className="status-badge verified">✅ Verified</span>
                    ) : (
                      <span className="status-badge unverified">⚠️ Unverified</span>
                    )}
                  </td>
                  <td className="date-cell">{formatDate(user.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default RegisteredUsers;