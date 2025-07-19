import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Paperclip, Smile, User, MoreVertical, Search, Phone, Video } from 'lucide-react';
import { conversationService } from '../../api/conversationService';
import { useChatWebSocket } from '../../hooks/useChatWebSocket';
import { authService } from '../../api/authService';
import './ConversationDetail.css';

const MessageBubble = ({ message, isConsecutive = false }) => {
  const isOutbound = message.direction === 'outbound';
  
  const getFileTypeIcon = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    switch(ext) {
      case 'pdf':
        return '📄';
      case 'doc':
      case 'docx':
        return '📝';
      case 'xls':
      case 'xlsx':
        return '📊';
      case 'ppt':
      case 'pptx':
        return '📑';
      case 'txt':
        return '📄';
      default:
        return '📎';
    }
  };

  const StatusIcon = ({ status }) => {
    switch (status) {
      case 'delivered':
        return (
          <div className="message-status delivered">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M1.5 8.5L5 12L14.5 2.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8 12L16.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        );
      case 'read':
        return (
          <div className="message-status read">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M1.5 8.5L5 12L14.5 2.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8 12L16.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        );
      case 'sent':
        return (
          <div className="message-status sent">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M1.5 8.5L5 12L14.5 2.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        );
      case 'sending':
        return (
          <div className="message-status sending">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
        );
      case 'failed':
        return (
          <div className="message-status failed">
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

  return (
    <div className={`message-bubble ${isOutbound ? 'outbound' : 'inbound'} ${isConsecutive ? 'consecutive' : ''}`}>
      <div className="message-content">
        {message.message_type === 'text' && <p>{message.content}</p>}
        
        {message.message_type === 'image' && (
          <div className="message-image">
            <img src={message.media_url} alt={message.content} />
          </div>
        )}
        
        {message.message_type === 'document' && (
          <div className="message-document">
            <a 
              href={message.media_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="document-link"
            >
              <div className="document-icon">
                {getFileTypeIcon(message.media_filename || message.content)}
              </div>
              <div className="document-info">
                <div className="document-name">{message.media_filename || message.content}</div>
                <div className="document-size">{formatFileSize(message.file_size)}</div>
              </div>
            </a>
          </div>
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
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  const user = authService.getCurrentUser();
  const { notifications, sendMessage, isConnected, reconnect, clearNotifications } = useChatWebSocket();

  // Simple message deduplication using a Set of message identifiers
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
        conversationService.getConversationMessages(id)
      ]);
      
      setConversation(convResponse.data);
      setMessages(messagesResponse.data);
      
    } catch (error) {
      console.error('Error loading conversation:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
      const messageContent = newMessage;
      setNewMessage('');

      // Send typing false
      sendMessage({ type: 'typing', conversationId: id, isTyping: false });

      // Send message directly without adding to UI first
      await conversationService.sendMessage(id, {
        messageType: 'text',
        content: messageContent
      });

      // WebSocket will handle adding the message to UI

    } catch (error) {
      console.error('Error sending message:', error);
      // Show error message or retry option
    } finally {
      setSending(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setSending(true);
      
      // Upload the file
      const uploadResponse = await conversationService.uploadFile(file);
      
      // Send the file message
      await conversationService.sendFileMessage(
        id, 
        uploadResponse.id,
        file.name
      );
      
      // WebSocket will handle adding the message to UI
      
    } catch (error) {
      console.error('Error sending file:', error);
      // Show error message or retry option
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
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
    fileInputRef.current.click();
  };

  // Initialize conversation
  useEffect(() => {
    fetchConversation();
  }, [fetchConversation]);

  // Handle WebSocket notifications - simplified
  useEffect(() => {
    if (!notifications.length) return;

    console.log('Processing notifications:', notifications);

    notifications.forEach(notification => {
      switch (notification.type) {
        case 'new_message':
          if (notification.conversationId !== id) return;
          
          const newMessage = notification.message;
          console.log('Adding new message:', newMessage);
          
          setMessages(prev => {
            // Simple deduplication - check if message already exists
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

    // Clear notifications after processing
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

  return (
    <div className="conversation-detail-container">
      <div className="conversation-header">
        <div className="header-left">
          <button className="back-button" onClick={handleBackClick}>
            <ArrowLeft size={20} />
          </button>
          <div className="contact-info">
            <div className="contact-avatar">
              {conversation.contact_avatar ? (
                <img src={conversation.contact_avatar} alt="Profile" />
              ) : (
                <User size={24} />
              )}
            </div>
            <div className="contact-details">
              <h3 className="contact-name">
                {conversation.contact_name || `+${conversation.phone_number}`}
              </h3>
              <p className="contact-status">
                <span className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
                {!isConnected && (
                  <button onClick={reconnect} className="reconnect-btn">
                    Reconnect
                  </button>
                )}
                {conversation.status === 'active' ? (
                  <span className="active">Active</span>
                ) : (
                  <span className="closed">Closed</span>
                )}
                {isTyping && <span className="typing-indicator">typing...</span>}
              </p>
            </div>
          </div>
        </div>
        <div className="header-actions">
          <button className="header-action-btn">
            <Video size={20} />
          </button>
          <button className="header-action-btn">
            <Phone size={20} />
          </button>
          <button className="header-action-btn">
            <Search size={20} />
          </button>
          <button className="header-action-btn">
            <MoreVertical size={20} />
          </button>
        </div>
      </div>

      <div className="messages-container">
        <div className="messages-wrapper">
          {messages.length === 0 ? (
            <div className="empty-messages">No messages yet</div>
          ) : (
            messages.map((message, index) => {
              const prevMessage = messages[index - 1];
              const isConsecutive = prevMessage && 
                prevMessage.direction === message.direction &&
                new Date(message.timestamp) - new Date(prevMessage.timestamp) < 300000;

              return (
                <MessageBubble 
                  key={getMessageIdentifier(message)} 
                  message={message} 
                  isConsecutive={isConsecutive}
                />
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="message-input-container">
        <div className="message-input">
          <button className="input-action-btn">
            <Smile size={20} />
          </button>
          <div className="input-wrapper">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message"
              rows={1}
              className="message-textarea"
              disabled={!isConnected}
            />
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange}
              style={{ display: 'none' }}
              accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
            />
            
            <button 
              className="input-action-btn attachment-btn"
              onClick={handleAttachClick}
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
    </div>
  );
};

export default ConversationDetail;