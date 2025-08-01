// Enhanced quickRepliesService.js
import axios from 'axios';

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

export const quickRepliesService = {
  // Get all quick replies for a business
  getQuickReplies: async (businessId) => {
    try {
      const response = await apiClient.get(`/quick-replies?businessId=${businessId}`);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch quick replies');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error fetching quick replies:', error.response?.data);
      throw error.response?.data || error;
    }
  },

  // Create a new quick reply
  createQuickReply: async (businessId, shortcode, message) => {
    try {
      const response = await apiClient.post('/quick-replies', {
        businessId,
        shortcode: shortcode.toLowerCase().trim(),
        message: message.trim()
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

  // Update an existing quick reply
  updateQuickReply: async (quickReplyId, data) => {
    try {
      const response = await apiClient.put(`/quick-replies/${quickReplyId}`, {
        shortcode: data.shortcode.toLowerCase().trim(),
        message: data.message.trim()
      });
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to update quick reply');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error updating quick reply:', error.response?.data);
      throw error.response?.data || error;
    }
  },

  // Delete a quick reply
  deleteQuickReply: async (quickReplyId) => {
    try {
      const response = await apiClient.delete(`/quick-replies/${quickReplyId}`);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to delete quick reply');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error deleting quick reply:', error.response?.data);
      throw error.response?.data || error;
    }
  },

  // Search quick replies by shortcode or message content
  searchQuickReplies: async (businessId, query) => {
    try {
      const response = await apiClient.get(`/quick-replies/search?businessId=${businessId}&q=${encodeURIComponent(query)}`);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to search quick replies');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error searching quick replies:', error.response?.data);
      throw error.response?.data || error;
    }
  }
};

export default quickRepliesService;