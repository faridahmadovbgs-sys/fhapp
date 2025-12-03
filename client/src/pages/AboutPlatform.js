import React from 'react';
import './About.css';

const AboutPlatform = () => {
  return (
    <div className="page-container">
      <div className="about-container">
        <h1 className="page-title">About Integrant Platform</h1>
        
        <section className="about-section compact-about">
          <div className="about-content-wrapper">
            <div className="about-header">
              <h2>🎯 Our Mission</h2>
              <p>
                Integrant Platform is designed to streamline enterprise organization management by providing a comprehensive suite of tools for billing, team collaboration, and document management. We believe that managing an organization should be simple, efficient, and accessible to everyone.
              </p>
            </div>

            <div className="about-subsection">
              <h3>✨ Key Features</h3>
              <div className="features-compact">
                <div className="feature-compact">
                  <strong>💰 Billing Management</strong>
                  <span>Create and manage bills, track payments, and handle subscription billing with automated payment tracking and detailed financial reports.</span>
                </div>
                <div className="feature-compact">
                  <strong>👥 Team Collaboration</strong>
                  <span>Invite members, manage roles and permissions, communicate in real-time with built-in chat, and maintain a clear organizational structure.</span>
                </div>
                <div className="feature-compact">
                  <strong>📁 Document Management</strong>
                  <span>Securely store and share documents with categorization, search functionality, and granular access control.</span>
                </div>
                <div className="feature-compact">
                  <strong>🔐 Role-Based Access</strong>
                  <span>Advanced permission system ensuring the right people have the right access.</span>
                </div>
                <div className="feature-compact">
                  <strong>📊 Real-Time Updates</strong>
                  <span>Stay synchronized with real-time notifications, live chat, and instant updates.</span>
                </div>
                <div className="feature-compact">
                  <strong>🎨 Professional Design</strong>
                  <span>Modern, corporate-grade interface with responsive layouts.</span>
                </div>
              </div>
            </div>

            <div className="about-subsection">
              <h3>🚀 Built With Modern Technology</h3>
              <div className="tech-compact">
                <div className="tech-compact-item">
                  <strong>React.js 18</strong>
                  <span>Modern frontend framework</span>
                </div>
                <div className="tech-compact-item">
                  <strong>Firebase</strong>
                  <span>Real-time database & cloud storage</span>
                </div>
                <div className="tech-compact-item">
                  <strong>Node.js & Express</strong>
                  <span>Scalable backend infrastructure</span>
                </div>
                <div className="tech-compact-item">
                  <strong>Professional UI</strong>
                  <span>Corporate design system</span>
                </div>
              </div>
            </div>

            <div className="about-subsection">
              <h3>👨‍💻 Development Team</h3>
              <p className="team-info">
                Integrant Platform is developed by <strong>Farid Ahmadov</strong>, focused on creating enterprise-grade solutions for modern organizations.
              </p>
              <p className="team-info">
                Product Owner: <strong>Haley Davidshofer</strong>
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AboutPlatform;
