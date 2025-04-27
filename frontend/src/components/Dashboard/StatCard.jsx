import './StatCard.css';

function StatCard({ title, value, change, icon, color }) {
  return (
    <div className={`stat-card card ${color}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-content">
        <span className="stat-title">{title}</span>
        <span className="stat-value">{value}</span>
        <span className={`stat-change ${change.startsWith('+') ? 'positive' : 'negative'}`}>
          {change}
        </span>
      </div>
    </div>
  );
}

export default StatCard;