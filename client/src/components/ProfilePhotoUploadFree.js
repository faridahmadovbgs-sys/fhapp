import React, { useState, useRef } from 'react';
import './ProfilePhotoUpload.css';

/**
 * Profile Photo Upload - FREE VERSION
 * Stores compressed images as base64 strings in Firestore
 * No Firebase Storage required - completely free!
 * 
 * Max size: ~100KB per image (fits within Firestore 1MB document limit)
 */
const ProfilePhotoUploadFree = ({ userId, currentPhotoURL, onPhotoUploaded }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(currentPhotoURL || null);
  const fileInputRef = useRef(null);

  const compressImageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 150; // Smaller for base64 storage
          
          let width = img.width;
          let height = img.height;
          
          // Calculate new dimensions (keep square ratio)
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
          
          // Try different quality levels to keep size small
          let quality = 0.7;
          let base64String = canvas.toDataURL('image/jpeg', quality);
          
          // If still too large, reduce quality further
          while (base64String.length > 100000 && quality > 0.1) {
            quality -= 0.1;
            base64String = canvas.toDataURL('image/jpeg', quality);
          }
          
          console.log('📦 Compressed image size:', Math.round(base64String.length / 1024), 'KB');
          
          if (base64String.length > 150000) {
            reject(new Error('Image too large even after compression. Try a smaller image.'));
          } else {
            resolve(base64String);
          }
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

      console.log('🔄 Starting upload process (FREE version - no storage needed)...');
      
      // Compress image to base64
      console.log('📦 Compressing image to base64...');
      const base64String = await compressImageToBase64(file);
      console.log('✅ Image compressed to base64 string');
      
      // Set preview
      setPreview(base64String);

      // Call parent callback with base64 string
      if (onPhotoUploaded) {
        console.log('💾 Saving to Firestore...');
        await onPhotoUploaded(base64String);
        console.log('✅ Photo saved successfully (stored in Firestore)!');
      }

      setUploading(false);
    } catch (error) {
      console.error('❌ Error uploading photo:', error);
      
      let errorMessage = 'Failed to upload photo. ';
      if (error.message.includes('too large')) {
        errorMessage += 'Image is too large even after compression. Try a smaller image or crop it first.';
      } else {
        errorMessage += error.message || 'Please try again.';
      }
      
      setError(errorMessage);
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
          {uploading ? 'Processing...' : preview ? 'Change Photo' : 'Upload Photo'}
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
        ✅ FREE - No storage costs • Max size: 5MB • Auto-resized to 150x150px
      </div>
    </div>
  );
};

export default ProfilePhotoUploadFree;
