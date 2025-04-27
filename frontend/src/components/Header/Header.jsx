import { useLocation } from 'react-router-dom';
import { Menu, PlusCircle, Bell, User } from 'lucide-react';
import './Header.css';

function Header({ toggleSidebar }) {
  const location = useLocation();
  const { pathname } = location;

  const getPageTitle = () => {
    switch (pathname) {
      case '/':
        return 'Dashboard';
      case '/templates':
        return 'Message Templates';
      case '/templates/create':
        return 'Create Template';
      case '/campaigns':
        return 'Campaigns';
      case '/send-message':
        return 'Send Message';
      case '/settings':
        return 'Settings';
      default:
        return 'Dashboard';
    }
  };

  const getActionButton = () => {
    switch (pathname) {
      case '/templates':
        return {
          text: 'Create Template',
          path: '/templates/create',
          icon: <PlusCircle size={16} />
        };
      case '/campaigns':
        return {
          text: 'Create Campaign',
          path: '/campaigns/create',
          icon: <PlusCircle size={16} />
        };
      default:
        return null;
    }
  };

  const actionButton = getActionButton();

  return (
    <header className="header">
      <div className="header-left">
        <button className="menu-toggle" onClick={toggleSidebar}>
          <Menu size={20} />
        </button>
        <h1 className="page-title">{getPageTitle()}</h1>
      </div>
      <div className="header-right">
        {actionButton && (
          <a href={actionButton.path} className="btn btn-primary create-btn">
            {actionButton.icon}
            <span>{actionButton.text}</span>
          </a>
        )}
        <div className="header-actions">
          <button className="header-action-btn">
            <Bell size={20} />
            <span className="notification-badge">3</span>
          </button>
          <div className="user-profile">
            <button className="user-profile-btn">
              <div className="avatar">
                <User size={20} />
              </div>
              <span className="user-name">John Doe</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;