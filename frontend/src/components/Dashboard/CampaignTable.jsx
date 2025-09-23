import React from 'react';
import { MessageCircle, Users, Calendar, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import './CampaignTable.css';

const CampaignTable = ({ campaigns = [] }) => {
  const getStatusConfig = (status) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return {
          class: 'status-completed',
          icon: <CheckCircle size={14} />,
          text: 'Completed',
          color: '#25D366'
        };
      case 'scheduled':
        return {
          class: 'status-scheduled',
          icon: <Clock size={14} />,
          text: 'Scheduled',
          color: '#128C7E'
        };
      case 'sending':
        return {
          class: 'status-sending',
          icon: <MessageCircle size={14} />,
          text: 'Sending',
          color: '#34B7F1'
        };
      case 'failed':
        return {
          class: 'status-failed',
          icon: <AlertTriangle size={14} />,
          text: 'Failed',
          color: '#DC2626'
        };
      default:
        return {
          class: 'status-default',
          icon: <Clock size={14} />,
          text: status,
          color: '#6B7280'
        };
    }
  };

  const totalRecipients = campaigns.reduce((acc, campaign) => acc + (campaign.recipients || 0), 0);

  return (
    <div className="whatsapp-campaign-container">
      {/* Header */}
      <div className="campaign-header">
        <div className="header-content">
          <MessageCircle className="header-icon" size={28} />
          <div>
            <h2 className="header-title">Campaign Performance</h2>
            <p className="header-subtitle">Monitor your WhatsApp marketing campaigns</p>
          </div>
        </div>
        <div className="stats-pills">
          <div className="stat-pill">
            <span className="stat-number">{campaigns.length}</span>
            <span className="stat-label">Campaigns</span>
          </div>
          <div className="stat-pill">
            <span className="stat-number">{totalRecipients.toLocaleString()}</span>
            <span className="stat-label">Recipients</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="campaign-table-wrapper">
        <table className="campaign-table">
          <thead>
            <tr>
              <th>
                <div className="th-content">
                  <MessageCircle size={16} />
                  Campaign Name
                </div>
              </th>
              <th>
                <div className="th-content">
                  <div className="template-icon">📄</div>
                  Template
                </div>
              </th>
              <th>
                <div className="th-content">
                  <Users size={16} />
                  Recipients
                </div>
              </th>
              <th>
                <div className="th-content">
                  <div className="status-icon">📊</div>
                  Status
                </div>
              </th>
              <th>
                <div className="th-content">
                  <Calendar size={16} />
                  Date
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((campaign, index) => {
              const statusConfig = getStatusConfig(campaign.status);
              return (
                <tr key={campaign.id} className="campaign-row" style={{ animationDelay: `${index * 0.1}s` }}>
                  <td>
                    <div className="campaign-name-cell">
                      <div className="campaign-avatar">
                        <MessageCircle size={18} />
                      </div>
                      <div className="campaign-info">
                        <span className="campaign-name">{campaign.name}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="template-cell">
                      <div className="template-badge">
                        <span className="template-emoji">📝</span>
                        <span className="template-name">{campaign.template}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="recipients-cell">
                      <div className="recipients-count">
                        {campaign.recipients?.toLocaleString() || '0'}
                      </div>
                      <div className="recipients-label">contacts</div>
                    </div>
                  </td>
                  <td>
                    <div className={`status-badge ${statusConfig.class}`}>
                      {statusConfig.icon}
                      <span>{statusConfig.text}</span>
                    </div>
                  </td>
                  <td>
                    <div className="date-cell">
                      <span className="date-text">{campaign.date}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {campaigns.length === 0 && (
          <div className="empty-state">
            <MessageCircle size={48} className="empty-icon" />
            <h3 className="empty-title">No campaigns yet</h3>
            <p className="empty-subtitle">Create your first WhatsApp marketing campaign to get started</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CampaignTable;