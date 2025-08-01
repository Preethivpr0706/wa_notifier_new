import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Check, X, Search, Zap, Copy, AlertCircle, MessageSquare } from 'lucide-react';
import { quickRepliesService } from '../../api/quickRepliesService';
import { authService } from '../../api/authService';
import './conversations.css';

const QuickRepliesManager = () => {
  const [quickReplies, setQuickReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({ shortcode: '', message: '' });
  const [newReply, setNewReply] = useState({ shortcode: '', message: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredReplies, setFilteredReplies] = useState([]);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  const user = authService.getCurrentUser();
  const businessId = user?.businessId;

  const fetchQuickReplies = async () => {
    if (!businessId) return;
    
    try {
      setLoading(true);
      const response = await quickRepliesService.getQuickReplies(businessId);
      setQuickReplies(response.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching quick replies:', error);
      setErrors({ general: 'Failed to load quick replies' });
      setLoading(false);
    }
  };

  // Filter quick replies based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredReplies(quickReplies);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = quickReplies.filter(reply =>
        reply.shortcode.toLowerCase().includes(query) ||
        reply.message.toLowerCase().includes(query)
      );
      setFilteredReplies(filtered);
    }
  }, [quickReplies, searchQuery]);

  useEffect(() => {
    fetchQuickReplies();
  }, [businessId]);

  const validateInput = (shortcode, message, excludeId = null) => {
    const newErrors = {};

    // Validate shortcode
    if (!shortcode.trim()) {
      newErrors.shortcode = 'Shortcode is required';
    } else if (shortcode.length > 50) {
      newErrors.shortcode = 'Shortcode must be less than 50 characters';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(shortcode)) {
      newErrors.shortcode = 'Shortcode can only contain letters, numbers, hyphens, and underscores';
    } else {
      // Check for duplicate shortcode
      const duplicate = quickReplies.find(reply => 
        reply.id !== excludeId && 
        reply.shortcode.toLowerCase() === shortcode.toLowerCase().trim()
      );
      if (duplicate) {
        newErrors.shortcode = 'This shortcode already exists';
      }
    }

    // Validate message
    if (!message.trim()) {
      newErrors.message = 'Message is required';
    } else if (message.length > 1000) {
      newErrors.message = 'Message must be less than 1000 characters';
    }

    return newErrors;
  };

  const showSuccessMessage = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleCreate = async () => {
    const validationErrors = validateInput(newReply.shortcode, newReply.message);
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      setSaving(true);
      setErrors({});
      
      const response = await quickRepliesService.createQuickReply(
        businessId,
        newReply.shortcode.trim(),
        newReply.message.trim()
      );
      
      setQuickReplies(prev => [...prev, response.data]);
      setNewReply({ shortcode: '', message: '' });
      showSuccessMessage('Quick reply created successfully!');
    } catch (error) {
      console.error('Error creating quick reply:', error);
      setErrors({ general: error.message || 'Failed to create quick reply' });
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (reply) => {
    setEditingId(reply.id);
    setEditValues({ shortcode: reply.shortcode, message: reply.message });
    setErrors({});
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditValues({ shortcode: '', message: '' });
    setErrors({});
  };

  const handleUpdate = async (id) => {
    const validationErrors = validateInput(editValues.shortcode, editValues.message, id);
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      setSaving(true);
      setErrors({});
      
      const response = await quickRepliesService.updateQuickReply(id, {
        shortcode: editValues.shortcode.trim(),
        message: editValues.message.trim()
      });
      
      setQuickReplies(prev => 
        prev.map(reply => reply.id === id ? response.data : reply)
      );
      setEditingId(null);
      showSuccessMessage('Quick reply updated successfully!');
    } catch (error) {
      console.error('Error updating quick reply:', error);
      setErrors({ general: error.message || 'Failed to update quick reply' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this quick reply?')) {
      return;
    }

    try {
      setSaving(true);
      await quickRepliesService.deleteQuickReply(id);
      setQuickReplies(prev => prev.filter(reply => reply.id !== id));
      showSuccessMessage('Quick reply deleted successfully!');
    } catch (error) {
      console.error('Error deleting quick reply:', error);
      setErrors({ general: error.message || 'Failed to delete quick reply' });
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(`/${text}`).then(() => {
      showSuccessMessage('Shortcode copied to clipboard!');
    }).catch(() => {
      showSuccessMessage('Failed to copy shortcode');
    });
  };

  const getUsageExample = (shortcode) => {
    return `Type "/${shortcode}" in the message input to use this quick reply`;
  };

  return (
    <div className="quick-replies-manager">
      <div className="manager-header">
        <h2>
          <Zap size={28} />
          Quick Replies
        </h2>
        <p className="description">
          Create shortcuts for common messages. Use <code>/shortcode</code> in chat or click the ⚡ button to insert quick replies.
        </p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="success-banner">
          <Check size={20} />
          {successMessage}
        </div>
      )}

      {/* General Error Message */}
      {errors.general && (
        <div className="error-banner">
          <AlertCircle size={20} />
          {errors.general}
        </div>
      )}

      {/* Create Form */}
      <div className="create-form">
        <h3>Create New Quick Reply</h3>
        <div className="form-row">
          <div className="form-group">
            <label>
              Shortcode
              <span className="required">*</span>
            </label>
            <div className="input-with-prefix">
              <span className="input-prefix">/</span>
              <input
                type="text"
                placeholder="greeting"
                value={newReply.shortcode}
                onChange={(e) => {
                  setNewReply({...newReply, shortcode: e.target.value});
                  if (errors.shortcode) setErrors(prev => ({...prev, shortcode: null}));
                }}
                className={errors.shortcode ? 'error' : ''}
                maxLength={50}
              />
            </div>
            {errors.shortcode && <span className="error-text">{errors.shortcode}</span>}
            <div className="character-count">{newReply.shortcode.length}/50</div>
          </div>
          
          <div className="form-group message-group">
            <label>
              Message
              <span className="required">*</span>
            </label>
            <textarea
              placeholder="Enter the message content that will be inserted when using this shortcode"
              value={newReply.message}
              onChange={(e) => {
                setNewReply({...newReply, message: e.target.value});
                if (errors.message) setErrors(prev => ({...prev, message: null}));
              }}
              className={errors.message ? 'error' : ''}
              rows={3}
              maxLength={1000}
            />
            {errors.message && <span className="error-text">{errors.message}</span>}
            <div className="character-count">{newReply.message.length}/1000</div>
          </div>
        </div>
        
        <div className="form-actions">
          <button 
            className="btn create-btn"
            onClick={handleCreate}
            disabled={!newReply.shortcode.trim() || !newReply.message.trim() || saving}
          >
            <Plus size={16} />
            {saving ? 'Creating...' : 'Create Quick Reply'}
          </button>
        </div>
      </div>

      {/* Search and Stats */}
      <div className="list-header">
        <div className="list-stats">
          <MessageSquare size={20} />
          <span>{quickReplies.length} quick replies</span>
          {searchQuery && (
            <span className="search-results">
              • {filteredReplies.length} found
            </span>
          )}
        </div>
        
        <div className="search-container">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search quick replies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button 
              className="clear-search"
              onClick={() => setSearchQuery('')}
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Quick Replies List */}
      {loading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
          Loading quick replies...
        </div>
      ) : filteredReplies.length === 0 ? (
        <div className="empty-state">
          {searchQuery ? (
            <>
              <Search size={48} />
              <h3>No quick replies found</h3>
              <p>Try adjusting your search terms</p>
              <button 
                className="btn secondary-btn"
                onClick={() => setSearchQuery('')}
              >
                Clear Search
              </button>
            </>
          ) : (
            <>
              <MessageSquare size={48} />
              <h3>No quick replies created yet</h3>
              <p>Create your first quick reply to get started</p>
            </>
          )}
        </div>
      ) : (
        <div className="quick-replies-list">
          {filteredReplies.map((reply) => (
            <div key={reply.id} className="quick-reply-item">
              {editingId === reply.id ? (
                <div className="edit-form">
                  <div className="form-group">
                    <label>Shortcode</label>
                    <div className="input-with-prefix">
                      <span className="input-prefix">/</span>
                      <input
                        type="text"
                        value={editValues.shortcode}
                        onChange={(e) => {
                          setEditValues({...editValues, shortcode: e.target.value});
                          if (errors.shortcode) setErrors(prev => ({...prev, shortcode: null}));
                        }}
                        className={errors.shortcode ? 'error' : ''}
                        maxLength={50}
                      />
                    </div>
                    {errors.shortcode && <span className="error-text">{errors.shortcode}</span>}
                  </div>
                  
                  <div className="form-group">
                    <label>Message</label>
                    <textarea
                      value={editValues.message}
                      onChange={(e) => {
                        setEditValues({...editValues, message: e.target.value});
                        if (errors.message) setErrors(prev => ({...prev, message: null}));
                      }}
                      className={errors.message ? 'error' : ''}
                      rows={4}
                      maxLength={1000}
                    />
                    {errors.message && <span className="error-text">{errors.message}</span>}
                    <div className="character-count">{editValues.message.length}/1000</div>
                  </div>
                  
                  <div className="edit-actions">
                    <button 
                      className="btn save-btn"
                      onClick={() => handleUpdate(reply.id)}
                      disabled={saving}
                    >
                      <Check size={16} />
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button 
                      className="btn cancel-btn"
                      onClick={cancelEditing}
                      disabled={saving}
                    >
                      <X size={16} />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="reply-content">
                    <div className="shortcode-header">
                      <div className="shortcode">/{reply.shortcode}</div>
                      <button 
                        className="copy-btn"
                        onClick={() => copyToClipboard(reply.shortcode)}
                        title="Copy shortcode"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                    <div className="message">{reply.message}</div>
                    <div className="usage-hint">
                      {getUsageExample(reply.shortcode)}
                    </div>
                    <div className="reply-meta">
                      <span className="created-date">
                        Created: {new Date(reply.created_at).toLocaleDateString()}
                      </span>
                      {reply.updated_at !== reply.created_at && (
                        <span className="updated-date">
                          Updated: {new Date(reply.updated_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="item-actions">
                    <button 
                      className="btn edit-btn"
                      onClick={() => startEditing(reply)}
                      disabled={saving}
                      title="Edit quick reply"
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      className="btn delete-btn"
                      onClick={() => handleDelete(reply.id)}
                      disabled={saving}
                      title="Delete quick reply"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Usage Guide */}
      <div className="usage-guide">
        <h3>How to Use Quick Replies</h3>
        <div className="usage-methods">
          <div className="usage-method">
            <div className="method-icon">⌨️</div>
            <div className="method-info">
              <strong>Type Shortcode</strong>
              <p>Type <code>/shortcode</code> in any message input and it will be replaced with the full message</p>
            </div>
          </div>
          <div className="usage-method">
            <div className="method-icon">⚡</div>
            <div className="method-info">
              <strong>Quick Replies Button</strong>
              <p>Click the lightning bolt (⚡) button in the message input to browse and select quick replies</p>
            </div>
          </div>
          <div className="usage-method">
            <div className="method-icon">🔍</div>
            <div className="method-info">
              <strong>Search as You Type</strong>
              <p>When you type <code>/</code> in the message input, a searchable dropdown will appear</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickRepliesManager;