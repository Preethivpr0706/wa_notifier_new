// src/App.jsx
import { useState } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Sidebar from './components/Sidebar/Sidebar';
import Header from './components/Header/Header';
import Dashboard from './components/Dashboard/Dashboard';
import MessageTemplates from './components/MessageTemplates/MessageTemplates';
import CreateTemplate from './components/CreateTemplate/CreateTemplate';
import Campaigns from './components/Campaigns/Campaigns';
import SendMessage from './components/SendMessage/SendMessage';
import Settings from './components/Settings/Settings';
import EditTemplate from './components/EditTemplate/EditTemplate';
import ImportContacts from './components/Contact/ImportContacts';
import ContactLists from './components/Contact/ContactLists';
import CampaignDetails from './components/Campaigns/CampaignDetails';
import EditCampaign from './components/SendMessage/EditCampaign';
import Login from './components/Login/Login';
import ProtectedRoute from './components/ProtectedRoute';
import ConversationDetail from './components/LiveChat/ConversationDetail';
import QuickRepliesManager from './components/LiveChat/QuickRepliesManager';
import ChatLayout from './components/LiveChat/ChatLayout';
import './styles/App.css';

// Layout component to wrap protected routes
const Layout = () => {
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
          <Outlet /> {/* This renders the child routes */}
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />

      {/* Protected Routes wrapped in Layout */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/templates" element={<MessageTemplates />} />
        <Route path="/templates/create" element={<CreateTemplate />} />
        <Route path="/templates/edit/:id" element={<EditTemplate />} />
        <Route path="/campaigns" element={<Campaigns />} />
        <Route path="/campaigns/:id" element={<CampaignDetails />} />
        <Route path="/campaigns/:id/edit" element={<EditCampaign />} />
        <Route path="/send-message" element={<SendMessage />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/contacts/import" element={<ImportContacts />} />
        <Route path="/contacts/list" element={<ContactLists />} />
       
        <Route path="//quick-replies"  element={<QuickRepliesManager />}/>
   
         {/* Add these chat routes */}
        <Route path="/conversations" element={<ChatLayout />}>
          <Route index element={null} />
          <Route path=":id" element={<ConversationDetail />} />
        </Route>
  
      </Route>

      {/* Redirect unknown routes to dashboard */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
