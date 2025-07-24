import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Search, Archive, MoreVertical, User, MessageCircle, X } from 'lucide-react';
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
  
  const user = authService.getCurrentUser();
  const businessId = user?.businessId;

  const { notifications } = useChatWebSocket();

  const statusFilters = [
    { value: 'all', label: 'All Chats', icon: '💬' },
    { value: 'active', label: 'Active', icon: '🟢' },
    { value: 'closed', label: 'Closed', icon: '⭕' },
    { value: 'archived', label: 'Archived', icon: '📋' }
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
      
      // Sort by last_message_at in descending order (most recent first)
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

  const truncateMessage = (message, maxLength = 35) => {
    if (!message) return 'No messages yet';
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  };

  // Enhanced search function to search both name and phone number
  const filteredConversations = conversations.filter(conv => {
    const query = searchQuery.toLowerCase();
    const contactName = getContactName(conv).toLowerCase();
    const phoneNumber = conv.phone_number.toString();
    
    return contactName.includes(query) || phoneNumber.includes(query);
  });

  // Calculate unread count (don't show for currently active conversation)
  const getDisplayUnreadCount = (conversation) => {
    if (activeConversationId === conversation.id.toString()) {
      return 0; // Don't show unread count for currently active conversation
    }
    return conversation.unread_count || 0;
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  return (
    <div className="conversation-list-container">
      <div className="conversation-list-header">
        <div className="header-top">
          <div className="profile-section">
            <div className="profile-avatar">
              <User size={22} />
            </div>
            <div className="profile-info">
              <h3 className="profile-name">WhatsApp Business</h3>
              <p className="profile-status">Live Chat Dashboard</p>
            </div>
          </div>
          <div className="header-actions">
            <button className="action-btn" title="Archive">
              <Archive size={18} />
            </button>
            <button className="action-btn" title="More options">
              <MoreVertical size={18} />
            </button>
          </div>
        </div>
        
        <div className="search-section">
          <div className="search-container">
            <div className="search-input-wrapper">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              {searchQuery && (
                <button 
                  className="search-clear-btn" 
                  onClick={clearSearch}
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
        
        <div className="conversation-filters">
          {statusFilters.map(filter => (
            <button
              key={filter.value}
              className={`filter-btn ${statusFilter === filter.value ? 'filter-btn--active' : ''}`}
              onClick={() => setStatusFilter(filter.value)}
            >
              <span>{filter.icon}</span>
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="conversation-items">
        {loading && conversations.length === 0 ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <span>Loading conversations...</span>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="empty-state">
            <MessageCircle size={64} />
            <span>No conversations found</span>
            <small>Start a new conversation or adjust your filters</small>
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
                  className={`conversation-item ${displayUnreadCount > 0 ? 'conversation-item--unread' : ''} ${isActive ? 'conversation-item--active' : ''}`}
                >
                  <div className="conversation-avatar">
                    {conv.contact_avatar ? (
                      <img src={conv.contact_avatar} alt="Profile" className="conversation-avatar__image" />
                    ) : (
                      <User size={26} />
                    )}
                  </div>
                  <div className="conversation-details">
                    <div className="conversation-header">
                      <span className="contact-name">{getContactName(conv)}</span>
                      <span className="conversation-time">
                        {formatTime(conv.last_message_at)}
                      </span>
                    </div>
                    <div className="conversation-preview">
                      <p className="message-preview">
                        {truncateMessage(conv.last_message_content)}
                      </p>
                      {displayUnreadCount > 0 && (
                        <div className="unread-badge">{displayUnreadCount}</div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
            {hasMore && (
              <button 
                className="load-more-btn"
                onClick={loadMore}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="loading-spinner loading-spinner--small"></div>
                    <span>Loading more...</span>
                  </>
                ) : (
                  <>
                    <span>📄</span>
                    Load More Conversations
                  </>
                )}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ConversationList;