import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, updateDoc, serverTimestamp, setDoc, collection } from 'firebase/firestore';
import { db } from '../config/firebase';
import ProfilePhotoUploadFree from './ProfilePhotoUploadFree';
import './UserProfileForm.css';

const UserProfileForm = () => {
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [currentPhotoURL, setCurrentPhotoURL] = useState(null);
  const [userRole, setUserRole] = useState('');
  const [subAccountName, setSubAccountName] = useState('');
  const [isEditingSubAccountName, setIsEditingSubAccountName] = useState(false);
  const [originalSubAccountName, setOriginalSubAccountName] = useState('');
  const [showRoleUpgrade, setShowRoleUpgrade] = useState(false);
  const [organizationName, setOrganizationName] = useState('');
  const [ein, setEin] = useState('');
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [userOrganizations, setUserOrganizations] = useState([]);

  // Fetch current user's profile from Firestore
  useEffect(() => {
    const fetchProfile = async () => {
      if (!currentUser || !db) return;

      try {
        setLoading(true);
        const userDoc = await getDoc(doc(db, 'users', currentUser.id));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setCurrentPhotoURL(userData.photoURL || userData.profilePictureUrl || null);
          setUserRole(userData.role || 'user');
          setSubAccountName(userData.subAccountName || '');
          setOriginalSubAccountName(userData.subAccountName || '');
          
          // Fetch organizations user belongs to
          if (userData.organizations && userData.organizations.length > 0) {
            const orgPromises = userData.organizations.map(async (orgId) => {
              try {
                const orgDoc = await getDoc(doc(db, 'organizations', orgId));
                if (orgDoc.exists()) {
                  const orgData = orgDoc.data();
                  // Check if user has sub-account owner for this org
                  const subAccountInfo = userData.subAccountOwners?.[orgId];
                  return {
                    id: orgId,
                    name: orgData.name,
                    isOwner: orgData.ownerId === currentUser.id,
                    subAccountOwner: subAccountInfo ? subAccountInfo.ownerName : null
                  };
                }
              } catch (err) {
                console.error('Error fetching org:', orgId, err);
              }
              return null;
            });
            const orgs = (await Promise.all(orgPromises)).filter(o => o !== null);
            setUserOrganizations(orgs);
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [currentUser]);

  const handlePhotoUploaded = async (photoURL) => {
    if (!currentUser || !db) return;

    try {
      const userRef = doc(db, 'users', currentUser.id);
      await updateDoc(userRef, {
        photoURL: photoURL,
        profilePictureUrl: photoURL, // Also update old field for backwards compatibility
        updatedAt: serverTimestamp()
      });

      setCurrentPhotoURL(photoURL);
      setMessage(photoURL ? '✅ Profile picture updated!' : '✅ Profile picture removed!');
      setTimeout(() => setMessage(''), 3000);
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('profilePhotoUpdated', { detail: { photoURL } }));
      console.log('Profile photo updated event dispatched');
    } catch (error) {
      console.error('Error updating profile picture:', error);
      setMessage('❌ Failed to update profile picture');
    }
  };

  const handleSubAccountNameUpdate = async () => {
    if (!currentUser || !db) return;
    
    if (!subAccountName.trim()) {
      setMessage('❌ Sub Account Name cannot be empty');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    try {
      setLoading(true);
      const userRef = doc(db, 'users', currentUser.id);
      await updateDoc(userRef, {
        subAccountName: subAccountName.trim(),
        updatedAt: serverTimestamp()
      });

      setOriginalSubAccountName(subAccountName.trim());
      setIsEditingSubAccountName(false);
      setMessage('✅ Sub Account Name updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error updating sub account name:', error);
      setMessage('❌ Failed to update Sub Account Name');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setSubAccountName(originalSubAccountName);
    setIsEditingSubAccountName(false);
  };

  const handleRoleUpgrade = async (newRole) => {
    if (!currentUser || !db) return;
    
    // Validate required fields for account owner
    if (newRole === 'account_owner') {
      if (!organizationName.trim()) {
        setMessage('❌ Organization name is required for Account Owner');
        setTimeout(() => setMessage(''), 3000);
        return;
      }
      if (!ein.trim()) {
        setMessage('❌ EIN is required for Account Owner');
        setTimeout(() => setMessage(''), 3000);
        return;
      }
    }
    
    // Validate required fields for sub-account owner
    if (newRole === 'sub_account_owner' && !subAccountName.trim()) {
      setMessage('❌ Sub Account Name is required for Sub Account Owner');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    try {
      setUpgradeLoading(true);
      
      let organizationId = null;

      // Create organization if becoming account owner
      if (newRole === 'account_owner') {
        // Create organization document
        const orgRef = doc(collection(db, 'organizations'));
        organizationId = orgRef.id;
        
        await setDoc(orgRef, {
          name: organizationName.trim(),
          ein: ein.trim(),
          ownerId: currentUser.id,
          ownerEmail: currentUser.email,
          ownerName: currentUser.displayName || currentUser.fullName || currentUser.email,
          members: [currentUser.id],
          memberCount: 1,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          active: true
        });

        console.log('✅ Organization created:', organizationId);
      }

      // Update user document
      const userRef = doc(db, 'users', currentUser.id);
      
      // Get existing user data to preserve organizations array
      const existingUserDoc = await getDoc(userRef);
      const existingData = existingUserDoc.exists() ? existingUserDoc.data() : {};
      const existingOrganizations = existingData.organizations || [];
      
      const updateData = {
        role: newRole,
        updatedAt: serverTimestamp()
      };

      if (newRole === 'account_owner') {
        updateData.organizationName = organizationName.trim();
        updateData.ein = ein.trim();
        updateData.isAccountOwner = true;
        // Add new organization to existing list (avoid duplicates)
        const updatedOrganizations = [...new Set([...existingOrganizations, organizationId])];
        updateData.organizations = updatedOrganizations;
      } else if (newRole === 'sub_account_owner') {
        updateData.subAccountName = subAccountName.trim();
        updateData.isSubAccountOwner = true;
      }

      await updateDoc(userRef, updateData);

      setUserRole(newRole);
      setShowRoleUpgrade(false);
      setMessage(`✅ Successfully upgraded to ${newRole === 'account_owner' ? 'Account Owner' : 'Sub Account Owner'}!${newRole === 'account_owner' ? ' Organization created.' : ''}`);
      setTimeout(() => setMessage(''), 4000);
      
      // Reload page to reflect new permissions
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Error upgrading role:', error);
      setMessage('❌ Failed to upgrade role. Please try again.');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setUpgradeLoading(false);
    }
  };

  if (loading) {
    return <div className="user-profile-form"><p>Loading profile...</p></div>;
  }

  return (
    <div className="user-profile-form">
      <h3>👤 Profile Settings</h3>
      
      <div className="profile-section">
        <h4>Profile Photo</h4>
        <ProfilePhotoUploadFree
          userId={currentUser?.id}
          currentPhotoURL={currentPhotoURL}
          onPhotoUploaded={handlePhotoUploaded}
        />
      </div>

      {/* Role Upgrade Section - Only show for regular users */}
      {userRole !== 'account_owner' && userRole !== 'sub_account_owner' && userRole !== 'admin' && (
        <div className="profile-section" style={{ marginTop: '20px', backgroundColor: '#f0f8ff', padding: '15px', borderRadius: '8px' }}>
          <h4>🎯 Upgrade Your Account</h4>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
            Unlock additional features by becoming an Account Owner or Sub-Account Owner
          </p>
          
          {!showRoleUpgrade ? (
            <button 
              onClick={() => setShowRoleUpgrade(true)}
              style={{
                padding: '10px 20px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#218838'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#28a745'}
            >
              Upgrade Account
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button 
                  onClick={() => {
                    setShowRoleUpgrade(false);
                    setOrganizationName('');
                    setEin('');
                  }}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '13px'
                  }}
                >
                  Cancel
                </button>
              </div>
              
              <div style={{ 
                border: '1px solid #ddd', 
                borderRadius: '8px', 
                padding: '15px',
                backgroundColor: 'white'
              }}>
                <h5 style={{ marginTop: 0 }}>👨‍💼 Upgrade to Account Owner</h5>
                <p style={{ fontSize: '13px', color: '#666' }}>
                  Create and manage your organization, invite members, manage billing, and documents
                </p>
                
                <input
                  type="text"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  placeholder="Organization Name *"
                  style={{
                    padding: '10px',
                    fontSize: '14px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    width: '100%',
                    boxSizing: 'border-box',
                    marginBottom: '10px'
                  }}
                  disabled={upgradeLoading}
                />
                
                <input
                  type="text"
                  value={ein}
                  onChange={(e) => setEin(e.target.value)}
                  placeholder="EIN (Tax ID) *"
                  style={{
                    padding: '10px',
                    fontSize: '14px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    width: '100%',
                    boxSizing: 'border-box',
                    marginBottom: '10px'
                  }}
                  disabled={upgradeLoading}
                />
                
                <button 
                  onClick={() => handleRoleUpgrade('account_owner')}
                  disabled={upgradeLoading || !organizationName.trim() || !ein.trim()}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: upgradeLoading || !organizationName.trim() || !ein.trim() ? '#ccc' : '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: upgradeLoading || !organizationName.trim() || !ein.trim() ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    width: '100%'
                  }}
                >
                  {upgradeLoading ? 'Upgrading...' : 'Become Account Owner'}
                </button>
              </div>
              
              <div style={{ 
                border: '1px solid #ddd', 
                borderRadius: '8px', 
                padding: '15px',
                backgroundColor: 'white'
              }}>
                <h5 style={{ marginTop: 0 }}>👤 Upgrade to Sub-Account Owner</h5>
                <p style={{ fontSize: '13px', color: '#666' }}>
                  Invite and manage members under your sub-account
                </p>
                
                <input
                  type="text"
                  value={subAccountName}
                  onChange={(e) => setSubAccountName(e.target.value)}
                  placeholder="Sub Account Name *"
                  style={{
                    padding: '10px',
                    fontSize: '14px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    width: '100%',
                    boxSizing: 'border-box',
                    marginBottom: '10px'
                  }}
                  disabled={upgradeLoading}
                />
                
                <button 
                  onClick={() => handleRoleUpgrade('sub_account_owner')}
                  disabled={upgradeLoading || !subAccountName.trim()}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: upgradeLoading || !subAccountName.trim() ? '#ccc' : '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: upgradeLoading || !subAccountName.trim() ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    width: '100%'
                  }}
                >
                  {upgradeLoading ? 'Upgrading...' : 'Become Sub-Account Owner'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {userRole === 'sub_account_owner' && (
        <div className="profile-section" style={{ marginTop: '20px' }}>
          <h4>Sub Account Name</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {!isEditingSubAccountName ? (
              <>
                <div style={{ 
                  padding: '12px', 
                  backgroundColor: '#f5f5f5', 
                  borderRadius: '8px',
                  border: '1px solid #ddd'
                }}>
                  <strong>{subAccountName || 'Not set'}</strong>
                </div>
                <button 
                  onClick={() => setIsEditingSubAccountName(true)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#0056b3'}
                  onMouseOut={(e) => e.target.style.backgroundColor = '#007bff'}
                >
                  Edit Sub Account Name
                </button>
              </>
            ) : (
              <>
                <input
                  type="text"
                  value={subAccountName}
                  onChange={(e) => setSubAccountName(e.target.value)}
                  placeholder="Enter your sub account name"
                  style={{
                    padding: '12px',
                    fontSize: '14px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                  disabled={loading}
                />
                <small style={{color: '#666', fontSize: '12px', marginTop: '-5px'}}>
                  This name will be associated with members you invite
                </small>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    onClick={handleSubAccountNameUpdate}
                    disabled={loading || !subAccountName.trim()}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: loading || !subAccountName.trim() ? '#ccc' : '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: loading || !subAccountName.trim() ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      flex: 1
                    }}
                    onMouseOver={(e) => {
                      if (!loading && subAccountName.trim()) {
                        e.target.style.backgroundColor = '#218838';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!loading && subAccountName.trim()) {
                        e.target.style.backgroundColor = '#28a745';
                      }
                    }}
                  >
                    {loading ? 'Saving...' : 'Save'}
                  </button>
                  <button 
                    onClick={handleCancelEdit}
                    disabled={loading}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      flex: 1
                    }}
                    onMouseOver={(e) => {
                      if (!loading) {
                        e.target.style.backgroundColor = '#5a6268';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!loading) {
                        e.target.style.backgroundColor = '#6c757d';
                      }
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Organizations Display Section */}
      {userOrganizations.length > 0 && (
        <div className="profile-section" style={{ marginTop: '20px' }}>
          <h4>🏢 Your Organizations</h4>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
            Organizations you own or are a member of
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {userOrganizations.map((org) => (
              <div 
                key={org.id}
                style={{
                  padding: '15px',
                  backgroundColor: org.isOwner ? '#e8f5e9' : '#f5f5f5',
                  borderRadius: '8px',
                  border: org.isOwner ? '2px solid #4caf50' : '1px solid #ddd',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: '16px' }}>{org.name}</strong>
                  {org.isOwner && (
                    <span style={{
                      backgroundColor: '#4caf50',
                      color: 'white',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      👑 Owner
                    </span>
                  )}
                  {!org.isOwner && (
                    <span style={{
                      backgroundColor: '#2196F3',
                      color: 'white',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      👤 Member
                    </span>
                  )}
                </div>
                {org.subAccountOwner && (
                  <div style={{ fontSize: '13px', color: '#666' }}>
                    <span style={{ fontWeight: '500' }}>Sub-Account: </span>
                    {org.subAccountOwner}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {message && (
        <div className={`message ${message.startsWith('✅') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}
    </div>
  );
};

export default UserProfileForm;
