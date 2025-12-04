import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getAllUserOrganizations, getOrganization, updateOrganization } from '../services/organizationService';
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

        // Get ALL user's organizations (owned + member)
        const orgResult = await getAllUserOrganizations(user.id);
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
      </div>
    </div>
  );
};

export default About;