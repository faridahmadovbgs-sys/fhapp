import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAccount } from '../contexts/AccountContext';
import { useProfile } from '../contexts/ProfileContext';
import { 
  collection, 
  addDoc, 
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  where,
  getDocs,
  getDoc,
  arrayUnion
} from 'firebase/firestore';
import { db } from '../config/firebase';
import './AccountManager.css';

const AccountManager = () => {
  const { user } = useAuth();
  const { 
    accounts, 
    activeAccount, 
    loading: loadingAccounts, 
    switchAccount,
    switchToUserMode,
    setAsDefault,
    refreshAccounts 
  } = useAccount();
  const { refreshProfiles } = useProfile();
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showJoinOrgModal, setShowJoinOrgModal] = useState(false);
  const [selectedProfileForOrg, setSelectedProfileForOrg] = useState(null);
  const [inviteLink, setInviteLink] = useState('');
  const [organizationCounts, setOrganizationCounts] = useState({});

  const [formData, setFormData] = useState({
    accountType: 'person',
    accountName: '',
    personType: 'self',
    entityName: '',
    ein: '',
    taxId: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    email: '',
    isDefault: false
  });

  const accountTypes = [
    { value: 'person', label: 'Person', icon: '👤' },
    { value: 'llc', label: 'LLC', icon: '🏢' },
    { value: 'trust', label: 'Trust', icon: '🏛️' },
    { value: 'corporation', label: 'Corporation', icon: '🏭' },
    { value: 'partnership', label: 'Partnership', icon: '🤝' },
    { value: 'nonprofit', label: 'Non-Profit', icon: '❤️' },
    { value: 'other', label: 'Other', icon: '📋' }
  ];

  const personTypes = [
    { value: 'self', label: 'Self' },
    { value: 'child', label: 'Child' },
    { value: 'spouse', label: 'Spouse/Partner' }
  ];

  // Fetch organization counts for each profile
  useEffect(() => {
    const fetchOrganizationCounts = async () => {
      if (!user?.id) return;

      try {
        const userId = user.id || user.uid;
        const counts = {};

        // Count for primary user profile
        const userOrgQuery = query(
          collection(db, 'organizations'),
          where('members', 'array-contains', userId)
        );
        const userOrgSnapshot = await getDocs(userOrgQuery);
        counts['user'] = userOrgSnapshot.size;

        // Count for each sub profile
        for (const account of accounts) {
          const subProfileOrgQuery = query(
            collection(db, 'organizations'),
            where('members', 'array-contains', account.id)
          );
          const subProfileOrgSnapshot = await getDocs(subProfileOrgQuery);
          counts[account.id] = subProfileOrgSnapshot.size;
        }

        setOrganizationCounts(counts);
      } catch (error) {
        console.error('Error fetching organization counts:', error);
      }
    };

    fetchOrganizationCounts();
  }, [user, accounts]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.id) return;

    try {
      setLoading(true);
      setError('');

      // If this is set as default, unset all other defaults
      if (formData.isDefault) {
        const updatePromises = accounts.map(account => 
          updateDoc(doc(db, 'subProfiles', account.id), { isDefault: false })
        );
        await Promise.all(updatePromises);
      }

      if (editingAccount) {
        // Update existing sub profile
        const profileData = {
          ...formData,
          updatedAt: serverTimestamp()
        };

        await updateDoc(doc(db, 'subProfiles', editingAccount.id), profileData);

        setSuccess('Sub Profile updated successfully!');
        setEditingAccount(null);
        setShowAddForm(false);
        resetForm();
        await refreshAccounts();
        await refreshProfiles();
      } else {
        // Add new sub profile
        const newSubProfile = {
          userId: user.id,
          userEmail: user.email,
          userName: user.name || user.email.split('@')[0],
          ...formData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        await addDoc(collection(db, 'subProfiles'), newSubProfile);

        setSuccess('Sub Profile added successfully!');
        setShowAddForm(false);
        resetForm();
        await refreshAccounts();
        await refreshProfiles();
        console.log('✅ Both AccountContext and ProfileContext refreshed');
      }

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error saving sub profile:', err);
      setError('Failed to save sub profile: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSetAsDefault = async (accountId) => {
    try {
      setLoading(true);
      const success = await setAsDefault(accountId);
      if (success) {
        setSuccess('Default sub profile updated!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('Failed to set default sub profile');
      }
    } catch (err) {
      console.error('Error setting default:', err);
      setError('Failed to set default sub profile: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const editAccount = (account) => {
    setEditingAccount(account);
    setFormData({
      accountType: account.accountType || 'person',
      accountName: account.accountName || '',
      personType: account.personType || 'self',
      entityName: account.entityName || '',
      ein: account.ein || '',
      taxId: account.taxId || '',
      address: account.address || '',
      city: account.city || '',
      state: account.state || '',
      zipCode: account.zipCode || '',
      phone: account.phone || '',
      email: account.email || '',
      isDefault: account.isDefault || false
    });
    setShowAddForm(true);
    setError('');
  };

  const deleteAccount = async (accountId) => {
    if (!window.confirm('Are you sure you want to delete this sub profile?')) return;

    try {
      setLoading(true);
      await deleteDoc(doc(db, 'subProfiles', accountId));
      
      setSuccess('Sub Profile deleted successfully!');
      await refreshAccounts();
      await refreshProfiles();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error deleting sub profile:', err);
      setError('Failed to delete sub profile: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const openJoinOrgModal = (profile) => {
    setSelectedProfileForOrg(profile);
    setShowJoinOrgModal(true);
    setInviteLink('');
    setError('');
  };

  const handleJoinOrganization = async () => {
    if (!inviteLink.trim()) {
      setError('Please enter an invite link');
      return;
    }

    // Extract invitation token from the link
    let invitationToken = '';
    
    if (inviteLink.includes('token=')) {
      // Extract from URL parameter
      const urlParams = new URLSearchParams(inviteLink.split('?')[1]);
      invitationToken = urlParams.get('token');
    } else {
      // If just the token/code was pasted
      const urlParts = inviteLink.split('/');
      invitationToken = urlParts[urlParts.length - 1];
    }

    if (!invitationToken) {
      setError('Invalid invite link format. Please paste the full invitation link.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Determine which profile ID to use
      const profileId = selectedProfileForOrg ? selectedProfileForOrg.id : (user?.id || user?.uid);
      const profileName = selectedProfileForOrg 
        ? selectedProfileForOrg.accountName 
        : (user?.name || user?.displayName || user?.email || 'Primary Profile');

      console.log('🔍 Looking for invitation with token:', invitationToken);
      console.log('👤 Profile joining:', profileName, 'ID:', profileId);

      // Look up the invitation by token
      const invitationsRef = collection(db, 'invitations');
      const q = query(invitationsRef, where('token', '==', invitationToken));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError('Invalid invitation link. Please check the link and try again.');
        setLoading(false);
        return;
      }

      const invitationDoc = querySnapshot.docs[0];
      const invitation = invitationDoc.data();

      console.log('📋 Found invitation:', invitation);

      // Check if invitation is still valid
      if (invitation.status !== 'active') {
        setError('This invitation is no longer active.');
        setLoading(false);
        return;
      }

      // Check expiration
      const expiresAt = invitation.expiresAt?.toDate?.();
      if (expiresAt && expiresAt < new Date()) {
        setError('This invitation has expired.');
        setLoading(false);
        return;
      }

      // Get organization
      const orgRef = doc(db, 'organizations', invitation.organizationId);
      const orgDoc = await getDoc(orgRef);

      if (!orgDoc.exists()) {
        setError('Organization not found.');
        setLoading(false);
        return;
      }

      const orgData = orgDoc.data();
      console.log('🏢 Organization:', orgData.name);

      // Check if profile is already a member
      if (orgData.members?.includes(profileId)) {
        setError(`${profileName} is already a member of ${orgData.name}.`);
        setLoading(false);
        return;
      }

      // Add profile to organization members
      await updateDoc(orgRef, {
        members: arrayUnion(profileId),
        memberCount: (orgData.memberCount || 0) + 1,
        updatedAt: serverTimestamp()
      });

      console.log('✅ Successfully added profile to organization');

      // Update invitation usage
      const usedCount = (invitation.usedCount || 0) + 1;
      const updateData = {
        usedCount: usedCount,
        lastUsedAt: serverTimestamp(),
        lastUsedBy: profileId
      };

      // If single-use invitation (maxUses = 1), mark as inactive
      if (invitation.maxUses === 1) {
        updateData.status = 'used';
      }

      await updateDoc(doc(db, 'invitations', invitationDoc.id), updateData);

      setSuccess(`${profileName} successfully joined ${orgData.name}!`);
      setShowJoinOrgModal(false);
      setInviteLink('');
      setSelectedProfileForOrg(null);

      // Refresh the organization counts
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      console.error('❌ Error joining organization:', err);
      setError('Failed to join organization: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      accountType: 'person',
      accountName: '',
      personType: 'self',
      entityName: '',
      ein: '',
      taxId: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      phone: '',
      email: '',
      isDefault: false
    });
    setEditingAccount(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const getAccountIcon = (type) => {
    const account = accountTypes.find(a => a.value === type);
    return account ? account.icon : '📋';
  };

  if (loadingAccounts && accounts.length === 0) {
    return (
      <div className="account-manager-container">
        <div className="loading">Loading sub profiles...</div>
      </div>
    );
  }

  return (
    <div className="account-manager-container">
      <div className="page-header">
        <div>
          <h1>My Sub Profiles</h1>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => setShowAddForm(!showAddForm)}
          disabled={loading}
        >
          {showAddForm ? 'Cancel' : '+ Add Sub Profile'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {/* Active Sub Profile Summary */}
      {activeAccount && !showAddForm && (
        <div className="active-account-summary">
          <div className="active-badge">Currently Active</div>
          <div className="active-account-details">
            <span className="active-icon">{getAccountIcon(activeAccount.accountType)}</span>
            <div>
              <h3>{activeAccount.accountName}</h3>
              <p>{activeAccount.entityName || accountTypes.find(t => t.value === activeAccount.accountType)?.label}</p>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Sub Profile Form */}
        {showAddForm && (
        <div className="add-account-form">
          <h3>{editingAccount ? 'Edit Sub Profile' : 'Add New Sub Profile'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Profile Type *</label>
              <select
                name="accountType"
                value={formData.accountType}
                onChange={handleChange}
                required
              >
                {accountTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Person Type dropdown - only show when accountType is 'person' */}
            {formData.accountType === 'person' && (
              <div className="form-group">
                <label>Person Type *</label>
                <select
                  name="personType"
                  value={formData.personType}
                  onChange={handleChange}
                  required
                >
                  {personTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group">
              <label>Profile Name *</label>
              <input
                type="text"
                name="accountName"
                value={formData.accountName}
                onChange={handleChange}
                placeholder="e.g., Personal, My Business LLC"
                required
              />
            </div>

            <div className="form-group">
              <label>Entity/Business Name</label>
              <input
                type="text"
                name="entityName"
                value={formData.entityName}
                onChange={handleChange}
                placeholder="Official entity name (if applicable)"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>EIN</label>
                <input
                  type="text"
                  name="ein"
                  value={formData.ein}
                  onChange={handleChange}
                  placeholder="XX-XXXXXXX"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Address</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Street address"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label>State</label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="e.g., CA"
                  maxLength="2"
                />
              </div>
              <div className="form-group">
                <label>Zip Code</label>
                <input
                  type="text"
                  name="zipCode"
                  value={formData.zipCode}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="(123) 456-7890"
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="account@example.com"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="isDefault"
                  checked={formData.isDefault}
                  onChange={handleChange}
                />
                <span>Set as default sub profile</span>
              </label>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? (editingAccount ? 'Updating...' : 'Adding...') : (editingAccount ? 'Update Sub Profile' : 'Add Sub Profile')}
              </button>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => {
                  setShowAddForm(false);
                  resetForm();
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sub Profiles List */}
      <div className="accounts-section">
        <h2>Primary Profile & Sub-Profiles</h2>
        
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Sub Profile Name</th>
                <th>Type</th>
                <th>Entity Name</th>
                <th>EIN/Tax ID</th>
                <th>Contact</th>
                <th>Organizations</th>
                <th>Status</th>
                <th>Join Org</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* Primary User Profile Row (Always Default) */}
              <tr className={!activeAccount ? 'active-row' : ''} style={{backgroundColor: '#f8f9fa'}}>
                <td>
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <span style={{fontSize: '1.2rem'}}>👤</span>
                    <strong>{user?.name || user?.displayName || user?.email || 'You'}</strong>
                    <span style={{marginLeft: '8px', fontSize: '0.75rem', padding: '2px 6px', backgroundColor: '#007bff', color: 'white', borderRadius: '4px', fontWeight: 'bold'}}>PRIMARY</span>
                  </div>
                </td>
                <td>Personal Account</td>
                <td>-</td>
                <td>-</td>
                <td>
                  <div style={{fontSize: '0.85rem'}}>
                    {user?.email && <div>✉️ {user.email}</div>}
                  </div>
                </td>
                <td>
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <span style={{fontSize: '1.2rem'}}>🏢</span>
                    <strong>{organizationCounts['user'] || 0}</strong>
                  </div>
                </td>
                <td>
                  <span className="badge badge-success">✓ Default</span>
                  {!activeAccount && (
                    <span className="badge badge-info" style={{marginLeft: '4px'}}>Active</span>
                  )}
                </td>
                <td>
                  <button
                    className="btn-small btn-success"
                    onClick={() => openJoinOrgModal(null)}
                    title="Join Organization as Primary Profile"
                  >
                    Join Org
                  </button>
                </td>
                <td>
                  {activeAccount && (
                    <button
                      className="btn-small btn-primary"
                      onClick={switchToUserMode}
                      title="Switch to Primary Profile"
                    >
                      Switch to Primary
                    </button>
                  )}
                </td>
              </tr>
              
              {/* Sub Profiles from Database */}
              {accounts.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{textAlign: 'center', padding: '2rem', color: '#666'}}>
                    <div className="empty-state-inline">
                      <p><strong>No sub-profiles created yet.</strong></p>
                      <p style={{fontSize: '0.9rem', marginTop: '0.5rem'}}>Click "Add Sub Profile" to create additional profiles for LLCs, Trusts, or other entities.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                accounts.map((account) => (
                  <tr 
                    key={account.id}
                    className={activeAccount?.id === account.id ? 'active-row' : ''}
                  >
                    <td>
                      <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                        <span style={{fontSize: '1.2rem'}}>
                          {getAccountIcon(account.accountType)}
                        </span>
                        <strong>{account.accountName}</strong>
                      </div>
                    </td>
                    <td>
                      {accountTypes.find(t => t.value === account.accountType)?.label || account.accountType}
                    </td>
                    <td>{account.entityName || '-'}</td>
                    <td>{account.ein || account.taxId || '-'}</td>
                    <td>
                      <div style={{fontSize: '0.85rem'}}>
                        {account.phone && <div>📞 {account.phone}</div>}
                        {account.email && <div>✉️ {account.email}</div>}
                        {!account.phone && !account.email && '-'}
                      </div>
                    </td>
                    <td>
                      <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                        <span style={{fontSize: '1.2rem'}}>🏢</span>
                        <strong>{organizationCounts[account.id] || 0}</strong>
                      </div>
                    </td>
                    <td>
                      {account.isDefault ? (
                        <span className="badge badge-success">✓ Default</span>
                      ) : activeAccount?.id === account.id ? (
                        <span className="badge badge-info">Active</span>
                      ) : (
                        <span className="badge badge-secondary">Inactive</span>
                      )}
                    </td>
                    <td>
                      <button
                        className="btn-small btn-success"
                        onClick={() => openJoinOrgModal(account)}
                        title="Join Organization"
                      >
                        Join Org
                      </button>
                    </td>
                    <td>
                      <div style={{display: 'flex', gap: '8px'}}>
                        {!account.isDefault && (
                          <button
                            className="btn-small btn-primary"
                            onClick={() => handleSetAsDefault(account.id)}
                            title="Set as Default"
                          >
                            Set Default
                          </button>
                        )}
                        <button
                          className="btn-icon btn-secondary"
                          onClick={() => editAccount(account)}
                          title="Edit Sub Profile"
                        >
                          📝
                        </button>
                        <button
                          className="btn-icon btn-danger"
                          onClick={() => deleteAccount(account.id)}
                          title="Delete Sub Profile"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Join Organization Modal */}
      {showJoinOrgModal && (
        <div className="modal-overlay" onClick={() => setShowJoinOrgModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Join Organization</h2>
              <button 
                className="modal-close" 
                onClick={() => setShowJoinOrgModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p className="modal-description">
                Join an organization as:{' '}
                <strong>
                  {selectedProfileForOrg 
                    ? selectedProfileForOrg.accountName 
                    : `${user?.name || user?.displayName || user?.email || 'Primary Profile'} (Primary)`
                  }
                </strong>
              </p>
              
              <div className="form-group">
                <label>Organization Invite Link *</label>
                <input
                  type="text"
                  value={inviteLink}
                  onChange={(e) => setInviteLink(e.target.value)}
                  placeholder="Paste the invite link here"
                  className="modal-input"
                  autoFocus
                />
                <small className="form-help">
                  Paste the invitation link provided by the organization owner
                </small>
              </div>

              {error && (
                <div className="error-message" style={{ marginTop: '1rem' }}>
                  {error}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowJoinOrgModal(false)}
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleJoinOrganization}
                disabled={loading || !inviteLink.trim()}
              >
                {loading ? 'Joining...' : 'Join Organization'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountManager;
