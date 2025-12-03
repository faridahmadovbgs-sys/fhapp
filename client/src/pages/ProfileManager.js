import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import './ProfileManager.css';

const ProfileManager = () => {
  const { user } = useAuth();
  const { 
    profiles, 
    activeProfile, 
    loading: loadingProfiles, 
    switchProfile,
    setAsDefault,
    refreshProfiles 
  } = useProfile();
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedProfile, setExpandedProfile] = useState(null);

  const [formData, setFormData] = useState({
    profileType: 'personal',
    profileName: '',
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

  const profileTypes = [
    { value: 'personal', label: '👤 Personal', icon: '👤' },
    { value: 'llc', label: '🏢 LLC', icon: '🏢' },
    { value: 'trust', label: '🏛️ Trust', icon: '🏛️' },
    { value: 'corporation', label: '🏭 Corporation', icon: '🏭' },
    { value: 'partnership', label: '🤝 Partnership', icon: '🤝' },
    { value: 'nonprofit', label: '❤️ Non-Profit', icon: '❤️' },
    { value: 'other', label: '📋 Other', icon: '📋' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.id) return;

    try {
      setLoading(true);
      setError('');

      // If this is set as default, unset all other defaults
      if (formData.isDefault) {
        const updatePromises = profiles.map(profile => 
          updateDoc(doc(db, 'userProfiles', profile.id), { isDefault: false })
        );
        await Promise.all(updatePromises);
      }

      const newProfile = {
        userId: user.id,
        userEmail: user.email,
        userName: user.name || user.email.split('@')[0],
        ...formData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'userProfiles'), newProfile);

      setSuccess('Profile added successfully!');
      setShowAddForm(false);
      resetForm();
      await refreshProfiles();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error adding profile:', err);
      setError('Failed to add profile: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSetAsDefault = async (profileId) => {
    try {
      setLoading(true);
      const success = await setAsDefault(profileId);
      if (success) {
        setSuccess('Default profile updated!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('Failed to set default profile');
      }
    } catch (err) {
      console.error('Error setting default:', err);
      setError('Failed to set default profile: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteProfile = async (profileId) => {
    if (!window.confirm('Are you sure you want to delete this profile?')) return;

    try {
      setLoading(true);
      await deleteDoc(doc(db, 'userProfiles', profileId));
      
      setSuccess('Profile deleted successfully!');
      await refreshProfiles();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error deleting profile:', err);
      setError('Failed to delete profile: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      profileType: 'personal',
      profileName: '',
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
  };

  const getProfileIcon = (type) => {
    const profile = profileTypes.find(p => p.value === type);
    return profile ? profile.icon : '📋';
  };

  if (loadingProfiles && profiles.length === 0) {
    return (
      <div className="profile-manager-container">
        <div className="loading">Loading profiles...</div>
      </div>
    );
  }

  return (
    <div className="profile-manager-container">
      <div className="page-header">
        <div>
          <h1>👤 Profile Manager</h1>
          <p>Manage your profiles (Personal, LLC, Trust, etc.)</p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? 'Cancel' : '+ Add Profile'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {showAddForm && (
        <div className="add-profile-form">
          <h3>Add New Profile</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Profile Type *</label>
                <select
                  value={formData.profileType}
                  onChange={(e) => setFormData({ ...formData, profileType: e.target.value })}
                  required
                >
                  {profileTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Profile Name *</label>
                <input
                  type="text"
                  value={formData.profileName}
                  onChange={(e) => setFormData({ ...formData, profileName: e.target.value })}
                  placeholder="e.g., My Personal Account, ABC LLC"
                  required
                />
              </div>
            </div>

            {formData.profileType !== 'personal' && (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label>Entity Name *</label>
                    <input
                      type="text"
                      value={formData.entityName}
                      onChange={(e) => setFormData({ ...formData, entityName: e.target.value })}
                      placeholder="Legal entity name"
                      required={formData.profileType !== 'personal'}
                    />
                  </div>

                  <div className="form-group">
                    <label>EIN / Tax ID</label>
                    <input
                      type="text"
                      value={formData.ein}
                      onChange={(e) => setFormData({ ...formData, ein: e.target.value })}
                      placeholder="XX-XXXXXXX"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="form-row">
              <div className="form-group full-width">
                <label>Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street address"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="City"
                />
              </div>

              <div className="form-group">
                <label>State</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="State"
                />
              </div>

              <div className="form-group">
                <label>ZIP Code</label>
                <input
                  type="text"
                  value={formData.zipCode}
                  onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                  placeholder="ZIP"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(555) 555-5555"
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="profile@example.com"
                />
              </div>
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                />
                Set as default profile
              </label>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Adding...' : 'Add Profile'}
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

      <div className="profiles-section">
        <h2>Your Profiles ({profiles.length})</h2>
        
        {profiles.length === 0 ? (
          <div className="no-profiles">
            <p>📋 No profiles yet. Click "Add Profile" to create your first profile.</p>
          </div>
        ) : (
          <div className="profiles-list">
            {profiles.map((profile) => (
              <div 
                key={profile.id} 
                className={`profile-item ${profile.isDefault ? 'default' : ''} ${activeProfile?.id === profile.id ? 'active' : ''} ${expandedProfile === profile.id ? 'expanded' : ''}`}
              >
                <div 
                  className="profile-item-header"
                  onClick={() => setExpandedProfile(expandedProfile === profile.id ? null : profile.id)}
                >
                  <div className="profile-item-info">
                    <span className="profile-icon-small">{getProfileIcon(profile.profileType)}</span>
                    <div>
                      <h4>{profile.profileName}</h4>
                      <span className="profile-type-small">
                        {profileTypes.find(t => t.value === profile.profileType)?.label || profile.profileType}
                      </span>
                    </div>
                  </div>
                  <div className="profile-item-badges">
                    {profile.isDefault && <span className="badge badge-default">Default</span>}
                    {activeProfile?.id === profile.id && <span className="badge badge-active">Active</span>}
                    <span className="expand-icon">{expandedProfile === profile.id ? '▼' : '▶'}</span>
                  </div>
                </div>

                {expandedProfile === profile.id && (
                  <div className="profile-item-details">
                    {profile.entityName && (
                      <div className="detail-row">
                        <span className="label">Entity:</span>
                        <span className="value">{profile.entityName}</span>
                      </div>
                    )}
                    {profile.ein && (
                      <div className="detail-row">
                        <span className="label">EIN:</span>
                        <span className="value">{profile.ein}</span>
                      </div>
                    )}
                    {profile.address && (
                      <div className="detail-row">
                        <span className="label">Address:</span>
                        <span className="value">
                          {profile.address}
                          {profile.city && `, ${profile.city}`}
                          {profile.state && `, ${profile.state}`}
                          {profile.zipCode && ` ${profile.zipCode}`}
                        </span>
                      </div>
                    )}
                    {profile.phone && (
                      <div className="detail-row">
                        <span className="label">Phone:</span>
                        <span className="value">{profile.phone}</span>
                      </div>
                    )}
                    {profile.email && (
                      <div className="detail-row">
                        <span className="label">Email:</span>
                        <span className="value">{profile.email}</span>
                      </div>
                    )}

                    <div className="profile-item-actions">
                      <button
                        className="btn-small btn-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          switchProfile(profile);
                        }}
                      >
                        Use This Profile
                      </button>
                      {!profile.isDefault && (
                        <button
                          className="btn-small btn-secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetAsDefault(profile.id);
                          }}
                        >
                          Set as Default
                        </button>
                      )}
                      <button
                        className="btn-small btn-danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteProfile(profile.id);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {activeProfile && (
        <div className="active-profile-banner">
          <span className="profile-icon-small">{getProfileIcon(activeProfile.profileType)}</span>
          <div>
            <strong>Currently Using:</strong> {activeProfile.profileName}
            <small> — {activeProfile.entityName || 'Personal Profile'}</small>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileManager;
