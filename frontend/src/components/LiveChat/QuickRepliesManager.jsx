import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Check, X } from 'lucide-react';
import { quickRepliesService } from '../../api/quickRepliesService';
import { authService } from '../../api/authService';
import './conversations.css';

const QuickRepliesManager = () => {
  const [quickReplies, setQuickReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({ shortcode: '', message: '' });
  const [newReply, setNewReply] = useState({ shortcode: '', message: '' });

  const user = authService.getCurrentUser();
  const businessId = user?.business_id;

  const fetchQuickReplies = async () => {
    if (!businessId) return;
    
    try {
      setLoading(true);
      const response = await quickRepliesService.getQuickReplies(businessId);
      setQuickReplies(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching quick replies:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuickReplies();
  }, [businessId]);

  const handleCreate = async () => {
    try {
      if (!newReply.shortcode || !newReply.message) return;
      
      const response = await quickRepliesService.createQuickReply(
        user.business_id,
        newReply.shortcode,
        newReply.message
      );
      
      setQuickReplies(prev => [...prev, response.data]);
      setNewReply({ shortcode: '', message: '' });
    } catch (error) {
      console.error('Error creating quick reply:', error);
    }
  };

  const startEditing = (reply) => {
    setEditingId(reply.id);
    setEditValues({ shortcode: reply.shortcode, message: reply.message });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditValues({ shortcode: '', message: '' });
  };

  const handleUpdate = async (id) => {
    try {
      const response = await quickRepliesService.updateQuickReply(id, editValues);
      setQuickReplies(prev => 
        prev.map(reply => reply.id === id ? response.data : reply)
      );
      setEditingId(null);
    } catch (error) {
      console.error('Error updating quick reply:', error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await quickRepliesService.deleteQuickReply(id);
      setQuickReplies(prev => prev.filter(reply => reply.id !== id));
    } catch (error) {
      console.error('Error deleting quick reply:', error);
    }
  };

  return (
    <div className="quick-replies-manager">
      <h2>Quick Replies</h2>
      <p className="description">
        Create shortcuts for common messages. Use /shortcode in chat to insert.
      </p>

      <div className="create-form">
        <div className="form-group">
          <label>Shortcode</label>
          <input
            type="text"
            placeholder="e.g. greeting"
            value={newReply.shortcode}
            onChange={(e) => setNewReply({...newReply, shortcode: e.target.value})}
          />
        </div>
        <div className="form-group">
          <label>Message</label>
          <textarea
            placeholder="Enter the message content"
            value={newReply.message}
            onChange={(e) => setNewReply({...newReply, message: e.target.value})}
            rows={3}
          />
        </div>
        <button 
          className="btn create-btn"
          onClick={handleCreate}
          disabled={!newReply.shortcode || !newReply.message}
        >
          <Plus size={16} /> Create Quick Reply
        </button>
      </div>

      {loading ? (
        <div className="loading-spinner">Loading quick replies...</div>
      ) : quickReplies.length === 0 ? (
        <div className="empty-state">No quick replies created yet</div>
      ) : (
        <div className="quick-replies-list">
          {quickReplies.map((reply) => (
            <div key={reply.id} className="quick-reply-item">
              {editingId === reply.id ? (
                <div className="edit-form">
                  <div className="form-group">
                    <label>Shortcode</label>
                    <input
                      type="text"
                      value={editValues.shortcode}
                      onChange={(e) => setEditValues({
                        ...editValues,
                        shortcode: e.target.value
                      })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Message</label>
                    <textarea
                      value={editValues.message}
                      onChange={(e) => setEditValues({
                        ...editValues,
                        message: e.target.value
                      })}
                      rows={3}
                    />
                  </div>
                  <div className="edit-actions">
                    <button 
                      className="btn save-btn"
                      onClick={() => handleUpdate(reply.id)}
                    >
                      <Check size={16} /> Save
                    </button>
                    <button 
                      className="btn cancel-btn"
                      onClick={cancelEditing}
                    >
                      <X size={16} /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="reply-content">
                    <div className="shortcode">/{reply.shortcode}</div>
                    <div className="message">{reply.message}</div>
                  </div>
                  <div className="item-actions">
                    <button 
                      className="btn edit-btn"
                      onClick={() => startEditing(reply)}
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      className="btn delete-btn"
                      onClick={() => handleDelete(reply.id)}
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
    </div>
  );
};

export default QuickRepliesManager;