import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Unauthorized.css';

const Unauthorized = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="unauthorized-container">
      <div className="unauthorized-content">
        <div className="unauthorized-icon">🚫</div>
        <h1>Access Denied</h1>
        <p>
          Sorry {user?.name || 'User'}, you don't have permission to access this page.
        </p>
        <p className="unauthorized-description">
          If you believe you should have access to this resource, please contact your administrator.
        </p>
        
        <div className="unauthorized-actions">
          <button 
            onClick={() => navigate(-1)}
            className="btn btn-secondary"
          >
            Go Back
          </button>
          <button 
            onClick={() => navigate('/')}
            className="btn btn-primary"
          >
            Go Home
          </button>
        </div>

        <div className="contact-info">
          <p>Need help? Contact support:</p>
          <p>📧 support@example.com</p>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;