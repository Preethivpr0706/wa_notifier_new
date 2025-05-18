  import { useState } from 'react';
 import { Link, useLocation, useNavigate } from 'react-router-dom'; 
import { authService } from '../../api/authService'; 
  
  import { 
    LayoutDashboard, 
    FileText, 
    Send, 
    MessageSquare, 
    Settings, 
    LogOut, 
    Menu, 
    X,
    Users,
    PlusCircle,
    List
  } from 'lucide-react';
  import './Sidebar.css';

  function Sidebar({ isOpen, toggleSidebar }) {
    const location = useLocation();
    const navigate=useNavigate();
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [contactsOpen, setContactsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false); // Add loading state

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

    const confirmLogout = async () => {
        try {
            setIsLoading(true);
            // Wait for logout to complete
            await authService.logout();
            setShowLogoutConfirm(false);
            // Navigate to login page after logout is complete
            navigate('/login', { replace: true }); // Use replace to prevent going back
        } catch (error) {
            console.error('Logout error:', error);
            // Optionally show error message
        } finally {
            setIsLoading(false);
        }
    };

    const cancelLogout = () => {
        setShowLogoutConfirm(false);
    };

    const toggleContacts = () => {
      setContactsOpen(!contactsOpen);
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

            {/* Contacts Dropdown */}
            <li className={`menu-item ${contactsOpen ? 'open' : ''}`}>
              <div className="menu-link dropdown-toggle" onClick={toggleContacts}>
                <span className="menu-icon"><Users size={20} /></span>
                <span className="menu-text">Contacts</span>
              </div>
              {contactsOpen && (
                <ul className="submenu-list">
                  <li className="submenu-item">
                    <Link
                      to="/contacts/list"
                      className={`submenu-link ${location.pathname === '/contacts/list' ? 'active' : ''}`}
                    >
                      <List size={16} />
                      <span className="submenu-text">Contact List</span>
                    </Link>
                  </li>
                  <li className="submenu-item">
                    <Link
                      to="/contacts/add"
                      className={`submenu-link ${location.pathname === '/contacts/add' ? 'active' : ''}`}
                    >
                      <PlusCircle size={16} />
                      <span className="submenu-text">Add Contact</span>
                    </Link>
                  </li>
                  <li className="submenu-item">
    <Link
      to="/contacts/import"
      className={`submenu-link ${location.pathname === '/contacts/import' ? 'active' : ''}`}
    >
      <PlusCircle size={16} />
      <span className="submenu-text">Import Contacts</span>
    </Link>
  </li>

                </ul>
              )}
            </li>
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
                <button 
                    className="btn btn-secondary" 
                    onClick={cancelLogout}
                    disabled={isLoading}
                >
                    Cancel
                </button>
                <button 
                    className="btn btn-primary" 
                    onClick={confirmLogout}
                    disabled={isLoading}
                >
                    {isLoading ? 'Logging out...' : 'Logout'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  export default Sidebar;
