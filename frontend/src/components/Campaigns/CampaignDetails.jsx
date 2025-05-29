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
  // Add state for pagination
const [recipientsPage, setRecipientsPage] = useState(1);
const [recipientsLimit] = useState(20);
const [totalRecipients, setTotalRecipients] = useState(0);
// Add this with your other state declarations
const [recipients, setRecipients] = useState([]);
const [isLoadingRecipients, setIsLoadingRecipients] = useState(false);

  // Fetch campaign details
  const fetchCampaignDetails = useCallback(async () => {
    try {
        setIsLoading(true);
        setError(null);
        
        const response = await campaignService.getCampaignWithStats(id);
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
            value: campaign.recipient_count?.toLocaleString() || '0',
            icon: <Users size={20} />,
            color: 'var(--neutral-700)'
        },
        {
            label: 'Delivered',
            value: campaign.delivered_count?.toLocaleString() || '0',
            percentage: calculatePercentage(campaign.delivered_count, campaign.recipient_count),
            icon: <Mail size={20} />,
            color: 'var(--primary-color)'
        },
        {
            label: 'Read',
            value: campaign.read_count?.toLocaleString() || '0',
            percentage: calculatePercentage(campaign.read_count, campaign.delivered_count),
            icon: <CheckCircle size={20} />,
            color: 'var(--success-color)'
        },
        {
            label: 'Failed',
            value: campaign.failed_count?.toLocaleString() || '0',
            percentage: calculatePercentage(campaign.failed_count, campaign.recipient_count),
            icon: <XCircle size={20} />,
            color: 'var(--error-color)'
        },
        {
            label: 'Responses',
            value: campaign.responseCount?.toLocaleString() || '0',
            percentage: calculatePercentage(campaign.responseCount, campaign.delivered_count),
            icon: <MessageSquare size={20} />,
            color: 'var(--accent-color)'
        }
    ];
};

const fetchRecipients = useCallback(async () => {
    try {
        setIsLoadingRecipients(true);
        const response = await campaignService.getCampaignRecipients(id, {
            status: recipientFilter === 'all' ? undefined : recipientFilter,
            search: searchQuery,
            page: recipientsPage,
            limit: recipientsLimit
        });
        
        setTotalRecipients(response.data.total);
        setRecipients(response.data.recipients);
    } catch (error) {
        console.error('Error fetching recipients:', error);
        setRecipients([]);
        setError(error.message);
    } finally {
        setIsLoadingRecipients(false);
    }
}, [id, recipientFilter, searchQuery, recipientsPage, recipientsLimit]);

// Add this useEffect to fetch recipients when needed
useEffect(() => {
    if (activeTab === 'recipients') {
        fetchRecipients();
    }
}, [activeTab, fetchRecipients]);

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
                        style={{ width: calculatePercentage(campaign?.delivered_count, campaign?.recipient_count) }}
                      ></div>
                    </div>
                    <div className="progress-labels">
                      <span>Delivered: {campaign?.delivered_count?.toLocaleString() || '0'}</span>
                      <span>{calculatePercentage(campaign?.delivered_count, campaign?.recipient_count)}</span>
                    </div>
                  </div>
                  
                  <div className="progress-wrapper">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill read" 
                        style={{ width: calculatePercentage(campaign?.read_count, campaign?.recipient_count) }}
                      ></div>
                    </div>
                    <div className="progress-labels">
                      <span>Read: {campaign?.read_count?.toLocaleString() || '0'}</span>
                      <span>{calculatePercentage(campaign?.read_count, campaign?.recipient_count)}</span>
                    </div>
                  </div>
                  
                  <div className="progress-wrapper">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill failed" 
                        style={{ width: calculatePercentage(campaign?.failed_count, campaign?.recipient_count) }}
                      ></div>
                    </div>
                    <div className="progress-labels">
                      <span>Failed: {campaign?.failed_count?.toLocaleString() || '0'}</span>
                      <span>{calculatePercentage(campaign?.failed_count, campaign?.recipient_count)}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="chart-card">
                <h4>Response Rate</h4>
                <div className="response-chart">
                  <div className="donut-chart">
                    <div className="donut-fill" style={{ 
                      '--percentage': campaign?.responseCount && campaign?.delivered_count ? 
                        (campaign.responseCount / campaign.delivered_count) * 100 : 0 
                    }}></div>
                    <div className="donut-center">
                      {calculatePercentage(campaign?.responseCount, campaign?.delivered_count)}
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
                      <strong>{((campaign?.delivered_count || 0) - (campaign?.responseCount || 0)).toLocaleString()}</strong>
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
                  Message template used: <strong>{campaign?.template_name}</strong><br />
                  Total recipients: <strong>{campaign?.recipient_count?.toLocaleString() || '0'}</strong><br />
                  Delivered messages: <strong>{campaign?.delivered_count?.toLocaleString() || '0'} ({calculatePercentage(campaign?.delivered_count, campaign?.recipient_count)})</strong><br />
                  Read messages: <strong>{campaign?.read_count?.toLocaleString() || '0'} ({calculatePercentage(campaign?.read_count, campaign?.delivered_count)})</strong><br />
                  Failed messages: <strong>{campaign?.failed_count?.toLocaleString() || '0'} ({calculatePercentage(campaign?.failed_count, campaign?.recipient_count)})</strong><br />
                  Responses received: <strong>{campaign?.responseCount?.toLocaleString() || '0'} ({calculatePercentage(campaign?.responseCount, campaign?.delivered_count)})</strong>
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
    onClick={() => {
      setRecipientFilter('all');
      setRecipientsPage(1); // Reset to first page when changing filters
    }}
  >
    All
  </button>
  <button 
    className={`filter-button ${recipientFilter === 'delivered' ? 'active' : ''}`}
    onClick={() => {
      setRecipientFilter('delivered');
      setRecipientsPage(1);
    }}
  >
    Delivered
  </button>
  <button 
    className={`filter-button ${recipientFilter === 'read' ? 'active' : ''}`}
    onClick={() => {
      setRecipientFilter('read');
      setRecipientsPage(1);
    }}
  >
    Read
  </button>
  <button 
    className={`filter-button ${recipientFilter === 'pending' ? 'active' : ''}`}
    onClick={() => {
      setRecipientFilter('pending');
      setRecipientsPage(1);
    }}
  >
    Pending
  </button>
  <button 
    className={`filter-button ${recipientFilter === 'failed' ? 'active' : ''}`}
    onClick={() => {
      setRecipientFilter('failed');
      setRecipientsPage(1);
    }}
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
                    <th>Failed At</th>
                    <th>Error</th>
                  </tr>
                </thead>
               <tbody>
    {recipients.map((recipient) => (
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
<td>{recipient.failedAt ? formatDate(recipient.failedAt) : '-'}</td>
<td className="error-cell">{recipient.error || '-'}</td>
        </tr>
    ))}
</tbody>
              </table>
              {error && (
    <div className="error-message">
        <AlertTriangle size={16} />
        <span>{error}</span>
    </div>
)}
           
{isLoadingRecipients ? (
    <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading recipients...</p>
    </div>
) : (
    <>
        <table className="recipients-table">
            {/* Table content */}
        </table>
        {recipients.length === 0 && !isLoadingRecipients && (
            <div className="empty-table">
                <Inbox size={36} />
                <p>No recipients match your filters</p>
            </div>
        )}
    </>
)}
            </div>
            
           <div className="pagination">
    <button 
        className="btn-icon page-btn" 
        disabled={recipientsPage === 1 || isLoadingRecipients}
        onClick={() => {
            setRecipientsPage(p => p - 1);
            fetchRecipients();
        }}
    >
        &laquo; Previous
    </button>
    <span className="page-info">
        Page {recipientsPage} of {Math.ceil(totalRecipients / recipientsLimit)}
    </span>
    <button 
        className="btn-icon page-btn" 
        disabled={recipientsPage * recipientsLimit >= totalRecipients || isLoadingRecipients}
        onClick={() => {
            setRecipientsPage(p => p + 1);
            fetchRecipients();
        }}
    >
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
            <span>
                {campaign?.avg_read_time ? 
                    `${Math.round(campaign.avg_read_time / 60)} min` : 
                    'N/A'}
            </span>
        </div>
        <p className="stat-description">Average time between delivery and read</p>
    </div>
    
    <div className="engagement-stat-card">
        <h4>Response Rate</h4>
        <div className="stat-value">
            <MessageSquare size={24} />
            <span>{calculatePercentage(campaign?.responseCount, campaign?.delivered_count)}</span>
        </div>
        <p className="stat-description">Percentage of delivered messages that received a response</p>
    </div>
    
    <div className="engagement-stat-card">
        <h4>Read Rate</h4>
        <div className="stat-value">
            <CheckCircle size={24} />
            <span>{calculatePercentage(campaign?.read_count, campaign?.delivered_count)}</span>
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
        {/* Message Tab */}
{activeTab === 'message' && (
  <div className="message-tab">
    <div className="message-preview">
      <h4>Message Template Preview</h4>
      <div className="whatsapp-preview">
        <div className="whatsapp-header">
          <div className="contact-info">
            <div className="profile-picture"></div>
            <div className="contact-name">{campaign?.template?.name || 'Template Preview'}</div>
          </div>
        </div>
        <div className="message-container">
          <div className="message-bubble">
            {/* Header content if exists */}
            {campaign?.template?.header_type === 'text' && campaign?.template?.header_content && (
              <div className="template-header">
                {campaign.template.header_content}
              </div>
            )}
            
            {/* Body content */}
            <div className="template-body">
              {campaign?.template?.body_text || "No template content available"}
            </div>

            {/* Footer content if exists */}
            {campaign?.template?.footer_text && (
              <div className="template-footer">
                {campaign.template.footer_text}
              </div>
            )}

            {/* Buttons if they exist */}
            {campaign?.template?.buttons && campaign.template.buttons.length > 0 && (
              <div className="template-buttons">
                {campaign.template.buttons.map((button, index) => (
                  <div key={index} className="template-button">
                    {button.text}
                  </div>
                ))}
              </div>
            )}
            <div className="message-time">12:45 PM</div>
          </div>
        </div>
      </div>
    </div>
    
    <div className="template-details">
      <h4>Template Details</h4>
      <div className="template-info">
        <div className="info-row">
          <span className="info-label">Name:</span>
          <span className="info-value">{campaign?.template?.name}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Category:</span>
          <span className="info-value">{campaign?.template?.category}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Language:</span>
          <span className="info-value">{campaign?.template?.language}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Status:</span>
          <span className="info-value">{campaign?.template?.whatsapp_status}</span>
        </div>
      </div>
    </div>
    
    {campaign?.template?.variables && Object.keys(campaign.template.variables).length > 0 && (
      <div className="message-parameters">
        <h4>Template Variables</h4>
        <div className="parameters-table-container">
          <table className="parameters-table">
            <thead>
              <tr>
                <th>Variable</th>
                <th>Sample Value</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(campaign.template.variables).map(([key, value]) => (
                <tr key={key}>
                  <td>{'{{'}{key}{'}}'}</td>
                  <td>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}
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