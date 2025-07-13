import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Paperclip, Smile, User, MoreVertical, Search, Phone, Video } from 'lucide-react';
import { conversationService } from '../../api/conversationService';
import { useChatWebSocket } from '../../hooks/useChatWebSocket';
import { authService } from '../../api/authService';
import './ConversationDetail.css';

const MessageBubble = ({ message, isConsecutive = false }) => {
  const isOutbound = message.direction === 'outbound';
  
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
            <a href={message.media_url} target="_blank" rel="noopener noreferrer">
              📄 {message.media_filename || 'Download file'}
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
  const processedMessageIds = useRef(new Set());

  const user = authService.getCurrentUser();
  const { notifications, sendMessage, isConnected, reconnect } = useChatWebSocket();

  const fetchConversation = useCallback(async () => {
    try {
      setLoading(true);
      const [convResponse, messagesResponse] = await Promise.all([
        conversationService.getConversation(id),
        conversationService.getConversationMessages(id)
      ]);
      
      setConversation(convResponse.data);
      setMessages(messagesResponse.data);
      
      // Track existing message IDs - both regular id and whatsapp_message_id
      messagesResponse.data.forEach(msg => {
        if (msg.id) processedMessageIds.current.add(msg.id);
        if (msg.whatsapp_message_id) processedMessageIds.current.add(msg.whatsapp_message_id);
      });
      
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
      const tempId = `temp-${Date.now()}`;
      const tempMessage = {
        id: tempId,
        conversation_id: id,
        direction: 'outbound',
        message_type: 'text',
        content: newMessage,
        status: 'sending',
        timestamp: new Date().toISOString()
      };

      // Add to UI immediately
      setMessages(prev => [...prev, tempMessage]);
      const messageContent = newMessage;
      setNewMessage('');

      // Send typing false
      sendMessage({ type: 'typing', conversationId: id, isTyping: false });

      const response = await conversationService.sendMessage(id, {
        messageType: 'text',
        content: messageContent
      });

      // Update with real data
      setMessages(prev => prev.map(msg => 
        msg.id === tempId ? { 
          ...msg, 
          id: response.data.messageId,
          whatsapp_message_id: response.data.whatsappMessageId,
          status: 'sent'
        } : msg
      ));

      // Track the new message ID
      processedMessageIds.current.add(response.data.messageId);
      if (response.data.whatsappMessageId) {
        processedMessageIds.current.add(response.data.whatsappMessageId);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.map(msg => 
        msg.id.startsWith('temp-') ? { ...msg, status: 'failed' } : msg
      ));
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

  // Handle typing indicator
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

  // Initialize conversation
  useEffect(() => {
    fetchConversation();
  }, [fetchConversation]);

  // Handle WebSocket notifications
  useEffect(() => {
    if (!notifications.length) return;

    console.log('Processing notifications:', notifications);

    notifications.forEach(notification => {
      console.log('Processing notification:', notification);
      
      switch (notification.type) {
        case 'new_message':
          // Only process if it's for this conversation
          if (notification.conversationId !== id) return;
          
          const message = notification.message;
          console.log('New message received:', message);
          
          // Check if we've already processed this message
          const messageId = message.id || message.whatsapp_message_id;
          if (messageId && processedMessageIds.current.has(messageId)) {
            console.log('Message already processed, skipping');
            return;
          }

          // Only add inbound messages (outbound are handled by sendMessage)
          if (message.direction === 'inbound') {
            setMessages(prev => {
              const exists = prev.some(msg => 
                msg.id === message.id || 
                msg.whatsapp_message_id === message.whatsapp_message_id ||
                (msg.id && message.id && msg.id === message.id)
              );
              
              if (!exists) {
                console.log('Adding new inbound message');
                // Track the message ID
                if (message.id) processedMessageIds.current.add(message.id);
                if (message.whatsapp_message_id) processedMessageIds.current.add(message.whatsapp_message_id);
                
                return [...prev, message];
              }
              return prev;
            });
          }
          break;

        case 'message_status':
          console.log('Message status update:', notification);
          
          // Update message status - check both id and whatsapp_message_id
          setMessages(prev => {
            const updated = prev.map(msg => {
              // Check if this message matches the status update
              const matches = 
                msg.id === notification.messageId || 
                msg.whatsapp_message_id === notification.messageId ||
                (msg.id && notification.messageId && msg.id.toString() === notification.messageId.toString()) ||
                (msg.whatsapp_message_id && notification.messageId && msg.whatsapp_message_id.toString() === notification.messageId.toString());
              
              if (matches) {
                console.log(`Updating message ${msg.id} status from ${msg.status} to ${notification.status}`);
                return { ...msg, status: notification.status };
              }
              return msg;
            });
            
            // Check if any message was actually updated
            const wasUpdated = updated.some((msg, index) => 
              msg.status !== prev[index].status
            );
            
            if (wasUpdated) {
              console.log('Message status updated successfully');
            } else {
              console.log(`No message found with ID: ${notification.messageId}`);
              console.log('Available message IDs:', prev.map(m => ({ id: m.id, whatsapp_id: m.whatsapp_message_id })));
            }
            
            return updated;
          });
          break;

        case 'typing':
          // Only process if it's for this conversation
          if (notification.conversationId !== id) return;
          
          console.log('Typing status:', notification.isTyping);
          setIsTyping(notification.isTyping);
          break;

        case 'new_conversation':
          // This would be handled in the conversation list
          break;

        default:
          console.log('Unknown notification type:', notification.type);
      }
    });
  }, [notifications, id]);

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
                new Date(message.timestamp) - new Date(prevMessage.timestamp) < 300000; // 5 minutes

              return (
                <MessageBubble 
                  key={message.id || message.whatsapp_message_id} 
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
            <button className="input-action-btn attachment-btn">
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