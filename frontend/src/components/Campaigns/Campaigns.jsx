// src/pages/Campaigns.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Filter, Calendar, Clock, Eye, Play, 
  Edit, Trash, Plus, AlertCircle, RefreshCw 
} from 'lucide-react';
import { campaignService } from '../../api/campaignService';
import './Campaigns.css';
import { messageService } from '../../api/messageService';

function Campaigns() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch campaigns
 const fetchCampaigns = async () => {
  try {
    console.log('Fetching campaigns...');
    setIsLoading(true);
    setError(null);
    
    const filters = {};
    if (activeFilter !== 'all') {
      filters.status = activeFilter;
    }
    
    const response = await campaignService.getCampaigns(filters);
    console.log('Campaigns data:', response);
    
    // Updated to match backend response structure
    setCampaigns(response.data || []);
  } catch (err) {
    console.error('Error fetching campaigns:', err);
    setError('Failed to load campaigns: ' + (err.message || 'Unknown error'));
  } finally {
    setIsLoading(false);
    setIsRefreshing(false);
  }
};

 
  // Handle filter change
  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
  };

  // Handle search
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Confirm delete
  const confirmDelete = (id) => {
    setDeleteConfirm(id);
  };

  // Cancel delete
  const cancelDelete = () => {
    setDeleteConfirm(null);
  };

  // Delete campaign
  const deleteCampaign = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      await campaignService.deleteCampaign(deleteConfirm);
      setCampaigns(campaigns.filter(c => c.id !== deleteConfirm));
      setDeleteConfirm(null);
    } catch (err) {
      setError('Failed to delete campaign: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh campaigns
  const refreshCampaigns = async () => {
    setIsRefreshing(true);
    await fetchCampaigns();
  };

  // Filter campaigns by search
  const filteredCampaigns = campaigns.filter((campaign) => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (campaign.template_name && campaign.template_name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  
useEffect(() => {
  const fetchData = async () => {
    try {
      if (!isSilentRefresh) {
        setIsLoading(true);
      }
      
      const filters = {};
      if (activeFilter !== 'all') {
        filters.status = activeFilter;
      }
      
      const response = await campaignService.getCampaigns(filters);
      setCampaigns(response.data || []);
    } catch (err) {
      if (!isSilentRefresh) {
        setError('Failed to load campaigns: ' + (err.message || 'Unknown error'));
      }
    } finally {
      if (!isSilentRefresh) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  };

  // Initial load
  let isSilentRefresh = false;
  fetchData();

  // Set up polling for campaigns that might still update
  const shouldPoll = ['sending', 'partial', 'completed'].includes(activeFilter);
  if (shouldPoll) {
    const interval = setInterval(() => {
      isSilentRefresh = true;
      fetchData();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }
  }, [activeFilter]);

  // Get status class
  const getStatusClass = (status) => {
  const statusClasses = {
    completed: 'status-completed',
    partial: 'status-partial',
    sending: 'status-sending',
    scheduled: 'status-scheduled',
    draft: 'status-draft',
    failed: 'status-failed'
  };
  return statusClasses[status] || '';
};
  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Not scheduled';
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
  // In your Campaigns.jsx component, update the calculatePercentage function:
const calculatePercentage = (part, total) => {
  if (!part || !total || total === 0) return '0%';
  return `${Math.round((part / total) * 100)}%`;
};

// Add scheduled time display in campaign card
const getScheduledDisplay = (campaign) => {
  if (campaign.status !== 'scheduled') return null;
  
  const scheduledDate = new Date(campaign.scheduledAt);
  const now = new Date();
  
  if (scheduledDate < now) {
    return 'Processing...';
  }
  
  return `Scheduled for ${formatDate(campaign.scheduledAt)}`;
};
// Add the handler for sending drafts
const handleSendDraft = async (campaignId) => {
    try {
        setIsLoading(true);
        await messageService.sendDraft(campaignId);
        await fetchCampaigns(); // Refresh the list
    } catch (err) {
        setError('Failed to send draft: ' + (err.message || 'Unknown error'));
    } finally {
        setIsLoading(false);
    }
};
  return (
    <div className="campaigns">
      <div className="page-header">
        <h2>Campaigns</h2>
        <button 
          onClick={() => navigate('/send-message')} 
          className="btn btn-primary"
        >
          <Plus size={16} />
          <span>Create Campaign</span>
        </button>
      </div>

      {error && <div className="error-alert">{error}</div>}

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
          <button 
            onClick={refreshCampaigns}
            className="btn-icon refresh-btn"
            disabled={isRefreshing}
          >
            <RefreshCw size={16} className={isRefreshing ? "spinning" : ""} />
          </button>
        </div>
        
        <div className="filter-tabs">
          <button 
            className={`filter-tab ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => handleFilterChange('all')}
          >
            All
          </button>
          <button 
            className={`filter-tab ${activeFilter === 'completed' ? 'active' : ''}`}
            onClick={() => handleFilterChange('completed')}
          >
            Completed
          </button>
           <button className={`filter-tab ${activeFilter === 'partial' ? 'active' : ''}`} onClick={() => handleFilterChange('partial')}>
    Partially Completed
  </button>
          <button 
            className={`filter-tab ${activeFilter === 'sending' ? 'active' : ''}`}
            onClick={() => handleFilterChange('sending')}
          >
            Sending
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
      </div>

      {isLoading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading campaigns...</p>
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="empty-state">
          <AlertCircle size={48} />
          <h3>No campaigns found</h3>
          <p>Try adjusting your search or filter settings</p>
        </div>
      ) : (
        <div className="campaigns-grid">
          {filteredCampaigns.map((campaign) => (
            <div key={campaign.id} className="campaign-card card">
              <div className="campaign-header">
                <div className={`campaign-status ${getStatusClass(campaign.status)}`}>
                  {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                </div>
                <div className="campaign-date">
                  {formatDate(campaign.scheduledAt || campaign.createdAt)}
                </div>
              </div>
              
              <h3 className="campaign-name">{campaign.name}</h3>
              
              <div className="campaign-info">
    <div className="info-item">
        <span className="info-label">Template:</span>
        <span className="info-value">{campaign.templateName}</span>
    </div>
    
    <div className="info-item">
        <span className="info-label">Recipients:</span>
        <span className="info-value">
            {campaign.recipientCount?.toLocaleString() || '0'}
        </span>
    </div>
    
    {(campaign.status === 'completed' || campaign.status === 'sending' || 
      campaign.status === 'partial' || campaign.status === 'failed') && (
        <>
            <div className="info-item">
                <span className="info-label">Delivered:</span>
                <span className="info-value">
                    {campaign.deliveredCount?.toLocaleString() || '0'}
                    {campaign.recipientCount > 0 && (
                        <span className="percentage">
                            ({calculatePercentage(campaign.deliveredCount, campaign.recipientCount)})
                        </span>
                    )}
                </span>
            </div>
            
           <div className="info-item">
  <span className="info-label">Failed:</span>
  <span className="info-value">
    {campaign.failedCount?.toLocaleString() || '0'}
    {campaign.recipientCount > 0 && (
      <span className="percentage">
        ({calculatePercentage(campaign.failedCount, campaign.recipientCount)})
      </span>
    )}
  </span>
</div>
            
            <div className="info-item">
                <span className="info-label">Read:</span>
                <span className="info-value">
                    {campaign.readCount?.toLocaleString() || '0'}
                    {campaign.deliveredCount > 0 && (
                        <span className="percentage">
                            ({calculatePercentage(campaign.readCount, campaign.deliveredCount)})
                        </span>
                    )}
                </span>
            </div>
        </>
    )}
    
    {campaign.status === 'scheduled' && (
  <div className="scheduled-info">
    <Calendar size={16} />
    <span>{getScheduledDisplay(campaign)}</span>
  </div>
)}
 {campaign.headerType === 'document' && (
    <div className="info-item">
      <span className="info-label">Document:</span>
      <span className="info-value">
        {campaign.headerFilename || 'Document Attachment'}
      </span>
    </div>
  )}
</div>
              
              <div className="campaign-actions">
                <button 
                  className="btn-secondary"
                  onClick={() => navigate(`/campaigns/${campaign.id}`)}
                >
                  <Eye size={16} />
                  <span>View Details</span>
                </button>
                
                <div className="action-buttons">
                  
                  {campaign.status === 'draft' && (<>
<button 
            className="action-btn play-btn"
            title="Send Draft"
            onClick={() => handleSendDraft(campaign.id)}
            disabled={isLoading}
        >
            <Play size={16} />
        </button>
                    <button 
                      className="action-btn edit-btn"
                      title="Edit Campaign"
                      onClick={() => navigate(`/campaigns/${campaign.id}/edit`)}
                    >
                      <Edit size={16} />
                    </button></>
                  )}
                  
                  {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
                    <button 
                      className="action-btn delete-btn"
                      title="Delete Campaign"
                      onClick={() => confirmDelete(campaign.id)}
                    >
                      <Trash size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Delete Campaign?</h3>
            <p>Are you sure you want to delete this campaign? This action cannot be undone.</p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={cancelDelete}>
                Cancel
              </button>
              <button 
                className="btn btn-danger" 
                onClick={deleteCampaign}
                disabled={isLoading}
              >
                {isLoading ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Campaigns;