import { useState, useEffect } from 'react';
import ProfileImageUpload from './ProfileImageUpload';
import { 
  User, 
  Building, 
  Phone, 
  Mail, 
  Lock, 
  Bell, 
  CreditCard, 
  Users,
  ChevronRight,
  Edit,
  Key,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  CheckCircle,
  Save
} from 'lucide-react';
import { businessService } from '../../api/businessService';
import './Settings.css';

function Settings() {
  // State Management
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Form Data State
  const [formData, setFormData] = useState({
    user: {
      firstName: '',
      lastName: '',
      email: '',
      phone: ''
    },
    business: {
      name: '',
      description: '',
      industry: '',
      size: '',
      contact_email: '',
      contact_phone: '',
      website: ''
    }
  });

  // Notification Settings State
  const [notifications, setNotifications] = useState({
    campaignStart: true,
    campaignEnd: true,
    templateApproved: true,
    templateRejected: true,
    messaging: false,
    marketing: true
  });

  // Business Details State
  const [businessDetails, setBusinessDetails] = useState({
    name: 'Your Business',
    profileImage: null
  });

  // Fetch Initial Data
  useEffect(() => {
    fetchBusinessDetails();
  }, []);

  const fetchBusinessDetails = async () => {
    try {
      setIsLoading(true);
      const response = await businessService.getBusinessDetails();
      
      if (response.success) {
        const { user, business } = response.data;
        
        // Update form data
        setFormData({
          user: {
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            email: user.email || '',
            phone: user.phone || ''
          },
          business: {
            name: business.name || '',
            description: business.description || '',
            industry: business.industry || '',
            size: business.size || '',
            contact_email: business.contact_email || '',
            contact_phone: business.contact_phone || '',
            website: business.website || ''
          }
        });

        // Update business details
        setBusinessDetails({
          name: business.name || 'Your Business',
          profileImage: business.profile_image_url
        });

        setError(null);
      }
    } catch (err) {
      setError('Failed to load business details: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Event Handlers
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setError(null);
    setSuccessMessage('');
  };

  const handleInputChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleProfileImageUpdate = async (newImageUrl) => {
    try {
      setBusinessDetails(prev => ({
        ...prev,
        profileImage: newImageUrl
      }));
      
      // You might want to save this to the backend here
      await businessService.updateBusinessDetails({
        business: {
          ...formData.business,
          profile_image_url: newImageUrl
        }
      });
      
      setSuccessMessage('Profile image updated successfully!');
    } catch (err) {
      setError('Failed to update profile image: ' + err.message);
    }
  };

  const handleSaveChanges = async (section) => {
    try {
        setIsSaving(true);
        setError(null);

        // Log the data being sent
        console.log('Saving changes for section:', section, formData[section]);

        const response = await businessService.updateBusinessDetails({
            [section]: formData[section]
        });

        if (response.success) {
            setSuccessMessage(`${section === 'user' ? 'Profile' : 'Business'} details updated successfully!`);
            
            // Refresh the data after successful update
            await fetchBusinessDetails();
            
            setTimeout(() => setSuccessMessage(''), 3000);
        } else {
            throw new Error(response.message || 'Update failed');
        }
    } catch (err) {
        console.error('Save error:', err);
        setError(`Failed to update ${section} details: ` + (err.message || 'Unknown error'));
    } finally {
        setIsSaving(false);
    }
};


  const toggleNotification = (key) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };
  // Render Content Functions
  const renderProfileSection = () => (
    <div className="settings-content">
      <h3>Profile Settings</h3>
      
      <div className="user-profile-section">
        <ProfileImageUpload 
          profileImage={businessDetails.profileImage}
          onImageUpdate={handleProfileImageUpdate}
        />
        <div className="user-details">
          <h4>{formData.user.firstName} {formData.user.lastName}</h4>
          <p>{formData.user.email}</p>
        </div>
      </div>

      <div className="form-section">
        <h4>Personal Information</h4>
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="firstName">First Name</label>
            <input
              type="text"
              id="firstName"
              value={formData.user.firstName}
              onChange={(e) => handleInputChange('user', 'firstName', e.target.value)}
              placeholder="Enter first name"
            />
          </div>
          <div className="form-field">
            <label htmlFor="lastName">Last Name</label>
            <input
              type="text"
              id="lastName"
              value={formData.user.lastName}
              onChange={(e) => handleInputChange('user', 'lastName', e.target.value)}
              placeholder="Enter last name"
            />
          </div>
        </div>

        <div className="form-field">
          <label htmlFor="email">Email Address</label>
          <input
            type="email"
            id="email"
            value={formData.user.email}
            onChange={(e) => handleInputChange('user', 'email', e.target.value)}
            placeholder="Enter email address"
          />
        </div>

        <div className="form-field">
          <label htmlFor="phone">Phone Number</label>
          <input
            type="tel"
            id="phone"
            value={formData.user.phone}
            onChange={(e) => handleInputChange('user', 'phone', e.target.value)}
            placeholder="Enter phone number"
          />
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleSaveChanges('user')}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <span className="spinner"></span>
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  const renderBusinessSection = () => (
    <div className="settings-content">
      <h3>Business Settings</h3>
      
      <div className="form-section">
        <h4>Business Information</h4>
        <div className="form-field">
          <label htmlFor="businessName">Business Name</label>
          <input
            type="text"
            id="businessName"
            value={formData.business.name}
            onChange={(e) => handleInputChange('business', 'name', e.target.value)}
            placeholder="Enter business name"
          />
        </div>

        <div className="form-field">
          <label htmlFor="businessDescription">Business Description</label>
          <textarea
            id="businessDescription"
            value={formData.business.description}
            onChange={(e) => handleInputChange('business', 'description', e.target.value)}
            placeholder="Enter business description"
            rows="3"
          />
        </div>

        <div className="form-row">
          <div className="form-field">
            <label htmlFor="industry">Industry</label>
            <select
              id="industry"
              value={formData.business.industry}
              onChange={(e) => handleInputChange('business', 'industry', e.target.value)}
            >
              <option value="">Select Industry</option>
              <option value="technology">Technology</option>
              <option value="retail">Retail</option>
              <option value="healthcare">Healthcare</option>
              <option value="finance">Finance</option>
              <option value="education">Education</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="businessSize">Company Size</label>
            <select
              id="businessSize"
              value={formData.business.size}
              onChange={(e) => handleInputChange('business', 'size', e.target.value)}
            >
              <option value="">Select Size</option>
              <option value="1-10">1-10 employees</option>
              <option value="11-50">11-50 employees</option>
              <option value="51-200">51-200 employees</option>
              <option value="201+">201+ employees</option>
            </select>
          </div>
        </div>
      </div>

      <div className="form-section">
        <h4>Contact Information</h4>
        <div className="form-field">
          <label htmlFor="businessEmail">Business Email</label>
          <input
            type="email"
            id="businessEmail"
            value={formData.business.contact_email}
            onChange={(e) => handleInputChange('business', 'contact_email', e.target.value)}
            placeholder="Enter business email"
          />
        </div>

        <div className="form-field">
          <label htmlFor="businessPhone">Business Phone</label>
          <input
            type="tel"
            id="businessPhone"
            value={formData.business.contact_phone}
            onChange={(e) => handleInputChange('business', 'contact_phone', e.target.value)}
            placeholder="Enter business phone"
          />
        </div>

        <div className="form-field">
          <label htmlFor="website">Website</label>
          <input
            type="url"
            id="website"
            value={formData.business.website}
            onChange={(e) => handleInputChange('business', 'website', e.target.value)}
            placeholder="Enter website URL"
          />
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleSaveChanges('business')}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <span className="spinner"></span>
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  const renderSecuritySection = () => (
    <div className="settings-content">
      <h3>Security Settings</h3>
      
      <div className="form-section">
        <h4>Change Password</h4>
        <div className="form-field">
          <label htmlFor="currentPassword">Current Password</label>
          <input type="password" id="currentPassword" />
        </div>
        <div className="form-field">
          <label htmlFor="newPassword">New Password</label>
          <input type="password" id="newPassword" />
        </div>
        <div className="form-field">
          <label htmlFor="confirmPassword">Confirm New Password</label>
          <input type="password" id="confirmPassword" />
        </div>
        <button type="button" className="btn btn-primary">
          <Key size={16} />
          Update Password
        </button>
      </div>
    </div>
  );

  const renderNotificationsSection = () => (
    <div className="settings-content">
      <h3>Notification Settings</h3>
      
      <div className="form-section">
        <h4>Campaign Notifications</h4>
        {renderNotificationOption(
          'campaignStart',
          'Campaign Started',
          'Get notified when your campaign begins sending'
        )}
        {renderNotificationOption(
          'campaignEnd',
          'Campaign Completed',
          'Get notified when your campaign finishes sending'
        )}
      </div>
      
      <div className="form-section">
        <h4>Template Notifications</h4>
        {renderNotificationOption(
          'templateApproved',
          'Template Approved',
          'Get notified when your template is approved'
        )}
        {renderNotificationOption(
          'templateRejected',
          'Template Rejected',
          'Get notified when your template is rejected'
        )}
      </div>
      
      <div className="form-section">
        <h4>Communication Preferences</h4>
        {renderNotificationOption(
          'messaging',
          'Messaging Updates',
          'Get notified about new features and updates'
        )}
        {renderNotificationOption(
          'marketing',
          'Marketing Communications',
          'Receive promotions, special offers, and newsletters'
        )}
      </div>
    </div>
  );

  const renderNotificationOption = (key, title, description) => (
    <div className="notification-option">
      <div className="notification-info">
        <span>{title}</span>
        <p>{description}</p>
      </div>
      <button 
        className="toggle-button" 
        onClick={() => toggleNotification(key)}
      >
        {notifications[key] ? (
          <ToggleRight size={32} className="toggle-on" />
        ) : (
          <ToggleLeft size={32} className="toggle-off" />
        )}
      </button>
    </div>
  );
  // Main content renderer
  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return renderProfileSection();
      case 'business':
        return renderBusinessSection();
      case 'security':
        return renderSecuritySection();
      case 'notifications':
        return renderNotificationsSection();
      default:
        return null;
    }
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="settings-loading">
        <div className="spinner"></div>
        <p>Loading settings...</p>
      </div>
    );
  }

  // Main Render
  return (
    <div className="settings">
      <div className="page-header">
        <h2>Settings</h2>
      </div>
      
      {/* Messages */}
      {error && (
        <div className="message message--error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}
      
      {successMessage && (
        <div className="message message--success">
          <CheckCircle size={16} />
          <span>{successMessage}</span>
        </div>
      )}
      
      <div className="settings-container">
        {/* Sidebar Navigation */}
        <div className="settings-sidebar card">
          <ul className="settings-menu">
            <li className={`settings-menu-item ${activeTab === 'profile' ? 'active' : ''}`}>
              <button onClick={() => handleTabChange('profile')}>
                <span className="menu-icon"><User size={18} /></span>
                <span>Profile</span>
                <ChevronRight size={16} className="menu-chevron" />
              </button>
            </li>
            
            <li className={`settings-menu-item ${activeTab === 'business' ? 'active' : ''}`}>
              <button onClick={() => handleTabChange('business')}>
                <span className="menu-icon"><Building size={18} /></span>
                <span>Business</span>
                <ChevronRight size={16} className="menu-chevron" />
              </button>
            </li>
            
            <li className={`settings-menu-item ${activeTab === 'security' ? 'active' : ''}`}>
              <button onClick={() => handleTabChange('security')}>
                <span className="menu-icon"><Lock size={18} /></span>
                <span>Security</span>
                <ChevronRight size={16} className="menu-chevron" />
              </button>
            </li>
            
            <li className={`settings-menu-item ${activeTab === 'notifications' ? 'active' : ''}`}>
              <button onClick={() => handleTabChange('notifications')}>
                <span className="menu-icon"><Bell size={18} /></span>
                <span>Notifications</span>
                <ChevronRight size={16} className="menu-chevron" />
              </button>
            </li>
          </ul>
        </div>
        
        {/* Main Content Area */}
        <div className="settings-main card">
          {isSaving && (
            <div className="saving-overlay">
              <div className="spinner"></div>
              <span>Saving changes...</span>
            </div>
          )}
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

export default Settings;
