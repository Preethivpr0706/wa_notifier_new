import { useState, useEffect } from 'react';
import './AddContactModal.css'; // Import the new CSS file

const AddContactModal = ({ isOpen, onClose, onSave, existingLists }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    fname: '',
    lname: '',
    wanumber: '',
    email: '',
    listId: '',
    newListName: ''
  });
  const [errors, setErrors] = useState({});
  const [isNewList, setIsNewList] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        fname: '',
        lname: '',
        wanumber: '',
        email: '',
        listId: existingLists.length > 0 ? existingLists[0]?.id : '',
        newListName: ''
      });
      setErrors({});
      setIsNewList(false);
      setIsSaving(false); // Reset saving state when modal opens
    }
  }, [isOpen, existingLists]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.wanumber.trim()) {
      newErrors.wanumber = 'WhatsApp number is required';
    } else if (!/^(\+|\d)[0-9]{7,15}$/.test(formData.wanumber)) {
      newErrors.wanumber = 'Invalid WhatsApp number format';
    }
    
    if (isNewList && !formData.newListName.trim()) {
      newErrors.newListName = 'List name is required';
    } else if (!isNewList && !formData.listId) {
      newErrors.listId = 'Please select a list';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Form submitted'); // Debug log
    
    if (validateForm()) {
      setIsSaving(true);
      console.log('Form is valid, proceeding with save'); // Debug log
      try {
        const contactData = {
          fname: formData.fname.trim(),
          lname: formData.lname.trim(),
          wanumber: formData.wanumber.trim(),
          email: formData.email.trim(),
          listId: isNewList ? null : formData.listId,
          newListName: isNewList ? formData.newListName.trim() : null
        };
        
        console.log('Contact data to save:', contactData); // Debug log
        
        // Call the provided onSave function
        await onSave(contactData);
        onClose();
      } catch (error) {
        console.error('Save error:', error); // Debug log
        const message = error.message || 'Failed to save contact';
        setErrors({ submit: message });
      } finally {
        setIsSaving(false);
      }
    } else {
      console.log('Form validation failed'); // Debug log
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-content">
          <div className="modal-header">
            <h2 className="modal-title">➕ Add Contact</h2>
            <button 
              onClick={onClose}
              className="close-button"
              type="button"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="form-container">
            {/* First Name */}
            <div className="form-group">
              <label htmlFor="fname" className="label">
                First Name (Optional)
              </label>
              <input
                type="text"
                id="fname"
                name="fname"
                value={formData.fname}
                onChange={handleChange}
                className="input"
              />
            </div>
            
            {/* Last Name */}
            <div className="form-group">
              <label htmlFor="lname" className="label">
                Last Name (Optional)
              </label>
              <input
                type="text"
                id="lname"
                name="lname"
                value={formData.lname}
                onChange={handleChange}
                className="input"
              />
            </div>
            
            {/* WhatsApp Number */}
            <div className="form-group">
              <label htmlFor="wanumber" className="label">
                WhatsApp Number *
              </label>
              <input
                type="text"
                id="wanumber"
                name="wanumber"
                value={formData.wanumber}
                onChange={handleChange}
                placeholder="e.g., 919876543210"
                className={`input ${errors.wanumber ? 'input-error' : ''}`}
                required
              />
              {errors.wanumber && (
                <p className="error-message">{errors.wanumber}</p>
              )}
            </div>
            
            {/* Email */}
            <div className="form-group">
              <label htmlFor="email" className="label">
                Email (Optional)
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="input"
              />
            </div>
            
            {/* Contact List Selection */}
            <div className="form-group">
              <div className="radio-container">
                <input
                  type="radio"
                  id="existingList"
                  name="listOption"
                  checked={!isNewList}
                  onChange={() => setIsNewList(false)}
                  className="radio"
                />
                <label htmlFor="existingList" className="radio-label">
                  Select Existing List
                </label>
              </div>
              
              {!isNewList && (
                <select
                  name="listId"
                  value={formData.listId}
                  onChange={handleChange}
                  className={`input ${errors.listId ? 'input-error' : ''}`}
                >
                  <option value="">Select a list</option>
                  {existingLists.map(list => (
                    <option key={list.id} value={list.id}>{list.name}</option>
                  ))}
                </select>
              )}
              
              {errors.listId && !isNewList && (
                <p className="error-message">{errors.listId}</p>
              )}
            </div>
            
            {/* OR Divider */}
            <div className="divider-container">
              <div className="divider-line">
                <div className="divider-line-inner"></div>
              </div>
              <div className="divider-text">
                <span className="divider-text-inner">OR</span>
              </div>
            </div>
            
            {/* New List Option */}
            <div className="form-group">
              <div className="radio-container">
                <input
                  type="radio"
                  id="newList"
                  name="listOption"
                  checked={isNewList}
                  onChange={() => setIsNewList(true)}
                  className="radio"
                />
                <label htmlFor="newList" className="radio-label">
                  Create New List
                </label>
              </div>
              
              {isNewList && (
                <div>
                  <input
                    type="text"
                    name="newListName"
                    value={formData.newListName}
                    onChange={handleChange}
                    placeholder="Enter new list name"
                    className={`input ${errors.newListName ? 'input-error' : ''}`}
                  />
                  {errors.newListName && (
                    <p className="error-message">{errors.newListName}</p>
                  )}
                </div>
              )}
            </div>
            
            {/* Form Actions */}
            <div className="button-container">
              <button
                type="button"
                onClick={onClose}
                className="cancel-button"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="save-button" 
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Contact'}
              </button>
            </div>
            
            {/* General submit error */}
            {errors.submit && (
              <p className="error-message submit-error">{errors.submit}</p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddContactModal;