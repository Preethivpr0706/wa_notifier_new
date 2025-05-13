// src/pages/CampaignDetails.jsx
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, RefreshCw, Clock, Calendar, Users,
  Mail, CheckCircle, XCircle, MessageSquare, BarChart2,
  Download, Filter, Search, Inbox, AlertTriangle, Play,
  Pause, Copy, Edit, Trash, Link2
} from 'lucide-react';
import { campaignService } from '../../api/campaignService';
import './CampaignDetails.css';

function CampaignDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [recipientFilter, setRecipientFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);

  // Fetch campaign details
  const fetchCampaignDetails = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await campaignService.getCampaignById(id);
      setCampaign(response.data);
      return response.data;
    } catch (err) {
      console.error('Error fetching campaign details:', err);
      setError('Failed to load campaign details: ' + (err.message || 'Unknown error'));
      throw err;
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    let intervalId;
    
    const fetchData = async () => {
      const data = await fetchCampaignDetails();
      
      // Set up polling only if campaign is in sending state
      if (data?.status === 'sending') {
        intervalId = setInterval(fetchCampaignDetails, 30000); // 30 seconds
      }
    };

    fetchData();

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [fetchCampaignDetails]);

  // Refresh campaign data
  const refreshCampaign = async () => {
    setIsRefreshing(true);
    try {
      await fetchCampaignDetails();
    } catch (err) {
      console.error('Error refreshing campaign:', err);
    }
  };

  // Handle search
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleString(undefined, options);
  };

  // Calculate percentages
  const calculatePercentage = (part, total) => {
    if (!part || !total || total === 0) return '0%';
    return `${Math.round((part / total) * 100)}%`;
  };

  // Get status class
  const getStatusClass = (status) => {
    const statusClasses = {
      completed: 'status-completed',
      partial: 'status-partial',
      sending: 'status-sending',
      scheduled: 'status-scheduled',
      draft: 'status-draft',
      failed: 'status-failed',
      paused: 'status-paused'
    };
    return statusClasses[status] || '';
  };

  // Download campaign report
  const downloadReport = () => {
    console.log('Downloading report for campaign:', id);
  };

  // Delete campaign
  const deleteCampaign = async () => {
    try {
      await campaignService.deleteCampaign(id);
      navigate('/campaigns');
    } catch (err) {
      setError('Failed to delete campaign: ' + (err.message || 'Unknown error'));
    }
  };

  // Pause campaign
  const pauseCampaign = async () => {
    try {
      await campaignService.pauseCampaign(id);
      refreshCampaign();
      setShowPauseModal(false);
    } catch (err) {
      setError('Failed to pause campaign: ' + (err.message || 'Unknown error'));
    }
  };

  // Resume campaign
  const resumeCampaign = async () => {
    try {
      await campaignService.resumeCampaign(id);
      refreshCampaign();
    } catch (err) {
      setError('Failed to resume campaign: ' + (err.message || 'Unknown error'));
    }
  };

  // Get message statistics
  const getMessageStats = () => {
    if (!campaign) return null;
    
    return [
      {
        label: 'Recipients',
        value: campaign.recipientCount?.toLocaleString() || '0',
        icon: <Users size={20} />,
        color: 'var(--neutral-700)'
      },
      {
        label: 'Delivered',
        value: campaign.deliveredCount?.toLocaleString() || '0',
        percentage: calculatePercentage(campaign.deliveredCount, campaign.recipientCount),
        icon: <Mail size={20} />,
        color: 'var(--primary-color)'
      },
      {
        label: 'Read',
        value: campaign.readCount?.toLocaleString() || '0',
        percentage: calculatePercentage(campaign.readCount, campaign.deliveredCount),
        icon: <CheckCircle size={20} />,
        color: 'var(--success-color)'
      },
      {
        label: 'Failed',
        value: campaign.failedCount?.toLocaleString() || '0',
        percentage: calculatePercentage(campaign.failedCount, campaign.recipientCount),
        icon: <XCircle size={20} />,
        color: 'var(--error-color)'
      },
      {
        label: 'Responses',
        value: campaign.responseCount?.toLocaleString() || '0',
        percentage: calculatePercentage(campaign.responseCount, campaign.deliveredCount),
        icon: <MessageSquare size={20} />,
        color: 'var(--accent-color)'
      }
    ];
  };

  // Mock recipient data
  const getRecipientsData = useCallback(() => {
    if (!campaign) return [];
    
   const mockRecipients = Array(campaign.recipientCount || 0).fill().map((_, index) => ({
  id: `rec-${index}`,
  phoneNumber: `+1234567${String(index).padStart(4, '0')}`,
  name: `Contact ${index + 1}`,
  status: index % 10 === 0 ? 'failed' : 
          index % 5 === 0 ? 'pending' : 
          index % 3 === 0 ? 'delivered' : 'read',
  deliveredAt: index % 5 !== 0 ? new Date(Date.now() - Math.random() * 86400000).toISOString() : null,
  readAt: index % 3 === 0 ? new Date(Date.now() - Math.random() * 43200000).toISOString() : null,
  error: index % 10 === 0 ? 'Phone number not registered with WhatsApp' : null
}));
    
    const filteredRecipients = mockRecipients.filter(recipient => {
      if (recipientFilter === 'all') return true;
      return recipient.status === recipientFilter;
    });
    
    return filteredRecipients.filter(recipient => 
      recipient.phoneNumber.includes(searchQuery) || 
      recipient.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [campaign, recipientFilter, searchQuery]);

  const filteredRecipients = getRecipientsData();

  if (isLoading && !campaign) {
    return (
      <div className="campaign-details loading-state">
        <div className="spinner"></div>
        <p>Loading campaign details...</p>
      </div>
    );
  }

  if (error && !campaign) {
    return (
      <div className="campaign-details error-state">
        <AlertTriangle size={48} />
        <h3>Error Loading Campaign</h3>
        <p>{error}</p>
        <button className="btn btn-primary" onClick={() => navigate('/campaigns')}>
          Back to Campaigns
        </button>
      </div>
    );
  }

  return (
    <div className="campaign-details">
      {/* Header */}
      <div className="details-header">
        <div className="header-left">
          <button 
            className="btn-icon back-button" 
            onClick={() => navigate('/campaigns')}
          >
            <ArrowLeft size={20} />
          </button>
          <h2>Campaign Details</h2>
        </div>
        <div className="header-right">
          <button 
            className="btn-icon refresh-button" 
            onClick={refreshCampaign}
            disabled={isRefreshing}
          >
            <RefreshCw size={20} className={isRefreshing ? "spinning" : ""} />
          </button>
          <button className="btn btn-secondary" onClick={downloadReport}>
            <Download size={16} />
            <span>Download Report</span>
          </button>
          {campaign?.status === 'sending' && (
            <button 
              className="btn btn-warning"
              onClick={() => setShowPauseModal(true)}
            >
              <Pause size={16} />
              <span>Pause Campaign</span>
            </button>
          )}
          {campaign?.status === 'paused' && (
            <button 
              className="btn btn-accent"
              onClick={resumeCampaign}
            >
              <Play size={16} />
              <span>Resume Campaign</span>
            </button>
          )}
          {(campaign?.status === 'draft' || campaign?.status === 'scheduled') && (
            <>
              <button 
                className="btn btn-secondary"
                onClick={() => navigate(`/campaigns/${id}/edit`)}
              >
                <Edit size={16} />
                <span>Edit</span>
              </button>
              <button 
                className="btn btn-danger"
                onClick={() => setShowDeleteModal(true)}
              >
                <Trash size={16} />
                <span>Delete</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Campaign info card */}
      <div className="info-card">
        <div className="info-header">
          <div className="info-title">
            <h3>{campaign?.name}</h3>
            <div className={`campaign-status ${getStatusClass(campaign?.status)}`}>
              {campaign?.status?.charAt(0).toUpperCase() + campaign?.status?.slice(1)}
            </div>
          </div>
          <div className="campaign-id">
            <span>ID: {campaign?.id}</span>
            <button className="btn-icon copy-button" title="Copy ID">
              <Copy size={14} />
            </button>
          </div>
        </div>
        
        <div className="info-grid">
          <div className="info-item">
            <Calendar size={16} />
            <span className="info-label">Created Date:</span>
            <span className="info-value">{formatDate(campaign?.createdAt)}</span>
          </div>
          
          <div className="info-item">
            <Clock size={16} />
            <span className="info-label">Scheduled For:</span>
            <span className="info-value">{formatDate(campaign?.scheduledAt)}</span>
          </div>
          
          <div className="info-item">
            <Link2 size={16} />
            <span className="info-label">Template:</span>
            <span className="info-value">{campaign?.templateName}</span>
          </div>
          
          {campaign?.startedAt && (
            <div className="info-item">
              <Play size={16} />
              <span className="info-label">Started At:</span>
              <span className="info-value">{formatDate(campaign?.startedAt)}</span>
            </div>
          )}
          
          {campaign?.completedAt && (
            <div className="info-item">
              <CheckCircle size={16} />
              <span className="info-label">Completed At:</span>
              <span className="info-value">{formatDate(campaign?.completedAt)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        <div className="tabs">
          <button 
            className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={`tab-button ${activeTab === 'recipients' ? 'active' : ''}`}
            onClick={() => setActiveTab('recipients')}
          >
            Recipients
          </button>
          <button 
            className={`tab-button ${activeTab === 'engagement' ? 'active' : ''}`}
            onClick={() => setActiveTab('engagement')}
          >
            Engagement
          </button>
          <button 
            className={`tab-button ${activeTab === 'message' ? 'active' : ''}`}
            onClick={() => setActiveTab('message')}
          >
            Message
          </button>
        </div>
      </div>

      {/* Tab content */}
      <div className="tab-content">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="overview-tab">
            <div className="stats-grid">
              {getMessageStats()?.map((stat, index) => (
                <div className="stat-card" key={index}>
                  <div className="stat-icon" style={{ backgroundColor: stat.color + '15', color: stat.color }}>
                    {stat.icon}
                  </div>
                  <div className="stat-info">
                    <h4>{stat.label}</h4>
                    <div className="stat-value">
                      {stat.value}
                      {stat.percentage && <span className="stat-percentage">({stat.percentage})</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="overview-charts">
              <div className="chart-card">
                <h4>Delivery Performance</h4>
                <div className="delivery-chart">
                  <div className="progress-wrapper">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill delivered" 
                        style={{ width: calculatePercentage(campaign?.deliveredCount, campaign?.recipientCount) }}
                      ></div>
                    </div>
                    <div className="progress-labels">
                      <span>Delivered: {campaign?.deliveredCount?.toLocaleString() || '0'}</span>
                      <span>{calculatePercentage(campaign?.deliveredCount, campaign?.recipientCount)}</span>
                    </div>
                  </div>
                  
                  <div className="progress-wrapper">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill read" 
                        style={{ width: calculatePercentage(campaign?.readCount, campaign?.recipientCount) }}
                      ></div>
                    </div>
                    <div className="progress-labels">
                      <span>Read: {campaign?.readCount?.toLocaleString() || '0'}</span>
                      <span>{calculatePercentage(campaign?.readCount, campaign?.recipientCount)}</span>
                    </div>
                  </div>
                  
                  <div className="progress-wrapper">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill failed" 
                        style={{ width: calculatePercentage(campaign?.failedCount, campaign?.recipientCount) }}
                      ></div>
                    </div>
                    <div className="progress-labels">
                      <span>Failed: {campaign?.failedCount?.toLocaleString() || '0'}</span>
                      <span>{calculatePercentage(campaign?.failedCount, campaign?.recipientCount)}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="chart-card">
                <h4>Response Rate</h4>
                <div className="response-chart">
                  <div className="donut-chart">
                    <div className="donut-fill" style={{ 
                      '--percentage': campaign?.responseCount && campaign?.deliveredCount ? 
                        (campaign.responseCount / campaign.deliveredCount) * 100 : 0 
                    }}></div>
                    <div className="donut-center">
                      {calculatePercentage(campaign?.responseCount, campaign?.deliveredCount)}
                    </div>
                  </div>
                  <div className="response-legend">
                    <div className="legend-item">
                      <div className="legend-color response"></div>
                      <span>Responded</span>
                      <strong>{campaign?.responseCount?.toLocaleString() || '0'}</strong>
                    </div>
                    <div className="legend-item">
                      <div className="legend-color no-response"></div>
                      <span>No Response</span>
                      <strong>{((campaign?.deliveredCount || 0) - (campaign?.responseCount || 0)).toLocaleString()}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="overview-summary">
              <h4>Campaign Summary</h4>
              <div className="summary-content">
                <p>
                  This campaign was created on {formatDate(campaign?.createdAt)} and
                  {campaign?.status === 'scheduled' ? ' is scheduled to be sent on ' + formatDate(campaign?.scheduledAt) + '.' : 
                   campaign?.status === 'draft' ? ' is currently in draft state.' : 
                   campaign?.status === 'sending' ? ' is currently being sent.' : 
                   campaign?.status === 'completed' ? ' was completed on ' + formatDate(campaign?.completedAt) + '.' : 
                   campaign?.status === 'failed' ? ' has failed to complete successfully.' :
                   campaign?.status === 'paused' ? ' is currently paused.' :
                   campaign?.status === 'partial' ? ' was partially completed.' : ''}
                </p>
                <p>
                  Message template used: <strong>{campaign?.templateName}</strong><br />
                  Total recipients: <strong>{campaign?.recipientCount?.toLocaleString() || '0'}</strong><br />
                  Delivered messages: <strong>{campaign?.deliveredCount?.toLocaleString() || '0'} ({calculatePercentage(campaign?.deliveredCount, campaign?.recipientCount)})</strong><br />
                  Read messages: <strong>{campaign?.readCount?.toLocaleString() || '0'} ({calculatePercentage(campaign?.readCount, campaign?.deliveredCount)})</strong><br />
                  Failed messages: <strong>{campaign?.failedCount?.toLocaleString() || '0'} ({calculatePercentage(campaign?.failedCount, campaign?.recipientCount)})</strong><br />
                  Responses received: <strong>{campaign?.responseCount?.toLocaleString() || '0'} ({calculatePercentage(campaign?.responseCount, campaign?.deliveredCount)})</strong>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Recipients Tab */}
        {activeTab === 'recipients' && (
          <div className="recipients-tab">
            <div className="recipients-header">
              <div className="recipients-filters">
                <div className="filter-group">
                  <button 
                    className={`filter-button ${recipientFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setRecipientFilter('all')}
                  >
                    All
                  </button>
                  <button 
                    className={`filter-button ${recipientFilter === 'delivered' ? 'active' : ''}`}
                    onClick={() => setRecipientFilter('delivered')}
                  >
                    Delivered
                  </button>
                  <button 
                    className={`filter-button ${recipientFilter === 'read' ? 'active' : ''}`}
                    onClick={() => setRecipientFilter('read')}
                  >
                    Read
                  </button>
                  <button 
                    className={`filter-button ${recipientFilter === 'pending' ? 'active' : ''}`}
                    onClick={() => setRecipientFilter('pending')}
                  >
                    Pending
                  </button>
                  <button 
                    className={`filter-button ${recipientFilter === 'failed' ? 'active' : ''}`}
                    onClick={() => setRecipientFilter('failed')}
                  >
                    Failed
                  </button>
                </div>
                
                <div className="search-container">
                  <Search size={16} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search phone or name..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="search-input"
                  />
                </div>
              </div>
              
              <button className="btn btn-secondary download-btn">
                <Download size={16} />
                <span>Export CSV</span>
              </button>
            </div>
            
            <div className="recipients-table-container">
              <table className="recipients-table">
                <thead>
                  <tr>
                    <th>Phone Number</th>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Delivered At</th>
                    <th>Read At</th>
                    <th>Error</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecipients.slice(0, 20).map((recipient) => (
                    <tr key={recipient.id}>
                      <td>{recipient.phoneNumber}</td>
                      <td>{recipient.name}</td>
                      <td>
                        <span className={`status-badge ${recipient.status}`}>
                          {recipient.status.charAt(0).toUpperCase() + recipient.status.slice(1)}
                        </span>
                      </td>
                      <td>{recipient.deliveredAt ? formatDate(recipient.deliveredAt) : '-'}</td>
                      <td>{recipient.readAt ? formatDate(recipient.readAt) : '-'}</td>
                      <td className="error-cell">{recipient.error || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {filteredRecipients.length === 0 && (
                <div className="empty-table">
                  <Inbox size={36} />
                  <p>No recipients match your filters</p>
                </div>
              )}
            </div>
            
            <div className="pagination">
              <button className="btn-icon page-btn" disabled>
                &laquo; Previous
              </button>
              <span className="page-info">Page 1 of {Math.ceil(filteredRecipients.length / 20)}</span>
              <button className="btn-icon page-btn" disabled={filteredRecipients.length <= 20}>
                Next &raquo;
              </button>
            </div>
          </div>
        )}

        {/* Engagement Tab */}
        {activeTab === 'engagement' && (
          <div className="engagement-tab">
            <div className="engagement-stats">
              <div className="engagement-stat-card">
                <h4>Average Time to Read</h4>
                <div className="stat-value">
                  <Clock size={24} />
                  <span>14 min</span>
                </div>
                <p className="stat-description">Average time between delivery and read</p>
              </div>
              
              <div className="engagement-stat-card">
                <h4>Response Rate</h4>
                <div className="stat-value">
                  <MessageSquare size={24} />
                  <span>{calculatePercentage(campaign?.responseCount, campaign?.deliveredCount)}</span>
                </div>
                <p className="stat-description">Percentage of delivered messages that received a response</p>
              </div>
              
              <div className="engagement-stat-card">
                <h4>Read Rate</h4>
                <div className="stat-value">
                  <CheckCircle size={24} />
                  <span>{calculatePercentage(campaign?.readCount, campaign?.deliveredCount)}</span>
                </div>
                <p className="stat-description">Percentage of delivered messages that were read</p>
              </div>
            </div>
            
            <div className="chart-card engagement-chart">
              <h4>Engagement Timeline</h4>
              <div className="timeline-chart">
                <div className="chart-placeholder">
                  <BarChart2 size={48} />
                  <p>Engagement timeline chart would be displayed here</p>
                  <p className="chart-note">Shows message delivery and read rates over time</p>
                </div>
              </div>
            </div>
            
            <div className="engagement-breakdown">
              <h4>Response Analysis</h4>
              <div className="response-cards">
                <div className="response-card">
                  <h5>Common Responses</h5>
                  <ul className="response-list">
                    <li>
                      <span className="response-text">"Thank you for the information"</span>
                      <span className="response-count">24</span>
                    </li>
                    <li>
                      <span className="response-text">"I'm interested"</span>
                      <span className="response-count">18</span>
                    </li>
                    <li>
                      <span className="response-text">"Please call me"</span>
                      <span className="response-count">12</span>
                    </li>
                    <li>
                      <span className="response-text">"How much does it cost?"</span>
                      <span className="response-count">9</span>
                    </li>
                    <li>
                      <span className="response-text">"Not interested"</span>
                      <span className="response-count">7</span>
                    </li>
                  </ul>
                </div>
                
                <div className="response-card">
                  <h5>Response Time Analysis</h5>
                  <div className="response-time-chart">
                    <div className="chart-placeholder small">
                      <p>Distribution of response times</p>
                    </div>
                    <ul className="time-breakdown">
                      <li>
                        <span>Within 5 minutes</span>
                        <span>42%</span>
                      </li>
                      <li>
                        <span>5-30 minutes</span>
                        <span>31%</span>
                      </li>
                      <li>
                        <span>30-60 minutes</span>
                        <span>15%</span>
                      </li>
                      <li>
                        <span>1-24 hours</span>
                        <span>12%</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Message Tab */}
        {activeTab === 'message' && (
          <div className="message-tab">
            <div className="message-preview">
              <h4>Message Template Preview</h4>
              <div className="whatsapp-preview">
                <div className="whatsapp-header">
                  <div className="contact-info">
                    <div className="profile-picture"></div>
                    <div className="contact-name">{campaign?.templateName || 'Template Preview'}</div>
                  </div>
                </div>
                <div className="message-container">
                  <div className="message-bubble">
                    Hello {{name}},<br/><br/>
                    Thank you for your interest in our services. We're excited to let you know about our latest offerings.<br/><br/>
                    {campaign?.templateContent || "This is a placeholder for the actual template content that would be sent to recipients."}
                    <br/><br/>
                    If you have any questions, feel free to respond to this message or call us at {{business_phone}}.
                    <div className="message-time">12:45 PM</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="template-details">
              <h4>Template Details</h4>
              <div className="template-info">
                <div className="info-row">
                  <span className="info-label">Status:</span>
                  <span className="info-value">Approved</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Language:</span>
                  <span className="info-value">English</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Variables:</span>
                  <span className="info-value">name, business_phone, expiry_date</span>
                </div>
              </div>
            </div>
            
            <div className="message-parameters">
              <h4>Message Parameters</h4>
              <div className="parameters-table-container">
                <table className="parameters-table">
                  <thead>
                    <tr>
                      <th>Parameter</th>
                      <th>Description</th>
                      <th>Example Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{{name}}</td>
                      <td>Recipient's name</td>
                      <td>John Smith</td>
                    </tr>
                    <tr>
                      <td>{{business_phone}}</td>
                      <td>Business contact number</td>
                      <td>+1 555-123-4567</td>
                    </tr>
                    <tr>
                      <td>{{expiry_date}}</td>
                      <td>Offer expiration date</td>
                      <td>May 30, 2025</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Delete Campaign?</h3>
            <p>Are you sure you want to delete this campaign? This action cannot be undone.</p>
            <div className="modal-actions">
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-danger" 
                onClick={deleteCampaign}
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pause Confirmation Modal */}
      {showPauseModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Pause Campaign?</h3>
            <p>Are you sure you want to pause this campaign? Messages that have already been processed won't be affected.</p>
            <div className="modal-actions">
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowPauseModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-warning" 
                onClick={pauseCampaign}
              >
                Pause Campaign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CampaignDetails;