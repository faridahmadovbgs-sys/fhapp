import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { collection, addDoc, query, where, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';

const InvitationManager = () => {
  const { user } = useAuth();
  const { hasActionPermission } = usePermissions();
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'user',
    message: ''
  });
  const [status, setStatus] = useState('');

  // Check if user can manage invitations
  const canManageInvitations = hasActionPermission('manage_invitations');

  useEffect(() => {
    if (canManageInvitations) {
      fetchInvitations();
    }
  }, [canManageInvitations]);

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      const userId = user.uid || user.id;
      const q = query(
        collection(db, 'invitations'), 
        where('invitedBy', '==', userId)
      );
      const querySnapshot = await getDocs(q);
      const inviteList = [];
      querySnapshot.forEach((doc) => {
        inviteList.push({ id: doc.id, ...doc.data() });
      });
      setInvitations(inviteList);
    } catch (error) {
      console.error('Error fetching invitations:', error);
      setStatus('❌ Error loading invitations');
    } finally {
      setLoading(false);
    }
  };

  const generateInviteToken = () => {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  };

  const sendInvitation = async (e) => {
    e.preventDefault();
    if (!inviteForm.email.trim()) {
      setStatus('❌ Email is required');
      return;
    }

    setLoading(true);
    try {
      const userId = user.uid || user.id;
      const inviteToken = generateInviteToken();
      const inviteData = {
        email: inviteForm.email.toLowerCase(),
        role: inviteForm.role,
        message: inviteForm.message,
        token: inviteToken,
        invitedBy: userId,
        invitedByName: user.name || user.email,
        organizationName: user.organizationName || 'Your Organization',
        status: 'pending',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      };

      await addDoc(collection(db, 'invitations'), inviteData);
      
      // In a real app, you'd send an email here with the invite link
      const inviteLink = `${window.location.origin}/register/member?token=${inviteToken}`;
      console.log('Invitation sent! Link:', inviteLink);
      
      setStatus(`✅ Invitation sent to ${inviteForm.email}`);
      setInviteForm({ email: '', role: 'user', message: '' });
      fetchInvitations();

    } catch (error) {
      console.error('Error sending invitation:', error);
      setStatus('❌ Error sending invitation');
    } finally {
      setLoading(false);
    }
  };

  const revokeInvitation = async (inviteId) => {
    try {
      await deleteDoc(doc(db, 'invitations', inviteId));
      setStatus('✅ Invitation revoked');
      fetchInvitations();
    } catch (error) {
      console.error('Error revoking invitation:', error);
      setStatus('❌ Error revoking invitation');
    }
  };

  const resendInvitation = async (invite) => {
    try {
      const newToken = generateInviteToken();
      await updateDoc(doc(db, 'invitations', invite.id), {
        token: newToken,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      const inviteLink = `${window.location.origin}/register/member?token=${newToken}`;
      console.log('New invitation link:', inviteLink);
      setStatus(`✅ New invitation sent to ${invite.email}`);
      fetchInvitations();
    } catch (error) {
      console.error('Error resending invitation:', error);
      setStatus('❌ Error resending invitation');
    }
  };

  if (!canManageInvitations) {
    return (
      <div className="permission-denied">
        <h3>Access Denied</h3>
        <p>You don't have permission to manage invitations.</p>
      </div>
    );
  }

  return (
    <div className="invitation-manager">
      <h2>Team Invitations</h2>
      <p>Invite team members to join your organization</p>

      {status && (
        <div className={`status-message ${status.includes('✅') ? 'success' : 'error'}`}>
          {status}
        </div>
      )}

      {/* Invite Form */}
      <div className="invite-form-section">
        <h3>Send New Invitation</h3>
        <form onSubmit={sendInvitation} className="invite-form">
          <div className="form-row">
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({...inviteForm, email: e.target.value})}
                placeholder="colleague@company.com"
                required
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label>Role</label>
              <select
                value={inviteForm.role}
                onChange={(e) => setInviteForm({...inviteForm, role: e.target.value})}
                disabled={loading}
              >
                <option value="user">User</option>
                <option value="moderator">Moderator</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          
          <div className="form-group">
            <label>Personal Message (Optional)</label>
            <textarea
              value={inviteForm.message}
              onChange={(e) => setInviteForm({...inviteForm, message: e.target.value})}
              placeholder="Welcome to our team! We're excited to have you join us."
              rows="3"
              disabled={loading}
            />
          </div>
          
          <button type="submit" disabled={loading} className="invite-button">
            {loading ? 'Sending...' : 'Send Invitation'}
          </button>
        </form>
      </div>

      {/* Invitations List */}
      <div className="invitations-list">
        <h3>Sent Invitations ({invitations.length})</h3>
        
        {loading ? (
          <p>Loading invitations...</p>
        ) : invitations.length === 0 ? (
          <p>No invitations sent yet.</p>
        ) : (
          <div className="invitations-table">
            {invitations.map((invite) => (
              <div key={invite.id} className="invitation-row">
                <div className="invite-info">
                  <div className="invite-email">{invite.email}</div>
                  <div className="invite-details">
                    <span className="invite-role">{invite.role}</span>
                    <span className="invite-date">
                      Sent: {new Date(invite.createdAt.seconds * 1000).toLocaleDateString()}
                    </span>
                    <span className={`invite-status ${invite.status}`}>
                      {invite.status}
                    </span>
                  </div>
                  {invite.message && (
                    <div className="invite-message">"{invite.message}"</div>
                  )}
                </div>
                
                <div className="invite-actions">
                  {invite.status === 'pending' && (
                    <>
                      <button 
                        onClick={() => resendInvitation(invite)}
                        className="action-button resend"
                      >
                        Resend
                      </button>
                      <button 
                        onClick={() => {
                          const inviteLink = `${window.location.origin}/register/member?token=${invite.token}`;
                          navigator.clipboard.writeText(inviteLink);
                          setStatus('✅ Invite link copied to clipboard');
                        }}
                        className="action-button copy"
                      >
                        Copy Link
                      </button>
                    </>
                  )}
                  <button 
                    onClick={() => revokeInvitation(invite.id)}
                    className="action-button revoke"
                  >
                    {invite.status === 'accepted' ? 'Remove' : 'Revoke'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .invitation-manager {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        
        .status-message {
          padding: 10px;
          border-radius: 4px;
          margin: 15px 0;
        }
        
        .status-message.success {
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }
        
        .status-message.error {
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }
        
        .invite-form-section {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        
        .form-row {
          display: flex;
          gap: 20px;
        }
        
        .form-group {
          flex: 1;
          margin-bottom: 15px;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: bold;
        }
        
        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        
        .invite-button {
          background: #007bff;
          color: white;
          padding: 12px 24px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .invite-button:disabled {
          background: #6c757d;
          cursor: not-allowed;
        }
        
        .invitation-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px;
          border: 1px solid #ddd;
          border-radius: 4px;
          margin-bottom: 10px;
        }
        
        .invite-email {
          font-weight: bold;
          font-size: 16px;
        }
        
        .invite-details {
          display: flex;
          gap: 15px;
          margin: 5px 0;
          font-size: 14px;
          color: #666;
        }
        
        .invite-role {
          background: #e9ecef;
          padding: 2px 8px;
          border-radius: 12px;
          text-transform: capitalize;
        }
        
        .invite-status.pending {
          color: #ffc107;
        }
        
        .invite-status.accepted {
          color: #28a745;
        }
        
        .invite-message {
          font-style: italic;
          color: #666;
          margin-top: 5px;
        }
        
        .invite-actions {
          display: flex;
          gap: 8px;
        }
        
        .action-button {
          padding: 6px 12px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        }
        
        .action-button.resend {
          background: #17a2b8;
          color: white;
        }
        
        .action-button.copy {
          background: #6f42c1;
          color: white;
        }
        
        .action-button.revoke {
          background: #dc3545;
          color: white;
        }
      `}</style>
    </div>
  );
};

export default InvitationManager;