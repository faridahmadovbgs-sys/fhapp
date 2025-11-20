import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import './UserProfileForm.css';

const UserProfileForm = () => {
  const { user: currentUser } = useAuth();
  const [profilePicture, setProfilePicture] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [currentProfilePic, setCurrentProfilePic] = useState(null);

  // Fetch current user's profile picture from Firestore
  useEffect(() => {
    const fetchProfile = async () => {
      if (!currentUser || !db) return;

      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.id));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.profilePictureUrl) {
            setCurrentProfilePic(userData.profilePictureUrl);
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };

    fetchProfile();
  }, [currentUser]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setMessage('Please select a valid image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setMessage('File size must be less than 5MB');
        return;
      }

      setProfilePicture(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewUrl(event.target.result);
      };
      reader.readAsDataURL(file);
      
      setMessage('');
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    
    console.log('🚀 Upload started', { 
      hasProfilePicture: !!profilePicture, 
      hasCurrentUser: !!currentUser, 
      hasStorage: !!storage, 
      hasDb: !!db,
      userId: currentUser?.id 
    });

    if (!profilePicture || !currentUser || !storage || !db) {
      setMessage('Please select an image to upload');
      console.warn('⚠️ Upload validation failed:', { 
        hasProfilePicture: !!profilePicture, 
        hasCurrentUser: !!currentUser, 
        hasStorage: !!storage, 
        hasDb: !!db 
      });
      return;
    }

    setLoading(true);
    try {
      // Create a unique filename
      const timestamp = Date.now();
      const filename = `profile-${currentUser.id}-${timestamp}`;
      const storageRef = ref(storage, `profile-pictures/${filename}`);
      console.log('📝 Storage ref created:', filename);

      // Upload to Firebase Storage
      console.log('📤 Uploading file to Firebase Storage...');
      await uploadBytes(storageRef, profilePicture);
      console.log('✅ File uploaded, getting download URL...');
      
      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      console.log('✅ Download URL obtained:', downloadURL);

      // Update user document in Firestore
      console.log('📝 Updating Firestore user document...');
      const userRef = doc(db, 'users', currentUser.id);
      await updateDoc(userRef, {
        profilePictureUrl: downloadURL,
        updatedAt: serverTimestamp()
      });
      console.log('✅ Firestore updated');

      // Update local state
      setCurrentProfilePic(downloadURL);
      setProfilePicture(null);
      setPreviewUrl(null);
      setMessage('✅ Profile picture uploaded successfully!');
      
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      console.error('Error details:', { 
        code: error.code, 
        message: error.message,
        name: error.name 
      });
      
      let errorMessage = error.message;
      if (error.message.includes('CORS') || error.message.includes('ERR_FAILED')) {
        errorMessage = 'Upload failed due to Firebase Storage CORS configuration. See FIREBASE_STORAGE_CORS_FIX.md';
      } else if (error.code === 'storage/unauthorized') {
        errorMessage = 'Not authorized to upload. Check Firebase Storage Security Rules.';
      } else if (error.code === 'storage/unauthenticated') {
        errorMessage = 'Please log in first to upload a profile picture.';
      }
      
      setMessage('❌ Failed to upload profile picture: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!currentUser || !db) return;

    try {
      setLoading(true);
      const userRef = doc(db, 'users', currentUser.id);
      await updateDoc(userRef, {
        profilePictureUrl: null,
        updatedAt: serverTimestamp()
      });

      setCurrentProfilePic(null);
      setProfilePicture(null);
      setPreviewUrl(null);
      setMessage('✅ Profile picture removed');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error removing profile picture:', error);
      setMessage('❌ Failed to remove profile picture');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="user-profile-form">
      <h3>Profile Picture</h3>
      
      <div className="profile-pic-container">
        <div className="current-picture">
          {currentProfilePic ? (
            <>
              <img src={currentProfilePic} alt="Current profile" className="profile-image" />
              <p className="picture-label">Current Profile Picture</p>
            </>
          ) : (
            <>
              <div className="no-picture">
                {currentUser?.name?.charAt(0).toUpperCase() || '?'}
              </div>
              <p className="picture-label">No profile picture yet</p>
            </>
          )}
        </div>

        {previewUrl && (
          <div className="preview-picture">
            <img src={previewUrl} alt="Preview" className="profile-image" />
            <p className="picture-label">Preview</p>
          </div>
        )}
      </div>

      <form onSubmit={handleUpload} className="upload-form">
        <div className="form-group">
          <label htmlFor="profile-pic-input" className="file-input-label">
            Choose Image (JPG, PNG, GIF - Max 5MB)
          </label>
          <input
            id="profile-pic-input"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={loading}
            className="file-input"
          />
        </div>

        <div className="button-group">
          <button 
            type="submit" 
            disabled={!profilePicture || loading}
            className="btn btn-primary"
          >
            {loading ? 'Uploading...' : 'Upload Picture'}
          </button>
          
          {currentProfilePic && (
            <button 
              type="button" 
              onClick={handleRemove}
              disabled={loading}
              className="btn btn-danger"
            >
              Remove Picture
            </button>
          )}
        </div>
      </form>

      {message && (
        <div className={`message ${message.startsWith('✅') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}
    </div>
  );
};

export default UserProfileForm;
