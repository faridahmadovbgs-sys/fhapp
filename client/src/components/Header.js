import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

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