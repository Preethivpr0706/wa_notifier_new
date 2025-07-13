import axios from 'axios';
import { authService } from './authService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add authorization token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor
apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      authService.logout();
    }
    return Promise.reject(error);
  }
);

export const quickRepliesService = {
  getQuickReplies: async (businessId) => {
    try {
      const response = await apiClient.get('/conversation/quick-replies', {
        params: { businessId }
      });
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch quick replies');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error fetching quick replies:', error.response?.data);
      throw error.response?.data || error;
    }
  },

  createQuickReply: async (businessId, shortcode, message) => {
    try {
      const response = await apiClient.post('/conversation/quick-replies', {
        shortcode,
        message,
        businessId
      });
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to create quick reply');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error creating quick reply:', error.response?.data);
      throw error.response?.data || error;
    }
  },

  deleteQuickReply: async (quickReplyId) => {
    try {
      const response = await apiClient.delete(`/conversation/quick-replies/${quickReplyId}`);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to delete quick reply');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error deleting quick reply:', error.response?.data);
      throw error.response?.data || error;
    }
  },

  updateQuickReply: async (quickReplyId, updates) => {
    try {
      const response = await apiClient.put(
        `/quick-replies/${quickReplyId}`,
        updates
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to update quick reply');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error updating quick reply:', error.response?.data);
      throw error.response?.data || error;
    }
  }
};

export default quickRepliesService;