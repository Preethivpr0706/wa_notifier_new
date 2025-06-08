import { Eye } from 'lucide-react';
import './CampaignTable.css';
import { useNavigate } from 'react-router-dom';

function CampaignTable({ campaigns }) {
  const getStatusClass = (status) => {
    switch (status) {
      case 'Sent':
        return 'status-sent';
      case 'Scheduled':
        return 'status-scheduled';
      case 'Failed':
        return 'status-failed';
      default:
        return '';
    }
  };

  const navigate = useNavigate();

  return (
    <div className="campaign-table-container">
      <table className="campaign-table">
        <thead>
          <tr>
            <th>Campaign Name</th>
            <th>Template</th>
            <th>Recipients</th>
            <th>Status</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((campaign) => (
            <tr key={campaign.id}>
              <td data-label="Campaign Name">{campaign.name}</td>
              <td data-label="Template">{campaign.template}</td>
              <td data-label="Recipients">{campaign.recipients.toLocaleString()}</td>
              <td data-label="Status">
                <span className={`status-badge ${getStatusClass(campaign.status)}`}>
                  {campaign.status}
                </span>
              </td>
              <td data-label="Date">{campaign.date}</td>
              <td data-label="Actions">
                <div className="table-actions">
                  <button 
                    className="action-btn" 
                    title="View Details" 
                    onClick={() => navigate(`/campaigns/${campaign.id}`)}
                  >
                    <Eye size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default CampaignTable;