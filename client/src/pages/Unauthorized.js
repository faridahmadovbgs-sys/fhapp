import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Unauthorized.css';

const Unauthorized = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Auto-redirect to home page after a short delay
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/', { replace: true });
    }, 2000); // Redirect after 2 seconds

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="unauthorized-container">
      <div className="unauthorized-content">
        <div className="unauthorized-icon">🏠</div>
        <h1>Redirecting...</h1>
        <p>
          Redirecting you to the home page...
        </p>
        
        <div className="unauthorized-actions">
          <button 
            onClick={() => navigate('/', { replace: true })}
            className="btn btn-primary"
          >
            Go Home Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;