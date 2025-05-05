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
      const response = await apiClient.post('/messages/send-bulk', payload);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.message;
    }
  },
  
  createCampaign: async (campaignData) => {
    try {
      const response = await apiClient.post('/campaigns', campaignData);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.message;
    }
  }
};

export default messageService;