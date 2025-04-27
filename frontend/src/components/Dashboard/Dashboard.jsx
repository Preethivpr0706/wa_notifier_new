import { 
  BarChart3, 
  MessagesSquare, 
  FileText, 
  Zap, 
  Activity, 
  TrendingUp, 
  Users, 
  Calendar
} from 'lucide-react';
import StatCard from './StatCard';
import DeliveryChart from './DeliveryChart';
import CampaignTable from './CampaignTable';
import './Dashboard.css';

function Dashboard() {
  const stats = [
    {
      title: 'Total Campaigns',
      value: '24',
      change: '+12%',
      icon: <MessagesSquare />,
      color: 'blue'
    },
    {
      title: 'Messages Sent',
      value: '12,543',
      change: '+25%',
      icon: <Zap />,
      color: 'green'
    },
    {
      title: 'Templates Created',
      value: '18',
      change: '+5%',
      icon: <FileText />,
      color: 'purple'
    },
    {
      title: 'Success Rate',
      value: '97.8%',
      change: '+0.5%',
      icon: <Activity />,
      color: 'yellow'
    }
  ];

  const recentCampaigns = [
    {
      id: 1,
      name: 'May Product Launch',
      template: 'Product Launch Announcement',
      recipients: 2500,
      status: 'Sent',
      date: '2 days ago'
    },
    {
      id: 2,
      name: 'Weekend Flash Sale',
      template: 'Limited Time Offer',
      recipients: 5000,
      status: 'Scheduled',
      date: 'Tomorrow'
    },
    {
      id: 3,
      name: 'Customer Feedback Survey',
      template: 'Survey Request',
      recipients: 1200,
      status: 'Sent',
      date: '5 days ago'
    },
    {
      id: 4,
      name: 'Webinar Registration',
      template: 'Event Invitation',
      recipients: 3800,
      status: 'Failed',
      date: '1 day ago'
    }
  ];

  const deliveryData = {
    labels: ['Delivered', 'Read', 'Replied', 'Failed', 'Pending'],
    datasets: [
      {
        label: 'Message Status',
        data: [8750, 6500, 2100, 250, 1200],
        backgroundColor: [
          '#2DCE89',  // success
          '#4DA0FF',  // primary
          '#A78BFA',  // purple
          '#FF4949',  // error
          '#F5A623',  // warning
        ],
      },
    ],
  };

  const activityData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Messages Sent',
        data: [1200, 1900, 1500, 2500, 1800, 800, 500],
        backgroundColor: '#4DA0FF',
      },
      {
        label: 'Messages Read',
        data: [900, 1500, 1200, 1800, 1300, 500, 300],
        backgroundColor: '#2DCE89',
      },
    ],
  };

  return (
    <div className="dashboard">
      <section className="stats-grid">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </section>

      <section className="dashboard-grid">
        <div className="chart-container card">
          <div className="card-header">
            <h3>Message Delivery Status</h3>
            <button className="btn-secondary">
              <Calendar size={16} />
              <span>Last 30 days</span>
            </button>
          </div>
          <DeliveryChart data={deliveryData} type="pie" />
        </div>
        
        <div className="chart-container card">
          <div className="card-header">
            <h3>Message Activity</h3>
            <button className="btn-secondary">
              <Calendar size={16} />
              <span>This Week</span>
            </button>
          </div>
          <DeliveryChart data={activityData} type="bar" />
        </div>
      </section>

      <section className="dashboard-table card">
        <div className="card-header">
          <h3>Recent Campaigns</h3>
          <a href="/campaigns" className="btn-secondary">
            <TrendingUp size={16} />
            <span>View All</span>
          </a>
        </div>
        <CampaignTable campaigns={recentCampaigns} />
      </section>

      <section className="dashboard-grid">
        <div className="quick-stats card">
          <h3>Top Performing Templates</h3>
          <div className="template-stats">
            <div className="template-stat">
              <div className="template-info">
                <span className="template-name">Welcome Message</span>
                <span className="template-category">Utility</span>
              </div>
              <div className="template-metric">
                <span className="metric-value">98.7%</span>
                <span className="metric-label">Delivery</span>
              </div>
            </div>
            <div className="template-stat">
              <div className="template-info">
                <span className="template-name">Order Confirmation</span>
                <span className="template-category">Transactional</span>
              </div>
              <div className="template-metric">
                <span className="metric-value">97.2%</span>
                <span className="metric-label">Delivery</span>
              </div>
            </div>
            <div className="template-stat">
              <div className="template-info">
                <span className="template-name">Special Offer</span>
                <span className="template-category">Marketing</span>
              </div>
              <div className="template-metric">
                <span className="metric-value">95.5%</span>
                <span className="metric-label">Delivery</span>
              </div>
            </div>
          </div>
        </div>

        <div className="active-users card">
          <div className="card-header">
            <h3>Active Users</h3>
            <div className="active-now">
              <span className="active-dot"></span>
              <span>8 online now</span>
            </div>
          </div>
          <div className="user-list">
            <div className="user-item">
              <div className="user-avatar">
                <Users size={16} />
              </div>
              <div className="user-info">
                <span className="user-name">Alex Morgan</span>
                <span className="user-role">Admin</span>
              </div>
              <span className="user-status online"></span>
            </div>
            <div className="user-item">
              <div className="user-avatar">
                <Users size={16} />
              </div>
              <div className="user-info">
                <span className="user-name">Sarah Johnson</span>
                <span className="user-role">Manager</span>
              </div>
              <span className="user-status online"></span>
            </div>
            <div className="user-item">
              <div className="user-avatar">
                <Users size={16} />
              </div>
              <div className="user-info">
                <span className="user-name">Robert Chen</span>
                <span className="user-role">Editor</span>
              </div>
              <span className="user-status offline"></span>
            </div>
            <div className="user-item">
              <div className="user-avatar">
                <Users size={16} />
              </div>
              <div className="user-info">
                <span className="user-name">Jennifer Lee</span>
                <span className="user-role">Viewer</span>
              </div>
              <span className="user-status online"></span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Dashboard;