// StatCard.jsx
import './StatCard.css';

function StatCard({ title, value, change = '0%', icon, color }) {  // Add default value for change
  // Add null check before using startsWith
  const isPositive = change && change.startsWith('+');

  return (
    <div className={`stat-card card ${color}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-content">
        <span className="stat-title">{title}</span>
        <span className="stat-value">{value || '0'}</span>  {/* Add fallback for value */}
        {change && (  // Only render if change exists
          <span className={`stat-change ${isPositive ? 'positive' : 'negative'}`}>
            {change}
          </span>
        )}
      </div>
    </div>
  );
}

export default StatCard;
