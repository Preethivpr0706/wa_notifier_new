import { useState } from 'react';
import { Search, Filter, Calendar, Clock, Eye, Play, Edit, Trash, Plus } from 'lucide-react';
import './Campaigns.css';

function Campaigns() {
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const campaigns = [
    {
      id: 1,
      name: 'May Product Launch',
      template: 'Product Launch Announcement',
      recipients: 2500,
      status: 'sent',
      delivered: 2450,
      read: 1987,
      date: '05/15/2023',
      time: '10:00 AM'
    },
    {
      id: 2,
      name: 'Weekend Flash Sale',
      template: 'Limited Time Offer',
      recipients: 5000,
      status: 'scheduled',
      delivered: 0,
      read: 0,
      date: '05/20/2023',
      time: '08:00 AM'
    },
    {
      id: 3,
      name: 'Customer Feedback Survey',
      template: 'Survey Request',
      recipients: 1200,
      status: 'sent',
      delivered: 1180,
      read: 964,
      date: '05/10/2023',
      time: '09:30 AM'
    },
    {
      id: 4,
      name: 'Webinar Registration',
      template: 'Event Invitation',
      recipients: 3800,
      status: 'scheduled',
      delivered: 0,
      read: 0,
      date: '05/25/2023',
      time: '02:00 PM'
    },
    {
      id: 5,
      name: 'New Feature Announcement',
      template: 'Product Update',
      recipients: 4200,
      status: 'failed',
      delivered: 3800,
      read: 0,
      date: '05/08/2023',
      time: '11:00 AM'
    },
    {
      id: 6,
      name: 'Customer Loyalty Program',
      template: 'Loyalty Rewards',
      recipients: 2800,
      status: 'draft',
      delivered: 0,
      read: 0,
      date: '',
      time: ''
    }
  ];

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const filteredCampaigns = campaigns.filter((campaign) => {
    const matchesFilter = activeFilter === 'all' || campaign.status === activeFilter;
    const matchesSearch = campaign.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusClass = (status) => {
    switch (status) {
      case 'sent':
        return 'status-sent';
      case 'scheduled':
        return 'status-scheduled';
      case 'draft':
        return 'status-draft';
      case 'failed':
        return 'status-failed';
      default:
        return '';
    }
  };

  return (
    <div className="campaigns">
      <div className="page-header">
        <h2>Campaigns</h2>
        <a href="/campaigns/create" className="btn btn-primary">
          <Plus size={16} />
          <span>Create Campaign</span>
        </a>
      </div>

      <div className="filters-bar">
        <div className="search-container">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="search-input"
          />
        </div>
        <div className="filter-tabs">
          <button 
            className={`filter-tab ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => handleFilterChange('all')}
          >
            All
          </button>
          <button 
            className={`filter-tab ${activeFilter === 'sent' ? 'active' : ''}`}
            onClick={() => handleFilterChange('sent')}
          >
            Sent
          </button>
          <button 
            className={`filter-tab ${activeFilter === 'scheduled' ? 'active' : ''}`}
            onClick={() => handleFilterChange('scheduled')}
          >
            Scheduled
          </button>
          <button 
            className={`filter-tab ${activeFilter === 'draft' ? 'active' : ''}`}
            onClick={() => handleFilterChange('draft')}
          >
            Draft
          </button>
          <button 
            className={`filter-tab ${activeFilter === 'failed' ? 'active' : ''}`}
            onClick={() => handleFilterChange('failed')}
          >
            Failed
          </button>
        </div>
        <button className="btn-secondary filter-button">
          <Filter size={16} />
          <span>Filter</span>
        </button>
      </div>

      <div className="campaigns-grid">
        {filteredCampaigns.map((campaign) => (
          <div key={campaign.id} className="campaign-card card">
            <div className="campaign-header">
              <div className={`campaign-status ${getStatusClass(campaign.status)}`}>
                {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
              </div>
            </div>
            <h3 className="campaign-name">{campaign.name}</h3>
            <div className="campaign-info">
              <div className="info-item">
                <span className="info-label">Template:</span>
                <span className="info-value">{campaign.template}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Recipients:</span>
                <span className="info-value">{campaign.recipients.toLocaleString()}</span>
              </div>
              {campaign.status !== 'draft' && (
                <>
                  <div className="info-item">
                    <span className="info-label">Delivered:</span>
                    <span className="info-value">
                      {campaign.delivered.toLocaleString()} 
                      {campaign.recipients > 0 ? ` (${Math.round(campaign.delivered / campaign.recipients * 100)}%)` : ''}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Read:</span>
                    <span className="info-value">
                      {campaign.read.toLocaleString()}
                      {campaign.delivered > 0 ? ` (${Math.round(campaign.read / campaign.delivered * 100)}%)` : ''}
                    </span>
                  </div>
                </>
              )}
            </div>
            
            {(campaign.status === 'sent' || campaign.status === 'scheduled' || campaign.status === 'failed') && (
              <div className="campaign-timing">
                <div className="timing-item">
                  <Calendar size={14} />
                  <span>{campaign.date}</span>
                </div>
                <div className="timing-item">
                  <Clock size={14} />
                  <span>{campaign.time}</span>
                </div>
              </div>
            )}
            
            <div className="campaign-actions">
              <div className="action-buttons">
                <button className="action-btn view-btn" title="View Campaign">
                  <Eye size={16} />
                </button>
                {campaign.status === 'scheduled' && (
                  <button className="action-btn play-btn" title="Send Now">
                    <Play size={16} />
                  </button>
                )}
                {campaign.status === 'draft' && (
                  <button className="action-btn edit-btn" title="Edit Campaign">
                    <Edit size={16} />
                  </button>
                )}
                {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
                  <button className="action-btn delete-btn" title="Delete Campaign">
                    <Trash size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Campaigns;