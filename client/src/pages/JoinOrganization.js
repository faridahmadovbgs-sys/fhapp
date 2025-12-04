import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, updateDoc, arrayUnion, increment } from 'firebase/firestore';
import { db } from '../config/firebase';
import './JoinOrganization.css';

const JoinOrganization = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invitationLink, setInvitationLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [invitationPreview, setInvitationPreview] = useState(null);

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

      // Check if user is already a member
      if (organizationData.members && organizationData.members.includes(user.id)) {
        setError('You are already a member of this organization');
        setLoading(false);
        return;
      }

      // Add user to organization members
      await updateDoc(organizationRef, {
        members: arrayUnion(user.id),
        memberCount: increment(1)
      });

      // Update user document to include organization
      const userRef = doc(db, 'users', user.id);
      const userDoc = await getDoc(userRef);
      
      const updateData = {
        organizations: arrayUnion(invitationData.organizationId)
      };

      // If invitation grants sub_account_owner role, store that role for this org
      if (invitationData.role === 'sub_account_owner') {
        updateData[`organizationRoles.${invitationData.organizationId}`] = 'sub_account_owner';
        console.log('👨‍💼 User joining as sub-account owner');
      }
      // Otherwise store as member (default)
      else {
        updateData[`organizationRoles.${invitationData.organizationId}`] = 'member';
      }

      // Store sub-account owner info if joining under someone's sub-account
      if (invitationData.subAccountOwnerId && invitationData.subAccountName) {
        updateData[`subAccountOwners.${invitationData.organizationId}`] = {
          ownerId: invitationData.subAccountOwnerId,
          ownerName: invitationData.subAccountName,
          joinedAt: new Date()
        };
        console.log('📋 Joined under sub-account owner:', invitationData.subAccountName);
      }
      
      if (userDoc.exists()) {
        await updateDoc(userRef, updateData);
      }

      // Mark invitation as used (single-use system)
      await updateDoc(doc(db, 'invitations', invitationDoc.id), {
        usedCount: increment(1),
        lastUsedAt: new Date(),
        status: 'used', // Mark as used to prevent reuse
        usedBy: user.id
      });

      console.log('✅ Invitation marked as used, will generate new one automatically');
      console.log('✅ Successfully joined organization:', organizationData.name);

      const successMessage = invitationData.subAccountName 
        ? `🎉 Successfully joined ${organizationData.name} under ${invitationData.subAccountName}!`
        : `🎉 Successfully joined ${organizationData.name}!`;
      
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
              disabled={loading}
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
