import React from 'react';
import ChatPopup from '../components/ChatPopup';
import { usePermissions } from '../hooks/usePermissions';

const Home = ({ data }) => {
  const { isAdmin, userRole } = usePermissions();

  return (
    <div>
      <div className="hero">
        <h1>Welcome to Integrant</h1>
        <p>A modern full-stack web application with role-based access control</p>
        <div style={{ marginTop: '10px', padding: '10px', background: '#e9ecef', borderRadius: '5px' }}>
          <strong>Your Current Role: </strong>
          <span style={{ 
            color: isAdmin() ? '#28a745' : userRole === 'moderator' ? '#ffc107' : '#007bff',
            fontWeight: 'bold'
          }}>
            {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
            {isAdmin() && ' 👑'}
          </span>
        </div>
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
          <h3>React Frontend</h3>
          <p>Modern React.js application with routing, components, and hooks for a responsive user interface.</p>
        </div>
        <div className="feature">
          <h3>Node.js Backend</h3>
          <p>Express.js server with RESTful API endpoints, middleware, and proper error handling.</p>
        </div>
        <div className="feature">
          <h3>MongoDB Database</h3>
          <p>NoSQL database integration with Mongoose ODM for flexible data modeling and operations.</p>
        </div>
      </div>
      
      {/* Chat Popup */}
      <ChatPopup />
    </div>
  );
};

export default Home;