import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Users, Image, Video, Upload, BarChart3, Send, ChevronRight } from 'lucide-react';
import FieldMapper from './FieldMapper';
import { templateService } from '../../api/templateService';
import { getContacts, getListsForSending } from '../../api/contactService';
import { messageService } from '../../api/messageService';
import MediaUploadModal from './MediaUploadModal';
import './SendMessage.css';
import Papa from 'papaparse';

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
  const [contactLists, setContactLists] = useState([]);
  const [csvFields, setCsvFields] = useState([]);
  const [csvData, setCsvData] = useState([]);
  const [fileName, setFileName] = useState([]);
  // Add to your component's state
const [validationErrors, setValidationErrors] = useState([]);
const [successMessage, setSuccessMessage] = useState('');
  const [formData, setFormData] = useState({
    templateId: '',
    audienceType: 'all',
    customAudience: '',
    scheduledTime: '',
    scheduledDate: '',
    sendNow: true,
    fieldMappings: {}
  });
 const fileInputRef = useRef(null);
  // Fetch templates and contacts
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [templatesRes, contactsRes, listsRes] = await Promise.all([
          templateService.getTemplates({ status: 'approved' }),
          getContacts(),
          getListsForSending() // You'll need to implement this API call
        ]);
        
        setTemplates(templatesRes.data?.templates || []);
        setContacts(contactsRes.data || []);
        setContactLists(listsRes.data || []);
      } catch (err) {
        setError('Failed to load data: ' + (err.response?.data?.message || err.message));
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);
  const handleFileUpload = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  setFileName(file.name);
  setValidationErrors([]);
  setSuccessMessage('');

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      const { data, errors } = results;
      
      if (errors.length > 0) {
        setValidationErrors(errors.map(err => err.message));
        return;
      }

      // Validate required fields
      const requiredFields = ['wanumber'];
      const validationErrors = [];
      const validData = data.filter(row => {
        const hasAllFields = requiredFields.every(field => row[field]);
        if (!hasAllFields) {
          validationErrors.push(`Row missing required field(s)`);
        }
        return hasAllFields;
      });

      if (validationErrors.length > 0) {
        setValidationErrors(validationErrors);
        return;
      }

      // Transform data to match expected contact structure
      const transformedData = validData.map(row => ({
        id: row.id || `csv-${Math.random().toString(36).substr(2, 9)}`,
        wanumber: row.wanumber,
        fname: row.fname || '',
        lname: row.lname || '',
        email: row.email || '',
        list_id: row.list_id || null,
        list_name: row.list_name || 'CSV Import'
      }));

      setCsvFields(Object.keys(data[0]));
      setCsvData(transformedData);
      setSuccessMessage(`Successfully loaded ${transformedData.length} contacts`);
    },
    error: (error) => {
      setValidationErrors([`Error parsing CSV: ${error.message}`]);
    }
  });
};

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
    
    let targetContacts = [];
    
    if (formData.audienceType === 'all') {
      targetContacts = contacts;
    } 
    else if (formData.audienceType === 'list') {
      targetContacts = contacts.filter(c => c.list_id === formData.contactList);
    }
    else if (formData.audienceType === 'custom') {
      targetContacts = csvData;
    }
    
    // Ensure audienceType is lowercase to match backend expectations
    const payload = {
      templateId: formData.templateId,
      audience_type: formData.audienceType.toLowerCase(), // Convert to lowercase
      contacts: targetContacts.map(c => ({
        id: c.id,
        wanumber: c.wanumber,
        fname: c.fname || '',
        lname: c.lname || '',
        email: c.email || '',
        list_id: c.list_id || null
      })),
      fieldMappings: formData.fieldMappings,
      sendNow: formData.sendNow,
      scheduledAt: formData.sendNow ? null : 
        `${formData.scheduledDate}T${formData.scheduledTime}:00Z`,
      list_id: formData.audienceType === 'list' ? formData.contactList : null,
      is_custom: formData.audienceType === 'custom'
    };

    console.log('Sending payload:', payload); // Debug log
    const response = await messageService.sendBulkMessages(payload);
    navigate('/campaigns', { 
      state: { success: 'Messages sent successfully!' } 
    });
  } catch (err) {
    const errorMsg = err.response?.data?.message || err.message || 'Failed to send messages';
    setError(errorMsg);
    console.error('Send error:', err.response?.data || err);
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
            value="list"
            checked={formData.audienceType === 'list'}
            onChange={handleInputChange}
          />
          Select from Existing Lists
        </label>
        
        <label>
          <input
            type="radio"
            name="audienceType"
            value="custom"
            checked={formData.audienceType === 'custom'}
            onChange={handleInputChange}
          />
          Upload Custom CSV
        </label>
      </div>
    </div>
    
    {formData.audienceType === 'list' && (
      <div className="form-field">
        <label htmlFor="contactList">Select Contact List</label>
        <select
          id="contactList"
          name="contactList"
          value={formData.contactList}
          onChange={handleInputChange}
        >
          <option value="">Select a list</option>
          {contactLists.map(list => (
            <option key={list.id} value={list.id}>
              {list.name} ({list.contactCount || 0} contacts)
            </option>
          ))}
        </select>
      </div>
    )}
    
    {formData.audienceType === 'custom' && (
      <div className="form-field">
        <label htmlFor="customAudience">Upload CSV File</label>
        <input
          type="file"
          id="customAudience"
          name="customAudience"
          accept=".csv"
          onChange={handleFileUpload}
          ref={fileInputRef}
        />
        {csvFields.length > 0 && (
          <div className="csv-preview">
            <p>Detected fields in CSV: {csvFields.join(', ')}</p>
          </div>
        )}
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
        disabled={
          (formData.audienceType === 'list' && !formData.contactList) ||
          (formData.audienceType === 'custom' && csvData.length === 0)
        }
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
    
    {extractVariables(selectedTemplate.body_text).length > 0 ? (
      // Show FieldMapper only if variables exist
      <FieldMapper
        templateVariables={extractVariables(selectedTemplate.body_text)}
        contactFields={formData.audienceType === 'custom' ? csvFields : contactFields}
        onMappingChange={handleMappingChange}
      />
    ) : (
      // Show message when no variables exist
      <div className="no-variables-message">
        <div className="info-alert">
          <p>This template doesn't contain any variables to map.</p>
          <p>You can proceed to the next step.</p>
        </div>
      </div>
    )}
    
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