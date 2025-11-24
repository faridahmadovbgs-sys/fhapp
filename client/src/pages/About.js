import React from 'react';
import './About.css';

const About = () => {
  return (
    <div className="about-page">
      <div className="about-hero">
        <h1>About Integrant Platform</h1>
        <p className="about-subtitle">Enterprise Organization Management Made Simple</p>
      </div>

      <div className="about-content">
        <section className="about-section">
          <h2>🎯 Our Mission</h2>
          <p>
            Integrant Platform is designed to streamline enterprise organization management by providing a comprehensive suite of tools for billing, team collaboration, and document management. We believe that managing an organization should be simple, efficient, and accessible to everyone.
          </p>
        </section>

        <section className="about-section">
          <h2>💼 What We Offer</h2>
          <div className="features-grid">
            <div className="feature-item">
              <h3>💰 Billing Management</h3>
              <p>Create and manage bills, track payments, and handle subscription billing for your organization members with automated payment tracking and detailed financial reports.</p>
            </div>
            <div className="feature-item">
              <h3>👥 Team Collaboration</h3>
              <p>Invite team members, manage roles and permissions, communicate in real-time with built-in chat, and maintain a clear organizational structure.</p>
            </div>
            <div className="feature-item">
              <h3>📁 Document Management</h3>
              <p>Securely store and share both personal and organization-wide documents with categorization, search functionality, and granular access control.</p>
            </div>
            <div className="feature-item">
              <h3>🔐 Role-Based Access</h3>
              <p>Advanced permission system with account owners, administrators, moderators, and members - ensuring the right people have the right access.</p>
            </div>
            <div className="feature-item">
              <h3>📊 Real-Time Updates</h3>
              <p>Stay synchronized with real-time notifications, live chat, and instant updates across all organization activities and member interactions.</p>
            </div>
            <div className="feature-item">
              <h3>🎨 Professional Design</h3>
              <p>Modern, corporate-grade interface designed for enterprise use with responsive layouts that work seamlessly on all devices.</p>
            </div>
          </div>
        </section>

        <section className="about-section">
          <h2>🚀 Built With Modern Technology</h2>
          <div className="tech-stack">
            <div className="tech-item">
              <strong>React.js 18</strong>
              <span>Modern frontend framework with hooks and functional components</span>
            </div>
            <div className="tech-item">
              <strong>Firebase</strong>
              <span>Real-time database, authentication, and cloud storage</span>
            </div>
            <div className="tech-item">
              <strong>Node.js & Express</strong>
              <span>Scalable backend infrastructure and RESTful APIs</span>
            </div>
            <div className="tech-item">
              <strong>Professional UI</strong>
              <span>Corporate design system with CSS custom properties</span>
            </div>
          </div>
        </section>

        <section className="about-section">
          <h2>👨‍💻 Development Team</h2>
          <p>
            Integrant Platform is developed by <strong>Farid Ahmadov</strong>, focused on creating enterprise-grade solutions for modern organizations.
          </p>
          <p>
            Product Owner: <strong>Haley Davidshofer</strong>
          </p>
        </section>

        <section className="about-section about-cta">
          <h2>Ready to Get Started?</h2>
          <p>Join organizations using Integrant Platform to streamline their operations and improve team collaboration.</p>
        </section>
      </div>
    </div>
  );
};

export default About;