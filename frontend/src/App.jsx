import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar/Sidebar';
import Header from './components/Header/Header';
import Dashboard from './components/Dashboard/Dashboard';
import MessageTemplates from './components/MessageTemplates/MessageTemplates';
import CreateTemplate from './components/CreateTemplate/CreateTemplate';
import Campaigns from './components/Campaigns/Campaigns';
import SendMessage from './components/SendMessage/SendMessage';
import Settings from './components/Settings/Settings';
import './styles/App.css';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className={`app ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      <div className="main-content">
        <Header toggleSidebar={toggleSidebar} />
        <div className="page-container">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/templates" element={<MessageTemplates />} />
            <Route path="/templates/create" element={<CreateTemplate />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/send-message" element={<SendMessage />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default App;