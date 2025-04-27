import { Eye } from 'lucide-react';
import './CampaignTable.css';

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
              <td>{campaign.name}</td>
              <td>{campaign.template}</td>
              <td>{campaign.recipients.toLocaleString()}</td>
              <td>
                <span className={`status-badge ${getStatusClass(campaign.status)}`}>
                  {campaign.status}
                </span>
              </td>
              <td>{campaign.date}</td>
              <td>
                <div className="table-actions">
                  <button className="action-btn" title="View Details">
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