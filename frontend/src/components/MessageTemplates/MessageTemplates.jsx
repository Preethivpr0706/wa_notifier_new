import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, Edit, Trash, AlertCircle, Clock, RefreshCw, ExternalLink, Phone, ChevronLeft, ChevronRight } from 'lucide-react';
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
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12); // Show 12 templates per page
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchTemplates();
  }, [activeFilter, currentPage]);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filter changes
  }, [activeFilter, searchQuery]);

  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const filters = {};
      if (activeFilter !== 'all') {
        if (['marketing', 'utility'].includes(activeFilter)) {
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

  // Filter and paginate templates
  const filteredTemplates = templates.filter((template) => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Calculate pagination
  const totalFilteredTemplates = filteredTemplates.length;
  const calculatedTotalPages = Math.ceil(totalFilteredTemplates / itemsPerPage);
  
  useEffect(() => {
    setTotalPages(calculatedTotalPages);
  }, [calculatedTotalPages]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTemplates = filteredTemplates.slice(startIndex, endIndex);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const getCategoryLabel = (category) => {
    const labels = {
      marketing: 'Marketing',
      utility: 'Utility'
    };
    return labels[category] || category;
  };

  const getStatusClass = (status) => {
    const statusClasses = {
      approved: 'message-templates__status--approved',
      pending: 'message-templates__status--pending',
      rejected: 'message-templates__status--rejected',
      draft: 'message-templates__status--draft'
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
          <div className="message-templates__header-content">{template.header_content}</div>
        );
      case 'image':
        return (
          <div className="message-templates__header-image">
            <div className="message-templates__image-placeholder">
              <span>Image Preview</span>
            </div>
          </div>
        );
      case 'document':
        return (
          <div className="message-templates__header-document">
            <div className="message-templates__document-icon">📄</div>
            <div className="message-templates__document-name">{template.header_content || 'Document.pdf'}</div>
          </div>
        );
      case 'video':
        return (
          <div className="message-templates__header-video">
            <div className="message-templates__video-icon">🎬</div>
            <div className="message-templates__video-name">{template.header_content || 'Video.mp4'}</div>
          </div>
        );
      default:
        return null;
    }
  };

  const renderTemplateButtons = (buttons) => {
    if (!buttons || buttons.length === 0) return null;

    return (
      <div className="message-templates__buttons">
        {buttons.map((button, index) => {
          if (button.type === 'url') {
            return (
              <div key={index} className="message-templates__button message-templates__button--url">
                <ExternalLink size={14} />
                <span>{button.text}</span>
              </div>
            );
          } else if (button.type === 'call') {
            return (
              <div key={index} className="message-templates__button message-templates__button--call">
                <Phone size={14} />
                <span>{button.text}</span>
              </div>
            );
          } else {
            return (
              <div key={index} className="message-templates__button">
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
      <div className="message-templates__message-container">
        <div className="message-templates__message-bubble message-templates__message-bubble--received">
          {renderHeaderContent(template)}
          
          {template.body_text && (
            <div className="message-templates__message-text">{template.body_text}</div>
          )}
          
          {template.footer_text && (
            <div className="message-templates__footer">{template.footer_text}</div>
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
      <div className="message-templates__phone-screen">
        <div className="message-templates__chat-header">
          <div className="message-templates__chat-avatar">
            <div className="message-templates__profile-initials">YB</div>
          </div>
          <div className="message-templates__chat-info">
            <div className="message-templates__chat-name">Your Business</div>
            <div className="message-templates__chat-status">Business Account</div>
          </div>
        </div>
        
        <div className="message-templates__chat-messages">
          {renderTemplateContent(template)}
        </div>
      </div>
    );
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pageNumbers = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="message-templates__pagination">
        <div className="message-templates__pagination-info">
          Showing {startIndex + 1}-{Math.min(endIndex, totalFilteredTemplates)} of {totalFilteredTemplates} templates
        </div>
        
        <div className="message-templates__pagination-controls">
          <button
            className="message-templates__pagination-btn message-templates__pagination-btn--prev"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft size={16} />
            Previous
          </button>
          
          <div className="message-templates__pagination-numbers">
            {startPage > 1 && (
              <>
                <button
                  className="message-templates__pagination-number"
                  onClick={() => handlePageChange(1)}
                >
                  1
                </button>
                {startPage > 2 && <span className="message-templates__pagination-ellipsis">...</span>}
              </>
            )}
            
            {pageNumbers.map(page => (
              <button
                key={page}
                className={`message-templates__pagination-number ${
                  page === currentPage ? 'message-templates__pagination-number--active' : ''
                }`}
                onClick={() => handlePageChange(page)}
              >
                {page}
              </button>
            ))}
            
            {endPage < totalPages && (
              <>
                {endPage < totalPages - 1 && <span className="message-templates__pagination-ellipsis">...</span>}
                <button
                  className="message-templates__pagination-number"
                  onClick={() => handlePageChange(totalPages)}
                >
                  {totalPages}
                </button>
              </>
            )}
          </div>
          
          <button
            className="message-templates__pagination-btn message-templates__pagination-btn--next"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="message-templates">
      <div className="message-templates__header">
        <div className="message-templates__header-content">
          <h1 className="message-templates__title">Message Templates</h1>
          <p className="message-templates__subtitle">
            Create and manage WhatsApp message templates for your business
          </p>
        </div>
        <button onClick={handleCreateTemplate} className="message-templates__create-btn">
          <Plus size={18} />
          <span>Create Template</span>
        </button>
      </div>

      {error && (
        <div className="message-templates__error-alert">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="message-templates__filters-section">
        <div className="message-templates__search-container">
          <Search size={18} className="message-templates__search-icon" />
          <input
            type="text"
            placeholder="Search templates by name..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="message-templates__search-input"
          />
        </div>
        
        <div className="message-templates__filter-tabs">
          {[
            { key: 'all', label: 'All Templates' },
            { key: 'marketing', label: 'Marketing' },
            { key: 'utility', label: 'Utility' },
            { key: 'approved', label: 'Approved' },
            { key: 'pending', label: 'Pending' },
            { key: 'draft', label: 'Draft' }
          ].map(filter => (
            <button 
              key={filter.key}
              className={`message-templates__filter-tab ${
                activeFilter === filter.key ? 'message-templates__filter-tab--active' : ''
              }`}
              onClick={() => handleFilterChange(filter.key)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="message-templates__loading-state">
          <div className="message-templates__spinner"></div>
          <p className="message-templates__loading-text">Loading templates...</p>
        </div>
      ) : paginatedTemplates.length === 0 ? (
        <div className="message-templates__empty-state">
          <AlertCircle size={48} className="message-templates__empty-icon" />
          <h3 className="message-templates__empty-title">No templates found</h3>
          <p className="message-templates__empty-description">
            {searchQuery || activeFilter !== 'all' 
              ? 'Try adjusting your search or filter settings' 
              : 'Get started by creating your first message template'
            }
          </p>
          {!searchQuery && activeFilter === 'all' && (
            <button onClick={handleCreateTemplate} className="message-templates__empty-action-btn">
              <Plus size={16} />
              Create Your First Template
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="message-templates__grid">
            {paginatedTemplates.map((template) => (
              <div key={template.id} className="message-templates__card">
                <div className="message-templates__card-header">
                  <div className="message-templates__category-badge">
                    {getCategoryLabel(template.category)}
                  </div>
                 
                  <div className="message-templates__status-container">
                    <div className={`message-templates__status ${getStatusClass(template.status)}`}>
                      {template.status}
                    </div>
                    {template.status === 'pending' && (
                      <button 
                        className="message-templates__status-refresh-btn" 
                        onClick={() => handleCheckStatus(template.id)}
                        title="Check status"
                        disabled={isCheckingStatus}
                      >
                        <RefreshCw size={14} className={isCheckingStatus ? "message-templates__spinning" : ""} />
                      </button>
                    )}
                  </div>
                </div>
                
                <h3 className="message-templates__card-title">{template.name}</h3>
                
                <div className="message-templates__card-preview">
                  {renderTemplateContent(template)}
                </div>
                
                {template.status === 'rejected' && template.rejection_reason && (
                  <div className="message-templates__rejection-reason">
                    <AlertCircle size={14} />
                    <span>Reason: {template.rejection_reason}</span>
                  </div>
                )}
                
                <div className="message-templates__card-info">
                  <div className="message-templates__info-item">
                    <span className="message-templates__info-label">Language:</span>
                    <span className="message-templates__info-value">{template.language}</span>
                  </div>
                  <div className="message-templates__info-item">
                    <Clock size={14} />
                    <span className="message-templates__info-value">{formatDate(template.created_at)}</span>
                  </div>
                </div>
                
                <div className="message-templates__card-actions">
                  <button 
                    className="message-templates__action-btn message-templates__action-btn--secondary"
                    onClick={() => handlePreviewTemplate(template)}
                  >
                    <Eye size={16} />
                    <span>Preview</span>
                  </button>
                  
                  {template.status === 'draft' && (
                    <button
                      className="message-templates__action-btn message-templates__action-btn--primary"
                      onClick={() => handleSubmitDraft(template.id)}
                      disabled={isLoading}
                    >
                      <RefreshCw size={16} />
                      <span>Submit</span>
                    </button>
                  )}
                  
                  <div className="message-templates__icon-actions">
                    <button 
                      className="message-templates__icon-btn"
                      onClick={() => handleEditTemplate(template)}
                      title={template.status === 'draft' ? 'Continue editing' : 'Edit template'}
                    >
                      <Edit size={16} />
                    </button>

                    <button 
                      className="message-templates__icon-btn message-templates__icon-btn--delete"
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
          
          {renderPagination()}
        </>
      )}
      
      {deleteConfirm && (
        <div className="message-templates__modal-overlay">
          <div className="message-templates__modal-content">
            <h3 className="message-templates__modal-title">Delete Template?</h3>
            {templateToDelete?.status === 'draft' ? (
              <p className="message-templates__modal-description">
                This draft template will be permanently deleted from the system.
              </p>
            ) : templateToDelete?.whatsapp_id ? (
              <div className="message-templates__whatsapp-warning">
                <AlertCircle size={16} />
                <span>This template is registered with WhatsApp (ID: {templateToDelete.whatsapp_id})</span>
              </div>
            ) : null}
            <p className="message-templates__modal-description">
              Are you sure you want to delete "{templateToDelete?.name}"?
            </p>
            <div className="message-templates__modal-actions">
              <button className="message-templates__modal-btn message-templates__modal-btn--secondary" onClick={cancelDelete}>
                Cancel
              </button>
              <button 
                className="message-templates__modal-btn message-templates__modal-btn--danger" 
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
        <div className="message-templates__modal-overlay" onClick={closePreview}>
          <div className="message-templates__modal-content message-templates__preview-modal">
            <div className="message-templates__preview-header">
              <h3 className="message-templates__preview-title">Template Preview</h3>
              <button className="message-templates__close-btn" onClick={closePreview}>×</button>
            </div>
            <div className="message-templates__preview-content">
              <div className="message-templates__phone-preview">
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