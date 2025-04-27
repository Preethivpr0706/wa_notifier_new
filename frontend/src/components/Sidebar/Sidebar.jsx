import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  Send, 
  MessageSquare, 
  Settings, 
  LogOut, 
  Menu, 
  X
} from 'lucide-react';
import './Sidebar.css';

function Sidebar({ isOpen, toggleSidebar }) {
  const location = useLocation();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const menuItems = [
    { 
      title: 'Dashboard',
      path: '/',
      icon: <LayoutDashboard size={20} />
    },
    { 
      title: 'Message Templates',
      path: '/templates',
      icon: <FileText size={20} />
    },
    { 
      title: 'Campaigns',
      path: '/campaigns',
      icon: <MessageSquare size={20} />
    },
    { 
      title: 'Send Message',
      path: '/send-message',
      icon: <Send size={20} />
    },
    { 
      title: 'Settings',
      path: '/settings',
      icon: <Settings size={20} />
    }
  ];

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    // Implement logout functionality here
    console.log('User logged out');
    setShowLogoutConfirm(false);
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  return (
    <div className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-header">
        <div className="logo-container">
          <img src="/src/assets/images/whatsapp-logo.svg" alt="WhatsApp Logo" className="logo" />
          <span className="logo-text">WA Dashboard</span>
        </div>
        <button className="toggle-button" onClick={toggleSidebar}>
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      <nav className="sidebar-nav">
        <ul className="menu-list">
          {menuItems.map((item) => (
            <li key={item.path} className="menu-item">
              <Link 
                to={item.path}
                className={`menu-link ${location.pathname === item.path ? 'active' : ''}`}
              >
                <span className="menu-icon">{item.icon}</span>
                <span className="menu-text">{item.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="sidebar-footer">
        <button className="logout-button" onClick={handleLogout}>
          <span className="menu-icon"><LogOut size={20} /></span>
          <span className="menu-text">Logout</span>
        </button>
      </div>
      
      {showLogoutConfirm && (
        <div className="logout-confirm">
          <div className="logout-confirm-content">
            <h3>Confirm Logout</h3>
            <p>Are you sure you want to log out?</p>
            <div className="logout-actions">
              <button className="btn btn-secondary" onClick={cancelLogout}>Cancel</button>
              <button className="btn btn-primary" onClick={confirmLogout}>Logout</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Sidebar;