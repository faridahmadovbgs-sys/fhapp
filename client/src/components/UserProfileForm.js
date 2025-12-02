import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
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

      {message && (
        <div className={`message ${message.startsWith('✅') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}
    </div>
  );
};

export default UserProfileForm;
