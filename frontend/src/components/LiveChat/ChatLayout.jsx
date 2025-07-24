import { useState, useEffect } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import ConversationList from './ConversationList';
import './ChatLayout.css';

const ChatLayout = () => {
  const { id } = useParams();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 480);
  const [isTablet, setIsTablet] = useState(window.innerWidth > 480 && window.innerWidth <= 768);
  
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isLandscape = width > height;
      
      setIsMobile(width <= 480 && !isLandscape);
      setIsTablet(width > 480 && width <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    handleResize(); // Call once on mount
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // For mobile: show list when no conversation is selected, show detail when conversation is selected
  // For tablet and desktop: always show both sections
  const showList = !isMobile || !id;
  const showDetail = !isMobile || !!id;

  // Determine container classes
  const containerClasses = ['chat-layout-container'];
  if (isMobile && !id) {
    containerClasses.push('show-list');
  } else if (isMobile && id) {
    containerClasses.push('show-detail');
  }

  return (
    <div className={containerClasses.join(' ')}>
      {showList && (
        <div className="conversation-list-section">
          <ConversationList />
        </div>
      )}
      {showDetail && (
        <div className="conversation-detail-section">
          {!id && !isMobile ? (
            <div className="empty-chat-state">
              <div className="empty-chat-content">
                <div className="whatsapp-logo">
                  <svg viewBox="0 0 303 303" width="120" height="120">
                    <defs>
                      <linearGradient id="whatsappGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style={{stopColor: '#09f382', stopOpacity: 1}} />
                        <stop offset="100%" style={{stopColor: '#25d366', stopOpacity: 1}} />
                      </linearGradient>
                    </defs>
                    <path fill="url(#whatsappGradient)" d="M152.5,0C68.4,0,0,68.4,0,152.5S68.4,305,152.5,305S305,236.6,305,152.5S236.6,0,152.5,0z M152.5,279.3c-22.7,0-44.9-6.1-64.5-17.6l-4.6-2.7l-47.6,12.5l12.8-46.7l-3-4.8C33.6,200.4,27,177,27,152.5 C27,83.4,83.4,27,152.5,27S278,83.4,278,152.5S221.6,279.3,152.5,279.3z"/>
                    <path fill="#09f382" d="M213.8,170.6c-3.3-1.7-19.5-9.6-22.5-10.7c-3-1.1-5.2-1.7-7.4,1.7c-2.2,3.3-8.5,10.7-10.4,12.9 c-1.9,2.2-3.7,2.5-6.9,0.8c-3.3-1.7-13.8-5.1-26.3-16.2c-9.7-8.7-16.3-19.4-18.2-22.8c-1.9-3.3-0.2-5.1,1.4-6.7 c1.5-1.4,3.3-3.7,4.9-5.5c1.7-1.9,2.2-3.3,3.3-5.5c1.1-2.2,0.6-4.1-0.3-5.7c-0.8-1.7-7.4-17.8-10.1-24.4 c-2.7-6.4-5.4-5.5-7.4-5.6c-1.9-0.1-4.1-0.1-6.3-0.1c-2.2,0-5.7,0.8-8.7,4.1c-3,3.3-11.4,11.1-11.4,27.1s11.7,31.4,13.3,33.6 c1.7,2.2,23.5,35.9,56.9,50.4c7.9,3.4,14.1,5.4,18.9,6.9c7.9,2.5,15.1,2.2,20.8,1.3c6.4-1,19.5-8,22.2-15.7 c2.7-7.7,2.7-14.3,1.9-15.7C219.7,173.4,217.1,172.3,213.8,170.6z"/>
                  </svg>
                </div>
                <h2>WhatsApp LiveChat</h2>
                <p>Send and receive messages without keeping your phone online.</p>
              </div>
            </div>
          ) : (
            <Outlet />
          )}
        </div>
      )}
    </div>
  );
};

export default ChatLayout;