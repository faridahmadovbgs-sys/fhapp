import React from 'react';

const Home = ({ data }) => {
  return (
    <div>
      <div className="hero">
        <h1>Welcome to FH App</h1>
        <p>A modern full-stack web application</p>
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
    </div>
  );
};

export default Home;