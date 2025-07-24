import React, { useState } from 'react';
import { X, MessageSquareOff, Archive, RotateCcw } from 'lucide-react';
import { conversationService } from '../../api/conversationService';
import './ConversationOptionsModal.css';

const ConversationOptionsModal = ({ 
  conversation, 
  onClose, 
  onConversationUpdated 
}) => {
  const [loading, setLoading] = useState(false);

  const handleCloseConversation = async () => {
    if (confirm('Are you sure you want to close this conversation?')) {
      setLoading(true);
      try {
        await conversationService.closeConversation(conversation.id);
        onConversationUpdated();
        onClose();
      } catch (error) {
        console.error('Error closing conversation:', error);
        alert('Failed to close conversation. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleArchiveConversation = async () => {
    if (confirm('Are you sure you want to archive this conversation?')) {
      setLoading(true);
      try {
        await conversationService.archiveConversation(conversation.id);
        onConversationUpdated();
        onClose();
      } catch (error) {
        console.error('Error archiving conversation:', error);
        alert('Failed to archive conversation. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleReopenConversation = async () => {
    if (confirm('Are you sure you want to reopen this conversation?')) {
      setLoading(true);
      try {
        await conversationService.reopenConversation(conversation.id);
        onConversationUpdated();
        onClose();
      } catch (error) {
        console.error('Error reopening conversation:', error);
        alert('Failed to reopen conversation. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'conversation-status--active';
      case 'closed':
        return 'conversation-status--closed';
      case 'archived':
        return 'conversation-status--archived';
      default:
        return '';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'closed':
        return 'Closed';
      case 'archived':
        return 'Archived';
      default:
        return status;
    }
  };

  return (
    <div className="conversation-options-modal__overlay">
      <div className="conversation-options-modal">
        <div className="conversation-options-modal__header">
          <h3 className="conversation-options-modal__title">Conversation Options</h3>
          <button 
            className="conversation-options-modal__close"
            onClick={onClose}
            disabled={loading}
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="conversation-options-modal__content">
          <div className="conversation-options-modal__info">
            <div className="conversation-info-item">
              <span className="conversation-info-item__label">Contact:</span>
              <span className="conversation-info-item__value">
                {conversation.contact_name || `+${conversation.phone_number}`}
              </span>
            </div>
            <div className="conversation-info-item">
              <span className="conversation-info-item__label">Phone:</span>
              <span className="conversation-info-item__value">+{conversation.phone_number}</span>
            </div>
            <div className="conversation-info-item">
              <span className="conversation-info-item__label">Status:</span>
              <span className={`conversation-info-item__value conversation-status ${getStatusColor(conversation.status)}`}>
                {getStatusText(conversation.status)}
              </span>
            </div>
            <div className="conversation-info-item">
              <span className="conversation-info-item__label">Last Message:</span>
              <span className="conversation-info-item__value">
                {conversation.last_message_at 
                  ? new Date(conversation.last_message_at).toLocaleString()
                  : 'No messages'
                }
              </span>
            </div>
            {conversation.closed_at && (
              <div className="conversation-info-item">
                <span className="conversation-info-item__label">Closed At:</span>
                <span className="conversation-info-item__value">
                  {new Date(conversation.closed_at).toLocaleString()}
                </span>
              </div>
            )}
            {conversation.archived_at && (
              <div className="conversation-info-item">
                <span className="conversation-info-item__label">Archived At:</span>
                <span className="conversation-info-item__value">
                  {new Date(conversation.archived_at).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          <div className="conversation-options-modal__actions">
            {conversation.status === 'active' && (
              <>
                <button 
                  className="conversation-action-btn conversation-action-btn--close"
                  onClick={handleCloseConversation}
                  disabled={loading}
                >
                  <MessageSquareOff size={16} />
                  <span>{loading ? 'Closing...' : 'Close Conversation'}</span>
                </button>
                
                <button 
                  className="conversation-action-btn conversation-action-btn--archive"
                  onClick={handleArchiveConversation}
                  disabled={loading}
                >
                  <Archive size={16} />
                  <span>{loading ? 'Archiving...' : 'Archive'}</span>
                </button>
              </>
            )}

            {(conversation.status === 'closed' || conversation.status === 'archived') && (
              <button 
                className="conversation-action-btn conversation-action-btn--reopen"
                onClick={handleReopenConversation}
                disabled={loading}
              >
                <RotateCcw size={16} />
                <span>{loading ? 'Reopening...' : 'Reopen Conversation'}</span>
              </button>
            )}

            {conversation.status !== 'archived' && conversation.status !== 'active' && (
              <button 
                className="conversation-action-btn conversation-action-btn--archive"
                onClick={handleArchiveConversation}
                disabled={loading}
              >
                <Archive size={16} />
                <span>{loading ? 'Archiving...' : 'Archive'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConversationOptionsModal;