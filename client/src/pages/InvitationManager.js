import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getAccountOwnerInvitationLink, regenerateInvitationLink, getInvitedUsers } from '../services/invitationService';
import { getUserOrganizations } from '../services/organizationService';
import './InvitationManager.css';

const InvitationManager = () => {
  const { user } = useAuth();
  const [invitation, setInvitation] = useState(null);
  const [invitedUsers, setInvitedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState(null);

  useEffect(() => {
    const fetchOrganizations = async () => {
      if (!user?.id) return;
      
      try {
        const result = await getUserOrganizations(user.id);
        setOrganizations(result.organizations);
        
        // Auto-select first organization
        if (result.organizations.length > 0 && !selectedOrg) {
          setSelectedOrg(result.organizations[0]);
        }
      } catch (error) {
        console.error('Error fetching organizations:', error);
      }
    };
    
    fetchOrganizations();
  }, [user]);

  useEffect(() => {
    if (selectedOrg) {
      loadInvitationData();
    }
  }, [selectedOrg]);

  const loadInvitationData = async () => {
    if (!user?.id || !selectedOrg) {
      console.warn('⚠️ No user ID or selected organization available');
      return;
    }

    try {
      setLoading(true);
      console.log('📋 Loading invitation data for user:', user.id, 'org:', selectedOrg.id);
      
      // Load invitation link for the selected organization
      let invitationResult = await getAccountOwnerInvitationLink(user.id);
      console.log('📊 Invitation result:', invitationResult);
      
      // If no invitation exists, create one
      if (!invitationResult) {
        console.log('⚠️ No invitation found, creating new one...');
        try {
          const { createInvitationLink } = await import('../services/invitationService');
          invitationResult = await createInvitationLink(
            user.id, 
            user.email, 
            selectedOrg.name
          );
          console.log('✅ New invitation created:', invitationResult);
          setSuccess('✅ Invitation link created successfully!');
          setTimeout(() => setSuccess(''), 3000);
        } catch (createError) {
          console.error('❌ Failed to create invitation:', createError);
          setError('Could not create invitation link: ' + createError.message);
        }
      }
      
      if (invitationResult) {
        console.log('✅ Invitation found');
        setInvitation(invitationResult);
      }

      // Load invited users
      const usersResult = await getInvitedUsers(user.id);
      if (usersResult.success) {
        console.log(`✅ Found ${usersResult.count} invited users`);
        setInvitedUsers(usersResult.users);
      }

      setError(prev => !prev ? '' : prev); // Clear error only if not already set
    } catch (error) {
      console.error('❌ Error loading invitation data:', error);
      if (!error.message.includes('Could not create')) {
        setError('Failed to load invitation data: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!invitation?.link) return;

    try {
      setCopying(true);
      await navigator.clipboard.writeText(invitation.link);
      setSuccess('✅ Invitation link copied to clipboard!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error copying link:', error);
      setError('Failed to copy link');
    } finally {
      setCopying(false);
    }
  };

  const handleRegenerateLink = async () => {
    if (!user?.id) return;

    if (!window.confirm('This will create a new invitation link. The old link will no longer work. Continue?')) {
      return;
    }

    try {
      setRegenerating(true);
      const result = await regenerateInvitationLink(user.id, invitation?.organizationName || 'Team');
      setInvitation({
        ...result,
        link: result.link
      });
      setSuccess('✅ Invitation link regenerated successfully!');
      setError('');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error regenerating link:', error);
      setError('Failed to regenerate invitation link');
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) {
    return <div className="invitation-manager"><p>Loading...</p></div>;
  }

  return (
    <div className="invitation-manager">
      <div className="invitation-container">
        <div className="invitation-header">
          <div>
            <h2>📤 Invite Team Members</h2>
            <p className="subtitle">Share your unique invitation link with team members to add them to your organization.</p>
          </div>
          
          {/* Organization Selector */}
          {organizations.length > 0 && (
            <div className="org-selector-section">
              <label htmlFor="org-select">Organization:</label>
              <select
                id="org-select"
                value={selectedOrg?.id || ''}
                onChange={(e) => {
                  const org = organizations.find(o => o.id === e.target.value);
                  setSelectedOrg(org);
                }}
                className="org-select"
              >
                {organizations.map(org => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {invitation ? (
          <div className="invitation-section">
            <div className="invitation-box">
              <h3>Your Invitation Link</h3>
              
              <div className="organization-info">
                <p><strong>Organization:</strong> {invitation.organizationName}</p>
                <p><strong>Link Created:</strong> {new Date(invitation.createdAt.seconds * 1000).toLocaleDateString()}</p>
                <p><strong>Members Joined:</strong> {invitation.usedCount}</p>
              </div>

              <div className="link-display">
                <div className="link-input-group">
                  <input 
                    type="text" 
                    value={invitation.link} 
                    readOnly 
                    className="link-input"
                  />
                  <button 
                    onClick={handleCopyLink}
                    disabled={copying}
                    className="btn btn-primary"
                  >
                    {copying ? 'Copying...' : 'Copy Link'}
                  </button>
                </div>

                <p className="link-description">
                  Share this link with team members. They can use it to register and join your organization.
                </p>
              </div>

              <button 
                onClick={handleRegenerateLink}
                disabled={regenerating}
                className="btn btn-secondary"
              >
                {regenerating ? 'Regenerating...' : 'Regenerate Link'}
              </button>
              <p className="regenerate-info">Use this if you want to invalidate the current link and create a new one.</p>
            </div>

            <div className="invited-users-section">
              <h3>👥 Team Members ({invitedUsers.length})</h3>
              
              {invitedUsers.length === 0 ? (
                <p className="no-users">No team members yet. Share your invitation link to get started!</p>
              ) : (
                <div className="users-list">
                  {invitedUsers.map((invitedUser) => (
                    <div key={invitedUser.id} className="user-card">
                      <div className="user-avatar">
                        {invitedUser.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div className="user-info">
                        <div className="user-name">{invitedUser.name}</div>
                        <div className="user-email">{invitedUser.email}</div>
                        {invitedUser.invitedAt && (
                          <div className="invited-date">
                            Joined: {new Date(invitedUser.invitedAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="no-invitation">
            <p>No active invitation link found. Please contact support if you need help setting up team invitations.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvitationManager;
