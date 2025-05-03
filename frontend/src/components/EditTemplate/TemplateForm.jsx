import { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { Camera, Video, ExternalLink, Phone, Copy, Plus, X } from 'lucide-react';
import { CATEGORIES, LANGUAGES } from './templateConstants';
import { templateService } from '../../api/templateService';
import './TemplateForm.css';

const TemplateForm = forwardRef(({ initialData, onSubmit, isSubmitting }, ref) => {
    const [formData, setFormData] = useState({
      name: '',
      category: 'marketing',
      language: 'en',
      headerType: 'none',
      headerText: '',
      headerContent: '',
      bodyText: '',
      footerText: '',
      buttons: [],
      variableSamples: {},
      status: 'draft',
      ...initialData
    });

  const [errors, setErrors] = useState({});
  const [activeTab, setActiveTab] = useState('header');
  const [headerFile, setHeaderFile] = useState(null);
  const [headerFilePreview, setHeaderFilePreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);
  const formRef = useRef(null);
  const isSubmittedToWhatsApp = !!initialData?.whatsapp_id;

  // Expose methods to parent component through the ref
  useImperativeHandle(ref, () => ({
    submitForm: () => {
      handleFormSubmit();
    }
  }));

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleHeaderTypeChange = (type) => {
    setFormData(prev => ({
      ...prev,
      headerType: type,
      headerText: type === 'text' ? prev.headerText : '',
      headerContent: type === 'text' ? prev.headerText : prev.headerContent
    }));
    setHeaderFile(null);
    setHeaderFilePreview(null);
    setErrors({ ...errors, header: '' });
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const maxSize = formData.headerType === 'video' ? 16 * 1024 * 1024 : 5 * 1024 * 1024;

    if (formData.headerType === 'image' && !isImage) {
      setErrors({ ...errors, header: 'Please select an image file (JPEG, PNG)' });
      return;
    }

    if (formData.headerType === 'video' && !isVideo) {
      setErrors({ ...errors, header: 'Please select a video file (MP4)' });
      return;
    }

    if (file.size > maxSize) {
      setErrors({ ...errors, header: `File size exceeds the limit (${formData.headerType === 'video' ? '16MB' : '5MB'})` });
      return;
    }

    setHeaderFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setHeaderFilePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    handleFormSubmit();
  };


  // Update the validateForm function
const validateForm = () => {
  const errors = {};
  
  if (!formData.name.trim()) {
      errors.name = 'Template name is required';
  }
  
  if (!formData.bodyText.trim()) {
      errors.bodyText = 'Body text is required';
  }
  
  // Remove header validation to make it optional
  // if (formData.headerType === 'text' && !formData.headerText.trim()) {
  //     errors.headerText = 'Header text is required';
  // }
  
  // if ((formData.headerType === 'image' || formData.headerType === 'video') && !headerFile && !formData.headerContent) {
  //     errors.header = `${formData.headerType === 'image' ? 'Image' : 'Video'} is required`;
  // }
  
  return errors;
};

// Update the handleSubmit function to handle empty headers
const handleFormSubmit = async () => {
  const validationErrors = validateForm();
  
  if (Object.keys(validationErrors).length === 0) {
      let headerContent = formData.headerContent;
      
      // Only process header if there's content
      if (formData.headerType !== 'none' && 
          ((formData.headerType === 'text' && formData.headerText) || 
           ((formData.headerType === 'image' || formData.headerType === 'video') && headerFile))) {
          try {
              setIsUploading(true);
              const mediaHandle = await uploadFile(headerFile);
              if (mediaHandle) {
                  headerContent = mediaHandle;
              }
          } catch (error) {
              setErrors({ ...errors, header: 'Failed to upload file: ' + error.message });
              setIsUploading(false);
              return;
          }
      }

      onSubmit({
          ...formData,
          headerType: formData.headerType === 'none' ? null : formData.headerType,
          headerContent: formData.headerType === 'text' ? formData.headerText : headerContent
      });
  } else {
      setErrors(validationErrors);
  }
};

  const extractVariables = (text) => {
    const matches = text.match(/{{(\w+)}}/g) || [];
    return [...new Set(matches.map(match => match.replace(/[{}]/g, '')))];
  };

  const handleBodyChange = (e) => {
    const { value } = e.target;
    const variables = extractVariables(value);
    const newSamples = { ...formData.variableSamples };
    
    // Remove samples for variables that no longer exist
    Object.keys(newSamples).forEach(key => {
      if (!variables.includes(key)) {
        delete newSamples[key];
      }
    });
    
    // Add empty samples for new variables
    variables.forEach(varName => {
      if (!newSamples[varName]) {
        newSamples[varName] = '';
      }
    });
    
    setFormData({
      ...formData,
      bodyText: value,
      variableSamples: newSamples,
    });
  };

  const addButton = (type) => {
    if (formData.buttons.length < 3) {
      const defaultValues = {
        phone_number: { text: 'Call us', value: '' },
        url: { text: 'Visit website', value: 'https://example.com' },
        quick_reply: { text: 'Quick reply', value: '' }
      };
      
      setFormData({
        ...formData,
        buttons: [...formData.buttons, { 
          type,
          text: defaultValues[type].text,
          value: defaultValues[type].value
        }]
      });
    }
  };

  const removeButton = (index) => {
    const updatedButtons = [...formData.buttons];
    updatedButtons.splice(index, 1);
    setFormData({
      ...formData,
      buttons: updatedButtons
    });
  };

  const handleButtonChange = (index, field, value) => {
    const updatedButtons = [...formData.buttons];
    updatedButtons[index] = {
      ...updatedButtons[index],
      [field]: value
    };
    setFormData({
      ...formData,
      buttons: updatedButtons
    });
  };

  const uploadFile = async (file) => {
    if (!file) return null;
    try {
      setIsUploading(true);
      setUploadProgress(0);
  
       // Create upload session with exact file details
       const sessionResponse = await templateService.createUploadSession({
        fileType: file.type,
        fileName: file.name,
        fileSize: file.size
    });
    if (!sessionResponse?.data?.data?.id) {
      throw new Error('Failed to create upload session');
  }

  
      const sessionId = sessionResponse.data.data.id;
  
      // 2. Create FormData for the file upload (renamed to avoid conflict)
      const fileFormData = new FormData();  // Changed from formData2 to fileFormData
      fileFormData.append('file', file);
      fileFormData.append('fileSize', file.size.toString());
  
      // 3. Upload file with progress tracking
      const uploadResponse = await templateService.uploadFileToSession(
        sessionId,
        fileFormData,  // Using the renamed variable
        (progressEvent) => {
          if (progressEvent.lengthComputable) {
            const percent = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(percent);
          }
        }
      );
  
      // 4. Verify and return the media handle
       // Verify we got a handle
       const mediaHandle = uploadResponse?.data?.data?.h;
       if (!mediaHandle) {
           throw new Error('Upload completed but no media handle received');
       }
      
      return mediaHandle;
    } catch (error) {
      console.error('Upload failed:', error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };
  const renderVariableSamples = () => {
    const variables = extractVariables(formData.bodyText);
    if (variables.length === 0) return null;

    return (
      <div className="variable-samples">
        <h4>Variable Samples</h4>
        <p>Provide example values for each variable used in your template:</p>
        
        {variables.sort((a, b) => {
          const aIsNumber = !isNaN(a);
          const bIsNumber = !isNaN(b);
          
          if (aIsNumber && bIsNumber) return Number(a) - Number(b);
          if (aIsNumber) return -1;
          if (bIsNumber) return 1;
          return a.localeCompare(b);
        }).map(varName => (
          <div className="form-field" key={`var-${varName}`}>
            <label>Sample for {'{{' + varName + '}}'}</label>
            <input
              type="text"
              value={formData.variableSamples[varName] || ''}
              onChange={(e) => setFormData({
                ...formData,
                variableSamples: {
                  ...formData.variableSamples,
                  [varName]: e.target.value,
                },
              })}
              placeholder={`Example value for ${varName}`}
            />
          </div>
        ))}
      </div>
    );
  };

  const renderHeaderSection = () => {
    return (
      <div className="header-section">
        <div className="header-type-selector">
        <button type="button" className={`type-option ${formData.headerType==='none'?'active':''}`} onClick={() => handleHeaderTypeChange('none')}>None</button>
          <button
            type="button"
            className={`type-option ${formData.headerType === 'text' ? 'active' : ''}`}
            onClick={() => handleHeaderTypeChange('text')}
          >
            Text
          </button>
          <button
            type="button"
            className={`type-option ${formData.headerType === 'image' ? 'active' : ''}`}
            onClick={() => handleHeaderTypeChange('image')}
          >
            <Camera size={16} />
            <span>Image</span>
          </button>
          <button
            type="button"
            className={`type-option ${formData.headerType === 'video' ? 'active' : ''}`}
            onClick={() => handleHeaderTypeChange('video')}
          >
            <Video size={16} />
            <span>Video</span>
          </button>
        </div>
        
        {formData.headerType === 'text' && (
          <div className="form-field">
            <label htmlFor="header-text">Header Text</label>
            <input
              type="text"
              id="header-text"
              name="headerText"
              value={formData.headerText}
              onChange={handleChange}
              placeholder="Enter header text"
              maxLength="60"
            />
            <div className="character-counter">
              {formData.headerText.length}/60
            </div>
            {errors.headerText && <span className="error">{errors.headerText}</span>}
          </div>
        )}
        
        {formData.headerType === 'image' && (
          <div className="media-upload">
            <div className={`upload-area ${headerFilePreview ? 'has-preview' : ''}`}>
              {headerFilePreview ? (
                <>
                  <div className="file-preview">
                    <img src={headerFilePreview} alt="Header preview" />
                  </div>
                  <div className="file-actions">
                    <button 
                      type="button" 
                      className="btn btn-secondary"
                      onClick={() => {
                        setHeaderFile(null);
                        setHeaderFilePreview(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                    >
                      Remove Image
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <Camera size={24} />
                  <p>Upload an image</p>
                  <span>PNG or JPG (max 5MB)</span>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/jpeg,image/png"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                  />
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? `Uploading ${uploadProgress}%` : 'Select File'}
                  </button>
                </>
              )}
            </div>
            {errors.header && <span className="error">{errors.header}</span>}
          </div>
        )}
        
        {formData.headerType === 'video' && (
          <div className="media-upload">
            <div className={`upload-area ${headerFilePreview ? 'has-preview' : ''}`}>
              {headerFilePreview ? (
                <>
                  <div className="file-preview">
                    <video src={headerFilePreview} controls />
                  </div>
                  <div className="file-actions">
                    <button 
                      type="button" 
                      className="btn btn-secondary"
                      onClick={() => {
                        setHeaderFile(null);
                        setHeaderFilePreview(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                    >
                      Remove Video
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <Video size={24} />
                  <p>Upload a video</p>
                  <span>MP4 (max 16MB)</span>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="video/mp4"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                  />
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? `Uploading ${uploadProgress}%` : 'Select File'}
                  </button>
                </>
              )}
            </div>
            {errors.header && <span className="error">{errors.header}</span>}
          </div>
        )}
      </div>
    );
  };

  const renderBodySection = () => {
    return (
      <div className="body-section">
        <div className="form-field">
          <label htmlFor="body-text">Body Text</label>
          <textarea
            id="body-text"
            name="bodyText"
            value={formData.bodyText}
            onChange={handleBodyChange}
            placeholder="Enter message body. Use {{1}}, {{2}} or {{name}}, {{date}} for variables."
            rows="5"
            maxLength="1024"
          ></textarea>
          <div className="character-counter">
            {formData.bodyText.length}/1024
          </div>
          {errors.bodyText && <span className="error">{errors.bodyText}</span>}
        </div>
        
        <div className="variables-helper">
          <h4>Variables</h4>
          <p>You can use variables in your template with the format {'{{number}}'} or {'{{name}}'}:</p>
          <ul>
            <li><code>{'{{1}}'}</code> or <code>{'{{name}}'}</code> – Variables will be replaced with actual values</li>
            <li>Numbered variables sort first in samples</li>
          </ul>
          <div className="example-text">
            <p><strong>Example:</strong> Hello {'{{name}}'}, your order {'{{1}}'} will be delivered on {'{{date}}'}.</p>
          </div>
        </div>

        {renderVariableSamples()}
      </div>
    );
  };

  const renderFooterSection = () => {
    return (
      <div className="footer-section">
        <div className="form-field">
          <label htmlFor="footer-text">Footer Text (Optional)</label>
          <input
            type="text"
            id="footer-text"
            name="footerText"
            value={formData.footerText}
            onChange={handleChange}
            placeholder="Enter footer text"
            maxLength="60"
          />
          <div className="character-counter">
            {formData.footerText.length}/60
          </div>
        </div>
      </div>
    );
  };

  const renderButtonsSection = () => {
    return (
      <div className="buttons-section">
        <div className="buttons-header">
          <h4>Add Buttons (Optional)</h4>
          <p>You can add up to 3 buttons to your template</p>
        </div>
        
        <div className="buttons-container">
          {formData.buttons.map((button, index) => (
            <div key={index} className="button-item card">
              <div className="button-header">
                <span>Button {index + 1}</span>
                <button 
                  type="button" 
                  className="remove-button"
                  onClick={() => removeButton(index)}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="form-field">
                <label>Button Text</label>
                <input
                  type="text"
                  value={button.text}
                  onChange={(e) => handleButtonChange(index, 'text', e.target.value)}
                  placeholder="Enter button text"
                  maxLength="25"
                />
              </div>
              {button.type === 'url' && (
                <div className="form-field">
                  <label>URL</label>
                  <input
                    type="url"
                    value={button.value}
                    onChange={(e) => handleButtonChange(index, 'value', e.target.value)}
                    placeholder="https://example.com"
                  />
                </div>
              )}
              {button.type === 'phone_number' && (
                <div className="form-field">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    value={button.value}
                    onChange={(e) => handleButtonChange(index, 'value', e.target.value)}
                    placeholder="+1234567890"
                  />
                </div>
              )}
            </div>
          ))}
          
          {formData.buttons.length < 3 && (
            <div className="button-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => addButton('url')}
                disabled={formData.buttons.length >= 3}
              >
                <ExternalLink size={16} />
                <span>Add URL Button</span>
              </button>
              
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => addButton('phone_number')}
                disabled={formData.buttons.length >= 3}
              >
                <Phone size={16} />
                <span>Add Phone Button</span>
              </button>
              
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => addButton('quick_reply')}
                disabled={formData.buttons.length >= 3}
              >
                <Copy size={16} />
                <span>Add Quick Reply</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderPreview = () => {
    const renderBodyWithVariables = () => {
      if (!formData.bodyText) return null;
      
      const parts = [];
      let text = formData.bodyText;
      let match;
      const regex = /{{(\w+)}}/g;
      let lastIndex = 0;
      
      while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
          parts.push(text.substring(lastIndex, match.index));
        }
        const varName = match[1];
        const sample = formData.variableSamples[varName] || `Sample for ${varName}`;
        parts.push(<span key={match.index} className="variable">{sample}</span>);
        lastIndex = regex.lastIndex;
      }
      
      if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex));
      }
      
      return parts.length ? parts : text;
    };

    return (
      <div className="template-preview card">
        <h3>Preview</h3>
        <div className="phone-container">
          <div className="phone-header">
            <div className="phone-notch"></div>
          </div>
          <div className="phone-content">
            <div className="chat-header">
              <div className="chat-profile">
                <div className="chat-avatar">
                  <img src="/whatsapp-logo.svg" alt="WhatsApp" className="chat-logo" />
                </div>
                <div className="chat-info">
                  <span className="chat-name">Your Business</span>
                  <span className="chat-status">Online</span>
                </div>
              </div>
            </div>
            
            <div className="chat-messages">

          {/* Header section - only show if header exists */}
          {formData.headerType === 'text' && formData.headerText && (
            <div className="message-header">{formData.headerText}</div>
          )}
          
          {formData.headerType === 'image' && (
            <div className="message-image">
              {headerFilePreview ? (
                <img src={headerFilePreview} alt="Header" className="header-preview" />
              ) : (
                <div className="image-placeholder">
                  <Camera size={24} />
                  <span>Image Preview</span>
                </div>
              )}
            </div>
          )}
          
          {formData.headerType === 'video' && (
            <div className="message-video">
              {headerFilePreview ? (
                <video src={headerFilePreview} controls className="video-preview" />
              ) : (
                <div className="video-placeholder">
                  <Video size={24} />
                  <span>Video Preview</span>
                </div>
              )}
            </div>
          )}
          
          {/* Body section - always show if body exists */}
          {formData.bodyText && (
            <div className="message-container">
              <div className="message-body">
                {renderBodyWithVariables()}
              </div>
            </div>
          )}
          
          {/* Footer section - only show if footer exists */}
          {formData.footerText && (
            <div className="message-footer">{formData.footerText}</div>
          )}
          
          {/* Buttons section - only show if buttons exist */}
          {formData.buttons.length > 0 && (
            <div className="message-buttons">
              {formData.buttons.map((button, index) => (
                <div key={index} className="message-button">
                  {button.type === 'url' && <ExternalLink size={12} />}
                  {button.type === 'phone_number' && <Phone size={12} />}
                  {button.type === 'quick_reply' && <Copy size={12} />}
                  <span>{button.text || `Button ${index + 1}`}</span>
                </div>
              ))}
            </div>
          )}
        </div>
            </div>
          </div>
        </div>

    );
  };

  return (
    <div className="template-form-container">
      <form className="template-form card" onSubmit={handleSubmit}>
        <div className="form-section">
          <h3>Template Information</h3>
          <div className="form-fields">
          <div className="form-field">
    <label htmlFor="template-name">Template Name</label>
    <input
        type="text"
        id="template-name"
        name="name"
        value={formData.name}
        onChange={handleChange}
        placeholder="Enter template name"
        required
        disabled={isSubmittedToWhatsApp}  // Disable if already on WhatsApp
    />
    {errors.name && <span className="error">{errors.name}</span>}
</div>

            
            <div className="form-row">
            <div className="form-field">
    <label htmlFor="template-category">Category</label>
    <select
        id="template-category"
        name="category"
        value={formData.category}
        onChange={handleChange}
        required
        disabled={isSubmittedToWhatsApp}  // Disable if already on WhatsApp
    >
        {CATEGORIES.map(category => (
            <option key={category.value} value={category.value}>
                {category.label}
            </option>
        ))}
    </select>
</div>

<div className="form-field">
    <label htmlFor="template-language">Language</label>
    <select
        id="template-language"
        name="language"
        value={formData.language}
        onChange={handleChange}
        required
        disabled={isSubmittedToWhatsApp}  // Disable if already on WhatsApp
    >
        {LANGUAGES.map(lang => (
            <option key={lang.value} value={lang.value}>
                {lang.label}
            </option>
        ))}
    </select>
</div>
            </div>
          </div>
        </div>
        
        <div className="form-section">
          <div className="section-tabs">
            <button
              type="button"
              className={`section-tab ${activeTab === 'header' ? 'active' : ''}`}
              onClick={() => setActiveTab('header')}
            >
              Header
            </button>
            <button
              type="button"
              className={`section-tab ${activeTab === 'body' ? 'active' : ''}`}
              onClick={() => setActiveTab('body')}
            >
              Body
            </button>
            <button
              type="button"
              className={`section-tab ${activeTab === 'footer' ? 'active' : ''}`}
              onClick={() => setActiveTab('footer')}
            >
              Footer
            </button>
            <button
              type="button"
              className={`section-tab ${activeTab === 'buttons' ? 'active' : ''}`}
              onClick={() => setActiveTab('buttons')}
            >
              Buttons
            </button>
          </div>
          
          <div className="section-content">
            {activeTab === 'header' && renderHeaderSection()}
            {activeTab === 'body' && renderBodySection()}
            {activeTab === 'footer' && renderFooterSection()}
            {activeTab === 'buttons' && renderButtonsSection()}
          </div>
        </div>
      </form>
      
      {renderPreview()}
    </div>
  );
});

// Add display name
TemplateForm.displayName = 'TemplateForm';

export default TemplateForm;