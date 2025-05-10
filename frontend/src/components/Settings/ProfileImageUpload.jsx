import { useState, useRef, useEffect } from 'react';
import { Camera, User } from 'lucide-react';
import { businessService } from '../../api/businessService';
import './ProfileImageUpload.css';

function ProfileImageUpload({ profileImage, onImageUpdate }) {
  const [isUploading, setIsUploading] = useState(false);
  const [tempImage, setTempImage] = useState(null);
  const fileInputRef = useRef(null);

  // Clean up blob URLs
  useEffect(() => {
    return () => {
      if (tempImage) URL.revokeObjectURL(tempImage);
    };
  }, [tempImage]);

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file
    const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a JPEG, PNG, or GIF image');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be smaller than 5MB');
      return;
    }

    try {
      setIsUploading(true);
      
      // Create immediate preview
      const previewUrl = URL.createObjectURL(file);
      setTempImage(previewUrl);

      const formData = new FormData();
      formData.append('profileImage', file);

      const response = await businessService.uploadProfileImage(formData);
      
      // Only update parent when we have confirmation
      if (response.data?.profileImageUrl) {
        onImageUpdate(response.data.profileImageUrl);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      setTempImage(null);
      alert('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="profile-image-upload">
      <div className="profile-image-container">
        {tempImage || profileImage ? (
          <img 
            src={tempImage || profileImage} 
            alt="Profile" 
            className="profile-image"
            onLoad={() => {
              if (tempImage) {
                URL.revokeObjectURL(tempImage);
                setTempImage(null);
              }
            }}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = '/default-business-icon.png';
            }}
          />
        ) : (
          <div className="profile-image-fallback">
            <User size={24} />
          </div>
        )}
        {isUploading && <div className="upload-overlay">Uploading...</div>}
      </div>
      <label className="change-image-btn">
        <Camera size={16} />
        <span>{isUploading ? 'Uploading...' : 'Change Photo'}</span>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          disabled={isUploading}
          style={{ display: 'none' }}
        />
      </label>
    </div>
  );
}

export default ProfileImageUpload;