import React, { useState, useMemo } from 'react';
import { X, Search } from 'lucide-react';
import './MessageSearchModal.css';

const MessageSearchModal = ({ messages, onClose, onMessageSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    return messages.filter(message => 
      message.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      message.media_filename?.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 50); // Limit to 50 results for performance
  }, [messages, searchQuery]);

  const handleMessageClick = (messageId) => {
    onMessageSelect(messageId);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const highlightText = (text, query) => {
    if (!query.trim() || !text) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="search-highlight">{part}</mark>
      ) : (
        <span key={index}>{part}</span>
      )
    );
  };

  return (
    <div className="message-search-modal__overlay">
      <div className="message-search-modal">
        <div className="message-search-modal__header">
          <h3 className="message-search-modal__title">Search Messages</h3>
          <button 
            className="message-search-modal__close"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="message-search-modal__search">
          <div className="search-input-container">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search in messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
              autoFocus
            />
          </div>
        </div>

        <div className="message-search-modal__results">
          {searchQuery.trim() === '' ? (
            <div className="search-empty-state">
              <Search size={48} />
              <p>Type to search messages</p>
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="search-empty-state">
              <Search size={48} />
              <p>No messages found</p>
            </div>
          ) : (
            <div className="search-results">
              <div className="search-results__header">
                <span className="search-results__count">
                  {filteredMessages.length} result{filteredMessages.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="search-results__list">
                {filteredMessages.map((message) => (
                  <div
                    key={message.id}
                    className="search-result-item"
                    onClick={() => handleMessageClick(message.id)}
                  >
                    <div className="search-result-item__content">
                      <div className="search-result-item__text">
                        {message.message_type === 'text' ? (
                          highlightText(message.content, searchQuery)
                        ) : (
                          <span className="search-result-item__media">
                            {message.message_type === 'image' && '🖼️ Image'}
                            {message.message_type === 'video' && '🎥 Video'}
                            {message.message_type === 'document' && `📄 ${message.media_filename || 'Document'}`}
                          </span>
                        )}
                      </div>
                      <div className="search-result-item__meta">
                        <span className="search-result-item__direction">
                          {message.direction === 'outbound' ? 'You' : 'Contact'}
                        </span>
                        <span className="search-result-item__time">
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageSearchModal;