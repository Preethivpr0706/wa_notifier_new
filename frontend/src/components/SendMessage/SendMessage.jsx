import { useState } from 'react';
import { Users, FileText, BarChart3, Send } from 'lucide-react';
import './SendMessage.css';

function SendMessage() {
  const [formData, setFormData] = useState({
    template: '',
    audienceType: 'all',
    customAudience: '',
    scheduledTime: '',
    scheduledDate: '',
    sendNow: true
  });
  
  const templates = [
    { id: 1, name: 'Welcome Message', category: 'utility' },
    { id: 2, name: 'Order Confirmation', category: 'utility' },
    { id: 3, name: 'Special Offer', category: 'marketing' },
    { id: 4, name: 'Event Reminder', category: 'marketing' },
    { id: 5, name: 'Verification Code', category: 'authentication' }
  ];
  
  const audiences = [
    { id: 'all', name: 'All Contacts', count: 15000 },
    { id: 'active', name: 'Active Users', count: 8500 },
    { id: 'inactive', name: 'Inactive Users', count: 6500 },
    { id: 'new', name: 'New Users (Last 30 days)', count: 2200 }
  ];
  
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setFormData({
        ...formData,
        [name]: checked
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
    
    // If sendNow is checked, clear scheduled date and time
    if (name === 'sendNow' && checked) {
      setFormData(prev => ({
        ...prev,
        scheduledDate: '',
        scheduledTime: ''
      }));
    }
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission logic
    console.log('Send Message Form Data:', formData);
  };
  
  const selectedTemplate = templates.find(t => t.id === parseInt(formData.template, 10));
  const selectedAudience = audiences.find(a => a.id === formData.audienceType);
  const audienceCount = selectedAudience ? selectedAudience.count : 0;

  return (
    <div className="send-message">
      <div className="page-header">
        <h2>Send Message</h2>
      </div>
      
      <div className="send-message-container">
        <div className="send-form card">
          <form onSubmit={handleSubmit}>
            <div className="form-section">
              <h3 className="section-title">
                <FileText size={18} />
                <span>Select Template</span>
              </h3>
              <div className="form-field">
                <label htmlFor="template">Message Template</label>
                <select
                  id="template"
                  name="template"
                  value={formData.template}
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
                <div className="template-preview-small">
                  <h4>Template Preview</h4>
                  <div className="template-info">
                    <span className="template-name">{selectedTemplate.name}</span>
                    <span className="template-category">{selectedTemplate.category}</span>
                  </div>
                  <a href={`/templates/${selectedTemplate.id}`} className="btn-secondary">
                    View Full Template
                  </a>
                </div>
              )}
            </div>
            
            <div className="form-section">
              <h3 className="section-title">
                <Users size={18} />
                <span>Select Audience</span>
              </h3>
              <div className="audience-options">
                {audiences.map(audience => (
                  <div key={audience.id} className="audience-option">
                    <input
                      type="radio"
                      id={`audience-${audience.id}`}
                      name="audienceType"
                      value={audience.id}
                      checked={formData.audienceType === audience.id}
                      onChange={handleInputChange}
                    />
                    <label htmlFor={`audience-${audience.id}`} className="audience-label">
                      <div className="audience-info">
                        <span className="audience-name">{audience.name}</span>
                        <span className="audience-count">{audience.count.toLocaleString()} contacts</span>
                      </div>
                    </label>
                  </div>
                ))}
                
                <div className="audience-option">
                  <input
                    type="radio"
                    id="audience-custom"
                    name="audienceType"
                    value="custom"
                    checked={formData.audienceType === 'custom'}
                    onChange={handleInputChange}
                  />
                  <label htmlFor="audience-custom" className="audience-label">
                    <div className="audience-info">
                      <span className="audience-name">Custom Audience</span>
                      <span className="audience-count">Upload a CSV file</span>
                    </div>
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
                  <p className="field-helper">Upload a CSV file with phone numbers in international format</p>
                </div>
              )}
            </div>
            
            <div className="form-section">
              <h3 className="section-title">
                <BarChart3 size={18} />
                <span>Delivery Options</span>
              </h3>
              <div className="delivery-options">
                <div className="form-field checkbox-field">
                  <input
                    type="checkbox"
                    id="sendNow"
                    name="sendNow"
                    checked={formData.sendNow}
                    onChange={handleInputChange}
                  />
                  <label htmlFor="sendNow">Send immediately</label>
                </div>
                
                {!formData.sendNow && (
                  <div className="scheduled-fields">
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
                  </div>
                )}
              </div>
            </div>
            
            <div className="form-actions">
              <button type="submit" className="btn btn-primary send-button">
                <Send size={16} />
                <span>{formData.sendNow ? 'Send Now' : 'Schedule Message'}</span>
              </button>
            </div>
          </form>
        </div>
        
        <div className="send-summary card">
          <h3>Message Summary</h3>
          
          <div className="summary-section">
            <h4>Template</h4>
            <p>{selectedTemplate ? selectedTemplate.name : 'None selected'}</p>
          </div>
          
          <div className="summary-section">
            <h4>Audience</h4>
            <p>{selectedAudience ? selectedAudience.name : 'None selected'}</p>
            <p className="audience-count-large">{audienceCount.toLocaleString()} recipients</p>
          </div>
          
          <div className="summary-section">
            <h4>Delivery</h4>
            <p>{formData.sendNow ? 'Immediate delivery' : 'Scheduled delivery'}</p>
            {!formData.sendNow && formData.scheduledDate && formData.scheduledTime && (
              <p>{formData.scheduledDate} at {formData.scheduledTime}</p>
            )}
          </div>
          
          <div className="cost-estimate">
            <h4>Estimated Cost</h4>
            <div className="cost-breakdown">
              <div className="cost-item">
                <span>Message rate</span>
                <span>$0.005 per message</span>
              </div>
              <div className="cost-item">
                <span>Recipients</span>
                <span>{audienceCount.toLocaleString()}</span>
              </div>
              <div className="cost-total">
                <span>Total cost</span>
                <span>${(audienceCount * 0.005).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SendMessage;