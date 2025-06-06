import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, Edit, Trash, AlertCircle, Clock, RefreshCw, ExternalLink, Phone } from 'lucide-react';
import { templateService } from '../../api/templateService';
import './MessageTemplates.css';

function MessageTemplates() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, [activeFilter]);

  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const filters = {};
      if (activeFilter !== 'all') {
        if (['marketing', 'utility', 'authentication'].includes(activeFilter)) {
          filters.category = activeFilter;
        } else if (['approved', 'pending', 'rejected', 'draft'].includes(activeFilter)) {
          filters.status = activeFilter;
        }
      }
      
      const response = await templateService.getTemplates(filters);
      if (response.data?.templates) {
        setTemplates(response.data.templates);
      }
    } catch (err) {
      setError('Failed to load templates: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleCreateTemplate = () => {
    navigate('/templates/create');
  };

  const handleEditTemplate = (template) => {
    if (template.status === 'draft') {
      navigate('/templates/create', { 
        state: { 
          draftTemplate: template,
          isEditingDraft: true 
        } 
      });
    } else {
      navigate(`/templates/edit/${template.id}`, { 
        state: { template } 
      });
    }
  };

  const handlePreviewTemplate = (template) => {
    setSelectedTemplate(template);
  };

  const closePreview = (e) => {
    if (e.target === e.currentTarget) {
      setSelectedTemplate(null);
    }
  };

  const confirmDelete = (id) => {
    const template = templates.find(t => t.id === id);
    setTemplateToDelete(template);
    setDeleteConfirm(id);
  };

  const cancelDelete = () => {
    setDeleteConfirm(null);
    setTemplateToDelete(null);
  };

  const deleteTemplate = async () => {
    try {
      setIsDeleting(true);
      setError(null);
      
      if (templateToDelete?.status === 'draft') {
        const response = await templateService.deleteTemplate(deleteConfirm);
        
        if (response.success) {
          setTemplates(templates.filter(t => t.id !== deleteConfirm));
          setDeleteConfirm(null);
          setTemplateToDelete(null);
        } else {
          setError(response.message || 'Failed to delete template');
        }
        return;
      }
      
      const response = await templateService.deleteTemplate(deleteConfirm);
      
      if (response.success) {
        setTemplates(templates.filter(t => t.id !== deleteConfirm));
        setDeleteConfirm(null);
        setTemplateToDelete(null);
      } else {
        setError(response.message || 'Failed to delete template');
      }
    } catch (err) {
      setError(err.message || 'Failed to delete template');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCheckStatus = async (templateId) => {
    try {
      setIsCheckingStatus(true);
      setError(null);
      await templateService.checkTemplateStatus(templateId);
      fetchTemplates();
    } catch (err) {
      setError('Failed to check template status: ' + err.message);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleSubmitDraft = async (templateId) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await templateService.submitDraftTemplate(templateId);
      
      if (response.success) {
        fetchTemplates();
      } else {
        setError(response.message || 'Failed to submit draft template');
      }
    } catch (err) {
      setError('Failed to submit draft template: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let pollingInterval;
    
    if (templates.some(template => template.status === 'pending')) {
      pollingInterval = setInterval(() => {
        fetchTemplates();
      }, 30000);
    }

    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [templates]);

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const getCategoryLabel = (category) => {
    const labels = {
      marketing: 'Marketing',
      utility: 'Utility',
      authentication: 'Authentication'
    };
    return labels[category] || category;
  };

  const getStatusClass = (status) => {
    const statusClasses = {
      approved: 'status-approved',
      pending: 'status-pending',
      rejected: 'status-rejected',
      draft: 'status-draft'
    };
    return statusClasses[status] || '';
  };

  const formatDate = (dateString) => {
    const templateDate = new Date(dateString);
    const now = new Date();
    
    const templateDay = new Date(Date.UTC(
        templateDate.getUTCFullYear(), 
        templateDate.getUTCMonth(), 
        templateDate.getUTCDate()
    ));
    
    const today = new Date(Date.UTC(
        now.getUTCFullYear(), 
        now.getUTCMonth(), 
        now.getUTCDate()
    ));
    
    const diffDays = Math.floor((today - templateDay) / (1000 * 60 * 60 * 24));
    
if (diffDays === 0) return 'Today';
if (diffDays === 1) return 'Yesterday';
if (diffDays < 7) return `${diffDays} days ago`;
if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
return `${Math.floor(diffDays / 365)} years ago`;
  };

  const renderHeaderContent = (template) => {
    if (!template.header_type) return null;
    
    switch (template.header_type) {
      case 'text':
        return template.header_content && (
          <div className="template-header-content">{template.header_content}</div>
        );
      case 'image':
        return (
          <div className="template-header-image">
            <div className="image-placeholder">
              <span>Image Preview</span>
            </div>
          </div>
        );
      case 'document':
        return (
          <div className="template-header-document">
            <div className="document-icon">📄</div>
            <div className="document-name">{template.header_content || 'Document.pdf'}</div>
          </div>
        );
      case 'video':
        return (
          <div className="template-header-video">
            <div className="video-icon">🎬</div>
            <div className="video-name">{template.header_content || 'Video.mp4'}</div>
          </div>
        );
      default:
        return null;
    }
  };

  const renderTemplateButtons = (buttons) => {
    if (!buttons || buttons.length === 0) return null;

    return (
      <div className="template-buttons">
        {buttons.map((button, index) => {
          if (button.type === 'url') {
            return (
              <div key={index} className="template-button url-button">
                <ExternalLink size={14} />
                <span>{button.text}</span>
              </div>
            );
          } else if (button.type === 'call') {
            return (
              <div key={index} className="template-button call-button">
                <Phone size={14} />
                <span>{button.text}</span>
              </div>
            );
          } else {
            return (
              <div key={index} className="template-button">
                {button.text}
              </div>
            );
          }
        })}
      </div>
    );
  };

  const renderTemplateContent = (template) => {
    return (
      <div className="message-container">
        <div className="message-bubble received-message">
          {renderHeaderContent(template)}
          
          {template.body_text && (
            <div className="message-text">{template.body_text}</div>
          )}
          
          {template.footer_text && (
            <div className="template-footer">{template.footer_text}</div>
          )}
          
          {template.buttons && template.buttons.length > 0 && (
            renderTemplateButtons(template.buttons)
          )}
        </div>
      </div>
    );
  };

  const renderTemplatePreview = (template) => {
    return (
      <div className="phone-screen">
        <div className="chat-header">
          <div className="chat-avatar">
            <div className="profile-initials">YB</div>
          </div>
          <div className="chat-info">
            <div className="chat-name">Your Business</div>
            <div className="chat-status">Business Account</div>
          </div>
        </div>
        
        <div className="chat-messages">
          {renderTemplateContent(template)}
        </div>
      </div>
    );
  };

  return (
    <div className="message-templates">
      <div className="page-header">
        <h2>Message Templates</h2>
        <button onClick={handleCreateTemplate} className="btn btn-primary">
          <Plus size={16} />
          <span>Create Template</span>
        </button>
      </div>

      {error && <div className="error-alert">{error}</div>}

      <div className="filters-bar">
        <div className="search-container">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="search-input"
          />
        </div>
        
        <div className="filter-tabs">
          <button 
            className={`filter-tab ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => handleFilterChange('all')}
          >
            All
          </button>
          <button 
            className={`filter-tab ${activeFilter === 'marketing' ? 'active' : ''}`}
            onClick={() => handleFilterChange('marketing')}
          >
            Marketing
          </button>
          <button 
            className={`filter-tab ${activeFilter === 'utility' ? 'active' : ''}`}
            onClick={() => handleFilterChange('utility')}
          >
            Utility
          </button>
          <button 
            className={`filter-tab ${activeFilter === 'authentication' ? 'active' : ''}`}
            onClick={() => handleFilterChange('authentication')}
          >
            Authentication
          </button>
          <button 
            className={`filter-tab ${activeFilter === 'approved' ? 'active' : ''}`}
            onClick={() => handleFilterChange('approved')}
          >
            Approved
          </button>
          <button 
            className={`filter-tab ${activeFilter === 'pending' ? 'active' : ''}`}
            onClick={() => handleFilterChange('pending')}
          >
            Pending
          </button>
          <button 
            className={`filter-tab ${activeFilter === 'draft' ? 'active' : ''}`}
            onClick={() => handleFilterChange('draft')}
          >
            Draft
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading templates...</p>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="empty-state">
          <AlertCircle size={48} />
          <h3>No templates found</h3>
          <p>Try adjusting your search or filter settings</p>
        </div>
      ) : (
        <div className="templates-grid">
          {filteredTemplates.map((template) => (
            <div key={template.id} className="template-card card">
              <div className="template-header">
                <div className="template-category">
                  {getCategoryLabel(template.category)}
                </div>
               
                <div className="template-status-container">
                  <div className={`template-status ${getStatusClass(template.status)}`}>
                    {template.status}
                  </div>
                  {template.status === 'pending' && (
                    <button 
                      className="btn-icon" 
                      onClick={() => handleCheckStatus(template.id)}
                      title="Check status"
                      disabled={isCheckingStatus}
                    >
                      <RefreshCw size={16} className={isCheckingStatus ? "spinning" : ""} />
                    </button>
                  )}
                  {template.status === 'rejected' && template.rejection_reason && (
                    <div className="rejection-reason">
                      Reason: {template.rejection_reason}
                    </div>
                  )}
                </div>
              </div>
              
              <h3 className="template-name">{template.name}</h3>
              
              <div className="template-preview">
                {renderTemplateContent(template)}
              </div>
              
              <div className="template-info">
                <div className="info-item">
                  <span className="info-label">Language:</span>
                  <span className="info-value">{template.language}</span>
                </div>
                <div className="info-item">
                  <Clock size={14} />
                  <span className="info-value">{formatDate(template.created_at)}</span>
                </div>
              </div>
              
              <div className="template-actions">
                <button 
                  className="btn-secondary"
                  onClick={() => handlePreviewTemplate(template)}
                >
                  <Eye size={16} />
                  <span>Preview</span>
                </button>
                
                {template.status === 'draft' && (
                  <button
                    className="btn btn-primary"
                    onClick={() => handleSubmitDraft(template.id)}
                    disabled={isLoading}
                  >
                    <RefreshCw size={16} />
                    <span>Submit</span>
                  </button>
                )}
                
                <div className="action-buttons">
                  <button 
                    className="action-btn"
                    onClick={() => handleEditTemplate(template)}
                    title={template.status === 'draft' ? 'Continue editing' : 'Edit template'}
                  >
                    <Edit size={16} />
                  </button>

                  <button 
                    className="action-btn delete-btn"
                    onClick={() => confirmDelete(template.id)}
                    title="Delete template"
                  >
                    <Trash size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Delete Template?</h3>
            {templateToDelete?.status === 'draft' ? (
              <p>This draft template will be permanently deleted from the system.</p>
            ) : templateToDelete?.whatsapp_id ? (
              <div className="whatsapp-warning">
                <AlertCircle size={16} />
                <span>This template is registered with WhatsApp (ID: {templateToDelete.whatsapp_id})</span>
              </div>
            ) : null}
            <p>Are you sure you want to delete "{templateToDelete?.name}"?</p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={cancelDelete}>
                Cancel
              </button>
              <button 
                className="btn btn-danger" 
                onClick={deleteTemplate}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedTemplate && (
        <div className="modal-overlay" onClick={closePreview}>
          <div className="modal-content preview-modal">
            <div className="preview-header">
              <h3>Template Preview</h3>
              <button className="close-btn" onClick={closePreview}>×</button>
            </div>
            <div className="preview-content">
              <div className="phone-preview">
                {renderTemplatePreview(selectedTemplate)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MessageTemplates;