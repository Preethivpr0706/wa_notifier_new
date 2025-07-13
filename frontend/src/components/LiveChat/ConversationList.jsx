import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Archive, MoreVertical, User } from 'lucide-react';
import { conversationService } from '../../api/conversationService';
import { useChatWebSocket } from '../../hooks/useChatWebSocket';
import { authService } from '../../api/authService';
import './ConversationList.css';

const ConversationList = () => {
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
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'closed', label: 'Closed' },
    { value: 'unassigned', label: 'Unassigned' }
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
      
      console.log(response.data);
      
      setConversations(prev => 
        reset ? response.data : [...prev, ...response.data]
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
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getContactName = (conversation) => {
    if (conversation.contact_name && conversation.contact_name.trim() !== '') {
      return conversation.contact_name.trim();
    }
    return conversation.client_name || `+${conversation.phone_number}`;
  };

  const filteredConversations = conversations.filter(conv =>
    getContactName(conv).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="conversation-list-container">
      <div className="conversation-list-header">
        <div className="header-top">
          <div className="profile-section">
            <div className="profile-avatar">
              <User size={24} />
            </div>
          </div>
          <div className="header-actions">
            <button className="action-btn">
              <Archive size={20} />
            </button>
            <button className="action-btn">
              <MoreVertical size={20} />
            </button>
          </div>
        </div>
        <div className="search-section">
          <div className="search-container">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search or start new chat"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="conversation-filters">
          {statusFilters.map(filter => (
            <button
              key={filter.value}
              className={`filter-btn ${statusFilter === filter.value ? 'active' : ''}`}
              onClick={() => setStatusFilter(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="conversation-items">
        {loading && conversations.length === 0 ? (
          <div className="loading-state">Loading conversations...</div>
        ) : filteredConversations.length === 0 ? (
          <div className="empty-state">No conversations found</div>
        ) : (
          <>
            {filteredConversations.map(conv => (
              <Link
                key={conv.id}
                to={`/conversations/${conv.id}`}
                className={`conversation-item ${conv.unread_count > 0 ? 'unread' : ''}`}
              >
                <div className="conversation-avatar">
                  {conv.contact_avatar ? (
                    <img src={conv.contact_avatar} alt="Profile" />
                  ) : (
                    <User size={24} />
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
                      {conv.last_message_content || 'No messages yet'}
                    </p>
                    {conv.unread_count > 0 && (
                      <div className="unread-badge">{conv.unread_count}</div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
            {hasMore && (
              <button 
                className="load-more-btn"
                onClick={loadMore}
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Load More'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ConversationList;