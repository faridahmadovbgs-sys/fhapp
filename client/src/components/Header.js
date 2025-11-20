import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { PermissionGuard } from './ProtectedRoute';

const Header = ({ user }) => {
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <header>
      <div className="container">
        <nav>
          <ul>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/about">About</Link></li>
            <li><Link to="/demo-permissions">Permissions Demo</Link></li>
            <PermissionGuard requiredPage="users">
              <li><Link to="/registered-users">Users</Link></li>
            </PermissionGuard>
            <PermissionGuard requiredPage="admin">
              <li><Link to="/admin">Admin Panel</Link></li>
            </PermissionGuard>
          </ul>
        </nav>
        
        {user && (
          <div className="user-info">
            <span className="welcome-text">Welcome, {user.name || user.email}!</span>
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