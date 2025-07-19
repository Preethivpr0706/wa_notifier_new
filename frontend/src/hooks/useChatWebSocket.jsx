import { useEffect, useRef, useState, useCallback } from 'react';
import { authService } from '../api/authService';

export const useChatWebSocket = () => {
  const wsRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const reconnectTimeoutRef = useRef(null);
  const isConnectingRef = useRef(false);
  const processedNotificationIds = useRef(new Set());
  const maxReconnectAttempts = 5;

  const getBusinessId = () => {
    const user = authService.getCurrentUser();
    return user?.businessId;
  };

  const cleanup = useCallback(() => {
    console.log('Cleaning up WebSocket connection');
    
    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Close WebSocket connection
    if (wsRef.current) {
      wsRef.current.onclose = null; // Prevent reconnection
      wsRef.current.onerror = null;
      wsRef.current.onmessage = null;
      wsRef.current.onopen = null;
      
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close(1000, 'Component unmounting');
      }
      wsRef.current = null;
    }
    
    isConnectingRef.current = false;
  }, []);

  const connect = useCallback(() => {
    // Prevent multiple simultaneous connections
    if (isConnectingRef.current) {
      console.log('Connection already in progress, skipping...');
      return;
    }

    const businessId = getBusinessId();
    const token = localStorage.getItem('token');
    
    if (!businessId || !token) {
      console.log('Missing businessId or token');
      return;
    }

    isConnectingRef.current = true;
    
    // Clean up existing connection
    if (wsRef.current) {
      console.log('Cleaning up existing connection');
      wsRef.current.onclose = null;
      wsRef.current.close();
    }

    // Create WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = process.env.NODE_ENV === 'production' ? window.location.port : '5000';
    const wsUrl = `${protocol}//${host}:${port}/ws?businessId=${businessId}&token=${token}`;
    
    console.log('Connecting to WebSocket:', wsUrl);
    
    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected successfully');
        setIsConnected(true);
        setReconnectAttempts(0);
        isConnectingRef.current = false;
        // Clear processed notifications on reconnect
        processedNotificationIds.current.clear();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('WebSocket message received:', message);
          
          // Create a unique ID for this notification
          const notificationId = message.id || 
            `${message.type}-${message.conversationId || ''}-${message.messageId || message.message?.id || Date.now()}-${Math.random()}`;
          
          // Check if we've already processed this notification
          if (processedNotificationIds.current.has(notificationId)) {
            console.log('Duplicate notification ignored:', notificationId);
            return;
          }
          
          // Add to processed set
          processedNotificationIds.current.add(notificationId);
          
          // Add unique ID to the message
          message.id = notificationId;
          
          setNotifications(prev => {
            // For status updates, replace existing notifications with same messageId
            if (message.type === 'message_status') {
              const filtered = prev.filter(n => 
                !(n.type === 'message_status' && n.messageId === message.messageId)
              );
              return [...filtered, message];
            }
            
            // For new messages, just add if not duplicate
            return [...prev, message];
          });
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        isConnectingRef.current = false;
        
        // Only reconnect if:
        // 1. Not a normal closure (1000)
        // 2. Not exceeding max attempts
        // 3. Not manually closed
        if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
          console.log(`Reconnecting in ${delay}ms... (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts(prev => prev + 1);
            connect();
          }, delay);
        } else if (event.code === 1000) {
          console.log('WebSocket closed normally');
        } else {
          console.error('Max reconnection attempts reached');
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        isConnectingRef.current = false;
      };

    } catch (error) {
      console.error('Error creating WebSocket:', error);
      isConnectingRef.current = false;
    }
  }, [reconnectAttempts]);

  // Initialize connection once
  useEffect(() => {
    const businessId = getBusinessId();
    const token = localStorage.getItem('token');
    
    if (businessId && token) {
      connect();
    }

    // Cleanup on unmount
    return cleanup;
  }, []); // Empty dependency array - only run once

  const sendMessage = useCallback((message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('Sending WebSocket message:', message);
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    console.warn('WebSocket not connected, message not sent:', message);
    return false;
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    processedNotificationIds.current.clear();
  }, []);

  // Clear old notifications automatically
  useEffect(() => {
    const cleanup = setInterval(() => {
      setNotifications(prev => {
        const now = Date.now();
        const filtered = prev.filter(n => {
          const notificationTime = new Date(n.timestamp || now).getTime();
          return now - notificationTime < 300000; // Keep notifications for 5 minutes
        });
        
        // If we removed notifications, also clean up the processed IDs
        if (filtered.length !== prev.length) {
          const remainingIds = new Set(filtered.map(n => n.id));
          processedNotificationIds.current = remainingIds;
        }
        
        return filtered;
      });
    }, 60000); // Check every minute

    return () => clearInterval(cleanup);
  }, []);

  const reconnect = useCallback(() => {
    console.log('Manual reconnect requested');
    
    // Reset state
    setReconnectAttempts(0);
    processedNotificationIds.current.clear();
    
    // Clear any existing timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Force reconnection
    isConnectingRef.current = false;
    connect();
  }, [connect]);

  return {
    isConnected,
    notifications,
    clearNotifications,
    sendMessage,
    reconnect
  };
};