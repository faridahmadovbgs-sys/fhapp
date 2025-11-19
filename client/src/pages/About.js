import React from 'react';

const About = () => {
  return (
    <div>
      <h1>About This Application</h1>
      <p>
        This is a full-stack web application built with modern technologies:
      </p>
      <ul style={{ textAlign: 'left', maxWidth: '600px', margin: '0 auto' }}>
        <li><strong>Frontend:</strong> React.js with React Router for navigation</li>
        <li><strong>Backend:</strong> Node.js with Express.js framework</li>
        <li><strong>Database:</strong> MongoDB with Mongoose ODM</li>
        <li><strong>Development:</strong> Modern ES6+ JavaScript throughout</li>
      </ul>
      
      <h2>Features</h2>
      <p>
        The application includes a complete development setup with:
      </p>
      <ul style={{ textAlign: 'left', maxWidth: '600px', margin: '0 auto' }}>
        <li>Responsive React components and pages</li>
        <li>RESTful API with proper routing and middleware</li>
        <li>MongoDB integration for data persistence</li>
        <li>Environment-based configuration</li>
        <li>Development and production scripts</li>
      </ul>
    </div>
  );
};

export default About;