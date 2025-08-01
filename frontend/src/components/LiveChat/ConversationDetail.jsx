import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Paperclip, Smile, User, MoreVertical, Search, Image, Video, File, X,Zap } from 'lucide-react';
import { conversationService } from '../../api/conversationService';
import { quickRepliesService } from '../../api/quickRepliesService';
import { useChatWebSocket } from '../../hooks/useChatWebSocket';
import { authService } from '../../api/authService';
import EmojiPicker from './EmojiPicker';
import MessageSearchModal from './MessageSearchModal';
import ConversationOptionsModal from './ConversationOptionsModal';
import './ConversationDetail.css';

// Quick Replies Dropdown Component
const QuickRepliesDropdown = ({ quickReplies, onSelect, onClose, position }) => {
  const [filteredReplies, setFilteredReplies] = useState(quickReplies);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (searchTerm) {
      const filtered = quickReplies.filter(reply => 
        reply.shortcode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reply.message.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredReplies(filtered);
    } else {
      setFilteredReplies(quickReplies);
    }
  }, [searchTerm, quickReplies]);

  return (
    <div className="quick-replies-dropdown" style={{ 
      bottom: position.bottom, 
      left: position.left,
      maxHeight: '200px',
      overflowY: 'auto'
    }}>
      <div className="quick-replies-header">
        <input
          type="text"
          placeholder="Search quick replies..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="quick-replies-search"
          autoFocus
        />
        <button onClick={onClose} className="close-dropdown-btn">
          <X size={16} />
        </button>
      </div>
      <div className="quick-replies-list">
        {filteredReplies.length === 0 ? (
          <div className="no-replies">No quick replies found</div>
        ) : (
          filteredReplies.map(reply => (
            <div
              key={reply.id}
              className="quick-reply-item"
              onClick={() => onSelect(reply)}
            >
              <div className="reply-shortcode">/{reply.shortcode}</div>
              <div className="reply-message">{reply.message}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Date separator component
const DateSeparator = ({ date }) => {
  const formatDate = (date) => {
    const today = new Date();
    const messageDate = new Date(date);
    
    if (messageDate.toDateString() === today.toDateString()) {
      return 'Today';
    }
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (messageDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    if (messageDate > weekAgo) {
      return messageDate.toLocaleDateString('en-US', { weekday: 'long' });
    }
    
    return messageDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: messageDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined 
    });
  };

  return (
    <div className="date-separator">
      <div className="date-separator-line"></div>
      <div className="date-separator-text">{formatDate(date)}</div>
      <div className="date-separator-line"></div>
    </div>
  );
};

const MessageBubble = ({ message, isConsecutive = false, isHighlighted = false }) => {
  const isOutbound = message.direction === 'outbound';
  const isCampaignMessage = message.message_type === 'template';
  
  const getFileTypeIcon = (filename) => {
    if (!filename) return '📎';
    const ext = filename.split('.').pop()?.toLowerCase();
    switch(ext) {
      case 'pdf': return '📄';
      case 'doc': case 'docx': return '📝';
      case 'xls': case 'xlsx': return '📊';
      case 'ppt': case 'pptx': return '📑';
      case 'txt': return '📄';
      case 'jpg': case 'jpeg': case 'png': case 'gif': case 'webp': return '🖼️';
      case 'mp4': case 'avi': case 'mov': case 'webm': return '🎥';
      default: return '📎';
    }
  };

  const StatusIcon = ({ status }) => {
    switch (status) {
      case 'delivered':
        return (
          <div className="message-status message-status--delivered">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M1.5 8.5L5 12L14.5 2.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8 12L16.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        );
      case 'read':
        return (
          <div className="message-status message-status--read">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M1.5 8.5L5 12L14.5 2.5" stroke="#4FC3F7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8 12L16.5 3.5" stroke="#4FC3F7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        );
      case 'sent':
        return (
          <div className="message-status message-status--sent">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M1.5 8.5L5 12L14.5 2.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        );
      case 'sending':
        return (
          <div className="message-status message-status--sending">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
        );
      case 'failed':
        return (
          <div className="message-status message-status--failed">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2"/>
              <path d="M10 6L6 10M6 6l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const renderTemplateContent = () => {
    if (!isCampaignMessage) return null;
    
    const renderBodyWithVariables = () => {
      if (!message.template?.body_text) return null;
      
      return message.template.body_text.split(/(\{\{\w+\}\})/).map((part, i) => {
        const isVariable = /^\{\{\w+\}\}$/.test(part);
        return isVariable ? (
          <span key={i} className="template-variable">
            {message.template.variables?.[part.replace(/[{}]/g, '')] || part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        );
      });
    };

    const renderMediaPreview = (headerType, headerContent) => {
      // Since headerContent contains media ID, not URL, show appropriate icons
      switch (headerType) {
        case 'image':
          return (
            <div className="template-media template-media--image">
              <div className="media-preview media-preview--image">
                <Image size={48} />
                <span className="media-preview__label">Image</span>
              </div>
            </div>
          );
        case 'video':
          return (
            <div className="template-media template-media--video">
              <div className="media-preview media-preview--video">
                <Video size={48} />
                <span className="media-preview__label">Video</span>
              </div>
            </div>
          );
        case 'document':
          return (
            <div className="template-media template-media--document">
              <div className="media-preview media-preview--document">
                <File size={48} />
                <span className="media-preview__label">Document</span>
              </div>
            </div>
          );
        default:
          return null;
      }
    };

    return (
      <div className="template-message-content">
        {/* Header */}
        {message.template.header_type === 'text' && message.template.header_content && (
          <div className="template-header">{message.template.header_content}</div>
        )}
        
        {['image', 'video', 'document'].includes(message.template.header_type) && (
          renderMediaPreview(message.template.header_type, message.template.header_content)
        )}
        
        {/* Body */}
        {message.template.body_text && (
          <div className="template-body">
            {renderBodyWithVariables()}
          </div>
        )}
        
        {/* Footer */}
        {message.template.footer_text && (
          <div className="template-footer">{message.template.footer_text}</div>
        )}
        
        {/* Buttons */}
        {message.template.buttons?.length > 0 && (
          <div className="template-buttons">
            {message.template.buttons.map((button, i) => (
              <div key={i} className="template-button">
                {button.type === 'url' && <span className="template-button__icon">🔗</span>}
                {button.type === 'phone_number' && <span className="template-button__icon">📞</span>}
                <span className="template-button__text">{button.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`message-bubble ${isOutbound ? 'message-bubble--outbound' : 'message-bubble--inbound'} ${isConsecutive ? 'message-bubble--consecutive' : ''} ${isHighlighted ? 'message-bubble--highlighted' : ''}`}>
      {isCampaignMessage && (
        <div className="campaign-indicator">
          <span className="campaign-indicator__icon">📢</span>
          <span className="campaign-indicator__text">Campaign: {message.campaign_name}</span>
        </div>
      )}
      
      <div className="message-content">
        {isCampaignMessage ? renderTemplateContent() : (
          <>
            {message.message_type === 'text' && <p className="message-text">{message.content}</p>}
            {message.message_type === 'image' && (
              <div className="message-image">
                <img src={message.media_url} alt={message.content || 'Image'} />
              </div>
            )}
            {message.message_type === 'document' && (
              <div className="message-document">
                <a href={message.media_url} target="_blank" rel="noopener noreferrer" className="document-link">
                  <div className="document-icon">
                    {getFileTypeIcon(message.media_filename || message.content)}
                  </div>
                  <div className="document-info">
                    <div className="document-name">{message.media_filename || message.content || 'Document'}</div>
                    <div className="document-size">{formatFileSize(message.file_size)}</div>
                  </div>
                </a>
              </div>
            )}
            {message.message_type === 'video' && (
              <div className="message-video">
                <video controls className="message-video__player">
                  <source src={message.media_url} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
            )}
          </>
        )}
      </div>
      
      <div className="message-meta">
        <span className="message-time">
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
        {isOutbound && <StatusIcon status={message.status} />}
      </div>
    </div>
  );
};

const ConversationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);

  // Quick Replies state
  const [quickReplies, setQuickReplies] = useState([]);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [quickRepliesPosition, setQuickRepliesPosition] = useState({ bottom: 0, left: 0 });
  
  
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const quickRepliesRef = useRef(null);
  const textareaRef = useRef(null);

  const user = authService.getCurrentUser();
  const { notifications, sendMessage, isConnected, reconnect, clearNotifications } = useChatWebSocket();

   // Load quick replies
  const fetchQuickReplies = useCallback(async () => {
    try {
      const response = await quickRepliesService.getQuickReplies(user.businessId);
      setQuickReplies(response.data || []);
    } catch (error) {
      console.error('Error loading quick replies:', error);
    }
  }, [user.businessId]);

  // Helper function to check if two dates are on the same day
  const isSameDay = (date1, date2) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return d1.toDateString() === d2.toDateString();
  };

  // Group messages with date separators
  const getMessagesWithDateSeparators = (messages) => {
    if (!messages.length) return [];

    const result = [];
    let currentDate = null;

    messages.forEach((message, index) => {
      const messageDate = new Date(message.timestamp);
      
      if (!currentDate || !isSameDay(currentDate, messageDate)) {
        result.push({
          type: 'date-separator',
          date: messageDate,
          id: `date-${messageDate.toDateString()}`
        });
        currentDate = messageDate;
      }
      
      result.push({
        type: 'message',
        ...message
      });
    });

    return result;
  };

  const getMessageIdentifier = (message) => {
    return message.id || 
           message.whatsapp_message_id || 
           message.whatsapp_media_id || 
           `${message.conversation_id}-${message.timestamp}-${message.content}`;
  };

  const fetchConversation = useCallback(async () => {
    try {
      setLoading(true);
      const [convResponse, messagesResponse] = await Promise.all([
        conversationService.getConversation(id),
        conversationService.getConversationMessages(id, user.businessId)
      ]);
        
      setConversation(convResponse.data);
      setMessages(messagesResponse.data);
    } catch (error) {
      console.error('Error loading conversation:', error);
    } finally {
      setLoading(false);
    }
  }, [id, user.businessId]);
   // Handle quick reply selection
  const handleQuickReplySelect = (quickReply) => {
    setNewMessage(quickReply.message);
    setShowQuickReplies(false);
    textareaRef.current?.focus();
  };

  // Handle slash command detection
  const handleInputChange = (e) => {
    const value = e.target.value;
    setNewMessage(value);

    // Check for slash command
    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const lastSlashIndex = textBeforeCursor.lastIndexOf('/');
    
    if (lastSlashIndex !== -1) {
      const commandText = textBeforeCursor.substring(lastSlashIndex + 1);
      
      // Show quick replies if we have a slash at the beginning of a word
      if (commandText.length >= 0 && (lastSlashIndex === 0 || value[lastSlashIndex - 1] === ' ')) {
        const rect = e.target.getBoundingClientRect();
        setQuickRepliesPosition({
          bottom: window.innerHeight - rect.top + 10,
          left: rect.left
        });
        setShowQuickReplies(true);
      } else {
        setShowQuickReplies(false);
      }
    } else {
      setShowQuickReplies(false);
    }
  };

  // Process slash commands in message
  const processSlashCommands = (message) => {
    let processedMessage = message;
    
    // Find all slash commands in the message
    const slashCommandRegex = /\/(\w+)/g;
    let match;
    
    while ((match = slashCommandRegex.exec(message)) !== null) {
      const shortcode = match[1];
      const quickReply = quickReplies.find(qr => qr.shortcode === shortcode);
      
      if (quickReply) {
        processedMessage = processedMessage.replace(match[0], quickReply.message);
      }
    }
    
    return processedMessage;
  };

  const handleConversationUpdated = useCallback(async () => {
    try {
      const convResponse = await conversationService.getConversation(id);
      setConversation(convResponse.data);
    } catch (error) {
      console.error('Error refreshing conversation:', error);
    }
  }, [id]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
      const processedMessage = processSlashCommands(newMessage);
      setNewMessage('');
      setShowEmojiPicker(false);
      setShowQuickReplies(false);

      sendMessage({ type: 'typing', conversationId: id, isTyping: false });

      await conversationService.sendMessage(id, {
        messageType: 'text',
        content: processedMessage
      });

    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setSending(true);
      
      const uploadResponse = await conversationService.uploadFile(file);
      
      await conversationService.sendFileMessage(
        id, 
        uploadResponse.id,
        file.name
      );
      
    } catch (error) {
      console.error('Error sending file:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (showQuickReplies) {
        setShowQuickReplies(false);
      } else {
        handleSendMessage();
      }
    } else if (e.key === 'Escape' && showQuickReplies) {
      setShowQuickReplies(false);
    }
  };

  const handleTyping = useCallback((isTypingNow) => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    sendMessage({ type: 'typing', conversationId: id, isTyping: isTypingNow });

    if (isTypingNow) {
      typingTimeoutRef.current = setTimeout(() => {
        sendMessage({ type: 'typing', conversationId: id, isTyping: false });
      }, 3000);
    }
  }, [id, sendMessage]);

  const handleBackClick = () => {
    navigate('/conversations');
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleEmojiClick = (emoji) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleQuickRepliesToggle = () => {
    if (!showQuickReplies && textareaRef.current) {
      const rect = textareaRef.current.getBoundingClientRect();
      setQuickRepliesPosition({
        bottom: window.innerHeight - rect.top + 10,
        left: rect.left
      });
    }
    setShowQuickReplies(!showQuickReplies);
  };

  const handleMessageSearch = (messageId) => {
    setHighlightedMessageId(messageId);
    setShowSearchModal(false);
    
    setTimeout(() => {
      const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
      messageElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);

    setTimeout(() => {
      setHighlightedMessageId(null);
    }, 3000);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
      if (quickRepliesRef.current && !quickRepliesRef.current.contains(event.target)) {
        setShowQuickReplies(false);
      }
    };

    if (showEmojiPicker || showQuickReplies) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker, showQuickReplies]);

  // Initialize conversation and quick replies
  useEffect(() => {
    fetchConversation();
    fetchQuickReplies();
  }, [fetchConversation, fetchQuickReplies]);

  // Handle WebSocket notifications (keeping existing)
  useEffect(() => {
    if (!notifications.length) return;

    notifications.forEach(notification => {
      switch (notification.type) {
        case 'new_message':
          if (notification.conversationId !== id) return;
          
          const newMessage = notification.message;
          
          setMessages(prev => {
            const messageId = getMessageIdentifier(newMessage);
            const exists = prev.some(msg => getMessageIdentifier(msg) === messageId);
            
            if (!exists) {
              return [...prev, newMessage];
            }
            return prev;
          });
          break;
          
        case 'message_status':
          setMessages(prev => prev.map(msg => {
            const matches = 
              msg.id === notification.messageId || 
              msg.whatsapp_message_id === notification.messageId ||
              msg.whatsapp_media_id === notification.messageId;
            
            return matches ? { ...msg, status: notification.status } : msg;
          }));
          break;
      }
    });

    clearNotifications();
  }, [notifications, id, clearNotifications]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle typing status for input changes
  useEffect(() => {
    if (newMessage.trim()) {
      handleTyping(true);
    } else {
      handleTyping(false);
    }
  }, [newMessage, handleTyping]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="conversation-detail-container">
        <div className="loading-state">Loading conversation...</div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="conversation-detail-container">
        <div className="error-state">Conversation not found</div>
      </div>
    );
  }

  const messagesWithDateSeparators = getMessagesWithDateSeparators(messages);
  const displayName = conversation.contact_name || `+${conversation.phone_number}`;

  return (
    <div className="conversation-detail-container">
      <div className="conversation-header">
        <div className="conversation-header__left">
          <button className="back-button" onClick={handleBackClick}>
            <ArrowLeft size={20} />
          </button>
          <div className="contact-info">
            <div className="contact-avatar">
              {conversation.contact_avatar ? (
                <img src={conversation.contact_avatar} alt="Profile" className="contact-avatar__image" />
              ) : (
                <User size={24} />
              )}
            </div>
            <div className="contact-details">
              <h3 className="contact-name">{displayName}</h3>
              <div className="contact-status">
                <span className={`connection-status ${isConnected ? 'connection-status--connected' : 'connection-status--disconnected'}`}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
                {!isConnected && (
                  <button onClick={reconnect} className="reconnect-btn">
                    Reconnect
                  </button>
                )}
                <span className={`conversation-status ${
                  conversation.status === 'active'
                    ? 'conversation-status--active'
                    : conversation.status === 'closed'
                    ? 'conversation-status--closed'
                    : 'conversation-status--archived'
                }`}>
                  {conversation.status === 'active'
                    ? 'Active'
                    : conversation.status === 'closed'
                    ? 'Closed'
                    : 'Archived'}
                </span>
                {isTyping && <span className="typing-indicator">typing...</span>}
              </div>
            </div>
          </div>
        </div>
        <div className="conversation-header__actions">
          <button className="header-action-btn" onClick={() => setShowSearchModal(true)}>
            <Search size={20} />
          </button>
          <button className="header-action-btn" onClick={() => setShowOptionsModal(true)}>
            <MoreVertical size={20} />
          </button>
        </div>
      </div>

      <div className="messages-container">
        <div className="messages-wrapper">
          {messagesWithDateSeparators.length === 0 ? (
            <div className="empty-messages">No messages yet</div>
          ) : (
            messagesWithDateSeparators.map((item, index) => {
              if (item.type === 'date-separator') {
                return <DateSeparator key={item.id} date={item.date} />;
              }

              const prevMessage = index > 0 && messagesWithDateSeparators[index - 1].type === 'message' 
                ? messagesWithDateSeparators[index - 1] 
                : null;
              const isConsecutive = prevMessage && 
                prevMessage.direction === item.direction &&
                new Date(item.timestamp) - new Date(prevMessage.timestamp) < 300000;

              return (
                <div key={getMessageIdentifier(item)} data-message-id={item.id}>
                  <MessageBubble 
                    message={item}
                    isConsecutive={isConsecutive}
                    isHighlighted={highlightedMessageId === item.id}
                  />
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="message-input-container">
        <div className="message-input">
          <div className="emoji-picker-container" ref={emojiPickerRef}>
            <button 
              className="input-action-btn emoji-btn"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              <Smile size={20} />
            </button>
            {showEmojiPicker && (
              <EmojiPicker onEmojiClick={handleEmojiClick} />
            )}
          </div>

          <div className="quick-replies-container" ref={quickRepliesRef}>
            <button 
              className="input-action-btn quick-replies-btn"
              onClick={handleQuickRepliesToggle}
              title="Quick Replies (type / to search)"
            >
              <Zap size={20} />
            </button>
            {showQuickReplies && (
              <QuickRepliesDropdown
                quickReplies={quickReplies}
                onSelect={handleQuickReplySelect}
                onClose={() => setShowQuickReplies(false)}
                position={quickRepliesPosition}
              />
            )}
          </div>
          
          <div className="input-wrapper">
            <textarea
              ref={textareaRef}
              value={newMessage}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="Type a message or use /shortcode for quick replies"
              rows={1}
              className="message-textarea"
              disabled={!isConnected}
            />
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange}
              style={{ display: 'none' }}
              accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
            />
            
            <button 
              className="input-action-btn attachment-btn"
              onClick={handleAttachClick}
              disabled={!isConnected}
            >
              <Paperclip size={20} />
            </button>
          </div>
          
          <button 
            className="send-button"
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sending || !isConnected}
          >
            <Send size={20} />
          </button>
        </div>
      </div>

      {showSearchModal && (
        <MessageSearchModal
          messages={messages}
          onClose={() => setShowSearchModal(false)}
          onMessageSelect={handleMessageSearch}
        />
      )}

      {showOptionsModal && (
        <ConversationOptionsModal
          conversation={conversation}
          onClose={() => setShowOptionsModal(false)}
          onConversationUpdated={handleConversationUpdated}
        />
      )}
    </div>
  );
};

export default ConversationDetail;