import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Search, Archive, MoreVertical, User, MessageCircle, X, Menu } from 'lucide-react';
import { conversationService } from '../../api/conversationService';
import { useChatWebSocket } from '../../hooks/useChatWebSocket';
import { authService } from '../../api/authService';
import './ConversationList.css';

const ConversationList = () => {
  const { id: activeConversationId } = useParams();
  const [conversations, setConversations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  
  const user = authService.getCurrentUser();
  const businessId = user?.businessId;

  const { notifications } = useChatWebSocket();

  const statusFilters = [
    { value: 'all', label: 'All', icon: '💬', count: 0 },
    { value: 'unread', label: 'Unread', icon: '🔴', count: 0 },
    { value: 'active', label: 'Active', icon: '🟢', count: 0 },
    { value: 'archived', label: 'Archived', icon: '📁', count: 0 }
  ];

  const fetchConversations = async (reset = false) => {
    if (!businessId) return;
    
    try {
      setLoading(true);
      const currentPage = reset ? 1 : page;
      
      const response = await conversationService.listConversations(
        statusFilter === 'all' ? null : statusFilter,
        currentPage
      );
      
      const sortedConversations = response.data.sort((a, b) => {
        const dateA = a.last_message_at ? new Date(a.last_message_at) : new Date(0);
        const dateB = b.last_message_at ? new Date(b.last_message_at) : new Date(0);
        return dateB - dateA;
      });
      
      setConversations(prev => 
        reset ? sortedConversations : [...prev, ...sortedConversations]
      );
      setHasMore(response.data.length === 20);
      if (reset) setPage(1);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations(true);
  }, [statusFilter, businessId]);

  useEffect(() => {
    const newMessageNotifications = notifications.filter(
      n => n.type === 'new_message' || n.type === 'new_conversation'
    );
    if (newMessageNotifications.length > 0) {
      fetchConversations(true);
    }
  }, [notifications]);

  const loadMore = () => {
    setPage(prev => prev + 1);
  };

  useEffect(() => {
    if (page > 1) {
      fetchConversations();
    }
  }, [page]);

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (isYesterday) {
      return 'Yesterday';
    } else {
      const daysDiff = Math.floor((now - date) / (1000 * 60 * 60 * 24));
      if (daysDiff < 7) {
        return date.toLocaleDateString([], { weekday: 'short' });
      } else {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      }
    }
  };

  const getContactName = (conversation) => {
    if (conversation.contact_name && conversation.contact_name.trim() !== '') {
      return conversation.contact_name.trim();
    }
    return conversation.client_name || `+${conversation.phone_number}`;
  };

  const truncateMessage = (message, maxLength = 30) => {
    if (!message) return 'No messages yet';
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  };

  const filteredConversations = conversations.filter(conv => {
    const query = searchQuery.toLowerCase();
    const contactName = getContactName(conv).toLowerCase();
    const phoneNumber = conv.phone_number.toString();
    
    return contactName.includes(query) || phoneNumber.includes(query);
  });

  const getDisplayUnreadCount = (conversation) => {
    if (activeConversationId === conversation.id.toString()) {
      return 0;
    }
    return conversation.unread_count || 0;
  };

  const clearSearch = () => {
    setSearchQuery('');
    setIsSearchFocused(false);
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const words = name.split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="whatsapp-conversation-list">
      {/* Header */}
      <div className="wa-header">
        <div className="wa-header-content">
          <div className="wa-profile-section">
            <div className="wa-profile-avatar">
              <User size={20} />
            </div>
            <div className="wa-profile-info">
              <h3>Chats</h3>
            </div>
          </div>
          <div className="wa-header-actions">
            <button className="wa-action-btn" title="Archive">
              <Archive size={20} />
            </button>
            <button className="wa-action-btn" title="Menu">
              <MoreVertical size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="wa-search-container">
        <div className={`wa-search-wrapper ${isSearchFocused ? 'focused' : ''}`}>
          <div className="wa-search-input-container">
            <Search size={16} className="wa-search-icon" />
            <input
              type="text"
              placeholder="Search or start new chat"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              className="wa-search-input"
            />
            {searchQuery && (
              <button 
                className="wa-search-clear" 
                onClick={clearSearch}
                type="button"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="wa-filters">
        {statusFilters.map(filter => (
          <button
            key={filter.value}
            className={`wa-filter-btn ${statusFilter === filter.value ? 'active' : ''}`}
            onClick={() => setStatusFilter(filter.value)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Conversations List */}
      <div className="wa-conversations">
        <div className="wa-conversations-scroll">
          {loading && conversations.length === 0 ? (
            <div className="wa-loading">
              <div className="wa-spinner"></div>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="wa-empty-state">
              <MessageCircle size={64} className="wa-empty-icon" />
              <p>No conversations found</p>
              <span>Start messaging to see your chats here</span>
            </div>
          ) : (
            <>
              {filteredConversations.map(conv => {
                const displayUnreadCount = getDisplayUnreadCount(conv);
                const isActive = activeConversationId === conv.id.toString();
                
                return (
                  <Link
                    key={conv.id}
                    to={`/conversations/${conv.id}`}
                    className={`wa-conversation-item ${isActive ? 'active' : ''} ${displayUnreadCount > 0 ? 'unread' : ''}`}
                  >
                    <div className="wa-avatar">
                      {conv.contact_avatar ? (
                        <img 
                          src={conv.contact_avatar} 
                          alt={getContactName(conv)}
                          className="wa-avatar-img"
                        />
                      ) : (
                        <div className="wa-avatar-placeholder">
                          {getInitials(getContactName(conv))}
                        </div>
                      )}
                    </div>
                    
                    <div className="wa-conversation-content">
                      <div className="wa-conversation-header">
                        <h4 className="wa-contact-name">
                          {getContactName(conv)}
                        </h4>
                        <span className="wa-time">
                          {formatTime(conv.last_message_at)}
                        </span>
                      </div>
                      
                      <div className="wa-conversation-preview">
                        <p className="wa-last-message">
                          {truncateMessage(conv.last_message_content)}
                        </p>
                        {displayUnreadCount > 0 && (
                          <div className="wa-unread-count">
                            {displayUnreadCount > 99 ? '99+' : displayUnreadCount}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
              
              {hasMore && (
                <div className="wa-load-more">
                  <button 
                    className="wa-load-more-btn"
                    onClick={loadMore}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <div className="wa-spinner wa-spinner-small"></div>
                        Loading...
                      </>
                    ) : (
                      'Load more chats'
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConversationList;
