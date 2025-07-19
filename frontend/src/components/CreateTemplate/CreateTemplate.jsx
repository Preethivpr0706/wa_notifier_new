import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Camera, Video, ExternalLink, Phone, Copy, Plus, X, RefreshCw, File, FileText } from 'lucide-react';
import { templateService } from '../../api/templateService';
import { businessService } from '../../api/businessService';
import './CreateTemplate.css';

function CreateTemplate() {
  const { id } = useParams(); // For editing existing templates
  const { state } = useLocation(); // For draft templates
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('header');
  const [headerType, setHeaderType] = useState('text');
  const [formData, setFormData] = useState({
    name: '',
    category: 'marketing',
    language: 'en_US',
    headerText: '',
    headerType: 'text',
    bodyText: '',
    footerText: '',
    buttons: [],
    variableSamples: {},
  });
  const [headerFile, setHeaderFile] = useState(null);
  const [headerFilePreview, setHeaderFilePreview] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Extract variables from text
  const extractVariables = (text) => {
    const matches = text.match(/{{(\w+)}}/g) || [];
    const uniqueVariables = [...new Set(matches.map(match => 
      match.replace(/[{}]/g, ''))
    )];
    
    return uniqueVariables.sort((a, b) => {
      const aIsNumber = !isNaN(a);
      const bIsNumber = !isNaN(b);
      if (aIsNumber && bIsNumber) return Number(a) - Number(b);
      if (aIsNumber) return -1;
      if (bIsNumber) return 1;
      return a.localeCompare(b);
    });
  };

  // Load template data
  useEffect(() => {
  const loadTemplateData = async () => {
    try {
      setIsLoading(true);
      
      if (id) {
        // Editing existing template
        const response = await templateService.getTemplateById(id);
        const template = response.data.template;
        loadTemplateIntoForm(template);
      } else if (state?.draftTemplate) {
        // Continuing draft template
        loadTemplateIntoForm(state.draftTemplate);
      }
      
      setError(null);
    } catch (err) {
      setError('Failed to load template: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTemplateIntoForm = (template) => {
    const variables = extractVariables(template.body_text);
    const variableSamples = {};
    
    variables.forEach(varName => {
      variableSamples[varName] = template.variables?.[varName] || '';
    });
    
    setFormData({
      name: template.name,
      category: template.category,
      language: template.language,
      headerType: template.header_type,
      headerText: template.header_type === 'text' ? template.header_content : '',
      headerContent: template.header_content,
      bodyText: template.body_text,
      footerText: template.footer_text || '',
      buttons: template.buttons || [],
      variableSamples,
    });
    
    setHeaderType(template.header_type);
    
    // Set file preview if it's a media header
    // Set file preview if it's a media header
  if (template.header_type === 'document' && template.header_content) {
    // Create a dummy file object for the preview
    setHeaderFilePreview({ 
      name: 'Uploaded Document', 
      type: 'application/pdf' 
    });
  }

  };

  loadTemplateData();
}, [id, state?.draftTemplate]);

  // File handling functions
  const handleFileSelect = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');
  const isDocument = file.type === 'application/pdf';
  const maxSize = 
    headerType === 'video' ? 16 * 1024 * 1024 : 
    headerType === 'document' ? 100 * 1024 * 1024 : 
    5 * 1024 * 1024;

  if (headerType === 'image' && !isImage) {
    setError('Please select an image file (JPEG, PNG)');
    return;
  }

  if (headerType === 'video' && !isVideo) {
    setError('Please select a video file (MP4)');
    return;
  }

  if (headerType === 'document' && !isDocument) {
    setError('Please select a PDF document');
    return;
  }

  if (file.size > maxSize) {
    setError(`File size exceeds the limit (${maxSize / (1024 * 1024)}MB)`);
    return;
  }

  setHeaderFile(file);
  if (headerType === 'document') {
    setHeaderFilePreview(file); // Store the file object directly for documents
  } else {
    const reader = new FileReader();
    reader.onloadend = () => setHeaderFilePreview(reader.result);
    reader.readAsDataURL(file);
  }
};

const uploadFile = async (file) => {
  if (!file) return null;
  
  try {
    setIsUploading(true);
    setUploadProgress(0);
    
    const sessionResponse = await templateService.createUploadSession({
      fileType: file.type,
      fileName: file.name,
      fileSize: file.size
    });
    
    if (!sessionResponse?.data?.data?.id) {
      throw new Error('Failed to create upload session');
    }

    const sessionId = sessionResponse.data.data.id;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileSize', file.size.toString());

    // For documents, add filename if not PDF
    if (headerType === 'document' && !file.name.endsWith('.pdf')) {
      formData.append('filename', `${file.name}.pdf`);
    }

    const uploadResponse = await templateService.uploadFileToSession(
      sessionId, 
      formData,
      (progressEvent) => {
        if (progressEvent.lengthComputable) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        }
      }
    );
    
    const mediaHandle = uploadResponse?.data?.data?.h;
    if (!mediaHandle) {
      throw new Error('Upload completed but no media handle received');
    }

    return mediaHandle;
  } catch (error) {
    console.error('Upload error:', error);
    setError(`File upload failed: ${error.response?.data?.message || error.message}`);
    return null;
  } finally {
    setIsUploading(false);
  }
};

  // Form handling functions
  const handleHeaderTypeChange = (type) => {
    setHeaderType(type);
    setFormData(prev => ({
      ...prev,
      headerType: type,
      headerContent: type === 'text' ? prev.headerText : ''
    }));
    setHeaderFile(null);
    setHeaderFilePreview(null);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'bodyText') {
      const variables = extractVariables(value);
      const newSamples = { ...formData.variableSamples };
      
      Object.keys(newSamples).forEach(key => {
        if (!variables.includes(key)) delete newSamples[key];
      });
      
      variables.forEach(varName => {
        if (!newSamples[varName]) newSamples[varName] = '';
      });
      
      setFormData(prev => ({
        ...prev,
        [name]: value,
        variableSamples: newSamples,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  // Button handling
  const addButton = (type) => {
    if (formData.buttons.length < 3) {
      const defaultValues = {
        phone_number: { text: 'To contact us', value: '' },
        url: { text: 'Click here', value: 'https://example.com' },
        quick_reply: { text: 'Quick reply', value: '' }
      };
      
      setFormData(prev => ({
        ...prev,
        buttons: [...prev.buttons, { 
          type,
          text: defaultValues[type].text,
          value: defaultValues[type].value
        }]
      }));
    }
  };

  const removeButton = (index) => {
    const updatedButtons = [...formData.buttons];
    updatedButtons.splice(index, 1);
    setFormData(prev => ({
      ...prev,
      buttons: updatedButtons
    }));
  };

  const handleButtonChange = (index, field, value) => {
    const updatedButtons = [...formData.buttons];
    updatedButtons[index] = {
      ...updatedButtons[index],
      [field]: value
    };
    setFormData(prev => ({
      ...prev,
      buttons: updatedButtons
    }));
  };

  // Form submission
  const handleSaveAsDraft = async () => {
  try {
    setIsLoading(true);
    setError(null);
    
    const templateData = {
      name: formData.name || 'Untitled Template',
      category: formData.category,
      language: formData.language,
      headerType: formData.headerType,
      headerText: headerType === 'text' ? formData.headerText : '',
      headerContent: headerType === 'text' ? formData.headerText : formData.headerContent,
      bodyText: formData.bodyText,
      footerText: formData.footerText,
      buttons: formData.buttons,
      variableSamples: formData.variableSamples 
    };
    
    // Upload file if needed (for image, video, or document)
    if ((headerType === 'image' || headerType === 'video' || headerType === 'document') && 
        headerFile && !templateData.headerContent) {
      const mediaHandle = await uploadFile(headerFile);
      if (mediaHandle) {
        templateData.headerContent = mediaHandle;
      }
    }

    let response;
    if (id || state?.draftTemplate?.id) {
      // Update existing draft
      templateData.id = id || state.draftTemplate.id;
      response = await templateService.updateDraftTemplate(templateData.id, templateData);
    } else {
      // Create new draft
      response = await templateService.saveAsDraft(templateData);
    }
    
    navigate('/templates', {
      state: { successMessage: 'Template saved as draft successfully!' }
    });
  } catch (err) {
    setError('Error saving draft: ' + err.message);
  } finally {
    setIsLoading(false);
  }
};

 const handleSubmitToWhatsApp = async () => {
  try {
    setIsLoading(true);
    setError(null);
    
    let headerContent = formData.headerContent;
    
    // Upload file if needed (for image, video, or document)
    if ((headerType === 'image' || headerType === 'video' || headerType === 'document') && 
        headerFile && !headerContent) {
      headerContent = await uploadFile(headerFile);
      if (!headerContent) {
        setError(`Failed to upload ${headerType}. Please try again.`);
        setIsLoading(false);
        return;
      }
    }
    
    const templateData = {
      name: formData.name,
      category: formData.category,
      language: formData.language,
      headerType: formData.headerType,
      headerText: headerType === 'text' ? formData.headerText : '',
      headerContent: headerType === 'text' ? formData.headerText : headerContent,
      bodyText: formData.bodyText,
      footerText: formData.footerText,
      buttons: formData.buttons,
      variableSamples: formData.variableSamples 
    };

    let response;
    if (id || state?.draftTemplate?.id) {
      // Submit existing template (draft or previously submitted)
      const templateId = id || state.draftTemplate.id;
      response = await templateService.submitDraftTemplate(templateId, templateData);
    } else {
      // Create and submit new template
      response = await templateService.createTemplate(templateData);
    }
    
    navigate('/templates', {
      state: { successMessage: 'Template submitted to WhatsApp successfully!' }
    });
  } catch (err) {
    setError('Error submitting template: ' + err.message);
  } finally {
    setIsLoading(false);
  }
};

   // Add new state for business details
   const [businessDetails, setBusinessDetails] = useState({
    name: 'Your Business',
    profileImage: null
  });
  
  useEffect(() => {
    const fetchBusinessDetails = async () => {
      try {
        const response = await businessService.getBusinessDetails();
        setBusinessDetails({
          name: response.data.business.name || 'Your Business',
          profileImage: response.data.business.profile_image_url || null
        });
      } catch (error) {
        console.error('Failed to fetch business details:', error);
      }
    };
  
    fetchBusinessDetails();
  }, []);


  // Render functions for each section
  const renderHeaderSection = () => (
    <div className="header-section">
      <div className="header-type-selector">
        <button
          type="button"
          className={`type-option ${headerType === 'text' ? 'active' : ''}`}
          onClick={() => handleHeaderTypeChange('text')}
        >
          Text
        </button>
        <button
          type="button"
          className={`type-option ${headerType === 'image' ? 'active' : ''}`}
          onClick={() => handleHeaderTypeChange('image')}
        >
          <Camera size={16} />
          <span>Image</span>
        </button>
        <button
          type="button"
          className={`type-option ${headerType === 'video' ? 'active' : ''}`}
          onClick={() => handleHeaderTypeChange('video')}
        >
          <Video size={16} />
          <span>Video</span>
        </button>
        <button
        type="button"
        className={`type-option ${headerType === 'document' ? 'active' : ''}`}
        onClick={() => handleHeaderTypeChange('document')}
      >
        <File size={16} />
        <span>Document</span>
      </button>
      </div>
      
      {headerType === 'text' && (
        <div className="form-field">
          <label htmlFor="header-text">Header Text</label>
          <input
            type="text"
            id="header-text"
            name="headerText"
            value={formData.headerText}
            onChange={handleInputChange}
            placeholder="Enter header text"
            maxLength="60"
          />
          <div className="character-counter">
            {formData.headerText.length}/60
          </div>
        </div>
      )}
      
      {headerType === 'image' && (
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
                      setFormData(prev => ({...prev, headerContent: ''}));
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
        </div>
      )}
      
      {headerType === 'video' && (
        <div className="media-upload">
          <div className={`upload-area ${headerFilePreview ? 'has-preview' : ''}`}>
            {headerFilePreview ? (
              <>
                <div className="file-preview">
                  <video src={headerFilePreview} controls width="100%" />
                </div>
                <div className="file-actions">
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => {
                      setHeaderFile(null);
                      setHeaderFilePreview(null);
                      setFormData(prev => ({...prev, headerContent: ''}));
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
        </div>
      )}
      {/* Add document upload section */}
    {headerType === 'document' && (
  <div className="media-upload">
    <div className={`upload-area ${headerFilePreview ? 'has-preview' : ''}`}>
      {headerFilePreview ? (
        <>
          <div className="file-preview">
            <FileText size={48} />
            <span>{headerFilePreview.name}</span>
          </div>
          <div className="file-actions">
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={() => {
                setHeaderFile(null);
                setHeaderFilePreview(null);
                setFormData(prev => ({...prev, headerContent: ''}));
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
            >
              Remove Document
            </button>
          </div>
        </>
      ) : (
        <>
          <FileText size={24} />
          <p>Upload a document</p>
          <span>PDF (max 100MB)</span>
          <input
            type="file"
            ref={fileInputRef}
            accept="application/pdf"
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
  </div>
)}
    </div>
  );

  const renderBodySection = () => {
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
      <div className="body-section">
        <div className="form-field">
          <label htmlFor="body-text">Body Text</label>
          <textarea
            id="body-text"
            name="bodyText"
            value={formData.bodyText}
            onChange={handleInputChange}
            placeholder="Enter message body. Use {{1}}, {{2}} or {{name}}, {{date}} for variables."
            rows="5"
            maxLength="1024"
          />
          <div className="character-counter">
            {formData.bodyText.length}/1024
          </div>
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

        {Object.keys(formData.variableSamples).length > 0 && (
          <div className="variable-samples">
            <h4>Variable Samples</h4>
            <p>Provide example values for each variable used in your template:</p>
            
            {Object.entries(formData.variableSamples)
              .sort(([a], [b]) => {
                const aIsNumber = !isNaN(a);
                const bIsNumber = !isNaN(b);
                if (aIsNumber && bIsNumber) return Number(a) - Number(b);
                if (aIsNumber) return -1;
                if (bIsNumber) return 1;
                return a.localeCompare(b);
              })
              .map(([varName, sampleValue]) => (
                <div className="form-field" key={`var-${varName}`}>
                  <label>Sample for {'{{' + varName + '}}'}</label>
                  <input
                    type="text"
                    value={sampleValue}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      variableSamples: {
                        ...prev.variableSamples,
                        [varName]: e.target.value,
                      },
                    }))}
                    placeholder={`Example value for ${varName}`}
                  />
                </div>
              ))
            }
          </div>
        )}
      </div>
    );
  };

  const renderFooterSection = () => (
    <div className="footer-section">
      <div className="form-field">
        <label htmlFor="footer-text">Footer Text (Optional)</label>
        <input
          type="text"
          id="footer-text"
          name="footerText"
          value={formData.footerText}
          onChange={handleInputChange}
          placeholder="Enter footer text"
          maxLength="60"
        />
        <div className="character-counter">
          {formData.footerText.length}/60
        </div>
      </div>
    </div>
  );

  const renderButtonsSection = () => (
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
            {button.type === 'quick_reply' && (
              <div className="form-field">
                <label>Button Text</label>
                <input
                  type="text"
                  value={button.text}
                  onChange={(e) => handleButtonChange(index, 'text', e.target.value)}
                  placeholder="Quick reply text"
                  maxLength="25"
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
        parts.push(<span key={match.index} className="wa-template-variable">{sample}</span>);
        lastIndex = regex.lastIndex;
      }
      
      if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex));
      }
      
      return parts.length ? parts : text;
    };
  
    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
    return (
      <div className="template-preview">
        <h3>Template Preview</h3>
        <div className="wa-phone-container">
          <div className="wa-phone-header">
            <div className="wa-phone-notch"></div>
          </div>
          <div className="wa-phone-content">
            <div className="wa-chat-header">
              <div className="wa-chat-profile">
              <div className="wa-chat-avatar">
                  {businessDetails.profileImage ? (
                    <img 
                      src={businessDetails.profileImage} 
                      alt="Business Logo" 
                      className="wa-business-dp"
                      onError={(e) => {
                        e.target.onerror = null; 
                        e.target.src = '/default-business-icon.png';
                      }}
                    />
                  ) : (
                    <div className="wa-business-dp-fallback">
                      {businessDetails.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="wa-chat-info">
                  <div className="wa-chat-name">{businessDetails.name}</div>
                  <div className="wa-chat-status">Online</div>
                </div>
              </div>
            </div>
            
            <div className="wa-chat-messages">
              <div className="wa-template-message">
                <div className="wa-template-container">
                  {/* Header Media or Text */}
                  {headerType === 'image' && (
                    <div className="wa-template-media">
                      {headerFilePreview ? (
                        <img src={headerFilePreview} alt="Header" />
                      ) : (
                        <div className="wa-media-placeholder">
                          <Camera size={24} color="#8696a0" />
                          <span>Image</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {headerType === 'video' && (
                    <div className="wa-template-media">
                      {headerFilePreview ? (
                        <video src={headerFilePreview} controls />
                      ) : (
                        <div className="wa-media-placeholder">
                          <Video size={24} color="#8696a0" />
                          <span>Video</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {headerType === 'text' && formData.headerText && (
                    <div className="wa-template-header">{formData.headerText}</div>
                  )}
                  {headerType === 'document' && (
                <div className="wa-template-media">
                  {headerFilePreview ? (
                    <div className="wa-document-preview">
                      <FileText size={48} />
                      <span>{headerFilePreview.name}</span>
                    </div>
                  ) : (
                    <div className="wa-media-placeholder">
                      <FileText size={24} color="#8696a0" />
                      <span>Document</span>
                    </div>
                  )}
                </div>
              )}
                  
                  {/* Message Body */}
                  {formData.bodyText && (
                    <div className="wa-template-body">
                      {renderBodyWithVariables()}
                    </div>
                  )}
                  
                  {/* Footer */}
                  {formData.footerText && (
                    <div className="wa-template-footer">{formData.footerText}</div>
                  )}
                  
                  {/* Buttons */}
                  {formData.buttons.length > 0 && (
                    <div className="wa-template-buttons">
                      {formData.buttons.map((button, index) => (
                        <div key={index} className="wa-template-button">
                          {button.type === 'url' && <ExternalLink size={16} />}
                          {button.type === 'phone_number' && <Phone size={16} />}
                          {button.type === 'quick_reply' && <Copy size={16} />}
                          <span>{button.text || `Button ${index + 1}`}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Message Time with Check marks */}
                  <div className="wa-template-time">
                    {currentTime}
                    <svg viewBox="0 0 16 15" width="14" height="14">
                      <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="create-template">
      <div className="page-header">
        <button 
          className="back-link"
          onClick={() => navigate('/templates')}
        >
          <ArrowLeft size={16} />
          <span>Back to Templates</span>
        </button>
        <h2>
          {id ? 'Edit Template' : 
           state?.draftTemplate ? 'Continue Draft Template' : 'Create Message Template'}
        </h2>
      </div>
      
      {error && <div className="error-alert">{error}</div>}
      
      <div className="template-form-container">
        <form className="template-form card">
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
                  onChange={handleInputChange}
                  placeholder="Enter template name"
                  required
                />
                <p className="field-helper">Internal name for your template</p>
              </div>
              
              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="template-category">Category</label>
                  <select
                    id="template-category"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                  >
                    <option value="marketing">Marketing</option>
                    <option value="utility">Utility</option>
                  </select>
                </div>
                
                <div className="form-field">
                  <label htmlFor="template-language">Language</label>
                  <select
                    id="template-language"
                    name="language"
                    value={formData.language}
                    onChange={handleInputChange}
                  >
                    <option value="en">English</option>
                    <option value="en_US">English (US)</option>
                    <option value="es_ES">Spanish (Spain)</option>
                    <option value="fr_FR">French (France)</option>
                    <option value="pt_BR">Portuguese (Brazil)</option>
                    <option value="ta">Tamil</option>
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
                onClick={() => handleTabChange('header')}
              >
                Header
              </button>
              <button
                type="button"
                className={`section-tab ${activeTab === 'body' ? 'active' : ''}`}
                onClick={() => handleTabChange('body')}
              >
                Body
              </button>
              <button
                type="button"
                className={`section-tab ${activeTab === 'footer' ? 'active' : ''}`}
                onClick={() => handleTabChange('footer')}
              >
                Footer
              </button>
              <button
                type="button"
                className={`section-tab ${activeTab === 'buttons' ? 'active' : ''}`}
                onClick={() => handleTabChange('buttons')}
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
          
          <div className="form-actions">
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={handleSaveAsDraft}
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Save as Draft'}
            </button>
            <button 
              type="button" 
              className="btn btn-primary"
              onClick={handleSubmitToWhatsApp}
              disabled={isLoading}
            >
              {isLoading ? 'Submitting...' : 'Submit to WhatsApp'}
            </button>
          </div>
        </form>
        
        {renderPreview()}
      </div>
    </div>
  );
}

export default CreateTemplate;