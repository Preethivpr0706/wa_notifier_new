import { useState } from 'react';
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
  ToggleRight
} from 'lucide-react';
import './Settings.css';

function Settings() {
  const [activeTab, setActiveTab] = useState('profile');
  const [notifications, setNotifications] = useState({
    campaignStart: true,
    campaignEnd: true,
    templateApproved: true,
    templateRejected: true,
    messaging: false,
    marketing: true
  });
  
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };
  
  const toggleNotification = (key) => {
    setNotifications({
      ...notifications,
      [key]: !notifications[key]
    });
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="settings-content">
            <h3>Profile Settings</h3>
            <div className="user-profile-section">
              <div className="user-avatar-large">
                <User size={40} />
              </div>
              <div className="user-details">
                <h4>John Doe</h4>
                <p>john.doe@example.com</p>
                <button className="btn btn-secondary change-avatar-btn">Change Photo</button>
              </div>
            </div>
            
            <div className="form-section">
              <h4>Personal Information</h4>
              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="firstName">First Name</label>
                  <input type="text" id="firstName" name="firstName" defaultValue="John" />
                </div>
                <div className="form-field">
                  <label htmlFor="lastName">Last Name</label>
                  <input type="text" id="lastName" name="lastName" defaultValue="Doe" />
                </div>
              </div>
              <div className="form-field">
                <label htmlFor="email">Email Address</label>
                <input type="email" id="email" name="email" defaultValue="john.doe@example.com" />
              </div>
              <div className="form-field">
                <label htmlFor="phone">Phone Number</label>
                <input type="tel" id="phone" name="phone" defaultValue="+1 (555) 123-4567" />
              </div>
            </div>
            
            <div className="form-actions">
              <button type="button" className="btn btn-primary">Save Changes</button>
            </div>
          </div>
        );
      
      case 'business':
        return (
          <div className="settings-content">
            <h3>Business Settings</h3>
            
            <div className="form-section">
              <h4>Business Information</h4>
              <div className="form-field">
                <label htmlFor="businessName">Business Name</label>
                <input type="text" id="businessName" name="businessName" defaultValue="Acme Inc." />
              </div>
              <div className="form-field">
                <label htmlFor="businessDescription">Business Description</label>
                <textarea 
                  id="businessDescription" 
                  name="businessDescription" 
                  defaultValue="Acme Inc. is a leading provider of innovative solutions for businesses of all sizes."
                  rows="3"
                ></textarea>
              </div>
              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="industry">Industry</label>
                  <select id="industry" name="industry" defaultValue="technology">
                    <option value="technology">Technology</option>
                    <option value="retail">Retail</option>
                    <option value="healthcare">Healthcare</option>
                    <option value="finance">Finance</option>
                  </select>
                </div>
                <div className="form-field">
                  <label htmlFor="businessSize">Company Size</label>
                  <select id="businessSize" name="businessSize" defaultValue="medium">
                    <option value="small">1-10 employees</option>
                    <option value="medium">11-50 employees</option>
                    <option value="large">51-200 employees</option>
                    <option value="enterprise">201+ employees</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="form-section">
              <h4>Contact Information</h4>
              <div className="form-field">
                <label htmlFor="businessEmail">Business Email</label>
                <input type="email" id="businessEmail" name="businessEmail" defaultValue="contact@acmeinc.com" />
              </div>
              <div className="form-field">
                <label htmlFor="businessPhone">Business Phone</label>
                <input type="tel" id="businessPhone" name="businessPhone" defaultValue="+1 (555) 987-6543" />
              </div>
              <div className="form-field">
                <label htmlFor="website">Website</label>
                <input type="url" id="website" name="website" defaultValue="https://acmeinc.com" />
              </div>
            </div>
            
            <div className="form-actions">
              <button type="button" className="btn btn-primary">Save Changes</button>
            </div>
          </div>
        );
      
      case 'security':
        return (
          <div className="settings-content">
            <h3>Security Settings</h3>
            
            <div className="form-section">
              <h4>Change Password</h4>
              <div className="form-field">
                <label htmlFor="currentPassword">Current Password</label>
                <input type="password" id="currentPassword" name="currentPassword" />
              </div>
              <div className="form-field">
                <label htmlFor="newPassword">New Password</label>
                <input type="password" id="newPassword" name="newPassword" />
              </div>
              <div className="form-field">
                <label htmlFor="confirmPassword">Confirm New Password</label>
                <input type="password" id="confirmPassword" name="confirmPassword" />
              </div>
              <button type="button" className="btn btn-primary">Update Password</button>
            </div>
            
            <div className="form-section">
              <h4>Two-Factor Authentication</h4>
              <div className="security-option">
                <div className="security-info">
                  <h5>SMS Authentication</h5>
                  <p>Receive a code via SMS when you log in</p>
                </div>
                <button className="btn btn-secondary">
                  <Key size={16} />
                  <span>Enable</span>
                </button>
              </div>
              <div className="security-option">
                <div className="security-info">
                  <h5>Authenticator App</h5>
                  <p>Use Google Authenticator or similar app</p>
                </div>
                <button className="btn btn-secondary">
                  <Key size={16} />
                  <span>Enable</span>
                </button>
              </div>
            </div>
            
            <div className="form-section">
              <h4>Session Management</h4>
              <p>You are currently logged in on 2 devices</p>
              <button type="button" className="btn btn-danger">
                Sign Out From All Devices
              </button>
            </div>
          </div>
        );
      
      case 'notifications':
        return (
          <div className="settings-content">
            <h3>Notification Settings</h3>
            
            <div className="form-section">
              <h4>Campaign Notifications</h4>
              <div className="notification-option">
                <div className="notification-info">
                  <span>Campaign Started</span>
                  <p>Get notified when your campaign begins sending</p>
                </div>
                <button 
                  className="toggle-button" 
                  onClick={() => toggleNotification('campaignStart')}
                >
                  {notifications.campaignStart ? (
                    <ToggleRight size={32} className="toggle-on" />
                  ) : (
                    <ToggleLeft size={32} className="toggle-off" />
                  )}
                </button>
              </div>
              <div className="notification-option">
                <div className="notification-info">
                  <span>Campaign Completed</span>
                  <p>Get notified when your campaign finishes sending</p>
                </div>
                <button 
                  className="toggle-button" 
                  onClick={() => toggleNotification('campaignEnd')}
                >
                  {notifications.campaignEnd ? (
                    <ToggleRight size={32} className="toggle-on" />
                  ) : (
                    <ToggleLeft size={32} className="toggle-off" />
                  )}
                </button>
              </div>
            </div>
            
            <div className="form-section">
              <h4>Template Notifications</h4>
              <div className="notification-option">
                <div className="notification-info">
                  <span>Template Approved</span>
                  <p>Get notified when your template is approved</p>
                </div>
                <button 
                  className="toggle-button" 
                  onClick={() => toggleNotification('templateApproved')}
                >
                  {notifications.templateApproved ? (
                    <ToggleRight size={32} className="toggle-on" />
                  ) : (
                    <ToggleLeft size={32} className="toggle-off" />
                  )}
                </button>
              </div>
              <div className="notification-option">
                <div className="notification-info">
                  <span>Template Rejected</span>
                  <p>Get notified when your template is rejected</p>
                </div>
                <button 
                  className="toggle-button" 
                  onClick={() => toggleNotification('templateRejected')}
                >
                  {notifications.templateRejected ? (
                    <ToggleRight size={32} className="toggle-on" />
                  ) : (
                    <ToggleLeft size={32} className="toggle-off" />
                  )}
                </button>
              </div>
            </div>
            
            <div className="form-section">
              <h4>Communication Preferences</h4>
              <div className="notification-option">
                <div className="notification-info">
                  <span>Messaging Updates</span>
                  <p>Get notified about new features and updates</p>
                </div>
                <button 
                  className="toggle-button" 
                  onClick={() => toggleNotification('messaging')}
                >
                  {notifications.messaging ? (
                    <ToggleRight size={32} className="toggle-on" />
                  ) : (
                    <ToggleLeft size={32} className="toggle-off" />
                  )}
                </button>
              </div>
              <div className="notification-option">
                <div className="notification-info">
                  <span>Marketing Communications</span>
                  <p>Receive promotions, special offers, and newsletters</p>
                </div>
                <button 
                  className="toggle-button" 
                  onClick={() => toggleNotification('marketing')}
                >
                  {notifications.marketing ? (
                    <ToggleRight size={32} className="toggle-on" />
                  ) : (
                    <ToggleLeft size={32} className="toggle-off" />
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      
      case 'billing':
        return (
          <div className="settings-content">
            <h3>Billing & Subscription</h3>
            
            <div className="form-section">
              <div className="subscription-card">
                <div className="subscription-header">
                  <h4>Current Plan</h4>
                  <span className="plan-badge">Business</span>
                </div>
                <div className="subscription-details">
                  <div className="plan-price">
                    <span className="price">$49</span>
                    <span className="period">/ month</span>
                  </div>
                  <ul className="plan-features">
                    <li>10,000 messages per month</li>
                    <li>Unlimited templates</li>
                    <li>Advanced analytics</li>
                    <li>Priority support</li>
                  </ul>
                  <div className="plan-info">
                    <p>Renews on May 15, 2023</p>
                    <p>3,587 messages used this month</p>
                  </div>
                </div>
                <div className="subscription-actions">
                  <button className="btn btn-primary">Upgrade Plan</button>
                  <button className="btn btn-secondary">Manage Subscription</button>
                </div>
              </div>
            </div>
            
            <div className="form-section">
              <h4>Payment Methods</h4>
              <div className="payment-method">
                <div className="payment-info">
                  <div className="card-icon">
                    <CreditCard size={24} />
                  </div>
                  <div className="card-details">
                    <span className="card-name">Visa ending in 4242</span>
                    <span className="card-expiry">Expires 12/2025</span>
                  </div>
                </div>
                <div className="payment-actions">
                  <button className="action-btn">
                    <Edit size={16} />
                  </button>
                </div>
              </div>
              <button className="btn btn-secondary add-payment-btn">
                <CreditCard size={16} />
                <span>Add Payment Method</span>
              </button>
            </div>
            
            <div className="form-section">
              <h4>Billing History</h4>
              <div className="billing-history">
                <div className="invoice-item">
                  <div className="invoice-info">
                    <span className="invoice-date">Apr 15, 2023</span>
                    <span className="invoice-plan">Business Plan - Monthly</span>
                  </div>
                  <div className="invoice-amount">$49.00</div>
                </div>
                <div className="invoice-item">
                  <div className="invoice-info">
                    <span className="invoice-date">Mar 15, 2023</span>
                    <span className="invoice-plan">Business Plan - Monthly</span>
                  </div>
                  <div className="invoice-amount">$49.00</div>
                </div>
                <div className="invoice-item">
                  <div className="invoice-info">
                    <span className="invoice-date">Feb 15, 2023</span>
                    <span className="invoice-plan">Business Plan - Monthly</span>
                  </div>
                  <div className="invoice-amount">$49.00</div>
                </div>
              </div>
              <button className="btn btn-secondary">View All Invoices</button>
            </div>
          </div>
        );
      
      case 'team':
        return (
          <div className="settings-content">
            <h3>Team Management</h3>
            
            <div className="team-header">
              <h4>Team Members</h4>
              <button className="btn btn-primary">
                <Users size={16} />
                <span>Invite Team Member</span>
              </button>
            </div>
            
            <div className="team-list">
              <div className="team-member">
                <div className="member-info">
                  <div className="member-avatar">
                    <User size={20} />
                  </div>
                  <div className="member-details">
                    <span className="member-name">John Doe (You)</span>
                    <span className="member-email">john.doe@example.com</span>
                  </div>
                </div>
                <div className="member-role admin">Admin</div>
              </div>
              
              <div className="team-member">
                <div className="member-info">
                  <div className="member-avatar">
                    <User size={20} />
                  </div>
                  <div className="member-details">
                    <span className="member-name">Jane Smith</span>
                    <span className="member-email">jane.smith@example.com</span>
                  </div>
                </div>
                <div className="member-role editor">Editor</div>
              </div>
              
              <div className="team-member">
                <div className="member-info">
                  <div className="member-avatar">
                    <User size={20} />
                  </div>
                  <div className="member-details">
                    <span className="member-name">Mike Johnson</span>
                    <span className="member-email">mike.johnson@example.com</span>
                  </div>
                </div>
                <div className="member-role viewer">Viewer</div>
              </div>
              
              <div className="team-member pending">
                <div className="member-info">
                  <div className="member-avatar">
                    <User size={20} />
                  </div>
                  <div className="member-details">
                    <span className="member-name">Sarah Wilson</span>
                    <span className="member-email">sarah.wilson@example.com</span>
                  </div>
                </div>
                <div className="member-role pending">Pending</div>
              </div>
            </div>
            
            <div className="form-section">
              <h4>Roles & Permissions</h4>
              <div className="role-item">
                <div className="role-info">
                  <span className="role-name">Admin</span>
                  <p className="role-description">Can manage all aspects of the account including billing, team members, and all content.</p>
                </div>
              </div>
              <div className="role-item">
                <div className="role-info">
                  <span className="role-name">Editor</span>
                  <p className="role-description">Can create and edit templates, campaigns, and view analytics, but cannot manage team or billing.</p>
                </div>
              </div>
              <div className="role-item">
                <div className="role-info">
                  <span className="role-name">Viewer</span>
                  <p className="role-description">Can view templates, campaigns, and analytics, but cannot create or edit content.</p>
                </div>
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="settings">
      <div className="page-header">
        <h2>Settings</h2>
      </div>
      
      <div className="settings-container">
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
            <li className={`settings-menu-item ${activeTab === 'billing' ? 'active' : ''}`}>
              <button onClick={() => handleTabChange('billing')}>
                <span className="menu-icon"><CreditCard size={18} /></span>
                <span>Billing & Subscription</span>
                <ChevronRight size={16} className="menu-chevron" />
              </button>
            </li>
            <li className={`settings-menu-item ${activeTab === 'team' ? 'active' : ''}`}>
              <button onClick={() => handleTabChange('team')}>
                <span className="menu-icon"><Users size={18} /></span>
                <span>Team Management</span>
                <ChevronRight size={16} className="menu-chevron" />
              </button>
            </li>
          </ul>
        </div>
        
        <div className="settings-main card">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

export default Settings;