import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import { doc, getDoc, updateDoc, arrayUnion, increment, collection, query, where, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import './JoinOrganization.css';

const JoinOrganization = () => {
  const { user } = useAuth();
  const { profiles, activeProfile, loading: profilesLoading } = useProfile();
  const navigate = useNavigate();
  const [invitationLink, setInvitationLink] = useState('');
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [invitationPreview, setInvitationPreview] = useState(null);

  // Set default profile when profiles load
  useEffect(() => {
    console.log('📊 JoinOrganization profiles:', profiles);
    console.log('👤 Active profile:', activeProfile);
    if (profiles.length > 0 && !selectedProfile) {
      setSelectedProfile(activeProfile || profiles[0]);
      console.log('✅ Selected profile set to:', activeProfile?.profileName || profiles[0]?.profileName);
    }
  }, [profiles, activeProfile, selectedProfile]);

  const extractTokenFromLink = (link) => {
    try {
      // Handle full URL or just token
      if (link.includes('token=')) {
        const url = new URL(link.includes('http') ? link : `http://dummy.com${link}`);
        return url.searchParams.get('token');
      }
      // If it's just the token
      return link.trim();
    } catch (error) {
      return link.trim();
    }
  };

  const handlePreviewInvitation = async () => {
    if (!invitationLink.trim()) {
      setError('Please paste an invitation link or token');
      return;
    }

    setLoading(true);
    setError('');
    setInvitationPreview(null);

    try {
      const token = extractTokenFromLink(invitationLink);
      
      if (!token) {
        setError('Invalid invitation link format');
        setLoading(false);
        return;
      }

      // Find invitation by token
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const invitationsQuery = query(
        collection(db, 'invitations'),
        where('token', '==', token),
        where('status', '==', 'active')
      );

      const invitationsSnapshot = await getDocs(invitationsQuery);

      if (invitationsSnapshot.empty) {
        setError('Invalid or expired invitation link');
        setLoading(false);
        return;
      }

      const invitationDoc = invitationsSnapshot.docs[0];
      const invitationData = invitationDoc.data();

      // Get organization details
      const organizationRef = doc(db, 'organizations', invitationData.organizationId);
      const organizationDoc = await getDoc(organizationRef);

      if (!organizationDoc.exists()) {
        setError('Organization not found');
        setLoading(false);
        return;
      }

      const organizationData = organizationDoc.data();

      setInvitationPreview({
        organizationName: organizationData.name,
        subAccountName: invitationData.subAccountName || null,
        inviterEmail: invitationData.accountOwnerEmail
      });

    } catch (error) {
      console.error('❌ Error previewing invitation:', error);
      setError('Failed to preview invitation. Please check the link.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinOrganization = async (e) => {
    e.preventDefault();
    
    if (!user?.id) {
      setError('You must be logged in to join an organization');
      return;
    }

    if (!invitationLink.trim()) {
      setError('Please paste an invitation link or token');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Extract token from link
      const token = extractTokenFromLink(invitationLink);
      
      if (!token) {
        setError('Invalid invitation link format');
        setLoading(false);
        return;
      }

      console.log('🔍 Looking for invitation with token:', token);

      // Create a default profile if user doesn't have one
      let profileToUse = selectedProfile;
      if (!profileToUse && profiles.length === 0) {
        console.log('📝 Creating default profile for new user...');
        const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
        const newProfileRef = await addDoc(collection(db, 'subProfiles'), {
          userId: user.id,
          profileName: 'Personal',
          entityType: 'individual',
          isDefault: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        profileToUse = {
          id: newProfileRef.id,
          profileName: 'Personal',
          entityType: 'individual',
          isDefault: true
        };
        console.log('✅ Default profile created:', profileToUse.id);
      } else if (!profileToUse) {
        setError('Please select a profile to add to the organization');
        setLoading(false);
        return;
      }

      console.log('👤 Using profile:', profileToUse.profileName, 'Profile ID:', profileToUse.id);
      console.log('👤 Adding user to organization - User ID:', user.id);

      // Find invitation by token
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const invitationsQuery = query(
        collection(db, 'invitations'),
        where('token', '==', token),
        where('status', '==', 'active')
      );

      const invitationsSnapshot = await getDocs(invitationsQuery);

      if (invitationsSnapshot.empty) {
        setError('Invalid or expired invitation link');
        setLoading(false);
        return;
      }

      const invitationDoc = invitationsSnapshot.docs[0];
      const invitationData = invitationDoc.data();

      console.log('✅ Found invitation:', invitationData);

      // Check if invitation is expired
      if (invitationData.expiresAt && invitationData.expiresAt.toDate() < new Date()) {
        setError('This invitation has expired');
        setLoading(false);
        return;
      }

      // Get organization details
      const organizationRef = doc(db, 'organizations', invitationData.organizationId);
      const organizationDoc = await getDoc(organizationRef);

      if (!organizationDoc.exists()) {
        setError('Organization not found');
        setLoading(false);
        return;
      }

      const organizationData = organizationDoc.data();

      // Check if this user is already a member (check by user ID, not profile ID)
      if (organizationData.members && organizationData.members.includes(user.id)) {
        setError(`You are already a member of this organization`);
        setLoading(false);
        return;
      }

      // Add user ID (not profile ID) to organization members
      await updateDoc(organizationRef, {
        members: arrayUnion(user.id),
        memberCount: increment(1)
      });

      // Update profile document to include organization
      const profileRef = doc(db, 'subProfiles', profileToUse.id);
      const profileDoc = await getDoc(profileRef);
      
      const profileUpdateData = {
        organizations: arrayUnion(invitationData.organizationId)
      };

      // If invitation grants sub_account_owner role, store that role for this org
      if (invitationData.role === 'sub_account_owner') {
        profileUpdateData[`organizationRoles.${invitationData.organizationId}`] = 'sub_account_owner';
        console.log('👨‍💼 User joining as sub-account owner');
      }
      // Otherwise store as member (default)
      else {
        profileUpdateData[`organizationRoles.${invitationData.organizationId}`] = 'member';
      }

      // Store sub-account owner info if joining under someone's sub-account
      if (invitationData.subAccountOwnerId && invitationData.subAccountName) {
        profileUpdateData[`subAccountOwners.${invitationData.organizationId}`] = {
          ownerId: invitationData.subAccountOwnerId,
          ownerName: invitationData.subAccountName,
          joinedAt: new Date()
        };
        console.log('📋 Joined under sub-account owner:', invitationData.subAccountName);
      }
      
      if (profileDoc.exists()) {
        await updateDoc(profileRef, profileUpdateData);
      }

      // ALSO update the user document with organization membership info
      // This is needed for the Home page and OrganizationContext to display memberships
      const userRef = doc(db, 'users', user.id);
      const userDoc = await getDoc(userRef);
      
      const userUpdateData = {
        organizations: arrayUnion(invitationData.organizationId)
      };

      // Store role in user document
      if (invitationData.role === 'sub_account_owner') {
        userUpdateData[`organizationRoles.${invitationData.organizationId}`] = 'sub_account_owner';
      } else {
        userUpdateData[`organizationRoles.${invitationData.organizationId}`] = 'member';
      }

      // Store sub-account owner info in user document
      if (invitationData.subAccountOwnerId && invitationData.subAccountName) {
        userUpdateData[`subAccountOwners.${invitationData.organizationId}`] = {
          ownerId: invitationData.subAccountOwnerId,
          ownerName: invitationData.subAccountName,
          joinedAt: new Date()
        };
      }

      if (userDoc.exists()) {
        await updateDoc(userRef, userUpdateData);
        console.log('✅ User document updated with organization membership');
      } else {
        // Create user document if it doesn't exist
        await setDoc(userRef, {
          userId: user.id,
          email: user.email,
          ...userUpdateData,
          createdAt: new Date()
        });
        console.log('✅ User document created with organization membership');
      }

      // Mark invitation as used (single-use system)
      // Track which profile was used for joining (for reference only)
      await updateDoc(doc(db, 'invitations', invitationDoc.id), {
        usedCount: increment(1),
        lastUsedAt: new Date(),
        status: 'used', // Mark as used to prevent reuse
        usedBy: profileToUse.id,
        usedByUserId: user.id // Also track the actual user ID
      });

      console.log('✅ Invitation marked as used, will generate new one automatically');
      console.log('✅ Successfully joined organization:', organizationData.name);
      console.log('✅ User ID added to members:', user.id);
      console.log('✅ Profile used for joining:', profileToUse.profileName, profileToUse.id);

      const successMessage = invitationData.subAccountName 
        ? `🎉 You successfully joined ${organizationData.name} under ${invitationData.subAccountName} using profile "${profileToUse.profileName}"!`
        : `🎉 You successfully joined ${organizationData.name} using profile "${profileToUse.profileName}"!`;
      
      setSuccess(successMessage);
      
      // Redirect to home page after 2 seconds
      setTimeout(() => {
        navigate('/');
        window.location.reload(); // Reload to refresh organization data
      }, 2000);

    } catch (error) {
      console.error('❌ Error joining organization:', error);
      setError('Failed to join organization. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="join-organization-page">
      <div className="join-organization-container">
        <div className="join-organization-header">
          <h1>🏢 Join an Organization</h1>
          <p>Paste the invitation link you received from an organization owner</p>
        </div>

        <form onSubmit={handleJoinOrganization} className="join-organization-form">
          {/* Profile Selection */}
          {profilesLoading && (
            <div style={{
              padding: '15px',
              backgroundColor: '#e3f2fd',
              border: '1px solid #2196f3',
              borderRadius: '8px',
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              <span className="spinner" style={{ display: 'inline-block', marginRight: '10px' }}></span>
              Loading your profiles...
            </div>
          )}

          {!profilesLoading && profiles.length > 0 && (
            <div className="form-group">
              <label htmlFor="profileSelect">Select Profile to Add</label>
              <select
                id="profileSelect"
                value={selectedProfile?.id || ''}
                onChange={(e) => {
                  const profile = profiles.find(p => p.id === e.target.value);
                  setSelectedProfile(profile);
                  console.log('🔄 Profile selected:', profile?.profileName);
                }}
                disabled={loading}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.profileName} {profile.isDefault ? '(Default)' : ''} - {profile.entityType || 'Personal'}
                  </option>
                ))}
              </select>
              <small className="form-hint">
                Choose which profile you want to add to this organization ({profiles.length} profile{profiles.length !== 1 ? 's' : ''} available)
              </small>
            </div>
          )}

          {!profilesLoading && profiles.length === 0 && (
            <div style={{
              padding: '15px',
              backgroundColor: '#fff3cd',
              border: '1px solid #ffc107',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <strong>⚠️ No profiles found</strong>
              <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>
                You need to create a profile first. Go to your <a href="/accounts" style={{ color: '#007bff' }}>profile settings</a> to create one.
              </p>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="invitationLink">Invitation Link or Token</label>
            <textarea
              id="invitationLink"
              value={invitationLink}
              onChange={(e) => setInvitationLink(e.target.value)}
              placeholder="Paste invitation link or token here"
              rows={3}
              disabled={loading}
              required
            />
            <small className="form-hint">
              You can paste either the full invitation link or just the token
            </small>
          </div>

          {invitationPreview && (
            <div className="invitation-preview">
              <h3>📋 Invitation Details</h3>
              <div className="preview-item">
                <strong>Organization:</strong> {invitationPreview.organizationName}
              </div>
              {invitationPreview.subAccountName && (
                <div className="preview-item sub-account-highlight">
                  <strong>Sub-Account:</strong> {invitationPreview.subAccountName}
                  <span className="sub-account-badge">👨‍💼 You'll be under this sub-account owner</span>
                </div>
              )}
              <div className="preview-item">
                <strong>Invited by:</strong> {invitationPreview.inviterEmail}
              </div>
              {selectedProfile && (
                <div className="preview-item" style={{ 
                  backgroundColor: '#e3f2fd', 
                  padding: '12px', 
                  borderRadius: '6px',
                  marginTop: '10px'
                }}>
                  <strong>👤 Profile to add:</strong> {selectedProfile.profileName}
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="error-message">
              ❌ {error}
            </div>
          )}

          {success && (
            <div className="success-message">
              {success}
            </div>
          )}

          {!invitationPreview ? (
            <button 
              type="button"
              onClick={handlePreviewInvitation}
              className="preview-button"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Loading...
                </>
              ) : (
                'Preview Invitation'
              )}
            </button>
          ) : (
            <button 
              type="submit" 
              className="join-button"
              disabled={loading || (profiles.length > 0 && !selectedProfile)}
              title={profiles.length === 0 ? 'A default profile will be created for you' : ''}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Joining...
                </>
              ) : (
                'Confirm & Join Organization'
              )}
            </button>
          )}

          <button
            type="button"
            className="back-button"
            onClick={() => navigate('/')}
            disabled={loading}
          >
            Back to Home
          </button>
        </form>

        <div className="info-section">
          <h3>ℹ️ How to Join</h3>
          <ol>
            <li>Select which profile you want to add to the organization</li>
            <li>Get an invitation link from an organization owner or sub-account owner</li>
            <li>Paste the complete link or just the token in the field above</li>
            <li>Click "Join Organization" to become a member</li>
            <li>You'll be redirected to the home page once you've joined</li>
          </ol>
          
          <div className="help-text">
            <p><strong>Don't have an invitation link?</strong></p>
            <p>Ask your organization's owner or sub-account owner to create one for you from their Invitation Manager.</p>
          </div>

          <div className="roles-info" style={{marginTop: '16px'}}>
            <h3>👥 Role Types</h3>
            <div className="role-card" style={{background: '#fff8e1', border: '1.5px solid #ffc107', padding: '8px', borderRadius: '6px', marginBottom: '8px'}}>
              <div style={{fontWeight: '600', fontSize: '12px', color: '#f57f17', marginBottom: '3px'}}>👑 Account Owner - $49.99/month</div>
              <div style={{fontSize: '11px', color: '#666', lineHeight: '1.4'}}>Full administrative privileges, manage billing, settings, permissions, sub-profiles, and users</div>
            </div>
            <div className="role-card" style={{background: '#e8f5e9', border: '1.5px solid #4caf50', padding: '8px', borderRadius: '6px', marginBottom: '8px'}}>
              <div style={{fontWeight: '600', fontSize: '12px', color: '#2e7d32', marginBottom: '3px'}}>👤 Sub-Account Owner - 1st FREE, $9.99/month each additional</div>
              <div style={{fontSize: '11px', color: '#666', lineHeight: '1.4'}}>Manage sub-profiles, add/remove users, oversee specific business units or projects</div>
            </div>
            <div className="role-card" style={{background: '#e3f2fd', border: '1.5px solid #2196f3', padding: '8px', borderRadius: '6px'}}>
              <div style={{fontWeight: '600', fontSize: '12px', color: '#1565c0', marginBottom: '3px'}}>👥 Member - $0.99 per transaction</div>
              <div style={{fontSize: '11px', color: '#666', lineHeight: '1.4'}}>Limited permissions, view and interact with assigned resources</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JoinOrganization;
