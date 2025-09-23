import { useState, useRef, forwardRef, useImperativeHandle, useEffect } from 'react';
import { Camera, Video, ExternalLink, Phone, Copy, Plus, X, FileText } from 'lucide-react';
import { CATEGORIES, LANGUAGES } from './templateConstants';
import { templateService } from '../../api/templateService';
import './TemplateForm.css';

const TemplateForm = forwardRef(({ initialData, onSubmit, isSubmitting, businessDetails }, ref) => {
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
        const isDocument = file.type === 'application/pdf';
        const maxSize = formData.headerType === 'video' ? 16 * 1024 * 1024 : 
                        formData.headerType === 'document' ? 100 * 1024 * 1024 : 
                        5 * 1024 * 1024;

        if (formData.headerType === 'image' && !isImage) {
            setErrors({ ...errors, header: 'Please select an image file (JPEG, PNG)' });
            return;
        }

        if (formData.headerType === 'video' && !isVideo) {
            setErrors({ ...errors, header: 'Please select a video file (MP4)' });
            return;
        }

        if (formData.headerType === 'document' && !isDocument) {
            setErrors({ ...errors, header: 'Please select a PDF document' });
            return;
        }

        if (file.size > maxSize) {
            setErrors({ ...errors, header: `File size exceeds the limit (${maxSize / (1024 * 1024)}MB)` });
            return;
        }

        setHeaderFile(file);
        if (formData.headerType === 'document') {
            setHeaderFilePreview(file); // Store the file object directly for documents
        } else {
            const reader = new FileReader();
            reader.onloadend = () => setHeaderFilePreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e) => {
        if (e) e.preventDefault();
        handleFormSubmit();
    };

    const validateForm = () => {
        const errors = {};
        
        if (!formData.name.trim()) {
            errors.name = 'Template name is required';
        }
        
        if (!formData.bodyText.trim()) {
            errors.bodyText = 'Body text is required';
        }
        
        return errors;
    };

    const handleFormSubmit = async () => {
        const validationErrors = validateForm();
        
        if (Object.keys(validationErrors).length === 0) {
            let headerContent = formData.headerContent;
            
            // Only process header if there's content
            if (formData.headerType !== 'none' && 
                ((formData.headerType === 'text' && formData.headerText) || 
                 ((formData.headerType === 'image' || formData.headerType === 'video' || formData.headerType === 'document') && headerFile))) {
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
    
            // Create FormData for the file upload
            const fileFormData = new FormData();
            fileFormData.append('file', file);
            fileFormData.append('fileSize', file.size.toString());
    
            // For documents, add filename if not PDF
            if (formData.headerType === 'document' && !file.name.endsWith('.pdf')) {
                fileFormData.append('filename', `${file.name}.pdf`);
            }
    
            // Upload file with progress tracking
            const uploadResponse = await templateService.uploadFileToSession(
                sessionId,
                fileFormData,
                (progressEvent) => {
                    if (progressEvent.lengthComputable) {
                        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        setUploadProgress(progress);
                    }
                }
            );
    
            // Verify and return the media handle
            const mediaHandle = uploadResponse?.data?.data?.h;
            if (!mediaHandle) {
                throw new Error('Upload completed but no media handle received');
            }
            
            return mediaHandle;
        } catch (error) {
            console.error('Upload error:', error);
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
                    <button
                        type="button"
                        className={`type-option ${formData.headerType === 'document' ? 'active' : ''}`}
                        onClick={() => handleHeaderTypeChange('document')}
                    >
                        <FileText size={16} />
                        <span>Document</span>
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

                {formData.headerType === 'document' && (
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
                parts.push(<span key={match.index} className="wa-template-variable">{sample}</span>);
                lastIndex = regex.lastIndex;
            }
            
            if (lastIndex < text.length) {
                parts.push(text.substring(lastIndex));
            }
            
            return parts.length ? parts : text;
        };

        // const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

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
                                    {businessDetails?.profileImage ? (
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
                                            {businessDetails?.name?.charAt(0).toUpperCase() || 'B'}
                                        </div>
                                    )}
                                </div>
                                <div className="wa-chat-info">
                                    <div className="wa-chat-name">{businessDetails?.name || 'Your Business'}</div>
                                    <div className="wa-chat-status">Online</div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="wa-chat-messages">
                            <div className="wa-template-message">
                                <div className="wa-template-container">
                                    {/* Header Media or Text */}
                                    {formData.headerType === 'image' && (
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
                                    
                                    {formData.headerType === 'video' && (
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
                                    
                                    {formData.headerType === 'text' && formData.headerText && (
                                        <div className="wa-template-header">{formData.headerText}</div>
                                    )}

                                    {formData.headerType === 'document' && (
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
                                    {/* <div className="wa-template-time">
                                        {currentTime}
                                        <svg viewBox="0 0 16 15" width="14" height="14">
                                            <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z" />
                                        </svg>
                                    </div> */}
                                </div>
                            </div>
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
                                disabled={isSubmittedToWhatsApp}
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
                                    disabled={isSubmittedToWhatsApp}
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