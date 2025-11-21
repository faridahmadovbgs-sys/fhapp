import React, { useState, useRef } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';
import './ProfilePhotoUpload.css';

const ProfilePhotoUpload = ({ userId, currentPhotoURL, onPhotoUploaded }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(currentPhotoURL || null);
  const fileInputRef = useRef(null);

  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 200;
          
          let width = img.width;
          let height = img.height;
          
          // Calculate new dimensions
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to blob with quality compression
          canvas.toBlob(
            (blob) => {
              if (blob.size > 500000) { // 500KB limit
                // Further reduce quality if still too large
                canvas.toBlob(
                  (smallerBlob) => resolve(smallerBlob),
                  'image/jpeg',
                  0.6
                );
              } else {
                resolve(blob);
              }
            },
            'image/jpeg',
            0.8
          );
        };
        
        img.onerror = () => reject(new Error('Failed to load image'));
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
    });
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB before compression)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }

    try {
      setUploading(true);
      setError('');

      // Compress image
      const compressedBlob = await compressImage(file);
      
      // Create preview
      const previewURL = URL.createObjectURL(compressedBlob);
      setPreview(previewURL);

      // Upload to Firebase Storage
      const storageRef = ref(storage, `profile-photos/${userId}/${Date.now()}.jpg`);
      await uploadBytes(storageRef, compressedBlob);
      
      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      
      // Call parent callback
      if (onPhotoUploaded) {
        await onPhotoUploaded(downloadURL);
      }

      setUploading(false);
    } catch (error) {
      console.error('Error uploading photo:', error);
      setError('Failed to upload photo. Please try again.');
      setUploading(false);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemovePhoto = async () => {
    if (onPhotoUploaded) {
      await onPhotoUploaded(null);
      setPreview(null);
    }
  };

  return (
    <div className="profile-photo-upload">
      <div className="photo-preview-container">
        {preview ? (
          <img src={preview} alt="Profile" className="photo-preview" />
        ) : (
          <div className="photo-placeholder">
            <span>📷</span>
          </div>
        )}
      </div>
      
      <div className="photo-actions">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        
        <button
          type="button"
          onClick={handleClick}
          disabled={uploading}
          className="btn-upload-photo"
        >
          {uploading ? 'Uploading...' : preview ? 'Change Photo' : 'Upload Photo'}
        </button>
        
        {preview && !uploading && (
          <button
            type="button"
            onClick={handleRemovePhoto}
            className="btn-remove-photo"
          >
            Remove
          </button>
        )}
      </div>
      
      {error && <div className="upload-error">{error}</div>}
      
      <div className="upload-info">
        Max size: 5MB • Will be resized to 200x200px
      </div>
    </div>
  );
};

export default ProfilePhotoUpload;
