import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import ProfilePhotoUpload from './ProfilePhotoUpload';
import './UserProfileForm.css';

const UserProfileForm = () => {
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [currentPhotoURL, setCurrentPhotoURL] = useState(null);

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
    } catch (error) {
      console.error('Error updating profile picture:', error);
      setMessage('❌ Failed to update profile picture');
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
        <ProfilePhotoUpload
          userId={currentUser?.id}
          currentPhotoURL={currentPhotoURL}
          onPhotoUploaded={handlePhotoUploaded}
        />
      </div>

      {message && (
        <div className={`message ${message.startsWith('✅') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}
    </div>
  );
};

export default UserProfileForm;
