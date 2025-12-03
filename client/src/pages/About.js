import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getUserOrganizations, getOrganization, updateOrganization } from '../services/organizationService';
import { getUserRoleFromDatabase } from '../services/roleService';
import './About.css';

const About = () => {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState(null);
  const [userOrganizations, setUserOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [orgInfo, setOrgInfo] = useState({
    description: '',
    mission: '',
    website: '',
    industry: '',
    founded: '',
    size: '',
    location: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        // Get user role
        const role = await getUserRoleFromDatabase(user.id);
        setUserRole(role);

        // Get user's organizations
        const orgResult = await getUserOrganizations(user.id);
        if (orgResult.success && orgResult.organizations.length > 0) {
          const orgs = orgResult.organizations;
          setUserOrganizations(orgs);

          // For account owners and sub account owners, select their organization
          if ((role === 'account_owner' || role === 'sub_account_owner') && orgs.length > 0) {
            setSelectedOrg(orgs[0]);
            // Load organization info
            await loadOrganizationInfo(orgs[0].id);
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  const loadOrganizationInfo = async (orgId) => {
    try {
      const result = await getOrganization(orgId);
      if (result.success) {
        const org = result.organization;
        setOrgInfo({
          description: org.description || '',
          mission: org.mission || '',
          website: org.website || '',
          industry: org.industry || '',
          founded: org.founded || '',
          size: org.size || '',
          location: org.location || ''
        });
      }
    } catch (error) {
      console.error('Error loading organization info:', error);
    }
  };

  const handleSaveOrgInfo = async () => {
    if (!selectedOrg) return;

    setSaving(true);
    try {
      await updateOrganization(selectedOrg.id, orgInfo);
      setIsEditing(false);
      alert('Organization information updated successfully!');
    } catch (error) {
      console.error('Error saving organization info:', error);
      alert('Error saving organization information. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setOrgInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const isAccountOwner = userRole === 'account_owner' && selectedOrg;

  if (loading) {
    return (
      <div className="about-page">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="about-page">
      <div className="about-hero">
        <h1>About {selectedOrg ? selectedOrg.name : 'Integrant Platform'}</h1>
        <p className="about-subtitle">
          {selectedOrg ? 'Your Organization Overview' : 'Enterprise Organization Management Made Simple'}
        </p>
      </div>

      <div className="about-content">
        {/* Organization Information Section */}
        {selectedOrg && (
          <section className="about-section">
            <div className="section-header">
              <h2>🏢 {selectedOrg.name}</h2>
              {isAccountOwner && (
                <button
                  className="edit-btn"
                  onClick={() => setIsEditing(!isEditing)}
                  disabled={saving}
                >
                  {isEditing ? 'Cancel' : 'Edit Organization Info'}
                </button>
              )}
            </div>

            {isEditing && isAccountOwner ? (
              <div className="edit-form">
                <div className="form-group">
                  <label>Description:</label>
                  <textarea
                    value={orgInfo.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Brief description of your organization"
                    rows={3}
                  />
                </div>

                <div className="form-group">
                  <label>Mission Statement:</label>
                  <textarea
                    value={orgInfo.mission}
                    onChange={(e) => handleInputChange('mission', e.target.value)}
                    placeholder="Your organization's mission"
                    rows={3}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Website:</label>
                    <input
                      type="url"
                      value={orgInfo.website}
                      onChange={(e) => handleInputChange('website', e.target.value)}
                      placeholder="https://yourwebsite.com"
                    />
                  </div>

                  <div className="form-group">
                    <label>Industry:</label>
                    <input
                      type="text"
                      value={orgInfo.industry}
                      onChange={(e) => handleInputChange('industry', e.target.value)}
                      placeholder="e.g., Technology, Healthcare"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Founded:</label>
                    <input
                      type="text"
                      value={orgInfo.founded}
                      onChange={(e) => handleInputChange('founded', e.target.value)}
                      placeholder="e.g., 2020"
                    />
                  </div>

                  <div className="form-group">
                    <label>Company Size:</label>
                    <select
                      value={orgInfo.size}
                      onChange={(e) => handleInputChange('size', e.target.value)}
                    >
                      <option value="">Select size</option>
                      <option value="1-10">1-10 employees</option>
                      <option value="11-50">11-50 employees</option>
                      <option value="51-200">51-200 employees</option>
                      <option value="201-1000">201-1000 employees</option>
                      <option value="1000+">1000+ employees</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Location:</label>
                  <input
                    type="text"
                    value={orgInfo.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    placeholder="City, State/Country"
                  />
                </div>

                <div className="form-actions">
                  <button
                    className="save-btn"
                    onClick={handleSaveOrgInfo}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    className="cancel-btn"
                    onClick={() => setIsEditing(false)}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="org-info-display">
                {orgInfo.description && (
                  <div className="info-item">
                    <h3>Description</h3>
                    <p>{orgInfo.description}</p>
                  </div>
                )}

                {orgInfo.mission && (
                  <div className="info-item">
                    <h3>Mission</h3>
                    <p>{orgInfo.mission}</p>
                  </div>
                )}

                <div className="org-details-grid">
                  {orgInfo.website && (
                    <div className="detail-item">
                      <strong>Website:</strong>
                      <a href={orgInfo.website} target="_blank" rel="noopener noreferrer">
                        {orgInfo.website}
                      </a>
                    </div>
                  )}

                  {orgInfo.industry && (
                    <div className="detail-item">
                      <strong>Industry:</strong> {orgInfo.industry}
                    </div>
                  )}

                  {orgInfo.founded && (
                    <div className="detail-item">
                      <strong>Founded:</strong> {orgInfo.founded}
                    </div>
                  )}

                  {orgInfo.size && (
                    <div className="detail-item">
                      <strong>Company Size:</strong> {orgInfo.size}
                    </div>
                  )}

                  {orgInfo.location && (
                    <div className="detail-item">
                      <strong>Location:</strong> {orgInfo.location}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

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
              <p>Advanced permission system with account owners, administrators, and members - ensuring the right people have the right access.</p>
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