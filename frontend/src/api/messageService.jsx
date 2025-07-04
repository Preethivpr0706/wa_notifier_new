// src/api/messageService.js
import axios from 'axios';

const API_URL = import.meta.env.REACT_APP_API_URL || 'http://localhost:5000/api';

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

export const messageService = {
  sendBulkMessages: async (payload) => {
    try {
      console.log('Sending payload:', JSON.stringify(payload, null, 2));
      
      const response = await apiClient.post('/messages/send-bulk', payload);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to send messages');
      }
      
      
      return response.data;
    } catch (error) {
      console.error('Error details:', error.response?.data);
      throw error.response?.data || error;
    }
  },
  saveDraft: async (payload) => {
        try {
            const response = await apiClient.post('/messages/save-draft', payload);
            
            if (!response.data.success) {
                throw new Error(response.data.message || 'Failed to save draft');
            }
            
            return response.data;
        } catch (error) {
            console.error('Error saving draft:', error.response?.data);
            throw error.response?.data || error;
        }
    },

    sendDraft: async (campaignId) => {
        try {
            const response = await apiClient.post(`/messages/send-draft/${campaignId}`);
            
            if (!response.data.success) {
                throw new Error(response.data.message || 'Failed to send draft');
            }
            
            return response.data;
        } catch (error) {
            console.error('Error sending draft:', error.response?.data);
            throw error.response?.data || error;
        }
    }
};


export default messageService;