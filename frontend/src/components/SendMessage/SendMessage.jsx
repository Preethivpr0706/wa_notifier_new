import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Users, Image, Video, Upload, BarChart3, Send, ChevronRight } from 'lucide-react';
import FieldMapper from './FieldMapper';
import { templateService } from '../../api/templateService';
import { getContacts } from '../../api/contactService';
import { messageService } from '../../api/messageService';
import MediaUploadModal from './MediaUploadModal';
import './SendMessage.css';

function SendMessage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [templates, setTemplates] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showMediaUpload, setShowMediaUpload] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedMedia, setSelectedMedia] = useState(null);

  const [formData, setFormData] = useState({
    templateId: '',
    audienceType: 'all',
    customAudience: '',
    scheduledTime: '',
    scheduledDate: '',
    sendNow: true,
    fieldMappings: {}
  });

  // Fetch templates and contacts
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [templatesRes, contactsRes] = await Promise.all([
          templateService.getTemplates({ status: 'approved' }),
          getContacts()
        ]);
        
        setTemplates(templatesRes.data?.templates || []);
        setContacts(contactsRes.data || []);
      } catch (err) {
        setError('Failed to load data: ' + (err.response?.data?.message || err.message));
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleMappingChange = (mappings) => {
    setFormData(prev => ({
      ...prev,
      fieldMappings: mappings
    }));
  };

  // In the handleMediaUpload function
// In the handleMediaUpload function
const handleMediaUpload = async (file) => {
  try {
    setIsLoading(true);
    setUploadProgress(0);
    
    // Use templateService instead of direct axios call
    const response = await templateService.uploadMediaToWhatsApp(
      file,
      formData.templateId,
      selectedTemplate.header_type
    );

    setSelectedMedia({
      id: response.whatsappMediaId,
      type: file.type.startsWith('image') ? 'image' : 'video',
      name: file.name
    });
    
    setShowMediaUpload(false);
  } catch (err) {
    setError('Failed to upload media: ' + (err.response?.data?.message || err.message));
  } finally {
    setIsLoading(false);
    setUploadProgress(0);
  }
};

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setIsLoading(true);
      
      // Prepare payload
      const payload = {
        templateId: formData.templateId,
        audienceType: formData.audienceType,
        contacts: formData.audienceType === 'custom' ? formData.customAudience : undefined,
        fieldMappings: formData.fieldMappings,
        sendNow: formData.sendNow,
        scheduledAt: formData.sendNow ? undefined : 
          `${formData.scheduledDate}T${formData.scheduledTime}:00Z`
      };
      
      // Call API to send messages
      const response = await messageService.sendBulkMessages(payload);
      
      // Navigate to campaigns page
      navigate('/campaigns', { 
        state: { success: 'Messages sent successfully!' } 
      });
    } catch (err) {
      setError('Failed to send messages: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsLoading(false);
    }
  };

  const selectedTemplate = templates.find(t => t.id === formData.templateId);
  const contactFields = contacts.length > 0 ? Object.keys(contacts[0]) : [];

  return (
    <div className="send-message">
      <div className="page-header">
        <h2>Send Message</h2>
      </div>
      
      {/* Progress steps... */}
      <div className="progress-steps">
        <div className={`step ${step >= 1 ? 'active' : ''}`}>
          <span>1. Select Template</span>
        </div>
        <ChevronRight size={20} />
        <div className={`step ${step >= 2 ? 'active' : ''}`}>
          <span>2. Select Audience</span>
        </div>
        <ChevronRight size={20} />
        <div className={`step ${step >= 3 ? 'active' : ''}`}>
          <span>3. Map Fields</span>
        </div>
        <ChevronRight size={20} />
        <div className={`step ${step >= 4 ? 'active' : ''}`}>
          <span>4. Send</span>
        </div>
      </div>
      
      {error && <div className="error-alert">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        {/* Step 1: Template Selection */}
        {step === 1 && (
          <div className="form-step card">
            <h3 className="section-title">
              <FileText size={18} />
              <span>Select Template</span>
            </h3>
            
            <div className="form-field">
              <label htmlFor="templateId">Message Template</label>
              <select
                id="templateId"
                name="templateId"
                value={formData.templateId}
                onChange={handleInputChange}
                required
              >
                <option value="">Select a template</option>
                {templates.map(template => (
                  <option key={template.id} value={template.id}>
                    {template.name} ({template.category})
                  </option>
                ))}
              </select>
            </div>
            
            {selectedTemplate && (
              <div className="template-preview">
                <h4>Template Preview</h4>
                <div className="template-content">
                  {selectedTemplate.header_type && selectedTemplate.header_content && (
                    <div className={`template-header ${selectedTemplate.header_type}`}>
                      {selectedTemplate.header_type === 'text' ? (
                        selectedTemplate.header_content
                      ) : (
                        <div className="media-preview">
                          {selectedTemplate.header_type === 'image' ? (
                            <Image size={48} />
                          ) : (
                            <Video size={48} />
                          )}
                          <span>Media Attachment</span>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="template-body">
                    {selectedTemplate.body_text}
                  </div>
                  {selectedTemplate.footer_text && (
                    <div className="template-footer">
                      {selectedTemplate.footer_text}
                    </div>
                  )}
                </div>
                
                {/* Media upload button for media headers */}
                {selectedTemplate.header_type && 
                 ['image', 'video'].includes(selectedTemplate.header_type) && (
                  <div className="media-upload-section">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowMediaUpload(true)}
                    >
                      <Upload size={16} />
                      <span>Upload {selectedTemplate.header_type}</span>
                    </button>
                    
                    {selectedMedia && (
                      <div className="media-info">
                        <span>{selectedMedia.name}</span>
                        <span className="media-id">ID: {selectedMedia.id}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            <div className="step-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setStep(2)}
                disabled={!formData.templateId}
              >
                Next
              </button>
            </div>
          </div>
        )}
        
         {/* Step 2: Audience Selection */}
         {step === 2 && (
          <div className="form-step card">
            <h3 className="section-title">
              <Users size={18} />
              <span>Select Audience</span>
            </h3>
            
            <div className="form-field">
              <label>Audience Type</label>
              <div className="radio-group">
                <label>
                  <input
                    type="radio"
                    name="audienceType"
                    value="all"
                    checked={formData.audienceType === 'all'}
                    onChange={handleInputChange}
                  />
                  All Contacts ({contacts.length})
                </label>
                
                <label>
                  <input
                    type="radio"
                    name="audienceType"
                    value="custom"
                    checked={formData.audienceType === 'custom'}
                    onChange={handleInputChange}
                  />
                  Custom List
                </label>
              </div>
            </div>
            
            {formData.audienceType === 'custom' && (
              <div className="form-field">
                <label htmlFor="customAudience">Upload CSV File</label>
                <input
                  type="file"
                  id="customAudience"
                  name="customAudience"
                  accept=".csv"
                  onChange={handleInputChange}
                />
              </div>
            )}
            
            <div className="step-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setStep(1)}
              >
                Back
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setStep(3)}
              >
                Next
              </button>
            </div>
          </div>
        )}
        
        {/* Step 3: Field Mapping */}
        {step === 3 && selectedTemplate && (
          <div className="form-step card">
            <h3 className="section-title">
              <span>Map Template Variables</span>
            </h3>
            
            <FieldMapper
              templateVariables={extractVariables(selectedTemplate.body_text)}
              contactFields={contactFields}
              onMappingChange={handleMappingChange}
            />
            
            <div className="step-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setStep(2)}
              >
                Back
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setStep(4)}
              >
                Next
              </button>
            </div>
          </div>
        )}
        
        {/* Step 4: Send Options */}
        {step === 4 && (
          <div className="form-step card">
            <h3 className="section-title">
              <BarChart3 size={18} />
              <span>Delivery Options</span>
            </h3>
            
            <div className="form-field checkbox-field">
              <label>
                <input
                  type="checkbox"
                  name="sendNow"
                  checked={formData.sendNow}
                  onChange={handleInputChange}
                />
                Send immediately
              </label>
            </div>
            
            {!formData.sendNow && (
              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="scheduledDate">Date</label>
                  <input
                    type="date"
                    id="scheduledDate"
                    name="scheduledDate"
                    value={formData.scheduledDate}
                    onChange={handleInputChange}
                    min={new Date().toISOString().split('T')[0]}
                    required={!formData.sendNow}
                  />
                </div>
                
                <div className="form-field">
                  <label htmlFor="scheduledTime">Time</label>
                  <input
                    type="time"
                    id="scheduledTime"
                    name="scheduledTime"
                    value={formData.scheduledTime}
                    onChange={handleInputChange}
                    required={!formData.sendNow}
                  />
                </div>
              </div>
            )}
            
            <div className="summary-section">
              <h4>Summary</h4>
              <p><strong>Template:</strong> {selectedTemplate?.name}</p>
              <p><strong>Audience:</strong> {formData.audienceType === 'all' ? 
                `All Contacts (${contacts.length})` : 'Custom List'}</p>
              <p><strong>Delivery:</strong> {formData.sendNow ? 
                'Immediate' : 'Scheduled'}</p>
            </div>
            
            <div className="step-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setStep(3)}
              >
                Back
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isLoading}
              >
                {isLoading ? 'Sending...' : 'Send Messages'}
              </button>
            </div>
          </div>
        )}
      </form>
      
      {/* Media Upload Modal */}
      <MediaUploadModal
        isOpen={showMediaUpload}
        onClose={() => setShowMediaUpload(false)}
        onUpload={handleMediaUpload}
        fileType={selectedTemplate?.header_type}
        progress={uploadProgress}
      />
    </div>
  );
}

 
// Helper function to extract variables from template text
function extractVariables(text) {
  if (!text) return [];
  const regex = /\{\{([^}]+)\}\}/g;
  const matches = [];
  let match;
  while (match = regex.exec(text)) {
    matches.push(match[1]);
  }
  return [...new Set(matches)]; // Return unique variables
}

export default SendMessage;