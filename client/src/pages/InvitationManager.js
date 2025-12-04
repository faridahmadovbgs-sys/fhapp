import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAuthorization } from '../contexts/AuthorizationContext';
import { getAccountOwnerInvitationLink, getInvitedUsers } from '../services/invitationService';
import { getAllUserOrganizations, getUserMemberOrganizations } from '../services/organizationService';
import './InvitationManager.css';
import './PersonalDocuments.css';

const InvitationManager = () => {
  const { user } = useAuth();
  const { userRole } = useAuthorization();
  const isSubAccountOwner = userRole === 'sub_account_owner';
  const [invitation, setInvitation] = useState(null); // Member invitation
  const [subOwnerInvitation, setSubOwnerInvitation] = useState(null); // Sub-account owner invitation
  const [invitedUsers, setInvitedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState(null);

  useEffect(() => {
    const fetchOrganizations = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      
      try {
        console.log('🔍 Fetching organizations for user:', user.id);
        
        // Get organizations where user is owner
        const ownerResult = await getAllUserOrganizations(user.id);
        console.log('👑 Owner organizations:', ownerResult.organizations.length);
        
        // Get organizations where user is a member
        const memberResult = await getUserMemberOrganizations(user.id);
        console.log('👥 Member organizations:', memberResult.organizations.length);
        
        // Combine both (remove duplicates by id)
        const allOrgs = [...ownerResult.organizations];
        memberResult.organizations.forEach(org => {
          if (!allOrgs.find(o => o.id === org.id)) {
            allOrgs.push(org);
          }
        });
        
        console.log('✅ Total organizations:', allOrgs.length);
        setOrganizations(allOrgs);
        
        // Auto-select first organization
        if (allOrgs.length > 0 && !selectedOrg) {
          setSelectedOrg(allOrgs[0]);
        } else if (allOrgs.length === 0) {
          // No organizations found
          setLoading(false);
          setError('No organizations found. Please create an organization first.');
        }
      } catch (error) {
        console.error('Error fetching organizations:', error);
        setError('Failed to load organizations: ' + error.message);
        setLoading(false);
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
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('📋 Loading invitation data for user:', user.id, 'org:', selectedOrg.id, 'orgName:', selectedOrg.name);
      
      // Set timeout fallback to prevent infinite loading
      const timeoutId = setTimeout(() => {
        console.error('⏱️ Loading timeout - forcing completion');
        setLoading(false);
        setError('Loading took too long. Please refresh the page.');
      }, 10000); // 10 second timeout
      
      // Load invitation link for the selected organization
      let invitationResult = await getAccountOwnerInvitationLink(user.id, selectedOrg.id);
      console.log('📊 Invitation result:', invitationResult);
      console.log('📊 Selected Org ID:', selectedOrg.id);
      console.log('📊 Invitation Org ID:', invitationResult?.organizationId);
      console.log('📊 Invitation link token:', invitationResult?.link?.split('token=')[1]);
      
      // If no MEMBER invitation exists OR invitation doesn't match the organization, create one
      if (!invitationResult || invitationResult.organizationId !== selectedOrg.id) {
        console.log('⚠️ No member invitation found, creating new one...');
        try {
          const { createInvitationLink } = await import('../services/invitationService');
          
          // Check if user is a sub-account owner for THIS specific organization
          // (not owner of the org, but invited as sub-account owner)
          const { doc, getDoc } = await import('firebase/firestore');
          const { db } = await import('../config/firebase');
          const userDoc = await getDoc(doc(db, 'users', user.id));
          
          let subAccountOwnerId = null;
          let subAccountName = null;
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            // Check if user is NOT the owner but IS a sub-account owner for this org
            if (selectedOrg.ownerId !== user.id && userData.subAccountOwners && userData.subAccountOwners[selectedOrg.id]) {
              subAccountOwnerId = user.id;
              subAccountName = userData.subAccountOwners[selectedOrg.id].ownerName || userData.subAccountName || null;
            }
          }
          
          // Create MEMBER invitation
          invitationResult = await createInvitationLink(
            user.id, 
            user.email, 
            selectedOrg.name,
            selectedOrg.id,
            subAccountOwnerId,
            subAccountName,
            'member'  // Member role
          );
          console.log('✅ New member invitation created:', invitationResult);
          setSuccess('✅ Member invitation link created successfully!');
          setTimeout(() => setSuccess(''), 3000);
        } catch (createError) {
          console.error('❌ Failed to create member invitation:', createError);
          setError('Could not create member invitation link: ' + createError.message);
        }
      }
      
      if (invitationResult) {
        console.log('✅ Member invitation found');
        setInvitation(invitationResult);
      }

      // If user is account owner (not sub-account owner), create SUB-ACCOUNT OWNER invitation too
      if (!isSubAccountOwner && selectedOrg.ownerId === user.id) {
        try {
          const { createInvitationLink } = await import('../services/invitationService');
          
          // Create SUB-ACCOUNT OWNER invitation
          const subOwnerResult = await createInvitationLink(
            user.id,
            user.email,
            selectedOrg.name,
            selectedOrg.id,
            null,
            null,
            'sub_account_owner'  // Sub-account owner role
          );
          console.log('✅ Sub-account owner invitation created:', subOwnerResult);
          setSubOwnerInvitation(subOwnerResult);
        } catch (createError) {
          console.error('❌ Failed to create sub-account owner invitation:', createError);
        }
      }

      // Load invited users for the selected organization
      const usersResult = await getInvitedUsers(user.id, selectedOrg.id);
      if (usersResult.success) {
        console.log(`✅ Found ${usersResult.count} invited users for org:`, selectedOrg.name);
        setInvitedUsers(usersResult.users);
      }

      setError(prev => !prev ? '' : prev); // Clear error only if not already set
      
      // Clear timeout if we got here
      if (typeof timeoutId !== 'undefined') {
        clearTimeout(timeoutId);
      }
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

  if (loading) {
    return <div className="invitation-manager"><p>Loading...</p></div>;
  }

  return (
    <div className="invitation-manager">
      <div className="invitation-container">
        <div className="invitation-header">
          <div>
            <h2>📤 Invite Members</h2>
            <p className="subtitle">Share your unique invitation link with members to add them to your organization.</p>
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
            {/* Left column: Invitation boxes and stats */}
            <div className="invitation-boxes-wrapper">
              {/* Member Invitation Link */}
              <div className="invitation-box">
                <h3>👤 Member Invitation Link</h3>
                
                <div className="organization-info">
                  <p><strong>Organization:</strong> {invitation.organizationName}</p>
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
                      {copying ? 'Copying...' : '📋 Copy Link'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Sub Account Owner Invitation Link - Only visible to account owners */}
              {!isSubAccountOwner && subOwnerInvitation && (
                <div className="invitation-box">
                  <h3>👑 Sub Account Owner Invitation Link</h3>
                  
                  <div className="organization-info">
                    <p><strong>Organization:</strong> {subOwnerInvitation.organizationName}</p>
                    <p style={{fontSize: '14px', color: '#666', marginTop: '8px'}}>
                      People joining with this link will become sub-account owners with invitation and billing management permissions.
                    </p>
                  </div>

                  <div className="link-display">
                    <div className="link-input-group">
                      <input 
                        type="text" 
                        value={subOwnerInvitation.link} 
                        readOnly 
                        className="link-input"
                      />
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(subOwnerInvitation.link);
                          setCopying(true);
                          setSuccess('✅ Sub Account Owner link copied to clipboard!');
                          setTimeout(() => {
                            setCopying(false);
                            setSuccess('');
                          }, 2000);
                        }}
                        disabled={copying}
                        className="btn btn-primary"
                      >
                        {copying ? 'Copying...' : '📋 Copy Link'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Member Statistics */}
              <div className="member-stats-section" style={{display: 'flex', gap: '0.75rem', justifyContent: 'flex-start'}}>
              {!isSubAccountOwner && (
                <div style={{padding: '8px 12px', background: '#f0f7ff', borderRadius: '6px', border: '1px solid #d0e7ff', minWidth: '120px'}}>
                  <div style={{fontSize: '11px', color: '#666', marginBottom: '2px', fontWeight: '500'}}>Sub Account Owners</div>
                  <div style={{fontSize: '20px', fontWeight: '700', color: '#6264a7'}}>
                    {invitedUsers.filter(u => u.role === 'sub_account_owner').length}
                  </div>
                </div>
              )}
              <div style={{padding: '8px 12px', background: '#f0fff4', borderRadius: '6px', border: '1px solid #c6f6d5', minWidth: '120px'}}>
                <div style={{fontSize: '11px', color: '#666', marginBottom: '2px', fontWeight: '500'}}>Members</div>
                <div style={{fontSize: '20px', fontWeight: '700', color: '#38a169'}}>
                  {invitedUsers.filter(u => u.role === 'user' || !u.role).length}
                </div>
              </div>
            </div>
            </div>

            {/* Right column: Members table */}
            <div className="invited-users-section">
              <h3>👥 Members ({invitedUsers.length})</h3>
              
              {invitedUsers.length === 0 ? (
                <p className="no-users">No members yet. Share your invitation link to get started!</p>
              ) : (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Member</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Joined Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invitedUsers
                        .sort((a, b) => {
                          // Sort by join date from oldest to newest
                          const dateA = a.invitedAt?.seconds 
                            ? new Date(a.invitedAt.seconds * 1000)
                            : a.invitedAt instanceof Date 
                              ? a.invitedAt 
                              : new Date(a.invitedAt || 0);
                          const dateB = b.invitedAt?.seconds 
                            ? new Date(b.invitedAt.seconds * 1000)
                            : b.invitedAt instanceof Date 
                              ? b.invitedAt 
                              : new Date(b.invitedAt || 0);
                          return dateA - dateB; // Oldest first
                        })
                        .map((invitedUser) => (
                        <tr key={invitedUser.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: '600',
                                fontSize: '14px',
                                flexShrink: 0
                              }}>
                                {invitedUser.name?.charAt(0).toUpperCase() || '?'}
                              </div>
                              <strong style={{ fontSize: '13px', color: '#333' }}>
                                {invitedUser.name}
                              </strong>
                            </div>
                          </td>
                          <td style={{ fontSize: '13px', color: '#555' }}>
                            {invitedUser.email}
                          </td>
                          <td>
                            <span className="badge badge-info">
                              {invitedUser.role === 'sub_account_owner' ? 'Sub Account Owner' : 
                               invitedUser.role === 'account_owner' ? 'Account Owner' : 'Member'}
                            </span>
                          </td>
                          <td style={{ fontSize: '12px', color: '#999' }}>
                            {invitedUser.invitedAt 
                              ? (invitedUser.invitedAt.seconds 
                                  ? new Date(invitedUser.invitedAt.seconds * 1000).toLocaleDateString()
                                  : invitedUser.invitedAt instanceof Date 
                                    ? invitedUser.invitedAt.toLocaleDateString()
                                    : new Date(invitedUser.invitedAt).toLocaleDateString())
                              : 'Unknown'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
