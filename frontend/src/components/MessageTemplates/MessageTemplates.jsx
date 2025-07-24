import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Eye, 
  Edit, 
  Trash, 
  AlertCircle, 
  Clock, 
  RefreshCw, 
  ExternalLink, 
  Phone, 
  ChevronLeft, 
  ChevronRight,
  FileText,
  Image,
  FileVideo,
  File,
  ArrowUpDown,
  Filter,
  MoreHorizontal,
  X
} from 'lucide-react';
import { templateService } from '../../api/templateService';
import './MessageTemplates.css';

function MessageTemplates() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilters, setActiveFilters] = useState({
    status: 'all',
    category: 'all',
    headerType: 'all'
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const [selectedTemplates, setSelectedTemplates] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchTemplates();
  }, [activeFilters, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilters, searchQuery]);

  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const filters = {};
      if (activeFilters.status !== 'all') {
        filters.status = activeFilters.status;
      }
      if (activeFilters.category !== 'all') {
        filters.category = activeFilters.category;
      }
      if (activeFilters.headerType !== 'all') {
        filters.header_type = activeFilters.headerType;
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

  const handleFilterChange = (filterType, value) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
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

  const handleSelectTemplate = (templateId) => {
    setSelectedTemplates(prev => 
      prev.includes(templateId) 
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    );
  };

  const handleSelectAll = () => {
    if (selectedTemplates.length === paginatedTemplates.length) {
      setSelectedTemplates([]);
    } else {
      setSelectedTemplates(paginatedTemplates.map(t => t.id));
    }
  };

  const clearFilters = () => {
    setActiveFilters({
      status: 'all',
      category: 'all',
      headerType: 'all'
    });
    setSearchQuery('');
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (activeFilters.status !== 'all') count++;
    if (activeFilters.category !== 'all') count++;
    if (activeFilters.headerType !== 'all') count++;
    if (searchQuery) count++;
    return count;
  };

  // Filter and sort templates
  const filteredTemplates = templates.filter((template) => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.body_text?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Apply header type filter
    const matchesHeaderType = activeFilters.headerType === 'all' || 
                             template.header_type === activeFilters.headerType ||
                             (activeFilters.headerType === 'none' && !template.header_type);
    
    return matchesSearch && matchesHeaderType;
  });

  const sortedTemplates = [...filteredTemplates].sort((a, b) => {
    if (sortConfig.key === 'created_at') {
      const aDate = new Date(a.created_at);
      const bDate = new Date(b.created_at);
      return sortConfig.direction === 'asc' ? aDate - bDate : bDate - aDate;
    }
    
    const aValue = a[sortConfig.key]?.toString().toLowerCase() || '';
    const bValue = b[sortConfig.key]?.toString().toLowerCase() || '';
    
    if (sortConfig.direction === 'asc') {
      return aValue.localeCompare(bValue);
    } else {
      return bValue.localeCompare(aValue);
    }
  });

  // Calculate pagination
  const totalFilteredTemplates = sortedTemplates.length;
  const calculatedTotalPages = Math.ceil(totalFilteredTemplates / itemsPerPage);
  
  useEffect(() => {
    setTotalPages(calculatedTotalPages);
  }, [calculatedTotalPages]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTemplates = sortedTemplates.slice(startIndex, endIndex);

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

  const getHeaderTypeIcon = (headerType) => {
    switch (headerType) {
      case 'text':
        return <FileText size={16} />;
      case 'image':
        return <Image size={16} />;
      case 'document':
        return <File size={16} />;
      case 'video':
        return <FileVideo size={16} />;
      default:
        return <FileText size={16} />;
    }
  };

  const getHeaderTypeLabel = (headerType) => {
    const labels = {
      text: 'Text',
      image: 'Image',
      document: 'Document',
      video: 'Video'
    };
    return labels[headerType] || 'None';
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
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateText = (text, maxLength = 100) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  // NEW: Function to render header preview in table
  const renderHeaderPreview = (template) => {
    if (!template.header_type) return null;
    
    switch (template.header_type) {
      case 'text':
        return template.header_content && (
          <div className="message-templates__preview-header">
            <strong>{truncateText(template.header_content, 50)}</strong>
          </div>
        );
      case 'image':
        return (
          <div className="message-templates__preview-header message-templates__preview-header--media">
            <Image size={16} />
            <strong>Image Header</strong>
          </div>
        );
      case 'document':
        return (
          <div className="message-templates__preview-header message-templates__preview-header--media">
            <File size={16} />
            <strong>Document Header</strong>
          </div>
        );
      case 'video':
        return (
          <div className="message-templates__preview-header message-templates__preview-header--media">
            <FileVideo size={16} />
            <strong>Video Header</strong>
          </div>
        );
      default:
        return null;
    }
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
            <div className="message-templates__document-name">Document.pdf</div>
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
            placeholder="Search templates by name or content..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="message-templates__search-input"
          />
        </div>
        
        <div className="message-templates__filter-controls">
          <button 
            className={`message-templates__filter-toggle ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={16} />
            Filters
            {getActiveFilterCount() > 0 && (
              <span className="message-templates__filter-count">{getActiveFilterCount()}</span>
            )}
          </button>
          
          {getActiveFilterCount() > 0 && (
            <button 
              className="message-templates__clear-filters"
              onClick={clearFilters}
            >
              <X size={16} />
              Clear All
            </button>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="message-templates__filters-panel">
          <div className="message-templates__filter-group">
            <label className="message-templates__filter-label">Status</label>
            <select 
              value={activeFilters.status} 
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="message-templates__filter-select"
            >
              <option value="all">All Status</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
              <option value="draft">Draft</option>
            </select>
          </div>
          
          <div className="message-templates__filter-group">
            <label className="message-templates__filter-label">Category</label>
            <select 
              value={activeFilters.category} 
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="message-templates__filter-select"
            >
              <option value="all">All Categories</option>
              <option value="marketing">Marketing</option>
              <option value="utility">Utility</option>
            </select>
          </div>
          
          <div className="message-templates__filter-group">
            <label className="message-templates__filter-label">Header Type</label>
            <select 
              value={activeFilters.headerType} 
              onChange={(e) => handleFilterChange('headerType', e.target.value)}
              className="message-templates__filter-select"
            >
              <option value="all">All Header Types</option>
              <option value="none">No Header</option>
              <option value="text">Text Header</option>
              <option value="image">Image Header</option>
              <option value="document">Document Header</option>
              <option value="video">Video Header</option>
            </select>
          </div>
        </div>
      )}

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
            {searchQuery || getActiveFilterCount() > 0
              ? 'Try adjusting your search or filter settings' 
              : 'Get started by creating your first message template'
            }
          </p>
          {!searchQuery && getActiveFilterCount() === 0 && (
            <button onClick={handleCreateTemplate} className="message-templates__empty-action-btn">
              <Plus size={16} />
              Create Your First Template
            </button>
          )}
        </div>
      ) : (
        <div className="message-templates__table-container">
          <div className="message-templates__table-header">
            <div className="message-templates__table-stats">
              <span className="message-templates__table-count">
                {selectedTemplates.length > 0 ? `${selectedTemplates.length} selected` : `${totalFilteredTemplates} templates`}
              </span>
            </div>
            
            {selectedTemplates.length > 0 && (
              <div className="message-templates__bulk-actions">
                <button className="message-templates__bulk-btn">
                  <Trash size={16} />
                  Delete Selected
                </button>
              </div>
            )}
          </div>

          <div className="message-templates__table-wrapper">
            <table className="message-templates__table">
              <thead>
                <tr>
                  <th className="message-templates__table-header-cell">
                    <input
                      type="checkbox"
                      checked={selectedTemplates.length === paginatedTemplates.length && paginatedTemplates.length > 0}
                      onChange={handleSelectAll}
                      className="message-templates__checkbox"
                    />
                  </th>
                  <th className="message-templates__table-header-cell message-templates__table-header-cell--sortable" onClick={() => handleSort('name')}>
                    <div className="message-templates__header-content">
                      <span>Template Name</span>
                      <ArrowUpDown size={16} className="message-templates__sort-icon" />
                    </div>
                  </th>
                  <th className="message-templates__table-header-cell message-templates__table-header-cell--sortable" onClick={() => handleSort('category')}>
                    <div className="message-templates__header-content">
                      <span>Category</span>
                      <ArrowUpDown size={16} className="message-templates__sort-icon" />
                    </div>
                  </th>
                  <th className="message-templates__table-header-cell">
                    <div className="message-templates__header-content">
                      <span>Header Type</span>
                    </div>
                  </th>
                  <th className="message-templates__table-header-cell">
                    <div className="message-templates__header-content">
                      <span>Content Preview</span>
                    </div>
                  </th>
                  <th className="message-templates__table-header-cell message-templates__table-header-cell--sortable" onClick={() => handleSort('status')}>
                    <div className="message-templates__header-content">
                      <span>Status</span>
                      <ArrowUpDown size={16} className="message-templates__sort-icon" />
                    </div>
                  </th>
                  <th className="message-templates__table-header-cell message-templates__table-header-cell--sortable" onClick={() => handleSort('language')}>
                    <div className="message-templates__header-content">
                      <span>Language</span>
                      <ArrowUpDown size={16} className="message-templates__sort-icon" />
                    </div>
                  </th>
                  <th className="message-templates__table-header-cell message-templates__table-header-cell--sortable" onClick={() => handleSort('created_at')}>
                    <div className="message-templates__header-content">
                      <span>Created</span>
                      <ArrowUpDown size={16} className="message-templates__sort-icon" />
                    </div>
                  </th>
                  <th className="message-templates__table-header-cell">
                    <div className="message-templates__header-content">
                      <span>Actions</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedTemplates.map((template) => (
                  <tr key={template.id} className="message-templates__table-row">
                    <td className="message-templates__table-cell">
                      <input
                        type="checkbox"
                        checked={selectedTemplates.includes(template.id)}
                        onChange={() => handleSelectTemplate(template.id)}
                        className="message-templates__checkbox"
                      />
                    </td>
                    <td className="message-templates__table-cell">
                      <div className="message-templates__template-name">
                        <span className="message-templates__name-primary">{template.name}</span>
                        {template.whatsapp_id && (
                          <span className="message-templates__whatsapp-id">ID: {template.whatsapp_id}</span>
                        )}
                      </div>
                    </td>
                    <td className="message-templates__table-cell">
                      <span className="message-templates__category-badge">
                        {getCategoryLabel(template.category)}
                      </span>
                    </td>
                    <td className="message-templates__table-cell">
                      <div className="message-templates__header-type">
                        {getHeaderTypeIcon(template.header_type)}
                        <span>{getHeaderTypeLabel(template.header_type)}</span>
                      </div>
                    </td>
                    <td className="message-templates__table-cell">
                      <div className="message-templates__content-preview">
                        {renderHeaderPreview(template)}
                        {template.body_text && (
                          <div className="message-templates__preview-body">
                            {truncateText(template.body_text, 80)}
                          </div>
                        )}
                        {template.footer_text && (
                          <div className="message-templates__preview-footer">
                            <em>{truncateText(template.footer_text, 30)}</em>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="message-templates__table-cell">
                      <div className="message-templates__status-container">
                        <span className={`message-templates__status ${getStatusClass(template.status)}`}>
                          {template.status}
                        </span>
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
                      {template.status === 'rejected' && template.rejection_reason && (
                        <div className="message-templates__rejection-reason">
                          <AlertCircle size={12} />
                          <span>{truncateText(template.rejection_reason, 50)}</span>
                        </div>
                      )}
                    </td>
                    <td className="message-templates__table-cell">
                      <span className="message-templates__language">{template.language}</span>
                    </td>
                    <td className="message-templates__table-cell">
                      <div className="message-templates__date-info">
                        <span className="message-templates__date" title={formatDateTime(template.created_at)}>
                          {formatDate(template.created_at)}
                        </span>
                      </div>
                    </td>
                    <td className="message-templates__table-cell">
                      <div className="message-templates__table-actions">
                        <button 
                          className="message-templates__action-btn message-templates__action-btn--icon"
                          onClick={() => handlePreviewTemplate(template)}
                          title="Preview"
                        >
                          <Eye size={16} />
                        </button>
                        
                        <button 
                          className="message-templates__action-btn message-templates__action-btn--icon"
                          onClick={() => handleEditTemplate(template)}
                          title={template.status === 'draft' ? 'Continue editing' : 'Edit template'}
                        >
                          <Edit size={16} />
                        </button>
                        
                        {template.status === 'draft' && (
                          <button
                            className="message-templates__action-btn message-templates__action-btn--icon message-templates__action-btn--submit"
                            onClick={() => handleSubmitDraft(template.id)}
                            disabled={isLoading}
                            title="Submit for approval"
                          >
                            <RefreshCw size={16} />
                          </button>
                        )}

                        <button 
                          className="message-templates__action-btn message-templates__action-btn--icon message-templates__action-btn--delete"
                          onClick={() => confirmDelete(template.id)}
                          title="Delete template"
                        >
                          <Trash size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {renderPagination()}
        </div>
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