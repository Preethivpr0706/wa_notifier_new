import { 
  BarChart3, 
  MessagesSquare, 
  FileText, 
  Zap, 
  Activity, 
  TrendingUp, 
  Users, 
  Calendar,
  CheckCircle,
  XCircle
} from 'lucide-react';
import StatCard from './StatCard';
import DeliveryChart from './DeliveryChart';
import CampaignTable from './CampaignTable';
import './Dashboard.css';
import { useState, useEffect } from 'react';
import { dashboardService } from '../../api/dashboardService';

function Dashboard() {
  const [dashboardData, setDashboardData] = useState({
    stats: null,
    recentCampaigns: [],
    topTemplates: [],
    messageStats: null,
    isLoading: true,
    error: null
  });
const formatActivityDate = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  
  // Format as "May 23" (short month name and day)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
};
  const fetchDashboardData = async () => {
    try {
      const [stats, campaigns, templates, messageStats] = await Promise.all([
        dashboardService.getDashboardStats(),
        dashboardService.getRecentCampaigns(),
        dashboardService.getTopTemplates(),
        dashboardService.getMessageStats()
      ]);

      setDashboardData({
        stats: stats.data,
        recentCampaigns: campaigns.data,
        topTemplates: templates.data,
        messageStats: messageStats.data,
        isLoading: false,
        error: null
      });
    } catch (error) {
      setDashboardData(prev => ({
        ...prev,
        isLoading: false,
        error: error.message
      }));
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (dashboardData.isLoading) {
    return <div className="loading-state">Loading dashboard data...</div>;
  }

  if (dashboardData.error) {
    return <div className="error-state">Error: {dashboardData.error}</div>;
  }

  const { stats, recentCampaigns, topTemplates, messageStats } = dashboardData;

  // In Dashboard.jsx, modify the statsCards creation:
const statsCards = [
  {
    title: 'Total Campaigns',
    value: stats?.totalCampaigns || 0,
    change: stats?.campaignGrowth || '0%',
    icon: <MessagesSquare />,
    color: 'blue'
  },
  {
    title: 'Messages Sent',
    value: (stats?.totalMessages || 0).toLocaleString(),
    change: stats?.messageGrowth || '0%',
    icon: <Zap />,
    color: 'green'
  },
  {
    title: 'Templates Created',
    value: stats?.totalTemplates || 0,
    change: stats?.templateGrowth || '0%',
    icon: <FileText />,
    color: 'purple'
  },
  {
    title: 'Success Rate',
    value: `${stats?.successRate || 0}%`,
    change: stats?.successRateChange || '0%',
    icon: <Activity />,
    color: 'yellow'
  },
  {
        title: 'Messages Delivered',
        value: `${(stats?.deliveredMessages || 0).toLocaleString()} (${stats?.deliveryRate}%)`,
        change: stats?.deliveryGrowth || '0%',
        icon: <CheckCircle />,
        color: 'success'
    },
    {
        title: 'Failed Messages',
        value: `${(stats?.failedMessages || 0).toLocaleString()} (${stats?.failureRate}%)`,
        change: stats?.failureGrowth || '0%',
        icon: <XCircle />,
        color: 'error'
    }
];


  const deliveryData = {
    labels: ['Delivered', 'Read', 'Replied', 'Failed', 'Pending'],
    datasets: [{
      label: 'Message Status',
      data: [
        messageStats.delivered,
        messageStats.read,
        messageStats.replied,
        messageStats.failed,
        messageStats.pending
      ],
      backgroundColor: [
        '#2DCE89',
        '#4DA0FF',
        '#A78BFA',
        '#FF4949',
        '#F5A623',
      ],
    }],
  };

  const activityData = {
    labels: messageStats.timeline.map(item => formatActivityDate(item.date)),
    datasets: [
      {
        label: 'Messages Sent',
        data: messageStats.timeline.map(item => item.sent),
        backgroundColor: '#4DA0FF',
      },
      {
        label: 'Messages Read',
        data: messageStats.timeline.map(item => item.read),
        backgroundColor: '#2DCE89',
      },
    ],
  };

  

  return (
    <div className="dashboard">
      <section className="stats-grid">
        {statsCards.map((stat, index) => (
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
            {topTemplates.map((template, index) => (
              <div key={index} className="template-stat">
                <div className="template-info">
                  <span className="template-name">{template.name}</span>
                  <span className="template-category">{template.category}</span>
                </div>
                <div className="template-metric">
                  <span className="metric-value">{template.deliveryRate}%</span>
                  <span className="metric-label">Delivery</span>
                </div>
              </div>
            ))}
          </div>
        </div>


      </section>
    </div>
  );
}

export default Dashboard;